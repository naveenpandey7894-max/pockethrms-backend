const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 🟢 Helper: Convert UTC Date Object directly to IST (HH:mm) string
const formatTime24 = (dateObj) => {
  if (!dateObj) return "--:--";
  const date = new Date(dateObj);
  if (isNaN(date.getTime())) return "--:--";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

// 🟢 Helper: Pure Date and Boundary Generator
const getTargetDayBoundaries = (dateQueryParam) => {
  let targetDateStr;

  if (dateQueryParam && /^\d{4}-\d{2}-\d{2}$/.test(dateQueryParam)) {
    targetDateStr = dateQueryParam;
  } else {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    targetDateStr = formatter.format(new Date()); // YYYY-MM-DD
  }

  const startOfDay = new Date(`${targetDateStr}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${targetDateStr}T23:59:59.999+05:30`);
  const pureDate = new Date(`${targetDateStr}T00:00:00.000Z`);

  return { startOfDay, endOfDay, pureDate, targetDateStr };
};

// 🟢 Employee Dashboard Controller
const getEmployeeDashboardData = async (req, res) => {
  try {
    const rawId = req.params.employeeId || req.params.id;
    const employeeId = parseInt(rawId, 10);

    if (isNaN(employeeId)) {
      return res.status(400).json({ success: false, message: "Invalid Employee ID format" });
    }

    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id: employeeId }, { userId: employeeId }] },
    });

    const targetEmpId = employee ? employee.id : employeeId;
    const { startOfDay, endOfDay, pureDate, targetDateStr } = getTargetDayBoundaries(req.query.date);

    // 🟢 Fetch Attendance & Include Punches Array
    const todayAttendanceRecords = await prisma.attendance.findMany({
      where: {
        employeeId: targetEmpId,
        OR: [
          { checkIn: { gte: startOfDay, lte: endOfDay } },
          { date: pureDate },
        ],
      },
      include: {
        punches: {
          orderBy: { punchTime: "asc" } // 👈 First punch at index [0], last punch at end
        }
      },
      orderBy: { id: "desc" },
    });

    const latestAttendance = todayAttendanceRecords[0] || null;

    const pendingLeaveCount = await prisma.leaveRequest.count({
      where: { employeeId: targetEmpId, status: "PENDING" },
    });

    const upcomingHoliday = await prisma.holiday.findFirst({
      where: { date: { gte: startOfDay } },
      orderBy: { date: "asc" },
    });

    let formattedCheckIn = "--:--";
    let formattedCheckOut = "--:--";
    let isPunchedIn = false;

    if (latestAttendance) {
      // 🟢 Fix 1: Priority -> Earliest record in `punches` relation
      const hasPunches = latestAttendance.punches && latestAttendance.punches.length > 0;
      
      const firstPunchTime = hasPunches 
        ? latestAttendance.punches[0].punchTime 
        : latestAttendance.checkIn;

      const lastPunchTime = latestAttendance.checkOut;

      if (firstPunchTime) {
        formattedCheckIn = formatTime24(firstPunchTime);
      }

      if (lastPunchTime) {
        formattedCheckOut = formatTime24(lastPunchTime);
      }

      // Active state check
      isPunchedIn = !!(latestAttendance.checkIn && !latestAttendance.checkOut);
    }

    return res.status(200).json({
      success: true,
      data: {
        punchDate: targetDateStr,
        todayShift: "09:30 AM - 06:30 PM",
        firstPunch: formattedCheckIn,
        lastPunch: formattedCheckOut,
        isPunchedIn: isPunchedIn,
        upcomingHoliday: upcomingHoliday
          ? {
              name: upcomingHoliday.name,
              date: new Date(upcomingHoliday.date).toLocaleDateString("en-IN", {
                timeZone: "Asia/Kolkata",
                day: "2-digit",
                month: "short",
                year: "numeric",
              }),
            }
          : null,
        pendingRequests: {
          leaveCount: pendingLeaveCount,
          regularizationCount: 0,
          onDutyCount: 0,
          total: pendingLeaveCount,
        },
      },
    });
  } catch (error) {
    console.error("Employee Dashboard Controller Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

// 🟢 HR Dashboard Controller
const getHrDashboardData = async (req, res) => {
  try {
    const { startOfDay, endOfDay, pureDate } = getTargetDayBoundaries(req.query.date);

    const totalEmployees = await prisma.employee.count({
      where: { status: "ACTIVE" },
    });

    const pendingLeaves = await prisma.leaveRequest.count({
      where: { status: "PENDING" },
    });

    let pendingRegularizations = 0;
    if (prisma.regularization) {
      pendingRegularizations = await prisma.regularization.count({
        where: { status: "PENDING" },
      });
    }

    const presentToday = await prisma.attendance.count({
      where: {
        OR: [
          { checkIn: { gte: startOfDay, lte: endOfDay } },
          { date: pureDate },
        ],
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        pendingLeaves,
        pendingRegularizations,
        presentToday,
        absentToday: Math.max(0, totalEmployees - presentToday),
      },
    });
  } catch (error) {
    console.error("HR Dashboard Controller Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error", error: error.message });
  }
};

module.exports = {
  getEmployeeDashboardData,
  getHrDashboardData,
};