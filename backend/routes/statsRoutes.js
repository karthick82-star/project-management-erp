const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const FinalYearProject = require('../models/FinalYearProject');
const InternshipReport = require('../models/InternshipReport');
const SemesterMark = require('../models/SemesterMark');
const CiaMark = require('../models/CiaMark');
const { protect } = require('../middleware/auth');

// @route   GET /api/stats
// @desc    Get dashboard summary statistics
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let studentCount = 0;
    let fypCount = 0;
    let internshipCount = 0;
    let semesterMarkCount = 0;
    let ciaMarkCount = 0;

    if (req.user.role === 'admin') {
      [studentCount, fypCount, internshipCount, semesterMarkCount, ciaMarkCount] = await Promise.all([
        Student.countDocuments(),
        FinalYearProject.countDocuments(),
        InternshipReport.countDocuments(),
        SemesterMark.countDocuments(),
        CiaMark.countDocuments(),
      ]);
    } else if (req.user.role === 'staff') {
      const deptFilter = req.user.department ? { department: req.user.department } : {};
      const deptStudents = await Student.find(deptFilter).select('registerNumber');
      const regNums = deptStudents.map((s) => s.registerNumber);
      studentCount = regNums.length;

      [fypCount, internshipCount, semesterMarkCount, ciaMarkCount] = await Promise.all([
        FinalYearProject.countDocuments({ registerNumber: { $in: regNums } }),
        InternshipReport.countDocuments({ registerNumber: { $in: regNums } }),
        SemesterMark.countDocuments({ registerNumber: { $in: regNums } }),
        CiaMark.countDocuments({ registerNumber: { $in: regNums } }),
      ]);
    } else if (req.user.role === 'student') {
      if (req.student) {
        const reg = req.student.registerNumber;
        studentCount = 1;
        [fypCount, internshipCount, semesterMarkCount, ciaMarkCount] = await Promise.all([
          FinalYearProject.countDocuments({ registerNumber: reg }),
          InternshipReport.countDocuments({ registerNumber: reg }),
          SemesterMark.countDocuments({ registerNumber: reg }),
          CiaMark.countDocuments({ registerNumber: reg }),
        ]);
      }
    }

    res.json({
      success: true,
      data: {
        totalStudents: studentCount,
        finalYearProjects: fypCount,
        internshipReports: internshipCount,
        semesterMarks: semesterMarkCount,
        ciaMarks: ciaMarkCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
