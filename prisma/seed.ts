// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Demo user
  const passwordHash = await bcrypt.hash('demo1234', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@rhythmiq.app' },
    update: {},
    create: {
      email: 'demo@rhythmiq.app',
      name: 'Aathiya',
      passwordHash,
      wakeUpTime: '06:00',
      emailEnabled: true,
      streakWarning: true,
    },
  });

  console.log(`✓ Demo user: ${user.email}`);

  // Demo streak
  await prisma.streak.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, current: 12, best: 21, lastDate: new Date().toISOString().split('T')[0] },
  });

  // Default schedule slots
  const slots = [
    { title: 'Wake Up',         emoji: '🌅', startTime: '06:00', endTime: '06:05', tag: 'MORNING_ROUTINE', isAutoMark: true,  isStrict: false, strictMode: 'WARN', foodRequired: false, emailAlert: false, description: 'Rise and shine!',               checklist: [{ id: '1', label: 'Set alarm for tomorrow', required: false }, { id: '2', label: 'Morning stretch done', required: false }] },
    { title: 'Morning Routine', emoji: '🚿', startTime: '06:05', endTime: '07:30', tag: 'MORNING_ROUTINE', isAutoMark: true,  isStrict: false, strictMode: 'WARN', foodRequired: false, emailAlert: false, description: 'Hygiene & basics',              checklist: [{ id: '3', label: 'Brush & freshen up', required: false }, { id: '4', label: 'Make bed', required: false }] },
    { title: 'Breakfast',       emoji: '🍳', startTime: '07:30', endTime: '08:30', tag: 'BREAKFAST',       isAutoMark: false, isStrict: true,  strictMode: 'HARD', foodRequired: true,  emailAlert: false, description: 'Log food to continue',          checklist: [{ id: '5', label: 'Log food items', required: true }, { id: '6', label: 'Take vitamins', required: false }] },
    { title: 'College',         emoji: '🎓', startTime: '09:00', endTime: '16:00', tag: 'COLLEGE',         isAutoMark: false, isStrict: true,  strictMode: 'GRACE',foodRequired: false, emailAlert: true,  description: 'Classes & lectures',            checklist: [{ id: '7', label: 'Mark attendance', required: false }, { id: '8', label: 'Carry notes & ID', required: false }], isAcademic: true },
    { title: 'Self Study',      emoji: '📚', startTime: '16:30', endTime: '17:30', tag: 'SELF_STUDY',      isAutoMark: false, isStrict: true,  strictMode: 'WARN', foodRequired: false, emailAlert: true,  description: 'Revision + assignments',        checklist: [{ id: '9', label: 'Phone on DND', required: false }, { id: '10', label: 'Timer set', required: false }] },
    { title: 'Gym',             emoji: '💪', startTime: '18:00', endTime: '19:00', tag: 'GYM',             isAutoMark: false, isStrict: true,  strictMode: 'HARD', foodRequired: false, emailAlert: true,  description: '45 min strength training',      checklist: [{ id: '11', label: 'Workout clothes ready', required: false }, { id: '12', label: 'Water bottle filled', required: false }] },
    { title: 'Dinner',          emoji: '🍛', startTime: '20:00', endTime: '20:30', tag: 'DINNER',          isAutoMark: false, isStrict: true,  strictMode: 'WARN', foodRequired: true,  emailAlert: false, description: 'Eat well and wind down',        checklist: [{ id: '13', label: 'Log dinner items', required: true }] },
    { title: 'Wind Down',       emoji: '🌙', startTime: '22:00', endTime: '22:30', tag: 'MORNING_ROUTINE', isAutoMark: true,  isStrict: false, strictMode: 'WARN', foodRequired: false, emailAlert: false, description: 'Prepare for tomorrow',          checklist: [{ id: '14', label: "Tomorrow's plan ready", required: false }, { id: '15', label: 'Phone charged', required: false }] },
  ];

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    await prisma.scheduleSlot.upsert({
      where: { id: `seed-slot-${i}` },
      update: {},
      create: {
        id:          `seed-slot-${i}`,
        userId:      user.id,
        title:       s.title,
        emoji:       s.emoji,
        startTime:   s.startTime,
        endTime:     s.endTime,
        tag:         s.tag as any,
        isAutoMark:  s.isAutoMark,
        isStrict:    s.isStrict,
        strictMode:  s.strictMode as any,
        foodRequired:s.foodRequired,
        emailAlert:  s.emailAlert,
        description: s.description,
        checklist:   s.checklist as any,
        isAcademic:  (s as any).isAcademic || false,
        sortOrder:   i,
        repeatDays:  [1, 2, 3, 4, 5, 6, 7],
      },
    });
  }

  console.log(`✓ ${slots.length} schedule slots seeded`);

  // Demo academic timetable
  const tt = await prisma.academicTimetable.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId,
      slotStart: '09:00',
      slotEnd:   '16:00',
      parsedData: [] as any,
    },
  });

  const periods = [
    { subject: 'Compiler Design',          startTime: '09:30', endTime: '10:20', room: 'CS-201', dayOfWeek: [1,2,3,4,5], isLab: false, color: '#4A90D9' },
    { subject: 'Principles of Management', startTime: '10:25', endTime: '11:15', room: 'LH-101', dayOfWeek: [1,2,3,4,5], isLab: false, color: '#2DCB7A' },
    { subject: 'DBMS',                     startTime: '11:20', endTime: '12:10', room: 'CS-301', dayOfWeek: [1,3,5],     isLab: false, color: '#FF6B35' },
    { subject: 'Lunch Break',              startTime: '12:10', endTime: '13:00', room: '—',       dayOfWeek: [1,2,3,4,5], isLab: false, color: '#9A9A94' },
    { subject: 'Web Technology Lab',       startTime: '13:00', endTime: '15:50', room: 'Lab-2',  dayOfWeek: [2,4],       isLab: true,  color: '#9B59B6' },
    { subject: 'Compiler Design Lab',      startTime: '13:00', endTime: '15:50', room: 'Lab-1',  dayOfWeek: [1,3],       isLab: true,  color: '#4A90D9' },
    { subject: 'Data Structures',          startTime: '14:00', endTime: '14:50', room: 'CS-102', dayOfWeek: [5],         isLab: false, color: '#E74C3C' },
  ];

  for (const p of periods) {
    await prisma.academicPeriod.create({
      data: { timetableId: tt.id, ...p },
    }).catch(() => {}); // Skip if already exists
  }

  console.log(`✓ Academic timetable seeded with ${periods.length} periods`);
  console.log('\n🎉 Seed complete!');
  console.log('   Email:    demo@rhythmiq.app');
  console.log('   Password: demo1234');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
