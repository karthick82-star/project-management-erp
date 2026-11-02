const mongoose = require('mongoose');

const semesterMarkSchema = new mongoose.Schema(
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
    batch: {
      type: String,
      trim: true,
      default: '2022-2026',
    },
    semester: {
      type: Number,
      required: [true, 'Semester number is required'],
      min: 1,
      max: 8,
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
    },
    subjectName: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    subjectType: {
      type: String,
      enum: ['Theory', 'Practical'],
      default: 'Theory',
      trim: true,
    },
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks is required'],
      default: 100,
      min: 1,
    },
    obtainedMarks: {
      type: Number,
      required: [true, 'Obtained marks is required'],
      min: 0,
      validate: {
        validator: function (val) {
          const max = this.maxMarks != null ? this.maxMarks : 100;
          return val <= max;
        },
        message: 'Obtained marks ({VALUE}) cannot exceed maximum marks',
      },
    },
    resultStatus: {
      type: String,
      required: [true, 'Result status is required'],
      enum: ['Pass', 'Fail'],
      default: function () {
        const passingThreshold = (this.maxMarks || 100) * 0.4;
        return this.obtainedMarks >= passingThreshold ? 'Pass' : 'Fail';
      },
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
    collection: 'semesterMarks',
  }
);

semesterMarkSchema.index({ registerNumber: 1, semester: 1 });
semesterMarkSchema.index({ studentId: 1 });
semesterMarkSchema.index({ subjectCode: 1 });
semesterMarkSchema.index({ batch: 1 });
semesterMarkSchema.index({ batch: 1, semester: 1 });

module.exports = mongoose.model('SemesterMark', semesterMarkSchema);

