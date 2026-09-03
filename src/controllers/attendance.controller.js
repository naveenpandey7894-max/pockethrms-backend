const prisma = require('../config/prisma');

// 🟢 Helper: Time formatting for notifications (e.g. 06:33 PM)
const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// 🟢 Helper: Clean IST Date Range & Midnight UTC for @db.Date matching
const getTodayRangeIST = () => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const todayStr = formatter.format(new Date()); // Exact "YYYY-MM-DD" in IST

  // Pure YYYY-MM-DD Date representation for Prisma @db.Date
  const pureDate = new Date(`${todayStr}T00:00:00.000Z`);

  // IST Day boundaries converted to UTC timestamps for range comparison
  const startOfDay = new Date(`${todayStr}T00:00:00.000+05:30`);
  const endOfDay = new Date(`${todayStr}T23:59:59.999+05:30`);

  return { todayStr, pureDate, startOfDay, endOfDay };
};

// 🟢 1. Check-In
const checkIn = async (req, res, next) => {
  try {
    const employeeId = req.user?.employeeId || req.body.employeeId;

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    const empIdInt = parseInt(employeeId, 10);
    const { pureDate, startOfDay, endOfDay } = getTodayRangeIST();

    const activePunch = await prisma.attendance.findFirst({
      where: {
        employeeId: empIdInt,
        checkOut: null,
        OR: [
          { checkIn: { gte: startOfDay, lte: endOfDay } },
          { date: pureDate },
        ],
      },
    });

    if (activePunch) {
      return res.status(400).json({
        message: 'Aap pehle se Checked-In hain. Dobara Check-In karne se pehle Check-Out karein!',
      });
    }

    const now = new Date();

    let existingTodayRecord = await prisma.attendance.findFirst({
      where: {
        employeeId: empIdInt,
        OR: [
          { date: pureDate },
          { checkIn: { gte: startOfDay, lte: endOfDay } }
        ]
      }
    });

    let attendance;
    if (existingTodayRecord) {
      attendance = await prisma.attendance.update({
        where: { id: existingTodayRecord.id },
        data: {
          checkIn: existingTodayRecord.checkIn || now,
          checkOut: null,
          status: 'PRESENT',
          punches: {
            create: {
              punchType: 'IN',
              punchTime: now,
            },
          },
        },
        include: { punches: true },
      });
    } else {
      attendance = await prisma.attendance.create({
        data: {
          employeeId: empIdInt,
          date: pureDate,
          checkIn: now,
          checkOut: null,
          status: 'PRESENT',
          punches: {
            create: {
              punchType: 'IN',
              punchTime: now,
            },
          },
        },
        include: { punches: true },
      });
    }

    const formattedTimeStr = formatTime(now);
    await prisma.notification.create({
      data: {
        employeeId: empIdInt,
        title: 'Check-in Successful',
        message: `You successfully checked in at ${formattedTimeStr}`,
        type: 'attendance',
        isRead: false,
      },
    });

    return res.status(201).json({ message: 'Checked in successfully', data: attendance });
  } catch (err) {
    next(err);
  }
};

// 🟢 2. Check-Out
const checkOut = async (req, res, next) => {
  try {
    const employeeId = req.user?.employeeId || req.body.employeeId;

    if (!employeeId) {
      return res.status(400).json({ message: 'Employee ID is required' });
    }

    const empIdInt = parseInt(employeeId, 10);
    const { pureDate, startOfDay, endOfDay } = getTodayRangeIST();

    const activePunch = await prisma.attendance.findFirst({
      where: {
        employeeId: empIdInt,
        checkOut: null,
        OR: [
          { checkIn: { gte: startOfDay, lte: endOfDay } },
          { date: pureDate },
        ],
      },
      orderBy: { id: 'desc' }
    });

    if (!activePunch) {
      return res.status(400).json({ message: 'No active check-in record found for today.' });
    }

    const now = new Date();

    const attendance = await prisma.attendance.update({
      where: { id: activePunch.id },
      data: {
        checkOut: now,
        punches: {
          create: {
            punchType: 'OUT',
            punchTime: now,
          },
        },
      },
      include: { punches: true },
    });

    const formattedTimeStr = formatTime(now);
    await prisma.notification.create({
      data: {
        employeeId: empIdInt,
        title: 'Check-out Successful',
        message: `You successfully checked out at ${formattedTimeStr}`,
        type: 'attendance',
        isRead: false,
      },
    });

    return res.status(200).json({ message: 'Checked out successfully', data: attendance });
  } catch (err) {
    next(err);
  }
};

// 🟢 3. Get Today Attendance Summary
const getTodayAttendanceSummary = async (req, res, next) => {
  try {
    const { pureDate, startOfDay, endOfDay } = getTodayRangeIST();

    const totalPresent = await prisma.attendance.count({
      where: {
        status: 'PRESENT',
        OR: [
          { checkIn: { gte: startOfDay, lte: endOfDay } },
          { date: pureDate },
        ],
      },
    });

    return res.status(200).json({ success: true, presentCount: totalPresent });
  } catch (err) {
    next(err);
  }
};

// 🟢 4. Get Attendance Logs
const getAttendanceLogs = async (req, res, next) => {
  try {
    const logs = await prisma.attendance.findMany({
      include: { punches: true },
      orderBy: { id: 'desc' },
      take: 50,
    });
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
};

// 🟢 5. Get Today Attendance for Employee
const getTodayAttendance = async (req, res, next) => {
  try {
    const { employeeId } = req.params;
    const { pureDate, startOfDay, endOfDay } = getTodayRangeIST();

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId: parseInt(employeeId, 10),
        OR: [
          { checkIn: { gte: startOfDay, lte: endOfDay } },
          { date: pureDate },
        ],
      },
      include: { punches: true },
      orderBy: { id: 'asc' },
    });

    return res.status(200).json({ success: true, data: attendance });
  } catch (err) {
    next(err);
  }
};

// 🟢 6. Get Attendance History for Employee
const getAttendanceHistory = async (req, res, next) => {
  try {
    const { employeeId } = req.params;

    const history = await prisma.attendance.findMany({
      where: { employeeId: parseInt(employeeId, 10) },
      include: { punches: true },
      orderBy: { id: 'desc' },
    });

    return res.status(200).json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
};

// 🟢 Clean Single Export (Router Import Bug Safeguard)
module.exports = {
  getTodayAttendanceSummary,
  getAttendanceLogs,
  getTodayAttendance,
  getAttendanceHistory,
  checkIn,
  checkOut,
};