const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Default Department
  const dept = await prisma.department.upsert({
    where: { name: 'IT' },
    update: {},
    create: { name: 'IT' },
  });

  // 2. Create Default Designation
  let desig = await prisma.designation.findFirst({
    where: { name: 'Software Engineer', departmentId: dept.id },
  });

  if (!desig) {
    desig = await prisma.designation.create({
      data: {
        name: 'Software Engineer',
        departmentId: dept.id,
      },
    });
  }

  // 3. Create Default User
  const user = await prisma.user.upsert({
    where: { email: 'employee@pockethrms.com' },
    update: {},
    create: {
      name: 'John Doe',
      email: 'employee@pockethrms.com',
      password: 'password123',
      role: 'EMPLOYEE',
    },
  });

  // 🟢 4. Create / Get Employee (FIXED: Auto Auto-increment ID without Primary Key Collision)
  let employee = await prisma.employee.findUnique({
    where: { userId: user.id },
  });

  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        empCode: 'EMP002',
        userId: user.id,
        departmentId: dept.id,
        designationId: desig.id,
        phone: '9876543210',
        address: 'Indore, India',
      },
    });
  }

  // 🟢 5. Create Default Leave Types
  const leaveTypesData = [
    { name: 'Casual Leave', maxDays: 8 },
    { name: 'CompOff', maxDays: 0 },
    { name: 'Covid Leave', maxDays: 0 },
    { name: 'Floating Leave', maxDays: 2 },
    { name: 'Paternity Leave', maxDays: 0 },
    { name: 'Vacation leave', maxDays: 12 },
  ];

  const createdLeaveTypes = [];
  for (const lt of leaveTypesData) {
    const createdLt = await prisma.leaveType.upsert({
      where: { name: lt.name },
      update: { maxDays: lt.maxDays },
      create: lt,
    });
    createdLeaveTypes.push(createdLt);
  }

  // 🟢 6. Seed Initial Leave Balances for Employee
  const initialBalances = [
    { leaveTypeName: 'Casual Leave', opening: 0, credit: 8, debit: 0, used: 3.5, balance: 4.5 },
    { leaveTypeName: 'CompOff', opening: 0, credit: 0, debit: 0, used: 0, balance: 0 },
    { leaveTypeName: 'Covid Leave', opening: 0, credit: 0, debit: 0, used: 0, balance: 0 },
    { leaveTypeName: 'Floating Leave', opening: 0, credit: 2, debit: 0, used: 1, balance: 1 },
    { leaveTypeName: 'Paternity Leave', opening: 0, credit: 0, debit: 0, used: 0, balance: 0 },
    { leaveTypeName: 'Vacation leave', opening: 1.5, credit: 12, debit: 0, used: 0.5, balance: 13 },
  ];

  for (const bal of initialBalances) {
    const lt = createdLeaveTypes.find((t) => t.name === bal.leaveTypeName);
    if (lt) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId: {
            employeeId: employee.id,
            leaveTypeId: lt.id,
          },
        },
        update: {
          opening: bal.opening,
          credit: bal.credit,
          debit: bal.debit,
          used: bal.used,
          balance: bal.balance,
        },
        create: {
          employeeId: employee.id,
          leaveTypeId: lt.id,
          opening: bal.opening,
          credit: bal.credit,
          debit: bal.debit,
          used: bal.used,
          balance: bal.balance,
        },
      });
    }
  }

  // 7. Create 2026 Holidays List
  const actualHolidays2026 = [
    { name: 'Republic Day', date: new Date('2026-01-26') },
    { name: 'Maha Shivratri', date: new Date('2026-02-15') },
    { name: 'Holi', date: new Date('2026-03-04') },
    { name: 'Eid ul-Fitr', date: new Date('2026-03-20') },
    { name: 'Good Friday', date: new Date('2026-04-03') },
    { name: 'Ambedkar Jayanti', date: new Date('2026-04-14') },
    { name: 'Independence Day', date: new Date('2026-08-15') },
    { name: 'Ganesh Chaturthi', date: new Date('2026-09-14') },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02') },
    { name: 'Dussehra (Vijayadashami)', date: new Date('2026-10-20') },
    { name: 'Diwali (Deepavali)', date: new Date('2026-11-08') },
    { name: 'Guru Nanak Jayanti', date: new Date('2026-11-24') },
    { name: 'Christmas Day', date: new Date('2026-12-25') },
  ];

  await prisma.holiday.createMany({
    data: actualHolidays2026,
    skipDuplicates: true,
  });

  // 8. Seed Initial Notifications for Employee
  await prisma.notification.createMany({
    data: [
      {
        employeeId: employee.id,
        title: 'Welcome to PocketHRMS!',
        message: 'Your profile has been created. You can now mark attendance and apply for leaves.',
        type: 'general',
      },
      {
        employeeId: employee.id,
        title: 'Attendance Updated',
        message: 'Your attendance system is now live.',
        type: 'attendance',
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Database successfully seeded!');
}

main()
  .catch((e) => {
    console.error('Error inserting seed data:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });