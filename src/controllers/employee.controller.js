const prisma = require("../config/prisma");

// 🟢 Helper Function for Indian Standard Time (IST) Formatting
const formatISTDate = (dateObj) => {
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

// Helper function to format employee payload with IST timestamps
const formatEmployeeData = (employee) => {
  if (!employee) return null;
  return {
    ...employee,
    formattedCreatedAt: formatISTDate(employee.createdAt),
    formattedUpdatedAt: formatISTDate(employee.updatedAt),
    formattedJoiningDate: formatISTDate(employee.joiningDate),
    user: employee.user
      ? {
          ...employee.user,
          formattedCreatedAt: formatISTDate(employee.user.createdAt),
        }
      : null,
  };
};

// GET /api/employees
exports.getAllEmployees = async (req, res, next) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
        department: true,
        designation: true,
      },
      orderBy: { id: "asc" },
    });

    const formattedEmployees = employees.map((emp) => formatEmployeeData(emp));

    return res.status(200).json({
      success: true,
      data: formattedEmployees,
    });
  } catch (err) {
    console.error("Get All Employees Error:", err);
    next(err);
  }
};

// GET /api/employees/:id (Checks both Employee ID and User ID)
exports.getEmployeeById = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const parsedId = parseInt(rawId, 10);

    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Employee ID format",
      });
    }

    // Search by Employee ID OR User ID to prevent 404 mismatch
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id: parsedId }, { userId: parsedId }],
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
        department: true,
        designation: true,
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: formatEmployeeData(employee),
    });
  } catch (err) {
    console.error("Get Employee By ID Error:", err);
    next(err);
  }
};

// PUT /api/employees/:id
exports.updateEmployee = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const parsedId = parseInt(rawId, 10);

    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Employee ID format",
      });
    }

    const { phone, address, departmentId, designationId, status } = req.body;

    // Check if employee exists first
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        OR: [{ id: parsedId }, { userId: parsedId }],
      },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee record not found to update",
      });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: existingEmployee.id },
      data: {
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address }),
        ...(status !== undefined && { status }),
        ...(departmentId && !isNaN(parseInt(departmentId, 10)) && { departmentId: parseInt(departmentId, 10) }),
        ...(designationId && !isNaN(parseInt(designationId, 10)) && { designationId: parseInt(designationId, 10) }),
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
        department: true,
        designation: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: formatEmployeeData(updatedEmployee),
    });
  } catch (err) {
    console.error("Update Employee Error:", err);
    next(err);
  }
};

// DELETE /api/employees/:id
exports.deleteEmployee = async (req, res, next) => {
  try {
    const rawId = req.params.id;
    const parsedId = parseInt(rawId, 10);

    if (isNaN(parsedId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Employee ID format",
      });
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: {
        OR: [{ id: parsedId }, { userId: parsedId }],
      },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    await prisma.employee.delete({
      where: { id: existingEmployee.id },
    });

    return res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (err) {
    console.error("Delete Employee Error:", err);
    next(err);
  }
};