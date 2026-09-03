// const express = require("express");
// const router = express.Router();

// // 🟢 Both handlers ko destructured import karein
// const { 
//   getEmployeeDashboardData, 
//   getHrDashboardData 
// } = require("../controllers/dashboard.controller");

// // Debug Checks
// console.log("Employee Dashboard Handler Type:", typeof getEmployeeDashboardData);
// console.log("HR Dashboard Handler Type:", typeof getHrDashboardData);

// // 1. Employee Dashboard Route
// router.get("/employee/:employeeId", getEmployeeDashboardData);

// // 2. HR Dashboard Stats Route (HR Dashboard ke liye)
// router.get("/hr-stats", getHrDashboardData);

// module.exports = router;


const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");

// 🟢 Import dashboard controllers
const { 
  getEmployeeDashboardData, 
  getHrDashboardData 
} = require("../controllers/dashboard.controller");

// Debug Logs (Handler type verification)
console.log("Employee Dashboard Handler Type:", typeof getEmployeeDashboardData);
console.log("HR Dashboard Handler Type:", typeof getHrDashboardData);

// 🔒 Global Auth Middleware: Restricts public browser access to all dashboard routes
router.use(authenticate);

// 1. Static Routes (Role-restricted HR dashboard metrics)
router.get("/hr-stats", authorize("ADMIN", "HR"), getHrDashboardData);

// 2. Dynamic Param Routes (Employee-specific dashboard data)
router.get("/employee/:employeeId", getEmployeeDashboardData);

module.exports = router;