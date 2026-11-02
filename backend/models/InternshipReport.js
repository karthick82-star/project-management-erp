const mongoose = require('mongoose');

const internshipReportSchema = new mongoose.Schema(
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
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    internshipDomain: {
      type: String,
      required: [true, 'Internship domain is required'],
      trim: true,
    },
    projectTitle: {
      type: String,
      required: [true, 'Internship project title is required'],
      trim: true,
    },
    technologyUsed: {
      type: String,
      trim: true,
      default: '',
    },
    duration: {
      type: String,
      required: [true, 'Internship duration is required'],
      trim: true,
    },
    completionStatus: {
      type: String,
      enum: ['Completed', 'In Progress', 'Submitted'],
      default: 'Completed',
    },
    reportPdf: {
      type: String,
      default: '',
    },
    reportPdfOriginalName: {
      type: String,
      default: '',
    },
    certificatePdf: {
      type: String,
      default: '',
    },
    certificatePdfOriginalName: {
      type: String,
      default: '',
    },
    submissionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'internshipReports',
  }
);

internshipReportSchema.index({ registerNumber: 1 });
internshipReportSchema.index({ companyName: 1 });
internshipReportSchema.index({ internshipDomain: 1 });
internshipReportSchema.index({ studentId: 1 });

module.exports = mongoose.model('InternshipReport', internshipReportSchema);
