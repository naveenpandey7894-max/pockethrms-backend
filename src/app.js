// const express = require("express");
// const cors = require("cors");
// const morgan = require("morgan");

// const authRoutes = require("./routes/auth.routes");
// const employeeRoutes = require("./routes/employee.routes");
// const attendanceRoutes = require("./routes/attendance.routes");
// const leaveRoutes = require("./routes/leave.routes");
// const payrollRoutes = require("./routes/payroll.routes");
// const errorHandler = require("./middlewares/error.middleware");

// const app = express();

// app.use(cors());
// app.use(express.json());
// app.use(morgan("dev"));

// app.get("/api/health", (req, res) => res.json({ status: "OK" }));

// app.use("/api/auth", authRoutes);
// app.use("/api/employees", employeeRoutes);
// app.use("/api/attendance", attendanceRoutes);
// app.use("/api/leaves", leaveRoutes);
// app.use("/api/payroll", payrollRoutes);

// app.use((req, res) => res.status(404).json({ message: "Route not found" }));
// app.use(errorHandler);

// module.exports = app;



const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const employeeRoutes = require("./routes/employee.routes");
const attendanceRoutes = require("./routes/attendance.routes");
const leaveRoutes = require("./routes/leave.routes");
const payrollRoutes = require("./routes/payroll.routes");

// 🟢 NEW ROUTES IMPORT
const dashboardRoutes = require("./routes/dashboard.routes");
const notificationRoutes = require("./routes/notification.routes");

const errorHandler = require("./middlewares/error.middleware");

const app = express();
app.disable('etag')

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ status: "OK" }));

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/payroll", payrollRoutes);

// 🟢 NEW API ENDPOINTS
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found" }));
app.use(errorHandler);

module.exports = app;