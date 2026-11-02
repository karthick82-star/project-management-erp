const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');

// Protect routes via JWT
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    // For browser downloads where header cannot be set directly
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized. Please log in.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_college_erp_jwt_key_2026_xyz';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is currently deactivated.' });
    }

    req.user = user;

    // If user is a student, also attach student doc to req.student
    if (user.role === 'student') {
      const student = await Student.findOne({ userId: user._id });
      req.student = student;
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
};

// Require specific roles
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user?.role}' is not authorized to access this resource.`,
      });
    }
    next();
  };
};

// Check if staff has access to a student (Admin can access all, Staff only assigned)
const verifyStudentAccess = async (user, studentId) => {
  if (user.role === 'admin') return true;
  if (user.role === 'staff') {
    const student = await Student.findById(studentId);
    if (!student) return false;
    return String(student.assignedStaff) === String(user._id);
  }
  if (user.role === 'student') {
    const student = await Student.findById(studentId);
    if (!student) return false;
    return String(student.userId) === String(user._id);
  }
  return false;
};

module.exports = {
  protect,
  requireRole,
  verifyStudentAccess,
};
