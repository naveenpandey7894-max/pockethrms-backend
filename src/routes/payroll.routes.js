// const express = require("express");
// const router = express.Router();
// const { authenticate, authorize } = require("../middlewares/auth.middleware");
// const {
//   generatePayslip,
//   getPayslipsByEmployee,
//   getAllPayrolls,
// } = require("../controllers/payroll.controller");

// router.use(authenticate);

// router.post("/", authorize("ADMIN", "HR"), generatePayslip);
// router.get("/all", authorize("ADMIN", "HR"), getAllPayrolls);
// router.get("/:employeeId", getPayslipsByEmployee);

// module.exports = router;


const express = require("express");
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");
const {
  getPayrollSummary,
  generateAllPayslips,
  generatePayslip,
  getPayslipsByEmployee,
  getAllPayrolls,
} = require("../controllers/payroll.controller");

// 🔒 Global Auth Middleware: Enforces JWT authentication for all payroll endpoints
router.use(authenticate);

// 🛡️ Admin & HR Operations (Static & Processing Routes)
router.get("/summary", authorize("ADMIN", "HR"), getPayrollSummary);
router.get("/all", authorize("ADMIN", "HR"), getAllPayrolls);
router.post("/generate-all", authorize("ADMIN", "HR"), generateAllPayslips);
router.post("/", authorize("ADMIN", "HR"), generatePayslip);

// 👤 Employee Specific Routes (Dynamic parameter route placed last to avoid routing conflicts)
router.get("/:employeeId", getPayslipsByEmployee);

module.exports = router;