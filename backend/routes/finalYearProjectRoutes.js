const express = require('express');
const router = express.Router();
const FinalYearProject = require('../models/FinalYearProject');
const Student = require('../models/Student');
const upload = require('../middleware/upload');
const { protect, requireRole } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// @route   GET /api/final-projects
// @desc    Get all FYP reports (Role restricted)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, registerNumber } = req.query;
    let query = {};

    if (req.user.role === 'student') {
      if (!req.student) {
        return res.status(404).json({ success: false, message: 'Student record not linked.' });
      }
      query.registerNumber = req.student.registerNumber;
    }

    if (registerNumber && req.user.role !== 'student') {
      query.registerNumber = registerNumber.trim().toUpperCase();
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { studentName: regex },
        { registerNumber: regex },
        { projectTitle: regex },
        { projectGuide: regex },
        { technologyUsed: regex },
      ];
    }

    const projects = await FinalYearProject.find(query)
      .populate('studentId', 'name registerNumber department batch rollNumber umisId')
      .sort({ registerNumber: 1 });

    res.json({ success: true, count: projects.length, data: projects });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/final-projects/:id
// @desc    Get single FYP report
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const project = await FinalYearProject.findById(req.params.id).populate(
      'studentId',
      'name registerNumber department batch rollNumber assignedStaff'
    );

    if (!project) {
      return res.status(404).json({ success: false, message: 'Project report not found.' });
    }

    // Role check
    if (req.user.role === 'student' && project.registerNumber !== req.student?.registerNumber) {
      return res.status(403).json({ success: false, message: 'Access denied. You cannot view another student project.' });
    }

    res.json({ success: true, data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/final-projects
// @desc    Create/Upload FYP Report
// @access  Private (Admin & Staff)
router.post('/', protect, requireRole('admin', 'staff'), upload.single('reportPdf'), async (req, res) => {
  try {
    const {
      registerNumber,
      projectTitle,
      projectDescription,
      technologyUsed,
      projectGuide,
      submissionDate,
      status,
    } = req.body;

    if (!registerNumber || !projectTitle) {
      return res.status(400).json({ success: false, message: 'Register number and project title are required.' });
    }

    const regUpper = registerNumber.trim().toUpperCase();
    const student = await Student.findOne({ registerNumber: regUpper });

    if (!student) {
      return res.status(404).json({ success: false, message: `Student with Register Number ${regUpper} does not exist.` });
    }

    let reportPdf = '';
    let reportPdfOriginalName = '';
    if (req.file) {
      reportPdf = req.file.filename;
      reportPdfOriginalName = req.file.originalname;
    }

    const project = await FinalYearProject.create({
      studentId: student._id,
      studentName: student.name,
      registerNumber: regUpper,
      projectTitle: projectTitle.trim(),
      projectDescription: projectDescription ? projectDescription.trim() : '',
      technologyUsed: technologyUsed ? technologyUsed.trim() : '',
      projectGuide: projectGuide ? projectGuide.trim() : (req.user.role === 'staff' ? req.user.name : ''),
      guideStaffId: req.user.role === 'staff' ? req.user._id : null,
      reportPdf,
      reportPdfOriginalName,
      submissionDate: submissionDate || Date.now(),
      status: status || 'Submitted',
    });

    res.status(201).json({
      success: true,
      message: 'Final-year project report saved successfully.',
      data: project,
    });
  } catch (error) {
    console.error('[Create FYP Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/final-projects/:id
// @desc    Update FYP Report
// @access  Private (Admin & Staff)
router.put('/:id', protect, requireRole('admin', 'staff'), upload.single('reportPdf'), async (req, res) => {
  try {
    const project = await FinalYearProject.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project report not found.' });
    }

    const { projectTitle, projectDescription, technologyUsed, projectGuide, submissionDate, status } = req.body;

    if (projectTitle) project.projectTitle = projectTitle.trim();
    if (projectDescription !== undefined) project.projectDescription = projectDescription.trim();
    if (technologyUsed !== undefined) project.technologyUsed = technologyUsed.trim();
    if (projectGuide !== undefined) project.projectGuide = projectGuide.trim();
    if (submissionDate) project.submissionDate = submissionDate;
    if (status) project.status = status;

    if (req.file) {
      // Remove previous file if exists
      if (project.reportPdf) {
        const uploadsDir = fs.existsSync(path.resolve(__dirname, '..', 'uploads'))
          ? path.resolve(__dirname, '..', 'uploads')
          : path.resolve(__dirname, '..', '..', 'uploads');
        const oldPath = path.join(uploadsDir, project.reportPdf);
        if (fs.existsSync(oldPath)) {
          try { fs.unlinkSync(oldPath); } catch {}
        }
      }
      project.reportPdf = req.file.filename;
      project.reportPdfOriginalName = req.file.originalname;
    }

    await project.save();
    res.json({ success: true, message: 'Project report updated successfully.', data: project });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/final-projects/:id
// @desc    Delete FYP Report
// @access  Private (Admin & Staff)
router.delete('/:id', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const project = await FinalYearProject.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project report not found.' });
    }

    if (project.reportPdf) {
      const uploadsDir = fs.existsSync(path.resolve(__dirname, '..', 'uploads'))
        ? path.resolve(__dirname, '..', 'uploads')
        : path.resolve(__dirname, '..', '..', 'uploads');
      const filePath = path.join(uploadsDir, project.reportPdf);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch {}
      }
    }

    await FinalYearProject.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project report deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
