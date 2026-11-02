const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const dotenvPath = fs.existsSync(path.join(__dirname, '..', '.env'))
  ? path.join(__dirname, '..', '.env')
  : path.join(__dirname, '..', '..', '.env');
require('dotenv').config({ path: dotenvPath });

const connectDB = require('../config/db');
const User = require('../models/User');
const Student = require('../models/Student');
const FinalYearProject = require('../models/FinalYearProject');
const InternshipReport = require('../models/InternshipReport');
const SemesterMark = require('../models/SemesterMark');
const CiaMark = require('../models/CiaMark');

const hashPassword = async (pass) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pass, salt);
};

const runMigration = async () => {
  try {
    console.log('[Migration] Starting College ERP migration and verification...');
    await connectDB();

    // Ensure uploads directory exists
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Place a sample PDF in uploads for reports if not present
    const samplePdfDest = path.join(uploadsDir, 'sample_report.pdf');
    const existingTestPdf = path.resolve(__dirname, '..', 'test.pdf');
    const existingDocPdf = path.resolve(
      __dirname,
      '..',
      '..',
      'frontend',
      'document',
      'Cybersecurity Essentials for Beginners_ A Technical Deep Dive.pdf'
    );

    if (!fs.existsSync(samplePdfDest)) {
      if (fs.existsSync(existingDocPdf)) {
        fs.copyFileSync(existingDocPdf, samplePdfDest);
      } else if (fs.existsSync(existingTestPdf)) {
        fs.copyFileSync(existingTestPdf, samplePdfDest);
      } else {
        fs.writeFileSync(samplePdfDest, '%PDF-1.4 College ERP Sample Document');
      }
    }

    // ── 1. MIGRATE & ENSURE USERS ──────────────────────────────────────
    console.log('[Migration] Checking Users collection...');

    // Convert any legacy 'faculty' role to 'staff' in users
    const facultyUpdated = await User.updateMany({ role: 'faculty' }, { $set: { role: 'staff' } });
    if (facultyUpdated.modifiedCount > 0) {
      console.log(`[Migration] Updated ${facultyUpdated.modifiedCount} legacy faculty accounts to 'staff'.`);
    }

    // Ensure Admin account
    let adminUser = await User.findOne({ email: 'admin@college.edu' });
    if (!adminUser) {
      const legacyAdmin = await User.findOne({ role: 'admin' });
      if (legacyAdmin) {
        adminUser = legacyAdmin;
        legacyAdmin.password = 'admin123';
        await legacyAdmin.save();
        console.log(`[Migration] Found existing admin ${legacyAdmin.email}, updated password to 'admin123'`);
      } else {
        adminUser = await User.create({
          name: 'College Administrator',
          email: 'admin@college.edu',
          password: 'admin123',
          role: 'admin',
          department: 'Administration',
          phone: '9876543210',
        });
        console.log('[Migration] Created demo admin: admin@college.edu / admin123');
      }
    } else {
      adminUser.password = 'admin123';
      await adminUser.save();
    }

    // Ensure Staff account
    let staffUser = await User.findOne({ email: 'staff@college.edu' });
    if (!staffUser) {
      const existingStaff = await User.findOne({ role: 'staff' });
      if (existingStaff) {
        staffUser = existingStaff;
        existingStaff.password = 'staff123';
        await existingStaff.save();
        console.log(`[Migration] Found existing staff ${existingStaff.email}, password updated to 'staff123'`);
      } else {
        staffUser = await User.create({
          name: 'HOD',
          email: 'staff@college.edu',
          password: 'staff123',
          role: 'staff',
          department: 'Computer Science with Cyber Security',
          phone: '9876543211',
        });
        console.log('[Migration] Created demo staff: staff@college.edu / staff123');
      }
    } else {
      staffUser.password = 'staff123';
      await staffUser.save();
    }

    // Ensure secondary staff members exist
    let staff2 = await User.findOne({ email: 'rajesh.kumar@campuserp.com' });
    if (!staff2) {
      staff2 = await User.create({
        name: 'Prof. Rajesh Kumar',
        email: 'rajesh.kumar@campuserp.com',
        password: 'staff123',
        role: 'staff',
        department: 'Electronics & Communication',
        phone: '9876543212',
      });
    } else {
      staff2.role = 'staff';
      staff2.password = 'staff123';
      await staff2.save();
    }

    let staff3 = await User.findOne({ email: 'anitha.rajan@campuserp.com' });
    if (!staff3) {
      staff3 = await User.create({
        name: 'Dr. Anitha Rajan',
        email: 'anitha.rajan@campuserp.com',
        password: 'staff123',
        role: 'staff',
        department: 'Mechanical Engineering',
        phone: '9876543213',
      });
    } else {
      staff3.role = 'staff';
      staff3.password = 'staff123';
    }

    // ── 2. MIGRATE & ENSURE STUDENTS ───────────────────────────────────
    console.log('[Migration] Checking Students collection...');
    const allExistingStudents = await Student.find();

    const sampleStudentList = [
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
      {
        name: 'Vikram Rajan',
        registerNumber: 'REG2023001',
        rollNumber: 'EC2023001',
        department: 'Electronics and Communication Engineering',
        course: 'B.E. Electronics and Communication Engineering',
        academicYear: '2023 - 2027',
        batch: '2023-2027',
        email: 'vikram.r@campuserp.com',
        phone: '9000000003',
        assignedStaff: staff2._id,
      },
      {
        name: 'Kavitha Nair',
        registerNumber: 'REG2023002',
        rollNumber: 'EC2023002',
        department: 'Electronics and Communication Engineering',
        course: 'B.E. Electronics and Communication Engineering',
        academicYear: '2023 - 2027',
        batch: '2023-2027',
        email: 'kavitha.n@campuserp.com',
        phone: '9000000004',
        assignedStaff: staff2._id,
      },
      {
        name: 'Suresh Babu',
        registerNumber: 'REG2024001',
        rollNumber: 'ME2024001',
        department: 'Mechanical Engineering',
        course: 'B.E. Mechanical Engineering',
        academicYear: '2024 - 2028',
        batch: '2024-2028',
        email: 'suresh.b@campuserp.com',
        phone: '9000000005',
        assignedStaff: staff3._id,
      },
      {
        name: 'Deepa Menon',
        registerNumber: 'REG2024002',
        rollNumber: 'IT2024002',
        department: 'Information Technology',
        course: 'B.Tech Information Technology',
        academicYear: '2024 - 2028',
        batch: '2024-2028',
        email: 'deepa.m@campuserp.com',
        phone: '9000000006',
        assignedStaff: staffUser._id,
      },
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

    for (const stuData of sampleStudentList) {
      let existingStu = await Student.findOne({
        $or: [{ registerNumber: stuData.registerNumber }, { email: stuData.email }],
      });
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
      } else {
        stuUser.password = 'student123';
        await stuUser.save();
      }

      if (!existingStu) {
        existingStu = await Student.create({
          ...stuData,
          userId: stuUser._id,
        });
        console.log(`[Migration] Created student: ${stuData.name} (${stuData.registerNumber})`);
      } else {
        // Ensure all required fields exist
        if (!existingStu.rollNumber) existingStu.rollNumber = stuData.rollNumber;
        if (!existingStu.course) existingStu.course = stuData.course;
        if (!existingStu.academicYear) existingStu.academicYear = stuData.academicYear;
        if (!existingStu.batch) existingStu.batch = stuData.batch;
        if (!existingStu.assignedStaff) existingStu.assignedStaff = stuData.assignedStaff;
        if (!existingStu.userId) existingStu.userId = stuUser._id;
        await existingStu.save();
      }
    }

    // Also update any other pre-existing students in MongoDB to have valid required fields
    for (const stu of allExistingStudents) {
      let changed = false;
      if (!stu.rollNumber) { stu.rollNumber = 'STU' + String(stu.registerNumber).replace(/\D/g, ''); changed = true; }
      if (!stu.course) { stu.course = `B.E. ${stu.department || 'Engineering'}`; changed = true; }
      if (!stu.academicYear) { stu.academicYear = '2022 - 2026'; changed = true; }
      if (!stu.batch) { stu.batch = '2022-2026'; changed = true; }
      if (!stu.assignedStaff) { stu.assignedStaff = staffUser._id; changed = true; }
      if (changed) await stu.save();
    }

    // ── 3. MIGRATE FINAL YEAR PROJECTS ─────────────────────────────────
    console.log('[Migration] Checking Final Year Projects...');
    const fypCount = await FinalYearProject.countDocuments();
    if (fypCount === 0) {
      // Check if old collection 'finalprojects' has data
      const db = mongoose.connection.db;
      const oldProjects = await db.collection('finalprojects').find().toArray();

      if (oldProjects && oldProjects.length > 0) {
        for (const op of oldProjects) {
          const regNum = (op.registerNumbers && op.registerNumbers[0]) || 'REG2022001';
          const stu = await Student.findOne({ registerNumber: regNum }) || (await Student.findOne());
          await FinalYearProject.create({
            studentId: stu._id,
            studentName: (op.teamMembers && op.teamMembers[0]) || stu.name,
            registerNumber: stu.registerNumber,
            projectTitle: op.projectTitle || 'AI-Powered College ERP System',
            projectDescription: op.description || 'Comprehensive project report',
            technologyUsed: Array.isArray(op.technologiesUsed) ? op.technologiesUsed.join(', ') : (op.technologiesUsed || 'Node.js, React, MongoDB'),
            projectGuide: op.guideName || 'Dr. Priya Sharma',
            guideStaffId: staffUser._id,
            reportPdf: 'sample_report.pdf',
            reportPdfOriginalName: `${stu.registerNumber}_Final_Year_Report.pdf`,
            submissionDate: op.createdAt || new Date(),
            status: 'Approved',
          });
        }
        console.log(`[Migration] Migrated ${oldProjects.length} projects from finalprojects collection.`);
      } else {
        // Seed default final year projects
        const arjun = await Student.findOne({ registerNumber: 'REG2022001' });
        const preethi = await Student.findOne({ registerNumber: 'REG2022002' });
        const vikram = await Student.findOne({ registerNumber: 'REG2023001' });

        if (arjun) {
          await FinalYearProject.create({
            studentId: arjun._id,
            studentName: arjun.name,
            registerNumber: arjun.registerNumber,
            projectTitle: 'AI-Powered Intelligent Campus ERP System',
            projectDescription: 'Enterprise Resource Planning software for academic management, project tracking and assessment grading with real-time analytics.',
            technologyUsed: 'React, Node.js, Express, MongoDB, Python',
            projectGuide: 'Dr. Priya Sharma',
            guideStaffId: staffUser._id,
            reportPdf: 'sample_report.pdf',
            reportPdfOriginalName: 'REG2022001_FinalYear_ERP_Report.pdf',
            submissionDate: new Date('2024-04-15'),
            status: 'Approved',
          });
        }

        if (preethi) {
          await FinalYearProject.create({
            studentId: preethi._id,
            studentName: preethi.name,
            registerNumber: preethi.registerNumber,
            projectTitle: 'Autonomous Drone Navigation Using Computer Vision',
            projectDescription: 'Real-time obstacle avoidance and path planning using deep learning computer vision on aerial quadcopters.',
            technologyUsed: 'Python, OpenCV, TensorFlow, ROS, Jetson Nano',
            projectGuide: 'Dr. Priya Sharma',
            guideStaffId: staffUser._id,
            reportPdf: 'sample_report.pdf',
            reportPdfOriginalName: 'REG2022002_Drone_Navigation_Report.pdf',
            submissionDate: new Date('2024-04-18'),
            status: 'Approved',
          });
        }

        if (vikram) {
          await FinalYearProject.create({
            studentId: vikram._id,
            studentName: vikram.name,
            registerNumber: vikram.registerNumber,
            projectTitle: 'IoT Based Smart Energy Microgrid Monitor',
            projectDescription: 'Wireless sensor network for monitoring microgrid power distribution and renewable energy solar panel optimization.',
            technologyUsed: 'Embedded C, MQTT, Raspberry Pi, InfluxDB, Grafana',
            projectGuide: 'Prof. Rajesh Kumar',
            guideStaffId: staff2._id,
            reportPdf: 'sample_report.pdf',
            reportPdfOriginalName: 'REG2023001_Smart_Grid_Report.pdf',
            submissionDate: new Date('2024-04-20'),
            status: 'Submitted',
          });
        }
        console.log('[Migration] Seeded initial Final-Year Project reports.');
      }
    }

    // ── 4. MIGRATE INTERNSHIP REPORTS ──────────────────────────────────
    console.log('[Migration] Checking Internship Reports...');
    const internCount = await InternshipReport.countDocuments();
    if (internCount === 0) {
      const db = mongoose.connection.db;
      const oldInternships = await db.collection('internshipprojects').find().toArray();

      if (oldInternships && oldInternships.length > 0) {
        for (const oi of oldInternships) {
          const stu = (await Student.findOne({ registerNumber: oi.registerNumber })) || (await Student.findOne());
          await InternshipReport.create({
            studentId: stu._id,
            studentName: oi.studentName || stu.name,
            registerNumber: stu.registerNumber,
            companyName: oi.companyName || 'Tata Consultancy Services',
            internshipDomain: oi.internshipDomain || 'Full Stack Web Development',
            projectTitle: oi.projectTitle || 'E-Commerce Platform Development',
            technologyUsed: Array.isArray(oi.technologiesUsed) ? oi.technologiesUsed.join(', ') : (oi.technologiesUsed || 'React, Node.js, MongoDB'),
            duration: '6 Months (Jan 2024 - Jun 2024)',
            completionStatus: oi.status === 'Completed' ? 'Completed' : 'In Progress',
            reportPdf: 'sample_report.pdf',
            reportPdfOriginalName: `${stu.registerNumber}_Internship_Report.pdf`,
            certificatePdf: 'sample_report.pdf',
            certificatePdfOriginalName: `${stu.registerNumber}_Internship_Certificate.pdf`,
            submissionDate: oi.createdAt || new Date(),
          });
        }
        console.log(`[Migration] Migrated ${oldInternships.length} internship reports.`);
      } else {
        const arjun = await Student.findOne({ registerNumber: 'REG2022001' });
        const preethi = await Student.findOne({ registerNumber: 'REG2022002' });
        const vikram = await Student.findOne({ registerNumber: 'REG2023001' });

        if (arjun) {
          await InternshipReport.create({
            studentId: arjun._id,
            studentName: arjun.name,
            registerNumber: arjun.registerNumber,
            companyName: 'Tata Consultancy Services (TCS)',
            internshipDomain: 'Cloud Computing & Full Stack Development',
            projectTitle: 'Enterprise Microservices & Cloud API Deployment',
            technologyUsed: 'React, Node.js, Docker, Kubernetes, AWS',
            duration: '6 Months (Jan 2024 - Jun 2024)',
            completionStatus: 'Completed',
            reportPdf: 'sample_report.pdf',
            reportPdfOriginalName: 'REG2022001_TCS_Internship_Report.pdf',
            certificatePdf: 'sample_report.pdf',
            certificatePdfOriginalName: 'REG2022001_TCS_Certificate.pdf',
            submissionDate: new Date('2024-06-25'),
          });
        }

        if (preethi) {
          await InternshipReport.create({
            studentId: preethi._id,
            studentName: preethi.name,
            registerNumber: preethi.registerNumber,
            companyName: 'Infosys Technologies',
            internshipDomain: 'Artificial Intelligence & Machine Learning',
            projectTitle: 'Predictive Sales Analytics ML Pipeline',
            technologyUsed: 'Python, Scikit-Learn, Pandas, Flask, Streamlit',
            duration: '4 Months (Feb 2024 - May 2024)',
            completionStatus: 'Completed',
            reportPdf: 'sample_report.pdf',
            reportPdfOriginalName: 'REG2022002_Infosys_Internship_Report.pdf',
            certificatePdf: 'sample_report.pdf',
            certificatePdfOriginalName: 'REG2022002_Infosys_Certificate.pdf',
            submissionDate: new Date('2024-05-30'),
          });
        }

        if (vikram) {
          await InternshipReport.create({
            studentId: vikram._id,
            studentName: vikram.name,
            registerNumber: vikram.registerNumber,
            companyName: 'Robert Bosch Engineering',
            internshipDomain: 'Embedded Systems & Industrial IoT',
            projectTitle: 'CAN-bus Telemetry Data Logger',
            technologyUsed: 'Embedded C, CANalyzer, STM32, FreeRTOS',
            duration: '3 Months (Jun 2024 - Aug 2024)',
            completionStatus: 'Completed',
            reportPdf: 'sample_report.pdf',
            reportPdfOriginalName: 'REG2023001_Bosch_Internship_Report.pdf',
            certificatePdf: 'sample_report.pdf',
            certificatePdfOriginalName: 'REG2023001_Bosch_Certificate.pdf',
            submissionDate: new Date('2024-08-28'),
          });
        }
        console.log('[Migration] Seeded initial Internship reports.');
      }
    }

    // ── 5. SEED SEMESTER MARKS ─────────────────────────────────────────
    console.log('[Migration] Checking Semester Marks...');
    const semMarkCount = await SemesterMark.countDocuments();
    if (semMarkCount === 0) {
      const allStudents = await Student.find();
      const semSubjects = [
        { code: 'CS8501', name: 'Theory of Computation', max: 100, obt: 88, sem: 5, year: '2023-2024' },
        { code: 'CS8591', name: 'Computer Networks', max: 100, obt: 92, sem: 5, year: '2023-2024' },
        { code: 'CS8592', name: 'Object Oriented Analysis & Design', max: 100, obt: 85, sem: 5, year: '2023-2024' },
        { code: 'EC8681', name: 'Microprocessors and Microcontrollers', max: 100, obt: 79, sem: 5, year: '2023-2024' },
        { code: 'CS8651', name: 'Internet Programming', max: 100, obt: 95, sem: 6, year: '2023-2024' },
        { code: 'CS8691', name: 'Artificial Intelligence', max: 100, obt: 90, sem: 6, year: '2023-2024' },
        { code: 'CS8601', name: 'Mobile Computing', max: 100, obt: 84, sem: 6, year: '2023-2024' },
      ];

      for (const stu of allStudents) {
        for (const sub of semSubjects) {
          // slight score variation per student
          const variation = (stu.name.length % 7) - 3;
          const obt = Math.min(sub.max, Math.max(45, sub.obt + variation));
          await SemesterMark.create({
            studentId: stu._id,
            studentName: stu.name,
            registerNumber: stu.registerNumber,
            batch: stu.batch || '2022-2026',
            semester: sub.sem,
            subjectCode: sub.code,
            subjectName: sub.name,
            maxMarks: sub.max,
            obtainedMarks: obt,
            resultStatus: obt >= 40 ? 'Pass' : 'Fail',
            academicYear: sub.year,
          });
        }
      }
      console.log(`[Migration] Seeded semester marks for ${allStudents.length} students.`);
    }

    // ── 6. SEED CIA MARKS (CIA 1, CIA 2, CIA 3) ────────────────────────
    console.log('[Migration] Checking CIA Marks (CIA 1, CIA 2, CIA 3)...');
    const ciaCount = await CiaMark.countDocuments();
    if (ciaCount === 0) {
      const allStudents = await Student.find();
      const ciaSubjects = [
        { code: 'CS8501', name: 'Theory of Computation', sem: 5 },
        { code: 'CS8591', name: 'Computer Networks', sem: 5 },
        { code: 'CS8592', name: 'Object Oriented Analysis & Design', sem: 5 },
        { code: 'CS8651', name: 'Internet Programming', sem: 6 },
        { code: 'CS8691', name: 'Artificial Intelligence', sem: 6 },
      ];

      const assessments = [
        { type: 'CIA 1', max: 50, base: 42, date: new Date('2024-02-15') },
        { type: 'CIA 2', max: 50, base: 45, date: new Date('2024-03-20') },
        { type: 'CIA 3', max: 50, base: 44, date: new Date('2024-04-22') },
      ];

      for (const stu of allStudents) {
        for (const asmt of assessments) {
          for (const sub of ciaSubjects) {
            const variation = (stu.registerNumber.slice(-1).charCodeAt(0) % 6) - 2;
            const obt = Math.min(asmt.max, Math.max(25, asmt.base + variation));
            await CiaMark.create({
              studentId: stu._id,
              studentName: stu.name,
              registerNumber: stu.registerNumber,
              assessmentType: asmt.type,
              semester: sub.sem,
              subjectCode: sub.code,
              subjectName: sub.name,
              maxMarks: asmt.max,
              obtainedMarks: obt,
              examDate: asmt.date,
              resultStatus: obt >= asmt.max * 0.5 ? 'Pass' : 'Fail',
            });
          }
        }
      }
      console.log(`[Migration] Seeded CIA 1, CIA 2, and CIA 3 marks for ${allStudents.length} students.`);
    }

    console.log('[Migration] Migration and verification completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('[Migration Error]', error);
    process.exit(1);
  }
};

runMigration();
