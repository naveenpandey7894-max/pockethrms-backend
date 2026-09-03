// const express = require('express');
// const router = express.Router();

// const {
//   getNotificationsByEmployee,
//   markAsRead,
// } = require('../controllers/notification.controller');

// // Handlers
// router.get('/:employeeId', getNotificationsByEmployee);
// router.get('/employee/:employeeId', getNotificationsByEmployee);
// router.patch('/:id/read', markAsRead);

// module.exports = router;


const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require("../middlewares/auth.middleware");

const {
  getNotificationsByEmployee,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notification.controller');

// 🔒 Global Auth Middleware: Enforces JWT authentication for all notification endpoints
router.use(authenticate);

// 🟢 Specific & Multi-level Routes (Declared before generic dynamic parameters)
router.patch('/read-all/:employeeId', markAllAsRead);
router.get('/employee/:employeeId', getNotificationsByEmployee);

// 🟠 Generic Dynamic Parameter Routes
router.get('/:employeeId', getNotificationsByEmployee);
router.patch('/:id/read', markAsRead);

module.exports = router;