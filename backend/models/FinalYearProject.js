const mongoose = require('mongoose');

const finalYearProjectSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    studentName: {
      type: String,
      required: [true, 'Student name is required'],
      trim: true,
    },
    registerNumber: {
      type: String,
      required: [true, 'Register number is required'],
      trim: true,
      uppercase: true,
    },
    projectTitle: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
    },
    projectDescription: {
      type: String,
      trim: true,
      default: '',
    },
    technologyUsed: {
      type: String,
      trim: true,
      default: '',
    },
    projectGuide: {
      type: String,
      trim: true,
      default: '',
    },
    guideStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reportPdf: {
      type: String,
      default: '',
    },
    reportPdfOriginalName: {
      type: String,
      default: '',
    },
    submissionDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Submitted', 'Under Review', 'Approved', 'Revision Requested'],
      default: 'Submitted',
    },
  },
  {
    timestamps: true,
    collection: 'finalYearProjects',
  }
);

finalYearProjectSchema.index({ registerNumber: 1 });
finalYearProjectSchema.index({ studentId: 1 });
finalYearProjectSchema.index({ guideStaffId: 1 });

module.exports = mongoose.model('FinalYearProject', finalYearProjectSchema);
