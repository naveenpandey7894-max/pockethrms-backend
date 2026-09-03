const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employee.controller");

// 🔒 Global Auth Middleware: Enforces JWT authentication for all employee management endpoints
router.use(authenticate);

// 🟢 Static & Query Routes (Must be declared before dynamic parameter routes)
router.get("/all", authorize("ADMIN", "HR", "MANAGER"), getAllEmployees);
router.get("/", authorize("ADMIN", "HR", "MANAGER"), getAllEmployees);

// 🟠 Dynamic Parameter Routes (ID-specific operations)
router.get("/:id", getEmployeeById);
router.put("/:id", authorize("ADMIN", "HR"), updateEmployee);
router.delete("/:id", authorize("ADMIN"), deleteEmployee);

module.exports = router;