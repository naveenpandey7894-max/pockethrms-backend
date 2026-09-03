const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Master Data (Holidays & Leave Types)...');

  // 1. Create Default Master Leave Types
  const leaveTypesData = [
    { name: 'Casual Leave', maxDays: 8 },
    { name: 'CompOff', maxDays: 0 },
    { name: 'Covid Leave', maxDays: 0 },
    { name: 'Floating Leave', maxDays: 2 },
    { name: 'Paternity Leave', maxDays: 0 },
    { name: 'Vacation leave', maxDays: 12 },
  ];

  for (const lt of leaveTypesData) {
    await prisma.leaveType.upsert({
      where: { name: lt.name },
      update: { maxDays: lt.maxDays },
      create: lt,
    });
  }
  console.log('✅ Leave Types seeded successfully.');

  // 2. Create 2026 Holidays List
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
  console.log('✅ 2026 Holiday list seeded successfully.');

  console.log('🎉 Master database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Error inserting seed data:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });