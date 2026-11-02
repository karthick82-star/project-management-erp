// ============================================================
//  backend/scripts/testSuite.js — Comprehensive Automated Test Suite
//  Validates 2024 Batch, Empty 2023/2025 Batches, Marklist PDF & Academic Cards
//  Exclusively for 2 Active Roles: Staff & Student (Admin Removed)
// ============================================================

const BASE_URL = 'http://localhost:5000/api';

async function request(endpoint, options = {}, token = null) {
  const headers = options.headers || {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    data = await res.text().catch(() => '');
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('🧪 Starting College ERP Verification Test Suite (Staff & Student Only)...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // ── 1. AUTHENTICATION TESTS ──────────────────────────────────
  console.log('--- 1. Testing Role-Based Logins ---');
  
  // Admin login attempt blocked (Admin role removed - only Staff & Student permitted)
  const adminRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@college.edu', password: 'admin123', role: 'admin' }),
  });
  assert(adminRes.status === 403, 'Admin login blocked with 403 Forbidden (Only Staff and Student roles supported)');

  // Staff login
  const staffRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'staff@college.edu', password: 'staff123', role: 'staff' }),
  });
  assert(staffRes.ok && staffRes.data.token && staffRes.data.user.role === 'staff', 'Staff login successful (staff@college.edu)');
  const staffToken = staffRes.data.token;

  // Student login (Karthick V - 24SCC4524)
  const studentRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'student@college.edu', password: 'student123', role: 'student' }),
  });
  assert(studentRes.ok && studentRes.data.token && studentRes.data.user.role === 'student', 'Student login successful (student@college.edu)');
  const studentToken = studentRes.data.token;

  // Student direct login with Register Number and UMIS ID (Karthick V: 24SCC4524 / 9002793020)
  const regNoLogin1 = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: '24SCC4524', password: '9002793020', role: 'student' }),
  });
  assert(regNoLogin1.ok && regNoLogin1.data.user.registerNumber === '24SCC4524', 'Student login using Register Number (24SCC4524) and UMIS ID (9002793020) successful');

  // Student direct login with Register Number and UMIS ID (Janani R: 24SCC4501 / 9002785471)
  const regNoLogin2 = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: '24SCC4501', password: '9002785471', role: 'student' }),
  });
  assert(regNoLogin2.ok && regNoLogin2.data.user.registerNumber === '24SCC4501', 'Student login using Register Number (24SCC4501) and UMIS ID (9002785471) successful');

  // Student direct login for Savitha V (24SCC4507 / 9002786068)
  const regNoLogin3 = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: '24SCC4507', password: '9002786068', role: 'student' }),
  });
  assert(regNoLogin3.ok && regNoLogin3.data.user.registerNumber === '24SCC4507', 'Student login using Register Number (24SCC4507) and UMIS ID (9002786068) successful');

  // Student direct login for Mithran V M (24SCC4533 / 9002783228)
  const regNoLogin4 = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: '24SCC4533', password: '9002783228', role: 'student' }),
  });
  assert(regNoLogin4.ok && regNoLogin4.data.user.registerNumber === '24SCC4533', 'Student login using Register Number (24SCC4533) and UMIS ID (9002783228) successful');

  // Role Mismatch Protection
  const mismatchRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'student@college.edu', password: 'student123', role: 'staff' }),
  });
  assert(mismatchRes.status === 403, 'Role mismatch blocked (student cannot log in via staff portal)');

  // ── 2. STATS & BATCH SPLIT VERIFICATION ──────────────────────
  console.log('\n--- 2. Testing Stats & 2024/2023/2025 Batch Split ---');
  const staffStats = await request('/stats', {}, staffToken);
  assert(
    staffStats.ok &&
    staffStats.data.data.totalStudents >= 42 &&
    staffStats.data.data.finalYearProjects >= 42 &&
    staffStats.data.data.internshipReports >= 42 &&
    staffStats.data.data.semesterMarks >= 1000,
    'Staff dashboard summary statistics retrieved (42 students, 42 FYP, 42 Internships, 1000+ marks)'
  );

  // 2024 batch filter -> 42 students
  const batch2024 = await request('/students?batch=2024', {}, staffToken);
  assert(
    batch2024.ok && batch2024.data.data.length === 42,
    `2024 Batch filter returns all 42 enrolled students (found: ${batch2024.data.data ? batch2024.data.data.length : 0})`
  );

  // 2023 batch filter -> 0 students (empty)
  const batch2023 = await request('/students?batch=2023', {}, staffToken);
  assert(
    batch2023.ok && batch2023.data.data.length === 0,
    `2023 Batch filter returns exactly 0 students (empty, found: ${batch2023.data.data ? batch2023.data.data.length : 0})`
  );

  // 2025 batch filter -> 0 students (empty)
  const batch2025 = await request('/students?batch=2025', {}, staffToken);
  assert(
    batch2025.ok && batch2025.data.data.length === 0,
    `2025 Batch filter returns exactly 0 students (empty, found: ${batch2025.data.data ? batch2025.data.data.length : 0})`
  );

  // ── 3. MODULE 1: STUDENT DETAILS & RESTRICTIONS ──────────────
  console.log('\n--- 3. Testing Module 1: Student Details & Access Control ---');
  const staffStudents = await request('/students', {}, staffToken);
  assert(staffStudents.ok && Array.isArray(staffStudents.data.data), 'Staff can view all students');

  // Verify ascending Register Number ordering
  const studentsList = staffStudents.data.data.filter(s => s.batch === '2024-2027');
  const isAscending = studentsList.every((s, idx) => idx === 0 || s.registerNumber >= studentsList[idx - 1].registerNumber);
  assert(isAscending && studentsList.length === 42, 'All 42 students are returned in strictly ascending Register Number order (24SCC4501 to 24SCC4545)');

  // Verify Savitha V (24SCC4507) is #7 and Mithran V M (24SCC4533) is #30
  assert(studentsList[6] && studentsList[6].registerNumber === '24SCC4507' && studentsList[6].name.toUpperCase().includes('SAVITHA'), 'Savitha V (24SCC4507) correctly ordered at position #7');
  assert(studentsList[29] && studentsList[29].registerNumber === '24SCC4533' && studentsList[29].name.toUpperCase().includes('MITHRAN'), 'Mithran V M (24SCC4533) correctly ordered at position #30');

  // Verify UMIS IDs are present for all students
  const allHaveUmis = studentsList.every(s => s.umisId && s.umisId.length >= 10);
  assert(allHaveUmis, 'All 42 students have valid 10-digit UMIS IDs stored and retrieved');

  assert(studentsList.length >= 42, 'Staff has verified access to all 42 departmental students');

  const studentBlock = await request('/students', {}, studentToken);
  assert(studentBlock.status === 403, 'Students are forbidden from viewing student directory');

  // Student personal profile
  const studentProfile = await request('/students/profile/me', {}, studentToken);
  assert(
    studentProfile.ok &&
    studentProfile.data.data.registerNumber === '24SCC4524' &&
    studentProfile.data.data.course === 'B.Sc. CS with Cyber Security',
    'Student authenticated to Karthick V profile (24SCC4524, B.Sc. CS with Cyber Security)'
  );

  // Staff CRUD for Student
  const testReg = 'TEST' + Math.floor(1000 + Math.random() * 9000);
  const testEmail = `test_${testReg.toLowerCase()}@college.edu`;
  const createStuRes = await request(
    '/students',
    {
      method: 'POST',
      body: JSON.stringify({
        name: 'Automated Test Student',
        registerNumber: testReg,
        rollNumber: 'ROLL_' + testReg,
        department: 'Computer Science with Cyber Security',
        course: 'B.Sc. CS with Cyber Security',
        academicYear: '2024 - 2027',
        batch: '2024-2027',
        email: testEmail,
        phone: '9876543299',
        assignedStaff: staffRes.data.user.id,
        password: 'teststudent123',
      }),
    },
    staffToken
  );
  assert(createStuRes.ok && createStuRes.data.data.registerNumber === testReg, 'Staff can create new student with user account');
  const createdStudentId = createStuRes.data.data._id;

  // Edit student
  const updateStuRes = await request(
    `/students/${createdStudentId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ phone: '9998887776' }),
    },
    staffToken
  );
  assert(updateStuRes.ok && updateStuRes.data.data.phone === '9998887776', 'Staff can update student details');

  // ── 4. MODULE 2: FINAL-YEAR PROJECT REPORTS ──────────────────
  console.log('\n--- 4. Testing Module 2: Final-Year Project Reports ---');
  const fypRes = await request('/final-projects', {}, staffToken);
  assert(fypRes.ok && Array.isArray(fypRes.data.data) && fypRes.data.data.length >= 42, 'Staff can view all 42 FYP reports');

  const studentFyp = await request('/final-projects', {}, studentToken);
  assert(
    studentFyp.ok &&
    studentFyp.data.data.length > 0 &&
    studentFyp.data.data.every((p) => p.registerNumber === '24SCC4524'),
    'Student sees only their own FYP report (24SCC4524)'
  );

  // ── 5. MODULE 3: INTERNSHIP PROJECT REPORTS ──────────────────
  console.log('\n--- 5. Testing Module 3: Internship Project Reports ---');
  const internRes = await request('/internships', {}, staffToken);
  assert(internRes.ok && Array.isArray(internRes.data.data) && internRes.data.data.length >= 42, 'Staff can view all 42 internship reports');

  const studentIntern = await request('/internships', {}, studentToken);
  assert(
    studentIntern.ok &&
    studentIntern.data.data.length > 0 &&
    studentIntern.data.data.every((i) => i.registerNumber === '24SCC4524'),
    'Student sees only their own internship reports (24SCC4524)'
  );

  // Filter test
  const filterDomain = await request('/internships?domain=Security', {}, staffToken);
  assert(filterDomain.ok, 'Internship reports can be filtered by domain');

  // ── 6. MODULE 4: SEMESTER MARKS & SCREENSHOT AGGREGATION ─────
  console.log('\n--- 6. Testing Module 4: Semester Marks & Exact Screenshot Aggregation ---');
  const semRes = await request('/marks/semester', {}, staffToken);
  assert(semRes.ok && Array.isArray(semRes.data.data) && semRes.data.data.length >= 1428, 'Staff can view all 1,428 semester marks');

  // Aggregated student academic details endpoint (Matches User Screenshot)
  const summaryRes = await request('/marks/semester/student-summary/24SCC4524/1', {}, studentToken);
  assert(
    summaryRes.ok &&
    summaryRes.data.success &&
    summaryRes.data.data.studentName.toUpperCase() === 'KARTHICK V' &&
    summaryRes.data.data.semester === 1 &&
    summaryRes.data.data.totalMarks === 507 &&
    summaryRes.data.data.totalMax === 600 &&
    summaryRes.data.data.percentage === '84.5' &&
    summaryRes.data.data.overallStatus === 'PASS' &&
    summaryRes.data.data.subjects.length === 6,
    'Aggregated Academic Summary exactly matches screenshot (507/600, 84.5%, PASS, 6 subjects)'
  );

  // Marklist PDF endpoint test
  const pdfRes = await request('/marks/semester/pdf-view/24SCC4524/1', {}, studentToken);
  assert(
    pdfRes.ok &&
    typeof pdfRes.data === 'string' &&
    pdfRes.data.includes('24SCC4524') &&
    pdfRes.data.toUpperCase().includes('KARTHICK V') &&
    pdfRes.data.includes('507') &&
    pdfRes.data.includes('84.5%'),
    'Marklist PDF HTML view rendered correctly with token auth and exact student academic marks'
  );

  // Max marks validation test
  const invalidMarkRes = await request(
    '/marks/semester',
    {
      method: 'POST',
      body: JSON.stringify({
        registerNumber: testReg,
        semester: 3,
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        maxMarks: 100,
        obtainedMarks: 110, // Invalid!
        academicYear: '2024-2025',
      }),
    },
    staffToken
  );
  assert(invalidMarkRes.status === 400, 'Validation prevents obtained marks (110) from exceeding max marks (100)');

  // Valid mark entry
  const validMarkRes = await request(
    '/marks/semester',
    {
      method: 'POST',
      body: JSON.stringify({
        registerNumber: testReg,
        semester: 3,
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        subjectType: 'Theory',
        maxMarks: 100,
        obtainedMarks: 88,
        academicYear: '2024-2025',
      }),
    },
    staffToken
  );
  assert(validMarkRes.ok && validMarkRes.data.data.resultStatus === 'Pass', 'Valid semester mark added with auto-Pass status');
  const semMarkId = validMarkRes.data.data._id;

  // Student cannot modify semester marks
  const studentModBlock = await request(
    `/marks/semester/${semMarkId}`,
    {
      method: 'PUT',
      body: JSON.stringify({ obtainedMarks: 99 }),
    },
    studentToken
  );
  assert(studentModBlock.status === 403, 'Students are forbidden from modifying semester marks');

  // ── 7. MODULE 5 & 6: CIA MARKS & SPLIT FILTERS ──────────────
  console.log('\n--- 7. Testing Module 5 & 6: CIA 1, CIA 2, CIA 3 Marks & Split Filters ---');
  
  // Total CIA records & Batch splits
  const ciaBatch2024 = await request('/marks/cia?batch=2024', {}, staffToken);
  assert(
    ciaBatch2024.ok && ciaBatch2024.data.data.length === 4284,
    `2024 Batch CIA query returns all 4,284 marks (found: ${ciaBatch2024.data.data ? ciaBatch2024.data.data.length : 0})`
  );

  const ciaBatch2023 = await request('/marks/cia?batch=2023', {}, staffToken);
  assert(
    ciaBatch2023.ok && ciaBatch2023.data.data.length === 0,
    `2023 Batch CIA query returns exactly 0 marks (empty, found: ${ciaBatch2023.data.data ? ciaBatch2023.data.data.length : 0})`
  );

  const ciaBatch2025 = await request('/marks/cia?batch=2025', {}, staffToken);
  assert(
    ciaBatch2025.ok && ciaBatch2025.data.data.length === 0,
    `2025 Batch CIA query returns exactly 0 marks (empty, found: ${ciaBatch2025.data.data ? ciaBatch2025.data.data.length : 0})`
  );

  // Semester & Assessment splits (Sem 1-6 & CIA 1, 2, 3)
  const sem1Cia1 = await request('/marks/cia?batch=2024&semester=1&assessmentType=CIA 1', {}, staffToken);
  assert(
    sem1Cia1.ok && sem1Cia1.data.data.length === 252,
    `Semester 1 CIA 1 returns exactly 252 records (42 students * 6 subjects, found: ${sem1Cia1.data.data ? sem1Cia1.data.data.length : 0})`
  );

  const sem2Cia2 = await request('/marks/cia?batch=2024&semester=2&assessmentType=CIA 2', {}, staffToken);
  assert(
    sem2Cia2.ok && sem2Cia2.data.data.length === 252,
    `Semester 2 CIA 2 returns exactly 252 records (42 students * 6 subjects, found: ${sem2Cia2.data.data ? sem2Cia2.data.data.length : 0})`
  );

  const sem6Cia3 = await request('/marks/cia?batch=2024&semester=6&assessmentType=CIA 3', {}, staffToken);
  assert(
    sem6Cia3.ok && sem6Cia3.data.data.length === 210,
    `Semester 6 CIA 3 returns exactly 210 records (42 students * 5 subjects, found: ${sem6Cia3.data.data ? sem6Cia3.data.data.length : 0})`
  );

  // Staff unconstrained access
  const staffCiaRes = await request('/marks/cia', {}, staffToken);
  assert(
    staffCiaRes.ok && staffCiaRes.data.data.length >= 4284,
    `Staff faculty has full access to all ${staffCiaRes.data.data ? staffCiaRes.data.data.length : 0} CIA marks across department`
  );

  const staffFypRes = await request('/final-projects', {}, staffToken);
  assert(
    staffFypRes.ok && staffFypRes.data.data.length >= 42,
    `Staff faculty has full access to all ${staffFypRes.data.data ? staffFypRes.data.data.length : 0} FYP reports across department`
  );

  const staffIntRes = await request('/internships', {}, staffToken);
  assert(
    staffIntRes.ok && staffIntRes.data.data.length >= 42,
    `Staff faculty has full access to all ${staffIntRes.data.data ? staffIntRes.data.data.length : 0} internship reports across department`
  );

  // Student isolated access (Karthick V: 102 marks = 34 subjects * 3 CIAs)
  const studentCiaRes = await request('/marks/cia', {}, studentToken);
  assert(
    studentCiaRes.ok &&
    studentCiaRes.data.data.length === 102 &&
    studentCiaRes.data.data.every(m => m.registerNumber === '24SCC4524'),
    'Student Karthick V receives exactly 102 CIA records (all 34 subjects * 3 CIAs across Sem 1-6)'
  );

  const studentSem1Cia1 = await request('/marks/cia?semester=1&assessmentType=CIA 1', {}, studentToken);
  assert(
    studentSem1Cia1.ok && studentSem1Cia1.data.data.length === 6,
    'Student Karthick V Semester 1 CIA 1 returns 6 subjects (Prog in C, Math, Dig Fund, Comp Fund, Eng I, C Lab)'
  );

  // Validation: CIA max marks
  const invalidCia = await request(
    '/marks/cia',
    {
      method: 'POST',
      body: JSON.stringify({
        assessmentType: 'CIA 1',
        registerNumber: testReg,
        semester: 3,
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        maxMarks: 50,
        obtainedMarks: 55, // Invalid!
      }),
    },
    staffToken
  );
  assert(invalidCia.status === 400, 'Validation prevents CIA marks (55) exceeding max marks (50)');

  // Add CIA 1, CIA 2, CIA 3 separately
  const cia1 = await request(
    '/marks/cia',
    {
      method: 'POST',
      body: JSON.stringify({
        assessmentType: 'CIA 1',
        registerNumber: testReg,
        semester: 3,
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        maxMarks: 50,
        obtainedMarks: 45,
      }),
    },
    staffToken
  );
  assert(cia1.ok && cia1.data.data.assessmentType === 'CIA 1', 'CIA 1 mark recorded separately');

  const cia2 = await request(
    '/marks/cia',
    {
      method: 'POST',
      body: JSON.stringify({
        assessmentType: 'CIA 2',
        registerNumber: testReg,
        semester: 3,
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        maxMarks: 50,
        obtainedMarks: 48,
      }),
    },
    staffToken
  );
  assert(cia2.ok && cia2.data.data.assessmentType === 'CIA 2', 'CIA 2 mark recorded separately without mixing');

  const cia3 = await request(
    '/marks/cia',
    {
      method: 'POST',
      body: JSON.stringify({
        assessmentType: 'CIA 3',
        registerNumber: testReg,
        semester: 3,
        subjectCode: 'CS301',
        subjectName: 'Data Structures',
        maxMarks: 50,
        obtainedMarks: 44,
      }),
    },
    staffToken
  );
  assert(cia3.ok && cia3.data.data.assessmentType === 'CIA 3', 'CIA 3 mark recorded separately without mixing');

  // ── 8. SECURE DOCUMENT DOWNLOAD & PRIVACY ────────────────────
  console.log('\n--- 8. Testing Protected Document Download & Privacy ---');
  if (fypRes.data.data.length > 0) {
    const sampleFyp = fypRes.data.data.find(p => p.registerNumber !== '24SCC4524') || fypRes.data.data[0];
    
    // Staff download allowed
    const staffDl = await request(`/files/download/fyp/${sampleFyp._id}`, {}, staffToken);
    assert(staffDl.status !== 403, 'Staff authorized to download student report');

    // Cross-student download test: Student attempting to download another student's report
    if (sampleFyp.registerNumber !== '24SCC4524') {
      const crossDl = await request(`/files/download/fyp/${sampleFyp._id}`, {}, studentToken);
      assert(crossDl.status === 403, 'Cross-student document download blocked with 403 Forbidden');
    }
  }

  // ── 9. CLEANUP TEST STUDENT ──────────────────────────────────
  console.log('\n--- 9. Cleanup Test Student & Marks ---');
  if (semMarkId) await request(`/marks/semester/${semMarkId}`, { method: 'DELETE' }, staffToken);
  if (cia1?.data?.data?._id) await request(`/marks/cia/${cia1.data.data._id}`, { method: 'DELETE' }, staffToken);
  if (cia2?.data?.data?._id) await request(`/marks/cia/${cia2.data.data._id}`, { method: 'DELETE' }, staffToken);
  if (cia3?.data?.data?._id) await request(`/marks/cia/${cia3.data.data._id}`, { method: 'DELETE' }, staffToken);
  const delRes = await request(`/students/${createdStudentId}`, { method: 'DELETE' }, staffToken);
  assert(delRes.ok, 'Staff successfully deleted test student and associated test marks');

  // Summary
  console.log(`\n====================================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================`);
  if (failed === 0) {
    console.log('🎉 All integration and security tests passed successfully!');
  }
}

runTests();
