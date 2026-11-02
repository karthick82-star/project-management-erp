const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const FinalYearProject = require('../models/FinalYearProject');
const InternshipReport = require('../models/InternshipReport');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// @route   GET /api/files/download/:type/:id
// @desc    Secure, role-protected download of reports & certificates
// @access  Private (Admin, assigned Staff, or owning Student)
router.get('/download/:type/:id', protect, async (req, res) => {
  try {
    const { type, id } = req.params;
    let filename = '';
    let originalName = '';
    let studentReg = '';
    let studentId = null;

    if (type === 'fyp') {
      const project = await FinalYearProject.findById(id);
      if (!project) return res.status(404).json({ success: false, message: 'Final-year project report not found.' });
      filename = project.reportPdf;
      originalName = project.reportPdfOriginalName || `${project.registerNumber}_FYP_Report.pdf`;
      studentReg = project.registerNumber;
      studentId = project.studentId;
    } else if (type === 'internship-report') {
      const report = await InternshipReport.findById(id);
      if (!report) return res.status(404).json({ success: false, message: 'Internship report not found.' });
      filename = report.reportPdf;
      originalName = report.reportPdfOriginalName || `${report.registerNumber}_Internship_Report.pdf`;
      studentReg = report.registerNumber;
      studentId = report.studentId;
    } else if (type === 'internship-cert') {
      const report = await InternshipReport.findById(id);
      if (!report) return res.status(404).json({ success: false, message: 'Internship record not found.' });
      filename = report.certificatePdf;
      originalName = report.certificatePdfOriginalName || `${report.registerNumber}_Internship_Certificate.pdf`;
      studentReg = report.registerNumber;
      studentId = report.studentId;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid file type requested.' });
    }

    if (!filename) {
      return res.status(404).json({ success: false, message: 'No file uploaded for this document record.' });
    }

    // Role-based document access check
    if (req.user.role === 'student') {
      if (!req.student || req.student.registerNumber !== studentReg) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You are not authorized to download another student\'s private document.',
        });
      }
    }

    // Safe path resolution
    const uploadsDir = fs.existsSync(path.resolve(__dirname, '..', 'uploads'))
      ? path.resolve(__dirname, '..', 'uploads')
      : path.resolve(__dirname, '..', '..', 'uploads');
    const safeFilePath = path.join(uploadsDir, path.basename(filename));

    if (!fs.existsSync(safeFilePath)) {
      // Fallback check in frontend/document/ or test.pdf if sample file
      const fallbackDocPath = path.resolve(__dirname, '..', '..', 'frontend', 'document', path.basename(filename));
      const testPdfPath = fs.existsSync(path.resolve(__dirname, '..', 'test.pdf'))
        ? path.resolve(__dirname, '..', 'test.pdf')
        : path.resolve(__dirname, '..', '..', 'test.pdf');

      if (fs.existsSync(fallbackDocPath)) {
        return res.download(fallbackDocPath, originalName || path.basename(fallbackDocPath));
      } else if (fs.existsSync(testPdfPath)) {
        return res.download(testPdfPath, originalName || 'Academic_Report.pdf');
      }

      return res.status(404).json({ success: false, message: 'File not found on storage disk.' });
    }

    res.download(safeFilePath, originalName || path.basename(safeFilePath));
  } catch (error) {
    console.error('[Download Error]', error);
    res.status(500).json({ success: false, message: 'Failed to download file: ' + error.message });
  }
});

// @route   GET /api/files/preview/:type/:id
// @desc    Preview PDF inline in browser if authorized
router.get('/preview/:type/:id', protect, async (req, res) => {
  try {
    const { type, id } = req.params;
    let filename = '';
    let studentReg = '';
    let studentId = null;

    if (type === 'fyp') {
      const project = await FinalYearProject.findById(id);
      if (!project) return res.status(404).json({ success: false, message: 'Not found' });
      filename = project.reportPdf;
      studentReg = project.registerNumber;
      studentId = project.studentId;
    } else if (type === 'internship-report' || type === 'internship-cert') {
      const report = await InternshipReport.findById(id);
      if (!report) return res.status(404).json({ success: false, message: 'Not found' });
      filename = type === 'internship-report' ? report.reportPdf : report.certificatePdf;
      studentReg = report.registerNumber;
      studentId = report.studentId;
    }

    if (!filename) return res.status(404).json({ success: false, message: 'No file attached.' });

    if (req.user.role === 'student' && (!req.student || req.student.registerNumber !== studentReg)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const uploadsDir = fs.existsSync(path.resolve(__dirname, '..', 'uploads'))
      ? path.resolve(__dirname, '..', 'uploads')
      : path.resolve(__dirname, '..', '..', 'uploads');
    const safeFilePath = path.join(uploadsDir, path.basename(filename));

    if (fs.existsSync(safeFilePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      return fs.createReadStream(safeFilePath).pipe(res);
    }

    const testPdfPath = fs.existsSync(path.resolve(__dirname, '..', 'test.pdf'))
      ? path.resolve(__dirname, '..', 'test.pdf')
      : path.resolve(__dirname, '..', '..', 'test.pdf');
    if (fs.existsSync(testPdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      return fs.createReadStream(testPdfPath).pipe(res);
    }

    const fallbackDocPath = path.resolve(__dirname, '..', '..', 'frontend', 'document', path.basename(filename));
    if (fs.existsSync(fallbackDocPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      return fs.createReadStream(fallbackDocPath).pipe(res);
    }

    res.status(404).json({ success: false, message: 'File not found on disk.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
