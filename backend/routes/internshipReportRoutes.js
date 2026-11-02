const express = require('express');
const router = express.Router();
const InternshipReport = require('../models/InternshipReport');
const Student = require('../models/Student');
const upload = require('../middleware/upload');
const { protect, requireRole } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

// @route   GET /api/internships
// @desc    Get all internship reports with search and filter
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { search, company, domain, completionStatus, registerNumber } = req.query;
    let query = {};

    if (req.user.role === 'student') {
      if (!req.student) {
        return res.status(404).json({ success: false, message: 'Student profile not linked.' });
      }
      query.registerNumber = req.student.registerNumber;
    }

    if (registerNumber && req.user.role !== 'student') {
      query.registerNumber = registerNumber.trim().toUpperCase();
    }

    if (company) {
      query.companyName = new RegExp(company.trim(), 'i');
    }

    if (domain) {
      query.internshipDomain = new RegExp(domain.trim(), 'i');
    }

    if (completionStatus) {
      query.completionStatus = completionStatus;
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { studentName: regex },
        { registerNumber: regex },
        { companyName: regex },
        { internshipDomain: regex },
        { projectTitle: regex },
        { technologyUsed: regex },
      ];
    }

    const internships = await InternshipReport.find(query)
      .populate('studentId', 'name registerNumber department batch rollNumber umisId')
      .sort({ registerNumber: 1 });

    res.json({ success: true, count: internships.length, data: internships });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/internships/:id
// @desc    Get single internship report
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const report = await InternshipReport.findById(req.params.id).populate(
      'studentId',
      'name registerNumber department batch rollNumber assignedStaff'
    );

    if (!report) {
      return res.status(404).json({ success: false, message: 'Internship report not found.' });
    }

    if (req.user.role === 'student' && report.registerNumber !== req.student?.registerNumber) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/internships
// @desc    Upload/Create Internship Report
// @access  Private (Admin & Staff)
router.post(
  '/',
  protect,
  requireRole('admin', 'staff'),
  upload.fields([
    { name: 'reportPdf', maxCount: 1 },
    { name: 'certificatePdf', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        registerNumber,
        companyName,
        internshipDomain,
        projectTitle,
        technologyUsed,
        duration,
        completionStatus,
        submissionDate,
      } = req.body;

      if (!registerNumber || !companyName || !internshipDomain || !projectTitle || !duration) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required fields: register number, company, domain, title, duration.',
        });
      }

      const regUpper = registerNumber.trim().toUpperCase();
      const student = await Student.findOne({ registerNumber: regUpper });

      if (!student) {
        return res.status(404).json({ success: false, message: `Student with Register Number ${regUpper} not found.` });
      }

      let reportPdf = '';
      let reportPdfOriginalName = '';
      let certificatePdf = '';
      let certificatePdfOriginalName = '';

      if (req.files && req.files.reportPdf && req.files.reportPdf[0]) {
        reportPdf = req.files.reportPdf[0].filename;
        reportPdfOriginalName = req.files.reportPdf[0].originalname;
      }

      if (req.files && req.files.certificatePdf && req.files.certificatePdf[0]) {
        certificatePdf = req.files.certificatePdf[0].filename;
        certificatePdfOriginalName = req.files.certificatePdf[0].originalname;
      }

      const report = await InternshipReport.create({
        studentId: student._id,
        studentName: student.name,
        registerNumber: regUpper,
        companyName: companyName.trim(),
        internshipDomain: internshipDomain.trim(),
        projectTitle: projectTitle.trim(),
        technologyUsed: technologyUsed ? technologyUsed.trim() : '',
        duration: duration.trim(),
        completionStatus: completionStatus || 'Completed',
        reportPdf,
        reportPdfOriginalName,
        certificatePdf,
        certificatePdfOriginalName,
        submissionDate: submissionDate || Date.now(),
      });

      res.status(201).json({
        success: true,
        message: 'Internship project report created successfully.',
        data: report,
      });
    } catch (error) {
      console.error('[Create Internship Error]', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// @route   PUT /api/internships/:id
// @desc    Update Internship Report
// @access  Private (Admin & Staff)
router.put(
  '/:id',
  protect,
  requireRole('admin', 'staff'),
  upload.fields([
    { name: 'reportPdf', maxCount: 1 },
    { name: 'certificatePdf', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const report = await InternshipReport.findById(req.params.id);
      if (!report) {
        return res.status(404).json({ success: false, message: 'Internship report not found.' });
      }

      const { companyName, internshipDomain, projectTitle, technologyUsed, duration, completionStatus, submissionDate } =
        req.body;

      if (companyName) report.companyName = companyName.trim();
      if (internshipDomain) report.internshipDomain = internshipDomain.trim();
      if (projectTitle) report.projectTitle = projectTitle.trim();
      if (technologyUsed !== undefined) report.technologyUsed = technologyUsed.trim();
      if (duration) report.duration = duration.trim();
      if (completionStatus) report.completionStatus = completionStatus;
      if (submissionDate) report.submissionDate = submissionDate;

      if (req.files) {
        if (req.files.reportPdf && req.files.reportPdf[0]) {
          const uploadsDir = fs.existsSync(path.resolve(__dirname, '..', 'uploads'))
            ? path.resolve(__dirname, '..', 'uploads')
            : path.resolve(__dirname, '..', '..', 'uploads');
          if (report.reportPdf) {
            const oldPath = path.join(uploadsDir, report.reportPdf);
            if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch {} }
          }
          report.reportPdf = req.files.reportPdf[0].filename;
          report.reportPdfOriginalName = req.files.reportPdf[0].originalname;
        }

        if (req.files.certificatePdf && req.files.certificatePdf[0]) {
          const uploadsDir = fs.existsSync(path.resolve(__dirname, '..', 'uploads'))
            ? path.resolve(__dirname, '..', 'uploads')
            : path.resolve(__dirname, '..', '..', 'uploads');
          if (report.certificatePdf) {
            const oldPath = path.join(uploadsDir, report.certificatePdf);
            if (fs.existsSync(oldPath)) { try { fs.unlinkSync(oldPath); } catch {} }
          }
          report.certificatePdf = req.files.certificatePdf[0].filename;
          report.certificatePdfOriginalName = req.files.certificatePdf[0].originalname;
        }
      }

      await report.save();
      res.json({ success: true, message: 'Internship report updated successfully.', data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// @route   DELETE /api/internships/:id
// @desc    Delete Internship Report
// @access  Private (Admin & Staff)
router.delete('/:id', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const report = await InternshipReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Internship report not found.' });
    }

    const uploadsDir = fs.existsSync(path.resolve(__dirname, '..', 'uploads'))
      ? path.resolve(__dirname, '..', 'uploads')
      : path.resolve(__dirname, '..', '..', 'uploads');
    const filesToRemove = [report.reportPdf, report.certificatePdf].filter(Boolean);
    filesToRemove.forEach((f) => {
      const p = path.join(uploadsDir, f);
      if (fs.existsSync(p)) { try { fs.unlinkSync(p); } catch {} }
    });

    await InternshipReport.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Internship report deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
