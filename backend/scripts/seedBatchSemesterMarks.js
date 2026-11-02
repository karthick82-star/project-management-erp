require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
require('dns').setServers(['8.8.8.8', '1.1.1.1']);

const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const SemesterMark = require('../models/SemesterMark');

async function seedBatchAndSemesterMarks() {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campuserp';
    console.log('[DB] Connecting to MongoDB...');
    await mongoose.connect(connStr);
    console.log('[DB] Connected successfully.');

    // 1. Ensure staff user
    let staffUser = await User.findOne({ role: 'staff' });
    if (!staffUser) {
      staffUser = await User.create({
        name: 'Dr. Priya Sharma',
        email: 'staff@college.edu',
        password: 'staff123',
        role: 'staff',
        department: 'Computer Science',
        phone: '9876543211',
      });
    }

    // 2. Ensure students for 2026, 2025, and 2024 batches
    const targetStudents = [
      // 2026 Batch (2022-2026)
      {
        name: 'Arjun Krishnan',
        registerNumber: 'REG2022001',
        rollNumber: 'CS2022001',
        department: 'Computer Science and Engineering',
        course: 'B.E. Computer Science and Engineering',
        academicYear: '2022 - 2026',
        batch: '2022-2026',
        email: 'student@college.edu',
        phone: '9000000001',
        assignedStaff: staffUser._id,
      },
      {
        name: 'Preethi Suresh',
        registerNumber: 'REG2022002',
        rollNumber: 'CS2022002',
        department: 'Computer Science and Engineering',
        course: 'B.E. Computer Science and Engineering',
        academicYear: '2022 - 2026',
        batch: '2022-2026',
        email: 'preethi.s@campuserp.com',
        phone: '9000000002',
        assignedStaff: staffUser._id,
      },
      // 2025 Batch (2021-2025)
      {
        name: 'Karthik Varma',
        registerNumber: 'REG2021001',
        rollNumber: 'CS2021001',
        department: 'Computer Science and Engineering',
        course: 'B.E. Computer Science and Engineering',
        academicYear: '2021 - 2025',
        batch: '2021-2025',
        email: 'karthik.v@campuserp.com',
        phone: '9000000007',
        assignedStaff: staffUser._id,
      },
      {
        name: 'Sneha Reddy',
        registerNumber: 'REG2021002',
        rollNumber: 'CS2021002',
        department: 'Computer Science and Engineering',
        course: 'B.E. Computer Science and Engineering',
        academicYear: '2021 - 2025',
        batch: '2021-2025',
        email: 'sneha.r@campuserp.com',
        phone: '9000000008',
        assignedStaff: staffUser._id,
      },
      // 2024 Batch (2020-2024)
      {
        name: 'Rahul Sharma',
        registerNumber: 'REG2020001',
        rollNumber: 'CS2020001',
        department: 'Computer Science and Engineering',
        course: 'B.E. Computer Science and Engineering',
        academicYear: '2020 - 2024',
        batch: '2020-2024',
        email: 'rahul.s@campuserp.com',
        phone: '9000000009',
        assignedStaff: staffUser._id,
      },
      {
        name: 'Divya Mohan',
        registerNumber: 'REG2020002',
        rollNumber: 'CS2020002',
        department: 'Computer Science and Engineering',
        course: 'B.E. Computer Science and Engineering',
        academicYear: '2020 - 2024',
        batch: '2020-2024',
        email: 'divya.m@campuserp.com',
        phone: '9000000010',
        assignedStaff: staffUser._id,
      },
    ];

    for (const stuData of targetStudents) {
      let stu = await Student.findOne({ registerNumber: stuData.registerNumber });
      let stuUser = await User.findOne({ email: stuData.email });

      if (!stuUser) {
        stuUser = await User.create({
          name: stuData.name,
          email: stuData.email,
          password: 'student123',
          role: 'student',
          department: stuData.department,
          phone: stuData.phone,
        });
      }

      if (!stu) {
        stu = await Student.create({
          ...stuData,
          userId: stuUser._id,
        });
        console.log(`[Student] Created student: ${stu.name} (${stu.registerNumber}) - Batch: ${stu.batch}`);
      } else {
        stu.batch = stuData.batch;
        stu.assignedStaff = staffUser._id;
        await stu.save();
        console.log(`[Student] Updated student: ${stu.name} (${stu.registerNumber}) - Batch: ${stu.batch}`);
      }
    }

    // 3. Backfill batch on any existing semester marks
    const existingMarks = await SemesterMark.find();
    console.log(`[SemesterMarks] Total existing records: ${existingMarks.length}`);
    for (const m of existingMarks) {
      const student = await Student.findOne({ registerNumber: m.registerNumber });
      if (student && (!m.batch || m.batch !== student.batch)) {
        m.batch = student.batch;
        await m.save();
      }
    }

    // 4. Subjects across Semesters 1 to 6
    const semesterSubjects = [
      { sem: 1, code: 'MA8151', name: 'Engineering Mathematics I', max: 100, base: 85, year: '2022-2023' },
      { sem: 1, code: 'GE8151', name: 'Problem Solving and Python Programming', max: 100, base: 92, year: '2022-2023' },
      { sem: 2, code: 'MA8251', name: 'Engineering Mathematics II', max: 100, base: 80, year: '2022-2023' },
      { sem: 2, code: 'CS8251', name: 'Programming in C and Data Structures', max: 100, base: 88, year: '2022-2023' },
      { sem: 3, code: 'CS8351', name: 'Digital Principles & System Design', max: 100, base: 84, year: '2023-2024' },
      { sem: 3, code: 'CS8392', name: 'Object Oriented Programming with Java', max: 100, base: 90, year: '2023-2024' },
      { sem: 4, code: 'CS8492', name: 'Database Management Systems', max: 100, base: 89, year: '2023-2024' },
      { sem: 4, code: 'CS8493', name: 'Operating Systems & System Architecture', max: 100, base: 86, year: '2023-2024' },
      { sem: 5, code: 'CS8501', name: 'Theory of Computation', max: 100, base: 87, year: '2024-2025' },
      { sem: 5, code: 'CS8591', name: 'Computer Networks', max: 100, base: 93, year: '2024-2025' },
      { sem: 6, code: 'CS8651', name: 'Internet Programming & Web Technologies', max: 100, base: 94, year: '2024-2025' },
      { sem: 6, code: 'CS8691', name: 'Artificial Intelligence & Machine Learning', max: 100, base: 91, year: '2024-2025' },
    ];

    // Seed/verify marks for all target students across Semesters 1 to 6
    for (const stuData of targetStudents) {
      const stu = await Student.findOne({ registerNumber: stuData.registerNumber });
      if (!stu) continue;

      for (const sub of semesterSubjects) {
        const existing = await SemesterMark.findOne({
          registerNumber: stu.registerNumber,
          semester: sub.sem,
          subjectCode: sub.code,
        });

        if (!existing) {
          const variation = (stu.name.length % 5) - 2;
          const obt = Math.min(sub.max, Math.max(50, sub.base + variation));
          await SemesterMark.create({
            studentId: stu._id,
            studentName: stu.name,
            registerNumber: stu.registerNumber,
            batch: stu.batch,
            semester: sub.sem,
            subjectCode: sub.code,
            subjectName: sub.name,
            maxMarks: sub.max,
            obtainedMarks: obt,
            resultStatus: obt >= 40 ? 'Pass' : 'Fail',
            academicYear: sub.year,
          });
          console.log(`[Mark] Added: ${stu.name} (${stu.batch}) Sem ${sub.sem} - ${sub.code}: ${obt}/${sub.max}`);
        } else if (!existing.batch || existing.batch !== stu.batch) {
          existing.batch = stu.batch;
          await existing.save();
        }
      }
    }

    const finalCount = await SemesterMark.countDocuments();
    console.log(`[Success] Seeding complete! Total semester marks in DB: ${finalCount}`);
    process.exit(0);
  } catch (err) {
    console.error('[Error] Seeding failed:', err);
    process.exit(1);
  }
}

seedBatchAndSemesterMarks();
