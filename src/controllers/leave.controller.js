const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🟢 Helper Function for IST Date-Time Formatting
const formatISTDate = (dateObj) => {
  if (!dateObj) return null;
  return new Date(dateObj).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatISTDateTime = (dateObj) => {
  if (!dateObj) return null;
  return new Date(dateObj).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// 1. GET ALL LEAVE TYPES FOR DROPDOWN
const getAllLeaveTypes = async (req, res) => {
  try {
    const leaveTypes = await prisma.leaveType.findMany({
      orderBy: { id: 'asc' },
    });

    return res.status(200).json({
      success: true,
      data: leaveTypes || [],
    });
  } catch (error) {
    console.error("Get All Leave Types Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. GET LEAVE BALANCES FOR EMPLOYEE (Foreign Key Handled)
const getLeaveBalances = async (req, res) => {
  try {
    const rawId = req.params.employeeId || req.params.id;
    const empIdParsed = parseInt(rawId, 10);

    if (isNaN(empIdParsed)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Employee ID",
      });
    }

    // 🟢 Employee Existence Verification (Prevents FK violation error)
    const employeeExists = await prisma.employee.findUnique({
      where: { id: empIdParsed },
    });

    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: `Employee with ID ${empIdParsed} does not exist in database.`,
      });
    }

    // Database se Employee ka LeaveBalance fetch karein
    let balances = await prisma.leaveBalance.findMany({
      where: { employeeId: empIdParsed },
      include: { leaveType: true },
    });

    // Agar employee ke balance records initialized nahi hain, toh create kar de
    if (balances.length === 0) {
      const allTypes = await prisma.leaveType.findMany();
      for (const type of allTypes) {
        await prisma.leaveBalance.upsert({
          where: {
            employeeId_leaveTypeId: {
              employeeId: empIdParsed,
              leaveTypeId: type.id,
            },
          },
          update: {},
          create: {
            employeeId: empIdParsed,
            leaveTypeId: type.id,
            opening: 0,
            credit: type.maxDays || 0,
            debit: 0,
            used: 0,
            balance: type.maxDays || 0,
          },
        });
      }

      balances = await prisma.leaveBalance.findMany({
        where: { employeeId: empIdParsed },
        include: { leaveType: true },
      });
    }

    // Response structure
    const formattedData = balances.map((item) => ({
      id: item.id,
      leaveType: item.leaveType.name,
      leaveTypeId: item.leaveTypeId,
      opening: item.opening,
      credit: item.credit,
      debit: item.debit,
      used: item.used,
      balance: item.balance,
    }));

    return res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("Get Leave Balances Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. APPLY LEAVE
const applyLeave = async (req, res) => {
  try {
    const { employeeId, leaveTypeId, fromDate, toDate, reason, isHalfDay } = req.body;
    const empIdParsed = parseInt(employeeId, 10);

    if (isNaN(empIdParsed)) {
      return res.status(400).json({ success: false, message: "Invalid Employee ID" });
    }

    // 🟢 Check Employee existence before applying leave
    const employeeExists = await prisma.employee.findUnique({
      where: { id: empIdParsed },
    });

    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: `Cannot apply leave. Employee ID ${empIdParsed} does not exist.`,
      });
    }

    let typeId = parseInt(leaveTypeId, 10);
    if (isNaN(typeId)) {
      const defaultType = await prisma.leaveType.findFirst();
      if (!defaultType) {
        return res.status(400).json({
          success: false,
          message: "No Leave Types available in database.",
        });
      }
      typeId = defaultType.id;
    }

    const leaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: empIdParsed,
        leaveTypeId: typeId,
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
        reason: reason || "",
        status: "PENDING",
      },
    });

    // 🟢 IST Date Formatting in Notification
    const fromStr = formatISTDate(fromDate);
    const toStr = formatISTDate(toDate);
    
    // Auto Trigger Notification
    await prisma.notification.create({
      data: {
        employeeId: empIdParsed,
        title: "Leave Applied",
        message: `Your leave request from ${fromStr} to ${toStr} has been submitted.`,
        type: "leave",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Leave applied successfully!",
      data: {
        ...leaveRequest,
        formattedFromDate: fromStr,
        formattedToDate: toStr,
        formattedCreatedAt: formatISTDateTime(leaveRequest.createdAt),
      },
    });
  } catch (error) {
    console.error("Apply Leave Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. UPDATE LEAVE STATUS & AUTO-DEDUCT BALANCE
const updateLeaveStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'APPROVED' or 'REJECTED'

    const leaveReq = await prisma.leaveRequest.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!leaveReq) {
      return res.status(404).json({ success: false, message: "Leave Request not found" });
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: parseInt(id, 10) },
      data: { status: status },
    });

    // 🟢 Agar Leave Approve hui hai, toh LeaveBalance update karein
    if (status === 'APPROVED') {
      const diffTime = Math.abs(new Date(leaveReq.toDate) - new Date(leaveReq.fromDate));
      const requestedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const userBalance = await prisma.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: leaveReq.employeeId,
            leaveTypeId: leaveReq.leaveTypeId,
          },
        },
      });

      if (userBalance) {
        const newUsed = userBalance.used + requestedDays;
        const newBalance = Math.max(0, userBalance.opening + userBalance.credit - userBalance.debit - newUsed);

        await prisma.leaveBalance.update({
          where: { id: userBalance.id },
          data: {
            used: newUsed,
            balance: newBalance,
          },
        });
      }
    }

    // Auto Trigger Notification
    await prisma.notification.create({
      data: {
        employeeId: updatedLeave.employeeId,
        title: `Leave Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        message: `Your leave request has been ${status.toLowerCase()}.`,
        type: "leave",
      },
    });

    return res.status(200).json({
      success: true,
      message: `Leave status updated to ${status}`,
      data: {
        ...updatedLeave,
        formattedFromDate: formatISTDate(updatedLeave.fromDate),
        formattedToDate: formatISTDate(updatedLeave.toDate),
        formattedUpdatedAt: formatISTDateTime(updatedLeave.updatedAt),
      },
    });
  } catch (error) {
    console.error("Update Leave Status Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. GET LEAVE HISTORY FOR DYNAMIC MODAL (FIXED FOR /leaves/history/:employeeId)
const getLeaveHistory = async (req, res) => {
  try {
    const rawId = req.params.employeeId || req.params.id;
    const empIdParsed = parseInt(rawId, 10);
    const { leaveTypeId, type } = req.query;

    if (isNaN(empIdParsed)) {
      return res.status(400).json({ success: false, message: "Invalid Employee ID" });
    }

    const whereClause = {
      employeeId: empIdParsed,
    };

    if (leaveTypeId) {
      whereClause.leaveTypeId = parseInt(leaveTypeId, 10);
    }

    // Modal type filter handling (APPROVED or PENDING)
    if (type && type.toUpperCase() === 'USED') {
      whereClause.status = 'APPROVED';
    }

    const history = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });

    const formattedHistory = history.map((item) => {
      const diffTime = Math.abs(new Date(item.toDate) - new Date(item.fromDate));
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      return {
        id: item.id,
        date: formatISTDate(item.fromDate),
        createdAt: item.createdAt,
        remark: item.reason || 'N/A',
        days: days,
        status: item.status,
        leaveType: item.leaveType?.name || '',
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedHistory,
    });
  } catch (error) {
    console.error("Get Leave History Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET LEAVE HISTORY FOR SINGLE EMPLOYEE
const getLeavesByEmployee = async (req, res) => {
  try {
    const rawId = req.params.employeeId || req.params.id;
    const empIdParsed = parseInt(rawId, 10);

    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: empIdParsed },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });

    const formattedLeaves = leaves.map((item) => ({
      ...item,
      formattedFromDate: formatISTDate(item.fromDate),
      formattedToDate: formatISTDate(item.toDate),
      formattedCreatedAt: formatISTDateTime(item.createdAt),
    }));

    return res.status(200).json({ success: true, data: formattedLeaves });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// GET ALL LEAVES (FOR HR/ADMIN)
const getAllLeaves = async (req, res) => {
  try {
    const leaves = await prisma.leaveRequest.findMany({
      include: {
        employee: {
          include: { user: { select: { name: true, email: true } } },
        },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedLeaves = leaves.map((item) => ({
      ...item,
      formattedFromDate: formatISTDate(item.fromDate),
      formattedToDate: formatISTDate(item.toDate),
      formattedCreatedAt: formatISTDateTime(item.createdAt),
    }));

    return res.status(200).json({ success: true, data: formattedLeaves });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllLeaveTypes,
  applyLeave,
  getAllLeaves,
  getLeavesByEmployee,
  updateLeaveStatus,
  getLeaveBalances,
  getLeaveHistory, // 🟢 New Function Exported
};