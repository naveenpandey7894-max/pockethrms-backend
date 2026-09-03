const prisma = require("../config/prisma");

// Helper Function for Accurate IST Month, Year
const getISTDateDetails = (dateInput = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const [yearStr, monthStr] = formatter.format(new Date(dateInput)).split("-");

  return {
    month: parseInt(monthStr, 10),
    year: parseInt(yearStr, 10),
  };
};

// Helper Function for IST DateTime String
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

// 🟢 1. HR Dashboard Payroll Summary
exports.getPayrollSummary = async (req, res, next) => {
  try {
    const { month: currentMonth, year: currentYear } = getISTDateDetails();

    const totalEmployees = await prisma.employee.count({
      where: { status: "ACTIVE" },
    });

    const records = await prisma.payroll.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
      },
      include: {
        employee: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthString = `${monthNames[currentMonth - 1]} ${currentYear}`;

    const formattedRecords = records.map((rec) => ({
      id: rec.id,
      employeeId: rec.employeeId,
      employeeName: rec.employee?.user?.name || `Employee #${rec.employeeId}`,
      netSalary: rec.netSalary,
      status: rec.status || "GENERATED",
      formattedCreatedAt: formatISTDateTime(rec.createdAt),
    }));

    return res.status(200).json({
      success: true,
      data: {
        currentMonth: monthString,
        month: currentMonth,
        year: currentYear,
        totalEmployees,
        processedCount: records.length,
        pendingCount: Math.max(0, totalEmployees - records.length),
        records: formattedRecords,
      },
    });
  } catch (err) {
    next(err);
  }
};

// 🟢 2. Bulk Payslip Generation
exports.generateAllPayslips = async (req, res, next) => {
  try {
    const { month: defaultMonth, year: defaultYear } = getISTDateDetails();
    const month = req.body.month ? Number(req.body.month) : defaultMonth;
    const year = req.body.year ? Number(req.body.year) : defaultYear;

    const employees = await prisma.employee.findMany({
      where: { status: "ACTIVE" },
    });

    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No active employees found to generate payroll.",
      });
    }

    const upsertOperations = employees.map((emp) => {
      const basicNum = Number(emp.basicSalary) || 25000;
      const hraNum = Math.round(basicNum * 0.4);
      const allowancesNum = 2000;
      const deductionsNum = 1500;
      const netSalary = basicNum + hraNum + allowancesNum - deductionsNum;

      return prisma.payroll.upsert({
        where: {
          employeeId_month_year: {
            employeeId: emp.id,
            month: month,
            year: year,
          },
        },
        update: {
          basic: basicNum,
          hra: hraNum,
          allowances: allowancesNum,
          deductions: deductionsNum,
          netSalary,
        },
        create: {
          employeeId: emp.id,
          month: month,
          year: year,
          basic: basicNum,
          hra: hraNum,
          allowances: allowancesNum,
          deductions: deductionsNum,
          netSalary,
        },
      });
    });

    await prisma.$transaction(upsertOperations);

    return res.status(200).json({
      success: true,
      message: `Payslips successfully generated for ${employees.length} employees.`,
    });
  } catch (err) {
    next(err);
  }
};

