const prisma = require("../config/prisma");

// 🟢 Helper Function for Indian Standard Time (IST) Formatting
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

// GET /api/notifications/:employeeId
const getNotificationsByEmployee = async (req, res, next) => {
  try {
    const rawId = req.params.employeeId || req.params.id;
    const parsedId = parseInt(rawId, 10);

    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Employee ID format",
      });
    }

    // Check if employee exists by Employee ID or User ID
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id: parsedId }, { userId: parsedId }],
      },
    });

    const targetEmployeeId = employee ? employee.id : parsedId;

    const notifications = await prisma.notification.findMany({
      where: { employeeId: targetEmployeeId },
      orderBy: { createdAt: "desc" },
    });

    // 🟢 Format IST Timestamp for UI
    const formattedNotifications = notifications.map((item) => ({
      ...item,
      formattedCreatedAt: formatISTDateTime(item.createdAt),
    }));

    return res.status(200).json({
      success: true,
      data: formattedNotifications,
    });
  } catch (err) {
    console.error("Get Notifications Error:", err);
    if (next) return next(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Schema ID type dynamic handling (Int vs UUID String)
    const targetId = isNaN(id) ? id : parseInt(id, 10);

    const updatedNotification = await prisma.notification.update({
      where: { id: targetId },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: {
        ...updatedNotification,
        formattedCreatedAt: formatISTDateTime(updatedNotification.createdAt),
      },
    });
  } catch (err) {
    console.error("Mark As Read Error:", err);
    if (next) return next(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// 🟢 PATCH /api/notifications/read-all/:employeeId
const markAllAsRead = async (req, res, next) => {
  try {
    const rawId = req.params.employeeId;
    const parsedId = parseInt(rawId, 10);

    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Employee ID format",
      });
    }

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id: parsedId }, { userId: parsedId }],
      },
    });

    const targetEmployeeId = employee ? employee.id : parsedId;

    await prisma.notification.updateMany({
      where: { employeeId: targetEmployeeId, isRead: false },
      data: { isRead: true },
    });

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (err) {
    console.error("Mark All As Read Error:", err);
    if (next) return next(err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getNotificationsByEmployee,
  markAsRead,
  markAllAsRead,
};