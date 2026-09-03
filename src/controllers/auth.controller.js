
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const prisma = require("../config/prisma");

// // 🟢 FIX: Include employeeId directly inside JWT payload so protected routes get it
// function generateTokens(user) {
//   const payload = {
//     id: user.id,
//     email: user.email,
//     role: user.role,
//     employeeId: user.employee ? user.employee.id : null,
//   };

//   const accessToken = jwt.sign(
//     payload,
//     process.env.JWT_SECRET || 'secret',
//     { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
//   );

//   const refreshToken = jwt.sign(
//     payload,
//     process.env.JWT_REFRESH_SECRET || 'refreshSecret',
//     { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
//   );

//   return { accessToken, refreshToken };
// }

// // POST /api/auth/register (Admin/HR use karke naya user + employee banayenge)
// exports.register = async (req, res, next) => {
//   try {
//     const { name, email, password, role, empCode, departmentId, designationId, phone } = req.body;

//     // 1. Check if user already exists
//     const existing = await prisma.user.findUnique({ where: { email } });
//     if (existing) {
//       return res.status(400).json({ message: "Email already registered" });
//     }

//     // 2. Resolve Department ID safely
//     let targetDeptId = departmentId ? parseInt(departmentId, 10) : null;
//     if (targetDeptId) {
//       const deptExists = await prisma.department.findUnique({ where: { id: targetDeptId } });
//       if (!deptExists) targetDeptId = null;
//     }

//     if (!targetDeptId) {
//       const defaultDept = await prisma.department.upsert({
//         where: { name: 'IT' },
//         update: {},
//         create: { name: 'IT' },
//       });
//       targetDeptId = defaultDept.id;
//     }

//     // 3. Resolve Designation ID safely
//     let targetDesigId = designationId ? parseInt(designationId, 10) : null;
//     if (targetDesigId) {
//       const desigExists = await prisma.designation.findUnique({ where: { id: targetDesigId } });
//       if (!desigExists) targetDesigId = null;
//     }

//     if (!targetDesigId) {
//       let defaultDesig = await prisma.designation.findFirst({
//         where: { departmentId: targetDeptId },
//       });
//       if (!defaultDesig) {
//         defaultDesig = await prisma.designation.create({
//           data: {
//             name: 'Software Engineer',
//             departmentId: targetDeptId,
//           },
//         });
//       }
//       targetDesigId = defaultDesig.id;
//     }

//     // 4. Hash Password & Create User + Employee
//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await prisma.user.create({
//       data: {
//         name,
//         email,
//         password: hashedPassword,
//         role: role || "EMPLOYEE",
//         employee: {
//           create: {
//             empCode: empCode || `EMP${Date.now().toString().slice(-4)}`,
//             departmentId: targetDeptId,
//             designationId: targetDesigId,
//             phone: phone || "",
//           },
//         },
//       },
//       include: { employee: true },
//     });

//     const { password: _, ...userWithoutPassword } = user;
//     return res.status(201).json({
//       message: "User registered successfully",
//       user: userWithoutPassword,
//     });
//   } catch (err) {
//     console.error("Registration Error:", err);
//     next(err);
//   }
// };

// // POST /api/auth/login
// exports.login = async (req, res, next) => {
//   try {
//     const { email, password } = req.body;

//     const user = await prisma.user.findUnique({
//       where: { email },
//       include: { employee: true },
//     });

//     if (!user) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid email or password" });
//     }

//     const tokens = generateTokens(user);

//     return res.json({
//       message: "Login successful",
//       user: {
//         id: user.id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         employeeId: user.employee ? user.employee.id : null,
//       },
//       ...tokens,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

// // POST /api/auth/refresh
// exports.refresh = async (req, res, next) => {
//   try {
//     const { refreshToken } = req.body;
//     if (!refreshToken) return res.status(401).json({ message: "Refresh token required" });

//     jwt.verify(
//       refreshToken,
//       process.env.JWT_REFRESH_SECRET || 'refreshSecret',
//       async (err, decoded) => {
//         if (err) return res.status(403).json({ message: "Invalid or expired refresh token" });

//         // 🟢 FIX: Fetch fresh user & employee details from DB to maintain payload structure
//         const user = await prisma.user.findUnique({
//           where: { id: decoded.id },
//           include: { employee: true },
//         });

//         if (!user) return res.status(404).json({ message: "User no longer exists" });

//         const tokens = generateTokens(user);
//         return res.json({ accessToken: tokens.accessToken });
//       }
//     );
//   } catch (err) {
//     next(err);
//   }
// };

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

