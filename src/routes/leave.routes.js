// const express = require("express");
// const router = express.Router();
// const { authenticate, authorize } = require("../middlewares/auth.middleware");
// const {
//   getAllLeaveTypes, // 🟢 Import Leave Types
//   applyLeave,
//   getAllLeaves,
//   getLeavesByEmployee,
//   updateLeaveStatus,
//   getLeaveBalances,
//   getLeaveHistory,
// } = require("../controllers/leave.controller");

// // 🟢 Specific Public/Open Routes (Must be defined before parameterized routes like /:employeeId)
// router.get("/types", getAllLeaveTypes); // 🟢 LEAVE TYPES DROPDOWN ROUTE ADDED
// router.get("/balance/:employeeId", getLeaveBalances);
// router.get("/employee/:employeeId", getLeavesByEmployee);
// router.get("/:employeeId", getLeavesByEmployee);
// // 2. Add Route for /history/:employeeId
// router.get('/history/:employeeId', getLeaveHistory);

// // Auth middleware for Protected Routes
// router.use(authenticate);

// // Protected Routes
// router.post("/", applyLeave);
// router.get("/all", authorize("ADMIN", "HR", "MANAGER"), getAllLeaves);
// router.patch("/:id/status", authorize("ADMIN", "HR", "MANAGER"), updateLeaveStatus);

// module.exports = router;


const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
  getAllLeaveTypes,
  applyLeave,
  getAllLeaves,
  getLeavesByEmployee,
  updateLeaveStatus,
  getLeaveBalances,
  getLeaveHistory,
} = require("../controllers/leave.controller");

// 🔒 Global Auth Middleware: Enforces JWT authentication for all routes below
router.use(authenticate);

// 🟢 Specific Employee & Leave Information Routes
router.get("/types", getAllLeaveTypes);
router.get("/balance/:employeeId", getLeaveBalances);
router.get("/employee/:employeeId", getLeavesByEmployee);
router.get("/history/:employeeId", getLeaveHistory);
router.get("/:employeeId", getLeavesByEmployee);

// 📝 Leave Application Route (Employee level)
router.post("/", applyLeave);

// 🛡️ Admin & Manager Specific Protected Routes
router.get("/all", authorize("ADMIN", "HR", "MANAGER"), getAllLeaves);
router.patch("/:id/status", authorize("ADMIN", "HR", "MANAGER"), updateLeaveStatus);

module.exports = router;