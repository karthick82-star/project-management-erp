const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const User = require('../models/User');
const { protect, requireRole } = require('../middleware/auth');

// @route   GET /api/students
// @desc    Get all students (Admin: all, Staff: assigned only)
// @access  Private (Admin & Staff)
router.get('/', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const { search, department, batch, assignedStaff } = req.query;
    let query = {};

    if (department) {
      query.department = department;
    }

    if (batch) {
      query.batch = new RegExp(batch.trim(), 'i');
    }

    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { registerNumber: regex },
        { umisId: regex },
        { rollNumber: regex },
        { email: regex },
        { department: regex },
      ];
    }

    const students = await Student.find(query)
      .populate('assignedStaff', 'name email department phone')
      .sort({ registerNumber: 1 });

    res.json({ success: true, count: students.length, data: students });
  } catch (error) {
    console.error('[Get Students Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/students/profile/me
// @desc    Get current student's personal details
// @access  Private (Student only)
router.get('/profile/me', protect, requireRole('student'), async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.user._id }).populate(
      'assignedStaff',
      'name email department phone'
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/students/:id
// @desc    Get single student details by ID
// @access  Private (Admin, Staff for assigned, Student for self)
router.get('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate(
      'assignedStaff',
      'name email department phone'
    );

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (req.user.role === 'student' && String(student.userId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied. You cannot view another student profile.' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/students
// @desc    Create new student and student user account
// @access  Private (Admin & Staff)
router.post('/', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const {
      name,
      registerNumber,
      umisId,
      rollNumber,
      department,
      course,
      academicYear,
      batch,
      email,
      phone,
      gender,
      dob,
      assignedStaff,
      password,
    } = req.body;

    if (!name || !registerNumber || !department || !course || !academicYear || !batch || !email || !phone) {
      return res.status(400).json({ success: false, message: 'Please fill all required student details.' });
    }

    const regUpper = registerNumber.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    const cleanUmis = (umisId || '').trim();
    const cleanRoll = (rollNumber || cleanUmis || regUpper).trim().toUpperCase();

    // Check existing register number
    const regExists = await Student.findOne({ registerNumber: regUpper });
    if (regExists) {
      return res.status(400).json({ success: false, message: `Register Number '${regUpper}' already exists.` });
    }

    // Check existing user or student email
    const emailExists = await User.findOne({ email: cleanEmail });
    if (emailExists) {
      return res.status(400).json({ success: false, message: `Email '${cleanEmail}' is already registered.` });
    }

    // Create User account for student (default password is their UMIS ID or student123)
    const defaultPassword = password && password.length >= 6
      ? password
      : (cleanUmis.length >= 6 ? cleanUmis : 'student123');

    const user = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: defaultPassword,
      role: 'student',
      department: department.trim(),
      phone: phone.trim(),
    });

    // Create Student record
    const student = await Student.create({
      userId: user._id,
      name: name.trim(),
      registerNumber: regUpper,
      umisId: cleanUmis,
      rollNumber: cleanRoll,
      department: department.trim(),
      course: course.trim(),
      academicYear: academicYear.trim(),
      batch: batch.trim(),
      email: cleanEmail,
      phone: phone.trim(),
      gender: (gender || '').trim(),
      dob: (dob || '').trim(),
      assignedStaff: assignedStaff || null,
    });

    const populatedStudent = await Student.findById(student._id).populate(
      'assignedStaff',
      'name email department'
    );

    res.status(201).json({
      success: true,
      message: 'Student account and profile created successfully.',
      data: populatedStudent,
    });
  } catch (error) {
    console.error('[Create Student Error]', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/students/:id
// @desc    Update student details
// @access  Private (Admin & Staff for assigned)
router.put('/:id', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    let student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const {
      name,
      umisId,
      rollNumber,
      department,
      course,
      academicYear,
      batch,
      phone,
      gender,
      dob,
      assignedStaff,
      password,
    } = req.body;

    if (name) student.name = name.trim();
    if (umisId !== undefined) student.umisId = umisId.trim();
    if (rollNumber) student.rollNumber = rollNumber.trim().toUpperCase();
    if (department) student.department = department.trim();
    if (course) student.course = course.trim();
    if (academicYear) student.academicYear = academicYear.trim();
    if (batch) student.batch = batch.trim();
    if (phone) student.phone = phone.trim();
    if (gender !== undefined) student.gender = gender.trim();
    if (dob !== undefined) student.dob = dob.trim();

    // Only admin can change assigned staff
    if (req.user.role === 'admin' && assignedStaff !== undefined) {
      student.assignedStaff = assignedStaff || null;
    }

    await student.save();

    // If name or password updated, update corresponding User
    if (student.userId) {
      const user = await User.findById(student.userId);
      if (user) {
        if (name) user.name = name.trim();
        if (phone) user.phone = phone.trim();
        if (department) user.department = department.trim();
        if (password && password.length >= 6) {
          user.password = password;
        } else if (umisId && umisId.trim().length >= 6) {
          user.password = umisId.trim();
        }
        await user.save();
      }
    }

    const updated = await Student.findById(student._id).populate('assignedStaff', 'name email department');
    res.json({ success: true, message: 'Student updated successfully.', data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/students/:id
// @desc    Delete student record and user account
// @access  Private (Admin & Staff)
router.delete('/:id', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    if (student.userId) {
      await User.findByIdAndDelete(student.userId);
    }

    await Student.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Student and linked account deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
