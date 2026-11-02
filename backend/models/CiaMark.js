const mongoose = require('mongoose');

const ciaMarkSchema = new mongoose.Schema(
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
    assessmentType: {
      type: String,
      required: [true, 'Assessment type is required'],
      enum: {
        values: ['CIA 1', 'CIA 2', 'CIA 3'],
        message: '{VALUE} is not a valid CIA assessment. Allowed: CIA 1, CIA 2, CIA 3',
      },
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
    },
    batch: {
      type: String,
      trim: true,
      default: '2024-2027',
    },
    academicYear: {
      type: String,
      trim: true,
      default: '2024 - 2027',
    },
    maxMarks: {
      type: Number,
      required: [true, 'Maximum marks is required'],
      default: 50,
      min: 1,
    },
    obtainedMarks: {
      type: Number,
      required: [true, 'Obtained marks is required'],
      min: 0,
      validate: {
        validator: function (val) {
          const max = this.maxMarks != null ? this.maxMarks : 50;
          return val <= max;
        },
        message: 'Obtained marks ({VALUE}) cannot exceed maximum marks',
      },
    },
    examDate: {
      type: Date,
      default: Date.now,
    },
    resultStatus: {
      type: String,
      required: [true, 'Result status is required'],
      enum: ['Pass', 'Fail'],
      default: function () {
        const passingThreshold = (this.maxMarks || 50) * 0.5;
        return this.obtainedMarks >= passingThreshold ? 'Pass' : 'Fail';
      },
    },
  },
  {
    timestamps: true,
    collection: 'ciaMarks',
  }
);

// Compound indexes to prevent duplication and ensure fast retrieval
ciaMarkSchema.index({ registerNumber: 1, assessmentType: 1, semester: 1, subjectCode: 1 });
ciaMarkSchema.index({ studentId: 1 });
ciaMarkSchema.index({ assessmentType: 1 });
ciaMarkSchema.index({ batch: 1 });
ciaMarkSchema.index({ semester: 1, assessmentType: 1 });

module.exports = mongoose.model('CiaMark', ciaMarkSchema);
