const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'super_secret_college_erp_jwt_key_2026_xyz';
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    secret,
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/login
// @desc    Authenticate user & get token (Supports Reg No + UMIS ID for students)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password, registerNumber, umisId, role } = req.body;

    const identifier = (email || registerNumber || '').trim();
    const secretKey = (password || umisId || '').trim();

    if (!identifier || !secretKey) {
      return res.status(400).json({ success: false, message: 'Please provide credentials to log in.' });
    }

    let user = null;
    let studentInfo = null;

    // Check if identifier is student registerNumber, UMIS ID, or email
    const studentDoc = await Student.findOne({
      $or: [
        { registerNumber: identifier.toUpperCase() },
        { umisId: identifier },
        { email: identifier.toLowerCase() },
      ],
    });

    if (studentDoc && studentDoc.userId) {
      studentInfo = studentDoc;
      user = await User.findById(studentDoc.userId);
    }

    // If not found via student, look up User by email (for admin / staff)
    if (!user) {
      user = await User.findOne({ email: identifier.toLowerCase() });
      if (user && user.role === 'student') {
        studentInfo = await Student.findOne({ userId: user._id });
      }
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid register number / email or password.' });
    }

    // Admin login has been removed - only Staff and Student roles are supported
    if (user.role === 'admin' || role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin login has been removed. Only Staff and Student logins are supported.',
      });
    }

    // Role verification
    if (role && user.role !== role) {
      return res.status(403).json({
        success: false,
        message: `Account found, but it is not registered as a '${role}'. Please switch to the correct portal tab.`,
      });
    }

    // Verify password:
    // 1) standard bcrypt password compare
    // 2) or if user is student: direct match with student's umisId or student123
    let isMatch = await user.comparePassword(secretKey);
    if (!isMatch && studentInfo) {
      if (studentInfo.umisId && studentInfo.umisId.trim() === secretKey) {
        isMatch = true;
      } else if (secretKey === 'student123') {
        isMatch = true;
      }
    }

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: user.role === 'student'
          ? 'Invalid credentials. Please use your Register Number as username and UMIS ID as password.'
          : 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact Admin.' });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        registerNumber: studentInfo ? studentInfo.registerNumber : '',
        umisId: studentInfo ? studentInfo.umisId : '',
      },
      student: studentInfo,
    });
  } catch (error) {
    console.error('[Auth Error]', error);
    res.status(500).json({ success: false, message: 'Server error during authentication: ' + error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    let studentData = null;
    if (req.user.role === 'student') {
      studentData = await Student.findOne({ userId: req.user._id }).populate('assignedStaff', 'name email department');
    }

    res.json({
      success: true,
      user: req.user,
      student: studentData,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
