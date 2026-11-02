const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Student = require('../models/Student');
const { protect, requireRole } = require('../middleware/auth');

// @route   GET /api/staff
// @desc    Get all staff accounts
// @access  Private (Admin & Staff)
router.get('/', protect, requireRole('admin', 'staff'), async (req, res) => {
  try {
    const staffMembers = await User.find({ role: 'staff' })
      .select('-password')
      .sort({ name: 1 });

    // Also get count of assigned students for each staff
    const staffWithCounts = await Promise.all(
      staffMembers.map(async (st) => {
        const studentCount = await Student.countDocuments({ assignedStaff: st._id });
        return {
          ...st.toObject(),
          assignedStudentCount: studentCount,
        };
      })
    );

    res.json({ success: true, data: staffWithCounts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/staff
// @desc    Create new staff account
// @access  Private (Admin only)
router.post('/', protect, requireRole('admin'), async (req, res) => {
  try {
    const { name, email, password, department, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ success: false, message: `Email '${cleanEmail}' is already registered.` });
    }

    const staff = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password: password,
      role: 'staff',
      department: department ? department.trim() : '',
      phone: phone ? phone.trim() : '',
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully.',
      data: staff,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/staff/:id
// @desc    Update staff account
// @access  Private (Admin only)
router.put('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const { name, department, phone, password, isActive } = req.body;
    const staff = await User.findOne({ _id: req.params.id, role: 'staff' });

    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    if (name) staff.name = name.trim();
    if (department !== undefined) staff.department = department.trim();
    if (phone !== undefined) staff.phone = phone.trim();
    if (isActive !== undefined) staff.isActive = isActive;
    if (password && password.length >= 6) staff.password = password;

    await staff.save();
    res.json({ success: true, message: 'Staff account updated successfully.', data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/staff/:id
// @desc    Delete staff account
// @access  Private (Admin only)
router.delete('/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const staff = await User.findOne({ _id: req.params.id, role: 'staff' });
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    // Unassign this staff from students
    await Student.updateMany({ assignedStaff: staff._id }, { $set: { assignedStaff: null } });

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Staff account deleted and unassigned from students.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
