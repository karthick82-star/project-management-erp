# 🎓 College ERP — Academic Management System (MongoDB Edition)

A full-stack College ERP web application engineered with **Node.js**, **Express**, and **MongoDB (Mongoose)**, featuring a SaaS-grade responsive frontend (Vanilla HTML5, CSS3, JavaScript).

This system enforces strict **role-based access control (RBAC)** across three distinct user roles (**Admin**, **Staff**, **Student**) and retains strictly the **six required academic modules**, having purged all extraneous functionality (such as attendance, fees, library, hostel, transport, payroll, etc.).

---

## 📌 Table of Contents
1. [Key Architectural Highlights](#-key-architectural-highlights)
2. [User Roles & Access Control](#-user-roles--access-control)
3. [The 6 Core Academic Modules](#-the-6-core-academic-modules)
4. [MongoDB Database Schema & Collections](#-mongodb-database-schema--collections)
5. [Project Folder Structure](#-project-folder-structure)
6. [Prerequisites & Installation](#-prerequisites--installation)
7. [Environment Configuration](#-environment-configuration)
8. [Database Migration & Seeding](#-database-migration--seeding)
9. [Running the Application](#-running-the-application)
10. [Automated Verification Test Suite](#-automated-verification-test-suite)
11. [Demo Credentials](#-demo-credentials)
12. [Backend REST API Endpoints](#-backend-rest-api-endpoints)
13. [Security & Document Protection](#-security--document-protection)

---

## 🚀 Key Architectural Highlights

- **Database:** Engineered with a robust, persistent **MongoDB** backend using Mongoose ODM with schema validations, unique constraints, and compound indexes.
- **Strict Role-Based Authorization:** Backend authentication middleware verifies JWT bearer tokens and strictly authorizes access by role (`admin`, `staff`, `student`).
- **Staff-to-Student Assignment Enforcement:** Staff members can only view, manage, and enter marks for students assigned directly to them.
- **Student Ownership & Data Protection:** Students can only view their own profile, project reports, and marks. Students are strictly barred from modifying academic records or viewing records of other students.
- **Protected File Downloads:** Report PDFs and certificates are delivered through an authenticated backend stream (`/api/files/download/:filename` and `/api/files/preview/:filename`) that inspects authorization prior to file delivery.
- **Input & Mark Boundaries Validation:** Enforces strict boundary checks ensuring obtained marks never exceed configured maximum marks (`obtainedMarks <= maxMarks`).

---

## 👥 User Roles & Access Control

| Role | Access Scope | Key Capabilities |
|---|---|---|
| **Admin** | Full System Access (`admin-dashboard.html`) | Manage student details, staff accounts, assignments, final-year projects, internships, semester marks, and CIA 1/2/3 assessments. Access all academic records. |
| **Staff** | Assigned Students Only (`staff-dashboard.html`) | View assigned students, enter/update semester marks and CIA 1/2/3 marks for assigned students, review final-year and internship reports. Restricted from Admin settings. |
| **Student** | Personal Records Only (`student-dashboard.html`) | View personal profile, view/download own final-year project and internship report PDFs, view semester and CIA 1/2/3 marks. Read-only access to academic marks. |

---

## 📚 The 6 Core Academic Modules

### 1. Student Details
- **Attributes:** Student Name, Register Number (unique), Roll Number, Department, Course, Academic Year, Batch, Email, Phone Number, Assigned Staff Member.
- **Features:** Search by name/register number, department filter, batch filter, add/edit/delete modals.

### 2. Final-Year Project Report
- **Attributes:** Student Name, Register Number, Project Title, Project Description, Technology Used, Project Guide, Report PDF, Submission Date.
- **Features:** File upload with PDF/image validation, secure download, modal view, guide assignment.

### 3. Internship Project Report
- **Attributes:** Student Name, Register Number, Company Name, Internship Domain, Project Title, Technology Used, Duration, Completion Status, Report PDF, Completion Certificate.
- **Features:** Domain search/filter, completion status filter, multi-document upload.

### 4. Semester Mark List
- **Attributes:** Student Name, Register Number, Semester Number, Subject Code, Subject Name, Maximum Marks, Obtained Marks, Result Status (Pass/Fail/Pending), Academic Year.
- **Features:** Semester filter, auto result-status calculation, boundary validation (`obtainedMarks <= maxMarks`).

### 5. CIA 1 Mark List
- **Attributes:** Student Name, Register Number, Semester, Subject Code, Subject Name, Maximum Marks, Obtained Marks, Exam Date, Result Status.
- **Features:** Separate assessment collection (`ciaMarks` with `assessmentType: 'CIA 1'`), prevents mixing with other CIA exams.

### 6. CIA 2 & CIA 3 Mark Lists
- **Structure:** Identical to CIA 1, stored with distinct `assessmentType: 'CIA 2'` and `assessmentType: 'CIA 3'`.
- **Integrity:** Dedicated views and filters ensuring marks cannot be blended between assessments.

---

## 🗄️ MongoDB Database Schema & Collections

| Collection | Model Path | Purpose & Key Indexes |
|---|---|---|
| `users` | `backend/models/User.js` | Authentication credentials, bcrypt password hashes, roles (`admin`, `staff`, `student`). Unique index on `email`. |
| `students` | `backend/models/Student.js` | Complete student profile, reference to `assignedStaff` and `userId`. Unique index on `registerNumber`. |
| `finalYearProjects` | `backend/models/FinalYearProject.js` | FYP submissions, guide details, report PDF file path. Indexed on `studentId`, `registerNumber`. |
| `internshipReports` | `backend/models/InternshipReport.js` | Internship records, domains, report PDF, certificate file paths. Indexed on `studentId`, `domain`. |
| `semesterMarks` | `backend/models/SemesterMark.js` | Semester examination marks with validation. Compound index on `[studentId, semester, subjectCode]`. |
| `ciaMarks` | `backend/models/CiaMark.js` | CIA 1, CIA 2, and CIA 3 examination records. Compound index on `[studentId, assessmentType, subjectCode]`. |

---

## 📁 Project Folder Structure

```
college-erp/
├── backend/
│   ├── config/
│   │   └── db.js                        # Mongoose database connection
│   ├── middleware/
│   │   ├── auth.js                      # JWT auth, RBAC & staff-assignment verification
│   │   └── upload.js                    # Multer document upload (PDF/images, 15MB limit)
│   ├── models/
│   │   ├── User.js                      # User account model (bcrypt hashing)
│   │   ├── Student.js                   # Student profile model
│   │   ├── FinalYearProject.js          # FYP report model
│   │   ├── InternshipReport.js          # Internship report & certificate model
│   │   ├── SemesterMark.js              # Semester marks model
│   │   └── CiaMark.js                   # CIA 1, 2, 3 assessment marks model
│   ├── routes/
│   │   ├── authRoutes.js                # Login & /me verification
│   │   ├── studentRoutes.js             # Student CRUD & assigned queries
│   │   ├── staffRoutes.js               # Staff accounts & assignment stats
│   │   ├── finalYearProjectRoutes.js    # FYP report submissions & uploads
│   │   ├── internshipReportRoutes.js    # Internship reports & filtering
│   │   ├── markRoutes.js                # Semester & CIA 1/2/3 marks API
│   │   ├── statsRoutes.js               # Role-tailored dashboard metrics
│   │   └── fileRoutes.js                # Secure document preview & download stream
│   ├── scripts/
│   │   ├── migrateAndSeed.js            # Legacy data migration & initial seeder
│   │   └── testSuite.js                 # Automated integration test suite
│   ├── uploads/                         # Secure directory for uploaded project reports
│   │   └── sample_report.pdf            # Sample verification document
│   ├── .env                             # Active backend environment variables
│   ├── .env.example                     # Environment template file
│   ├── package.json                     # Backend dependencies and scripts
│   └── server.js                        # Express server entry point
│
├── frontend/
│   ├── css/
│   │   └── styles.css                   # Modern, responsive dashboard design system
│   ├── js/
│   │   ├── api.js                       # Centralized Fetch API client with Bearer tokens
│   │   ├── utils.js                     # Toast alerts, modals, formatters & UI helpers
│   │   ├── admin.js                     # Admin dashboard controller
│   │   ├── staff.js                     # Staff dashboard controller
│   │   └── student.js                   # Student dashboard controller
│   ├── document/                        # Academic resource documents & sample PDFs
│   ├── admin-dashboard.html             # Admin portal (6 modules + overview + staff)
│   ├── staff-dashboard.html             # Staff portal (assigned student records)
│   ├── student-dashboard.html           # Student portal (personal records & downloads)
│   ├── login.html                       # Multi-role authentication page
│   ├── index.html                       # Public landing page with role-based routing
│   └── package.json                     # Frontend scripts (serve / dev)
│
├── package.json                         # Root workspace scripts (start, dev, seed)
├── .gitignore                           # Git ignore rules for full project
└── README.md                            # Comprehensive documentation
```

---

## ⚙️ Prerequisites & Installation

### Prerequisites
- **Node.js** (v18.x or later recommended)
- **MongoDB** (Local instance on `mongodb://localhost:27017` or a MongoDB Atlas cloud URI)

### Installation Steps

1. **Clone or Navigate to the Project Directory:**
   ```bash
   cd college-erp
   ```

2. **Install Node Dependencies:**
   ```bash
   npm install
   ```

---

## 🔐 Environment Configuration

Create a `.env` file in the root directory (copied from `.env.example`):

```bash
cp .env.example .env
```

Configure the environment variables:

```ini
# Server Configuration
PORT=5000

# MongoDB Connection String (Local or MongoDB Atlas)
MONGODB_URI=mongodb://localhost:27017/campuserp

# JWT Secret Key for Session Authentication
JWT_SECRET=supersecret_college_erp_jwt_key_2026
```

---

## 🔄 Database Migration & Seeding

The project comes with a complete migration and seeder script that imports existing legacy records and seeds demo accounts with realistic academic data:

```bash
npm run seed
```

This populates:
- **3 Role Accounts:** Admin, Staff, Student
- **8 Enrolled Students** across CSE, ECE, MECH, and IT
- **Final-Year Projects** with guides and status
- **Internship Reports** across AI, Web Dev, and Cloud Computing
- **Semester Marks** (Semesters 1, 2, 3, 4) with auto-calculated Pass/Fail
- **CIA 1, CIA 2, and CIA 3 Marks** with maximum marks validations

---

## 🖥️ Running the Application

Start the Express + MongoDB server:

```bash
npm start
```

Or for development with automatic reload:

```bash
npm run dev
```

Open your browser and navigate to:
- **Landing Page:** [http://localhost:5000](http://localhost:5000)
- **Login Portal:** [http://localhost:5000/login.html](http://localhost:5000/login.html)
- **Admin Dashboard:** [http://localhost:5000/admin-dashboard.html](http://localhost:5000/admin-dashboard.html)
- **Staff Dashboard:** [http://localhost:5000/staff-dashboard.html](http://localhost:5000/staff-dashboard.html)
- **Student Dashboard:** [http://localhost:5000/student-dashboard.html](http://localhost:5000/student-dashboard.html)

---

## 🧪 Automated Verification Test Suite

Run the end-to-end integration test suite to verify role-based permissions, marks validation, and document protection:

```bash
node backend/scripts/testSuite.js
```

### Test Suite Coverage (28/28 Passing):
- ✅ Role-based login (Admin, Staff, Student) and portal mismatch blocking
- ✅ Admin & Staff dashboard summary metrics
- ✅ Module 1: Student details CRUD, staff filtering, and student self-profile
- ✅ Module 2: Final-year project uploads and student-only view
- ✅ Module 3: Internship reports, multi-document metadata, and domain filtering
- ✅ Module 4: Semester mark lists, boundary check (`obtainedMarks <= maxMarks`), student edit prevention
- ✅ Modules 5 & 6: CIA 1, CIA 2, and CIA 3 separate assessment isolation
- ✅ Protected document download stream and cross-student privacy enforcement (HTTP 403)

---

## 🔑 Demo Credentials

| Role | Email | Password | Assigned Scope / Details |
|---|---|---|---|
| **Admin** | `admin@college.edu` | `admin123` | Full administrative control over all 6 modules & accounts |
| **Staff** | `staff@college.edu` | `staff123` | Dr. Priya Sharma (CSE) — Assigned 3 students |
| **Student** | `student@college.edu` | `student123` | Arjun Krishnan (`REG2022001`) — Personal records only |

*Note: Legacy credentials `admin@campuserp.com` and `priya.sharma@campuserp.com` are also supported.*

---

## 📡 Backend REST API Endpoints

### Authentication
- `POST /api/auth/login` — Authenticate user and receive JWT bearer token
- `GET /api/auth/me` — Verify token and get current user profile

### Module 1: Students
- `GET /api/students` — List students (Admin: all; Staff: assigned only)
- `GET /api/students/me` — Student personal profile
- `POST /api/students` — Create new student profile & user account (Admin)
- `PUT /api/students/:id` — Update student details (Admin / Authorized Staff)
- `DELETE /api/students/:id` — Delete student record (Admin)

### Module 2: Final-Year Projects
- `GET /api/fyp` — List FYP records (Filtered by role / assignment)
- `POST /api/fyp` — Submit/update FYP report with PDF upload
- `PUT /api/fyp/:id` — Update FYP status & marks
- `DELETE /api/fyp/:id` — Remove FYP record (Admin)

### Module 3: Internship Reports
- `GET /api/internships` — List internship reports (Supports `?domain=` and `?status=`)
- `POST /api/internships` — Submit internship report and certificate files
- `PUT /api/internships/:id` — Update internship status
- `DELETE /api/internships/:id` — Remove internship record (Admin)

### Modules 4, 5 & 6: Marks
- `GET /api/marks/semester` — List semester marks
- `POST /api/marks/semester` — Add semester mark (`obtainedMarks <= maxMarks`)
- `PUT /api/marks/semester/:id` — Update semester mark
- `GET /api/marks/cia` — List CIA marks (`?assessmentType=CIA 1 | CIA 2 | CIA 3`)
- `POST /api/marks/cia` — Add CIA assessment mark with boundary check
- `PUT /api/marks/cia/:id` — Update CIA assessment mark

### Protected File Service
- `GET /api/files/download/:filename` — Download document with RBAC validation
- `GET /api/files/preview/:filename` — Preview document inline with RBAC validation

---

## 🛡️ Security & Document Protection

1. **Password Hashing:** Passwords are never stored in plaintext; salted with bcrypt (`bcryptjs`).
2. **Stateless JWT Authorization:** API requests require an `Authorization: Bearer <token>` header verified on each protected route.
3. **No Frontend-Only Security:** Access controls and assignment checks are enforced strictly in Express controller logic.
4. **Isolated Assessment Records:** CIA 1, CIA 2, and CIA 3 records cannot be overwritten or conflated due to schema level compound constraints.
5. **Private Document Storage:** Reports are stored in an unexposed upload directory and streamed exclusively through authenticated file endpoints.
