// const express = require("express");
// const router = express.Router();

// // 🟢 getAttendanceLogs ko yahan import list me add karein
// const {
//   getAttendanceLogs,
//   getTodayAttendance,
//   getAttendanceHistory,
//   checkIn,
//   checkOut,
// } = require("../controllers/attendance.controller");

// // Attendance Routes
// router.get("/logs", getAttendanceLogs);
// router.get("/logs/:employeeId", getAttendanceLogs);
// router.post("/check-in", checkIn);
// router.post("/check-out", checkOut);
// router.get("/today/:employeeId", getTodayAttendance);
// router.get("/history/:employeeId", getAttendanceHistory);
// router.get("/:employeeId", getAttendanceHistory);

// module.exports = router;


const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const attendanceController = require('../controllers/attendance.controller');

// Destructure controller methods safely
const {
  getTodayAttendanceSummary,
  getAttendanceLogs,
  getTodayAttendance,
  getAttendanceHistory,
  checkIn,
  checkOut,
} = attendanceController;

// 🔒 Global Auth Middleware: Enforces JWT authentication for all attendance endpoints
router.use(authenticate);

// 🟢 Attendance Operations & Check-In/Out Routes
if (checkIn) router.post('/check-in', checkIn);
if (checkOut) router.post('/check-out', checkOut);

// 📊 Static Attendance Summary & Log Routes
if (getTodayAttendanceSummary) router.get('/today-summary', getTodayAttendanceSummary);
if (getAttendanceLogs) router.get('/logs', getAttendanceLogs);

// 👤 Employee Specific Attendance Parameterized Routes
if (getTodayAttendance) router.get('/today/:employeeId', getTodayAttendance);
if (getAttendanceHistory) router.get('/history/:employeeId', getAttendanceHistory);

module.exports = router;