// 🟢 3. Single Employee Payslip Generate
exports.generatePayslip = async (req, res, next) => {
  try {
    const { employeeId, month, year, basic, hra, allowances, deductions } = req.body;

    if (!employeeId || !month || !year) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const basicNum = Number(basic) || 0;
    const hraNum = Number(hra) || 0;
    const allowancesNum = Number(allowances) || 0;
    const deductionsNum = Number(deductions) || 0;
    const netSalary = basicNum + hraNum + allowancesNum - deductionsNum;

    const payroll = await prisma.payroll.upsert({
      where: {
        employeeId_month_year: {
          employeeId: Number(employeeId),
          month: Number(month),
          year: Number(year),
        },
      },
      update: {
        basic: basicNum,
        hra: hraNum,
        allowances: allowancesNum,
        deductions: deductionsNum,
        netSalary,
      },
      create: {
        employeeId: Number(employeeId),
        month: Number(month),
        year: Number(year),
        basic: basicNum,
        hra: hraNum,
        allowances: allowancesNum,
        deductions: deductionsNum,
        netSalary,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Payslip generated successfully",
      payroll: {
        ...payroll,
        formattedCreatedAt: formatISTDateTime(payroll.createdAt),
      },
    });
  } catch (err) {
    next(err);
  }
};

// 🟢 4. Get Payslip by Employee ID (Handles single month query & full list)
exports.getPayslipsByEmployee = async (req, res, next) => {
  try {
    const rawId = req.params.employeeId || req.params.id;
    const inputId = Number(rawId);
    let { month, year } = req.query;

    if (isNaN(inputId)) {
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    // 1. Employee Verification (Matches Employee ID or User ID)
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id: inputId }, { userId: inputId }],
      },
    });

    if (!employee) {
      return res.status(404).json({ 
        success: false, 
        message: `Employee record not found for ID: ${inputId}` 
      });
    }

    const targetEmpId = employee.id;

    // 2. Single Month Payslip Fetch for Mobile App
    if (month && year) {
      // String padding fix: "09" -> 9 integer conversion
      const parsedMonth = parseInt(month, 10);
      const parsedYear = parseInt(year, 10);

      const payroll = await prisma.payroll.findFirst({
        where: {
          employeeId: targetEmpId,
          month: parsedMonth,
          year: parsedYear,
        },
      });

      // Agar is specific month/year ki payslip generated nahi hai:
      if (!payroll) {
        return res.status(404).json({
          success: false,
          message: `Payslip not generated yet for ${parsedMonth}/${parsedYear}.`,
        });
      }

      const basicPay = Number(payroll.basic) || 0;
      const hra = Number(payroll.hra) || 0;
      const allowances = Number(payroll.allowances) || 0;
      const deductions = Number(payroll.deductions) || 0;
      const grossSalary = basicPay + hra + allowances;
      const netPayable = Number(payroll.netSalary) || (grossSalary - deductions);

      return res.status(200).json({
        success: true,
        data: {
          id: payroll.id,
          employeeId: targetEmpId,
          monthYear: `${parsedMonth}/${parsedYear}`,
          basicPay,
          grossSalary,
          totalDeductions: deductions,
          netPayable,
          paidDays: payroll.paidDays || 30,
          lossOfPayDays: payroll.lossOfPayDays || 0,
          earnings: [
            { label: "Basic Salary", amount: basicPay },
            { label: "House Rent Allowance (HRA)", amount: hra },
            { label: "Special Allowances", amount: allowances },
          ],
          deductions: [
            { label: "Provident Fund / Taxes", amount: deductions },
          ],
          formattedCreatedAt: formatISTDateTime(payroll.createdAt),
        },
      });
    }

    // 3. Historical Payslips List (Month & Year Query Param Absent)
    const payrolls = await prisma.payroll.findMany({
      where: { employeeId: targetEmpId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const formattedPayrolls = payrolls.map((p) => ({
      ...p,
      formattedCreatedAt: formatISTDateTime(p.createdAt),
    }));

    return res.status(200).json({ success: true, data: formattedPayrolls });
  } catch (err) {
    console.error("Get Payslip Error:", err);
    next(err);
  }
};

// 🟢 5. All Payrolls (HR Admin Table View)
exports.getAllPayrolls = async (req, res, next) => {
  try {
    const { month, year } = req.query;

    const where = {};
    if (month) where.month = Number(month);
    if (year) where.year = Number(year);

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          include: {
            user: { select: { name: true, email: true } },
            department: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    const formattedPayrolls = payrolls.map((p) => ({
      ...p,
      formattedCreatedAt: formatISTDateTime(p.createdAt),
    }));

    return res.status(200).json({ success: true, data: formattedPayrolls });
  } catch (err) {
    next(err);
  }
};