/**
 * Helper function to generate JWT Access and Refresh Tokens
 */
function generateTokens(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    employeeId: user.employee ? user.employee.id : null,
  };

  const accessToken = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.JWT_REFRESH_SECRET || 'refreshSecret',
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
}

/**
 * @route   POST /api/auth/register
 * @desc    Register a new User along with Employee, Department, and Designation profile
 * @access  Public / Admin / HR
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role, empCode, departmentId, designationId, phone } = req.body;

    const normalizedEmail = email?.toLowerCase().trim();
    const finalEmpCode = empCode?.trim() || `EMP${Date.now().toString().slice(-4)}`;
    const userRole = role || "EMPLOYEE";

    // 1. Verify if user email or empCode already exists
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const existingEmp = await prisma.employee.findUnique({ where: { empCode: finalEmpCode } });
    if (existingEmp) {
      return res.status(400).json({ message: "Employee Code already in use" });
    }

    // 2. Wrap creation in a Prisma Transaction
    const newUser = await prisma.$transaction(async (tx) => {
      // Determine default names based on role
      const defaultDeptName = userRole === "HR" ? "Human Resources" : "IT";
      const defaultDesigName = userRole === "HR" ? "HR Manager" : "Software Engineer";

      // Resolve Department
      let targetDeptId = departmentId ? parseInt(departmentId, 10) : null;
      if (targetDeptId) {
        const deptExists = await tx.department.findUnique({ where: { id: targetDeptId } });
        if (!deptExists) targetDeptId = null;
      }

      if (!targetDeptId) {
        const defaultDept = await tx.department.upsert({
          where: { name: defaultDeptName },
          update: {},
          create: { name: defaultDeptName },
        });
        targetDeptId = defaultDept.id;
      }

      // Resolve Designation
      let targetDesigId = designationId ? parseInt(designationId, 10) : null;
      if (targetDesigId) {
        const desigExists = await tx.designation.findUnique({ where: { id: targetDesigId } });
        if (!desigExists) targetDesigId = null;
      }

      if (!targetDesigId) {
        let defaultDesig = await tx.designation.findFirst({
          where: { name: defaultDesigName, departmentId: targetDeptId },
        });
        if (!defaultDesig) {
          defaultDesig = await tx.designation.create({
            data: {
              name: defaultDesigName,
              departmentId: targetDeptId,
            },
          });
        }
        targetDesigId = defaultDesig.id;
      }

      // Hash Password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create User & Employee
      return await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          password: hashedPassword,
          role: userRole,
          employee: {
            create: {
              empCode: finalEmpCode,
              departmentId: targetDeptId,
              designationId: targetDesigId,
              phone: phone || "",
            },
          },
        },
        include: {
          employee: {
            include: {
              designation: true,
              department: true,
            },
          },
        },
      });
    });

    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      message: "User registered successfully",
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("Registration Error:", err);
    next(err);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate via Email OR Employee Code (+ Optional Company Code)
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { email, userIdentifier, empCode, password, companyCode } = req.body;

    const loginInput = (userIdentifier || email || empCode || "").trim();

    if (!loginInput || !password) {
      return res.status(400).json({ message: "Please provide Email/EmpCode and Password" });
    }

    // Search with case-insensitivity (mode: 'insensitive')
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: loginInput, mode: 'insensitive' } },
          { employee: { empCode: { equals: loginInput, mode: 'insensitive' } } },
        ],
      },
      include: {
        employee: {
          include: {
            designation: true,
            department: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const tokens = generateTokens(user);

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyCode: companyCode || null,
        employeeId: user.employee ? user.employee.id : null,
        empCode: user.employee ? user.employee.empCode : null,
        designation: user.employee?.designation ? user.employee.designation.name : null,
        department: user.employee?.department ? user.employee.department.name : null,
      },
      ...tokens,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/refresh
 * @desc    Get new Access Token using valid Refresh Token
 * @access  Public
 */
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token required" });
    }

    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'refreshSecret',
      async (err, decoded) => {
        if (err) {
          return res.status(403).json({ message: "Invalid or expired refresh token" });
        }

        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
          include: { employee: true },
        });

        if (!user) {
          return res.status(404).json({ message: "User no longer exists" });
        }

        const tokens = generateTokens(user);
        return res.json({ accessToken: tokens.accessToken });
      }
    );
  } catch (err) {
    next(err);
  }
};