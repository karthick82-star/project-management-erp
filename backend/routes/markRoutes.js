const express = require('express');
const router = express.Router();
const SemesterMark = require('../models/SemesterMark');
const CiaMark = require('../models/CiaMark');
const Student = require('../models/Student');
const { protect, requireRole } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════════
//  SEMESTER MARKS (Module 4)
// ════════════════════════════════════════════════════════════════

// @route   GET /api/marks/semester
// @desc    Get semester marks
// @access  Private
router.get('/semester', protect, async (req, res) => {
  try {
    const { semester, registerNumber, academicYear, batch, search } = req.query;
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

    if (semester) {
      query.semester = Number(semester);
    }

    if (academicYear) {
      query.academicYear = academicYear.trim();
    }

    if (batch) {
      const cleanBatch = batch.trim();
      const batchRegex = new RegExp(cleanBatch, 'i');
      const matchingStudents = await Student.find({ batch: batchRegex }).select('registerNumber _id');
      const regList = matchingStudents.map((s) => s.registerNumber);
      const stuIds = matchingStudents.map((s) => s._id);

      const batchCondition = {
        $or: [
          { batch: batchRegex },
          { registerNumber: { $in: regList } },
          { studentId: { $in: stuIds } },
        ],
      };

      if (query.$or) {
        query = { $and: [query, batchCondition] };
      } else {
        Object.assign(query, batchCondition);
      }
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      const searchCondition = {
        $or: [
          { studentName: regex },
          { registerNumber: regex },
          { subjectCode: regex },
          { subjectName: regex },
          { batch: regex },
        ],
      };
      if (query.$or || query.$and) {
        query = { $and: [query, searchCondition] };
      } else {
        Object.assign(query, searchCondition);
      }
    }

    const marks = await SemesterMark.find(query)
      .populate('studentId', 'batch department course umisId')
      .sort({ registerNumber: 1, semester: 1, subjectCode: 1 });

    const formattedMarks = marks.map((m) => {
      const obj = m.toObject();
      if (!obj.batch || obj.batch.trim() === '') {
        obj.batch = (m.studentId && m.studentId.batch) || '2022-2026';
      }
      return obj;
    });

    res.json({ success: true, count: formattedMarks.length, data: formattedMarks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/marks/semester/student-summary/:registerNumber/:semester
// @desc    Get aggregated student academic card & subject marks for a semester
// @access  Private
router.get('/semester/student-summary/:registerNumber/:semester', protect, async (req, res) => {
  try {
    const regUpper = req.params.registerNumber.trim().toUpperCase();
    const semNum = Number(req.params.semester);

    const student = await Student.findOne({ registerNumber: regUpper });
    if (!student) {
      return res.status(404).json({ success: false, message: `Student ${regUpper} not found.` });
    }

    if (req.user.role === 'student' && (!req.student || req.student.registerNumber !== regUpper)) {
      return res.status(403).json({ success: false, message: 'Access denied: You can only view your own marks.' });
    }

    const marks = await SemesterMark.find({ registerNumber: regUpper, semester: semNum }).sort({ subjectCode: 1 });

    const totalObtained = marks.reduce((sum, m) => sum + (Number(m.obtainedMarks) || 0), 0);
    const totalMax = marks.reduce((sum, m) => sum + (Number(m.maxMarks) || 0), 0) || 600;
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0';
    const hasFail = marks.some((m) => (m.resultStatus || '').toLowerCase() === 'fail' || m.obtainedMarks < (m.maxMarks * 0.4));
    const overallStatus = marks.length > 0 && !hasFail ? 'PASS' : 'FAIL';

    res.json({
      success: true,
      data: {
        studentName: student.name,
        registerNumber: student.registerNumber,
        rollNumber: student.rollNumber,
        department: student.department,
        course: student.course,
        academicYear: student.academicYear,
        batch: student.batch,
        gender: student.gender || '',
        dob: student.dob || '',
        umisId: student.umisId || '',
        semester: semNum,
        subjects: marks,
        totalMarks: totalObtained,
        totalMax: totalMax,
        percentage: percentage,
        overallStatus: overallStatus,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/marks/semester/pdf-view/:registerNumber/:semester
// @route   GET /api/marks/semester/pdf/:registerNumber/:semester
// @desc    Render printable HTML marklist matching student academic details screenshot
// @access  Private (Admin, Staff, or owning Student)
router.get(['/semester/pdf-view/:registerNumber/:semester', '/semester/pdf/:registerNumber/:semester'], protect, async (req, res) => {
  try {
    const regUpper = req.params.registerNumber.trim().toUpperCase();
    const semNum = Number(req.params.semester);

    const student = await Student.findOne({ registerNumber: regUpper });
    if (!student) {
      return res.status(404).send('<h3>Student not found.</h3>');
    }

    if (req.user.role === 'student' && (!req.student || req.student.registerNumber !== regUpper)) {
      return res.status(403).send('<h3>Access denied.</h3>');
    }

    const marks = await SemesterMark.find({ registerNumber: regUpper, semester: semNum }).sort({ subjectCode: 1 });

    const totalObtained = marks.reduce((sum, m) => sum + (Number(m.obtainedMarks) || 0), 0);
    const totalMax = marks.reduce((sum, m) => sum + (Number(m.maxMarks) || 0), 0) || 600;
    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : '0.0';
    const hasFail = marks.some((m) => (m.resultStatus || '').toLowerCase() === 'fail' || m.obtainedMarks < (m.maxMarks * 0.4));
    const overallStatus = marks.length > 0 && !hasFail ? 'PASS' : 'FAIL';

    const subjectRows = marks
      .map(
        (m) => `
        <tr>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: 500;">
            ${m.subjectName}
            <span style="display:block;font-size:11px;color:#64748b;font-family:monospace;">${m.subjectCode} · ${m.subjectType || 'Theory'}</span>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: center; color: #475569;">${m.maxMarks}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: 600; color: #0f172a;">${m.obtainedMarks}</td>
        </tr>
      `
      )
      .join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Semester ${semNum} Mark Details — ${student.name} (${student.registerNumber})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 20px;
    }
    .print-bar {
      width: 100%;
      max-width: 800px;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 20px;
    }
    .btn {
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid transparent;
    }
    .btn-primary { background: #16a34a; color: white; }
    .btn-primary:hover { background: #15803d; }
    .btn-secondary { background: #ffffff; border-color: #cbd5e1; color: #334155; }
    .btn-secondary:hover { background: #f1f5f9; }

    .card {
      background: #ffffff;
      width: 100%;
      max-width: 800px;
      border-radius: 20px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 25px rgba(0,0,0,0.04);
      padding: 40px 48px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
    }
    .header-title {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .sample-badge {
      background: #dcfce7;
      color: #15803d;
      font-size: 13px;
      font-weight: 600;
      padding: 4px 14px;
      border-radius: 20px;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px 48px;
      padding-bottom: 24px;
      border-bottom: 1px solid #f1f5f9;
      margin-bottom: 28px;
    }
    .meta-label {
      font-size: 13px;
      font-weight: 500;
      color: #64748b;
      margin-bottom: 4px;
    }
    .meta-value {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }
    .section-title {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    th {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      padding: 10px 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .summary-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-top: 20px;
      border-top: 1px solid #f1f5f9;
      margin-bottom: 20px;
    }
    .summary-group .label {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .total-val {
      font-size: 24px;
      font-weight: 800;
      color: #16a34a;
      line-height: 1.2;
    }
    .pct-val {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .status-badge {
      display: inline-block;
      margin-top: 10px;
      background: #dcfce7;
      color: #15803d;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      border-radius: 6px;
      letter-spacing: 0.04em;
    }
    .status-badge.fail {
      background: #fee2e2;
      color: #b91c1c;
    }
    .footer-note {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 14px;
    }
    @media print {
      body { background: white; padding: 0; }
      .print-bar { display: none !important; }
      .card { border: none !important; box-shadow: none !important; padding: 20px !important; }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="btn btn-secondary" onclick="window.close()">✕ Close</button>
    <button class="btn btn-primary" onclick="window.print()">🖨️ Print / Save Marksheet PDF</button>
  </div>

  <div class="card">
    <div class="header-row">
      <div class="header-title">Student Academic Details</div>
      <div class="sample-badge">Official Record</div>
    </div>

    <div class="meta-grid">
      <div>
        <div class="meta-label">Student Name</div>
        <div class="meta-value">${student.name}</div>
      </div>
      <div>
        <div class="meta-label">Course</div>
        <div class="meta-value">${student.course}</div>
      </div>
      <div>
        <div class="meta-label">Semester</div>
        <div class="meta-value">Semester ${semNum}</div>
      </div>
      <div>
        <div class="meta-label">Academic Year</div>
        <div class="meta-value">${student.academicYear || '2024–2027'}</div>
      </div>
    </div>

    <div class="section-title">Semester ${semNum} – Mark Details</div>

    <table>
      <thead>
        <tr>
          <th style="text-align: left;">Subject</th>
          <th style="text-align: center; width: 100px;">Max</th>
          <th style="text-align: right; width: 120px;">Obtained</th>
        </tr>
      </thead>
      <tbody>
        ${subjectRows || '<tr><td colspan="3" style="text-align:center;padding:24px;color:#94a3b8;">No marks recorded for this semester yet.</td></tr>'}
      </tbody>
    </table>

    <div class="summary-section">
      <div class="summary-group">
        <div class="label">Total Marks</div>
        <div class="total-val">${totalObtained}/${totalMax}</div>
        <div class="status-badge ${overallStatus === 'PASS' ? '' : 'fail'}">${overallStatus}</div>
      </div>
      <div class="summary-group" style="text-align: right;">
        <div class="label">Percentage</div>
        <div class="pct-val">${percentage}%</div>
      </div>
    </div>

    <div class="footer-note">Erode Arts and Science College (Autonomous) · Illustrative student marks record.</div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send(`<h3>Error: ${error.message}</h3>`);
  }
});

// @route   POST /api/marks/semester
// @desc    Add semester mark
// @access  Private (Admin & Staff)
router.post('/semester', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const {
      registerNumber,
      semester,
      subjectCode,
      subjectName,
      maxMarks,
      obtainedMarks,
      resultStatus,
      academicYear,
      batch,
      subjectType,
    } = req.body;

    if (
      !registerNumber ||
      !semester ||
      !subjectCode ||
      !subjectName ||
      maxMarks === undefined ||
      obtainedMarks === undefined ||
      !academicYear
    ) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields.' });
    }

    const regUpper = registerNumber.trim().toUpperCase();
    const student = await Student.findOne({ registerNumber: regUpper });

    if (!student) {
      return res.status(404).json({ success: false, message: `Student with Register Number ${regUpper} not found.` });
    }

    const numMax = Number(maxMarks);
    const numObt = Number(obtainedMarks);

    if (numObt > numMax) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Obtained marks (${numObt}) cannot exceed maximum marks (${numMax}).`,
      });
    }

    const finalStatus = resultStatus || (numObt >= numMax * 0.4 ? 'Pass' : 'Fail');
    const finalBatch = batch && batch.trim() !== '' ? batch.trim() : student.batch || '2022-2026';

    const mark = await SemesterMark.create({
      studentId: student._id,
      studentName: student.name,
      registerNumber: regUpper,
      batch: finalBatch,
      semester: Number(semester),
      subjectCode: subjectCode.trim().toUpperCase(),
      subjectName: subjectName.trim(),
      subjectType: subjectType && subjectType.trim() ? subjectType.trim() : 'Theory',
      maxMarks: numMax,
      obtainedMarks: numObt,
      resultStatus: finalStatus,
      academicYear: academicYear.trim(),
    });

    res.status(201).json({ success: true, message: 'Semester mark record added successfully.', data: mark });
  } catch (error) {
    console.error('[Add Semester Mark Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/marks/semester/:id
// @desc    Update semester mark
// @access  Private (Admin & Staff)
router.put('/semester/:id', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const mark = await SemesterMark.findById(req.params.id);
    if (!mark) {
      return res.status(404).json({ success: false, message: 'Semester mark record not found.' });
    }

    const { semester, subjectCode, subjectName, maxMarks, obtainedMarks, resultStatus, academicYear, batch, subjectType } = req.body;

    if (semester !== undefined) mark.semester = Number(semester);
    if (subjectCode) mark.subjectCode = subjectCode.trim().toUpperCase();
    if (subjectName) mark.subjectName = subjectName.trim();
    if (subjectType) mark.subjectType = subjectType.trim();
    if (academicYear) mark.academicYear = academicYear.trim();
    if (batch) mark.batch = batch.trim();

    if (maxMarks !== undefined) mark.maxMarks = Number(maxMarks);
    if (obtainedMarks !== undefined) mark.obtainedMarks = Number(obtainedMarks);

    if (mark.obtainedMarks > mark.maxMarks) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Obtained marks (${mark.obtainedMarks}) cannot exceed maximum marks (${mark.maxMarks}).`,
      });
    }

    if (resultStatus) {
      mark.resultStatus = resultStatus;
    } else {
      mark.resultStatus = mark.obtainedMarks >= mark.maxMarks * 0.4 ? 'Pass' : 'Fail';
    }

    await mark.save();
    res.json({ success: true, message: 'Semester mark updated successfully.', data: mark });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/marks/semester/:id
// @desc    Delete semester mark
// @access  Private (Admin & Staff)
router.delete('/semester/:id', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const mark = await SemesterMark.findByIdAndDelete(req.params.id);
    if (!mark) {
      return res.status(404).json({ success: false, message: 'Semester mark record not found.' });
    }
    res.json({ success: true, message: 'Semester mark record deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ════════════════════════════════════════════════════════════════
//  CIA MARKS (Module 5: CIA 1, Module 6: CIA 2 & CIA 3)
// ════════════════════════════════════════════════════════════════

// @route   GET /api/marks/cia
// @desc    Get CIA marks (filter by assessmentType: CIA 1, CIA 2, CIA 3)
// @access  Private
router.get('/cia', protect, async (req, res) => {
  try {
    const { assessmentType, semester, registerNumber, search, batch } = req.query;
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

    if (batch) {
      query.batch = new RegExp(batch.trim(), 'i');
    }

    if (assessmentType) {
      query.assessmentType = assessmentType;
    }

    if (semester) {
      query.semester = Number(semester);
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { studentName: regex },
        { registerNumber: regex },
        { subjectCode: regex },
        { subjectName: regex },
      ];
    }

    const marks = await CiaMark.find(query)
      .populate('studentId', 'umisId department')
      .sort({ registerNumber: 1, semester: 1, assessmentType: 1, subjectCode: 1 });
    res.json({ success: true, count: marks.length, data: marks });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper routes for direct CIA 1, CIA 2, CIA 3 retrieval
router.get('/cia1', protect, (req, res, next) => {
  req.query.assessmentType = 'CIA 1';
  next();
}, router.handle.bind(router));

router.get('/cia2', protect, (req, res, next) => {
  req.query.assessmentType = 'CIA 2';
  next();
}, router.handle.bind(router));

router.get('/cia3', protect, (req, res, next) => {
  req.query.assessmentType = 'CIA 3';
  next();
}, router.handle.bind(router));

// @route   POST /api/marks/cia
// @desc    Add CIA mark (CIA 1, CIA 2, or CIA 3)
// @access  Private (Admin & Staff)
router.post('/cia', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const {
      registerNumber,
      assessmentType,
      semester,
      subjectCode,
      subjectName,
      subjectType,
      batch,
      academicYear,
      maxMarks,
      obtainedMarks,
      examDate,
      resultStatus,
    } = req.body;

    if (!registerNumber || !assessmentType || !semester || !subjectCode || !subjectName || maxMarks === undefined || obtainedMarks === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide all required CIA mark fields.' });
    }

    const validTypes = ['CIA 1', 'CIA 2', 'CIA 3'];
    if (!validTypes.includes(assessmentType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid assessment type '${assessmentType}'. Allowed: CIA 1, CIA 2, CIA 3.`,
      });
    }

    const regUpper = registerNumber.trim().toUpperCase();
    const student = await Student.findOne({ registerNumber: regUpper });

    if (!student) {
      return res.status(404).json({ success: false, message: `Student with Register Number ${regUpper} not found.` });
    }

    const numMax = Number(maxMarks);
    const numObt = Number(obtainedMarks);

    if (numObt > numMax) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Obtained marks (${numObt}) cannot exceed maximum marks (${numMax}) for ${assessmentType}.`,
      });
    }

    const finalStatus = resultStatus || (numObt >= numMax * 0.5 ? 'Pass' : 'Fail');

    const mark = await CiaMark.create({
      studentId: student._id,
      studentName: student.name,
      registerNumber: regUpper,
      assessmentType: assessmentType,
      semester: Number(semester),
      subjectCode: subjectCode.trim().toUpperCase(),
      subjectName: subjectName.trim(),
      subjectType: subjectType && subjectType.trim() ? subjectType.trim() : 'Theory',
      batch: batch && batch.trim() ? batch.trim() : (student.batch || '2024-2027'),
      academicYear: academicYear && academicYear.trim() ? academicYear.trim() : (student.academicYear || '2024 - 2027'),
      maxMarks: numMax,
      obtainedMarks: numObt,
      examDate: examDate || Date.now(),
      resultStatus: finalStatus,
    });

    res.status(201).json({ success: true, message: `${assessmentType} mark record added successfully.`, data: mark });
  } catch (error) {
    console.error('[Add CIA Mark Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/marks/cia/:id
// @desc    Update CIA mark
// @access  Private (Admin & Staff)
router.put('/cia/:id', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const mark = await CiaMark.findById(req.params.id);
    if (!mark) {
      return res.status(404).json({ success: false, message: 'CIA mark record not found.' });
    }

    const { assessmentType, semester, subjectCode, subjectName, maxMarks, obtainedMarks, examDate, resultStatus, subjectType, batch, academicYear } =
      req.body;

    if (assessmentType) {
      if (!['CIA 1', 'CIA 2', 'CIA 3'].includes(assessmentType)) {
        return res.status(400).json({ success: false, message: 'Invalid assessment type.' });
      }
      mark.assessmentType = assessmentType;
    }

    if (semester !== undefined) mark.semester = Number(semester);
    if (subjectCode) mark.subjectCode = subjectCode.trim().toUpperCase();
    if (subjectName) mark.subjectName = subjectName.trim();
    if (subjectType) mark.subjectType = subjectType.trim();
    if (batch) mark.batch = batch.trim();
    if (academicYear) mark.academicYear = academicYear.trim();
    if (examDate) mark.examDate = examDate;

    if (maxMarks !== undefined) mark.maxMarks = Number(maxMarks);
    if (obtainedMarks !== undefined) mark.obtainedMarks = Number(obtainedMarks);

    if (mark.obtainedMarks > mark.maxMarks) {
      return res.status(400).json({
        success: false,
        message: `Validation error: Obtained marks (${mark.obtainedMarks}) cannot exceed maximum marks (${mark.maxMarks}).`,
      });
    }

    if (resultStatus) {
      mark.resultStatus = resultStatus;
    } else {
      mark.resultStatus = mark.obtainedMarks >= mark.maxMarks * 0.5 ? 'Pass' : 'Fail';
    }

    await mark.save();
    res.json({ success: true, message: `${mark.assessmentType} mark updated successfully.`, data: mark });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/marks/cia/:id
// @desc    Delete CIA mark
// @access  Private (Admin & Staff)
router.delete('/cia/:id', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const mark = await CiaMark.findByIdAndDelete(req.params.id);
    if (!mark) {
      return res.status(404).json({ success: false, message: 'CIA mark record not found.' });
    }
    res.json({ success: true, message: `${mark.assessmentType} mark record deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
