// ============================================================
//  js/admin.js — Admin Console Logic for College ERP
//  Covers exactly the 6 Academic Modules + Staff Management
// ============================================================

let currentAdmin = null;
let allStudents = [];
let allStaff = [];
let allFyp = [];
let allInternships = [];
let allSemesterMarks = [];
let allCiaMarks = [];
let adminCiaSelectedType = '';
let adminCiaSelectedBatch = '';
let adminCiaSelectedSem = '';
let currentSection = 'dashboard';

// ── Bootstrap & Auth Guard ────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  currentAdmin = Auth.requireAuth(['admin']);
  if (!currentAdmin) return;

  const nameEl = document.getElementById('admin-name');
  const avatarEl = document.getElementById('admin-avatar');
  if (nameEl) nameEl.textContent = currentAdmin.name || 'Administrator';
  if (avatarEl) {
    const initials = (currentAdmin.name || 'AD')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    avatarEl.textContent = initials;
  }

  // Load initial datasets
  await Promise.all([
    loadDashboardStats(),
    loadStaff(),
    loadStudents(),
    loadFinalProjects(),
    loadInternships(),
    loadSemesterMarks(),
    loadCiaMarks(),
  ]);
});

// ── Navigation ────────────────────────────────────────────────
const adminTitles = {
  dashboard: { title: 'Dashboard', sub: 'Academic overview & key metrics' },
  students: { title: 'Student Details', sub: 'Module 1: Student details & directory' },
  finalprojects: { title: 'Final-Year Project Report', sub: 'Module 2: Project documentation & reports' },
  internships: { title: 'Internship Project Report', sub: 'Module 3: Student industry internship reports' },
  semestermarks: { title: 'Semester Mark List', sub: 'Module 4: Semester examination grade records' },
  ciamarks: { title: 'CIA Marks', sub: 'Module 5: Continuous Internal Assessment (CIA 1, CIA 2, CIA 3)' },
  staff: { title: 'Staff & Faculty Accounts', sub: 'Manage staff credentials & directory' },
};

function navigateTo(section) {
  currentSection = section;
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));

  const sec = document.getElementById(`section-${section}`);
  const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (sec) sec.classList.add('active');
  if (nav) nav.classList.add('active');

  const info = adminTitles[section] || { title: section, sub: '' };
  const ttl = document.getElementById('topbar-title');
  const sub = document.getElementById('topbar-sub');
  if (ttl) ttl.textContent = info.title;
  if (sub) sub.textContent = info.sub;

  document.querySelector('.sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('active');
}

function refreshCurrentSection() {
  loadDashboardStats();
  if (currentSection === 'students') loadStudents();
  else if (currentSection === 'finalprojects') loadFinalProjects();
  else if (currentSection === 'internships') loadInternships();
  else if (currentSection === 'semestermarks') loadSemesterMarks();
  else if (currentSection === 'ciamarks') loadCiaMarks();
  else if (currentSection === 'staff') loadStaff();
  showToast('Data refreshed', 'info');
}

// ── Dashboard Stats ───────────────────────────────────────────
async function loadDashboardStats() {
  try {
    const res = await API.stats.get();
    if (res.success) {
      setText('stat-students', res.data.totalStudents);
      setText('stat-fyp', res.data.finalYearProjects);
      setText('stat-internships', res.data.internshipReports);
      setText('stat-semester-marks', res.data.semesterMarks);
      setText('stat-cia-marks', res.data.ciaMarks);
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 1: STUDENT DETAILS
// ════════════════════════════════════════════════════════════════
async function loadStudents() {
  try {
    const res = await API.students.getAll();
    allStudents = res.data || [];
    renderStudents(allStudents);
    populateDepartmentFilter();
    populateStaffSelectDropdown();
  } catch (err) {
    showToast('Failed to load students: ' + err.message, 'error');
  }
}

function renderStudents(students) {
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--slate-400);">No student records found. Click 'Add Student' to create one.</td></tr>`;
    return;
  }

  tbody.innerHTML = students
    .map(
      (s) => `
    <tr>
      <td><strong>${escapeHtml(s.name)}</strong></td>
      <td><span class="badge badge-info">${escapeHtml(s.registerNumber)}</span></td>
      <td>${escapeHtml(s.umisId || s.rollNumber || '—')}</td>
      <td>${escapeHtml(s.department)}</td>
      <td>${escapeHtml(s.course)}<br><small style="color:var(--slate-400);">${escapeHtml(s.academicYear)}</small></td>
      <td>${escapeHtml(s.batch)}</td>
      <td>${escapeHtml(s.email)}<br><small style="color:var(--slate-500);">${escapeHtml(s.phone)}</small></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="editStudent('${s._id}')" title="Edit Student">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s._id}', '${escapeHtml(s.name)}')" title="Delete Student">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

function filterStudents() {
  const q = (document.getElementById('student-search')?.value || '').toLowerCase().trim();
  const dept = document.getElementById('student-dept-filter')?.value || '';
  const batch = document.getElementById('student-batch-filter')?.value || '';

  const filtered = allStudents.filter((s) => {
    const matchQ =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.registerNumber.toLowerCase().includes(q) ||
      (s.umisId && s.umisId.toLowerCase().includes(q)) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
      s.email.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q);

    const matchDept = !dept || s.department === dept;
    const matchBatch = !batch || (s.batch && s.batch.includes(batch));
    return matchQ && matchDept && matchBatch;
  });

  renderStudents(filtered);
}

function populateDepartmentFilter() {
  const select = document.getElementById('student-dept-filter');
  if (!select) return;
  const currentVal = select.value;
  const depts = [...new Set(allStudents.map((s) => s.department).filter(Boolean))];
  select.innerHTML = '<option value="">All Departments</option>' + depts.map((d) => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('');
  if (currentVal) select.value = currentVal;
}

function populateStaffSelectDropdown() {
  const select = document.getElementById('s-assigned-staff');
  if (!select) return;
  select.innerHTML =
    '<option value="">None (Unassigned)</option>' +
    allStaff.map((st) => `<option value="${st._id}">${escapeHtml(st.name)} (${escapeHtml(st.department || 'Staff')})</option>`).join('');
}

function openAddStudentModal() {
  document.getElementById('student-modal-title').textContent = 'Add New Student';
  document.getElementById('s-id').value = '';
  document.getElementById('student-form').reset();
  document.getElementById('s-password-group').style.display = 'block';
  document.getElementById('s-regno').disabled = false;
  document.getElementById('s-email').disabled = false;
  if (document.getElementById('s-umis')) document.getElementById('s-umis').value = '';
  populateStaffSelectDropdown();
  openModal('student-modal');
}

function editStudent(id) {
  const s = allStudents.find((item) => item._id === id);
  if (!s) return;

  document.getElementById('student-modal-title').textContent = 'Edit Student Details';
  document.getElementById('s-id').value = s._id;
  document.getElementById('s-name').value = s.name;
  document.getElementById('s-regno').value = s.registerNumber;
  document.getElementById('s-regno').disabled = true; // registerNumber is immutable unique
  if (document.getElementById('s-umis')) document.getElementById('s-umis').value = s.umisId || s.rollNumber || '';
  if (document.getElementById('s-rollno')) document.getElementById('s-rollno').value = s.umisId || s.rollNumber || '';
  document.getElementById('s-dept').value = s.department;
  document.getElementById('s-course').value = s.course;
  document.getElementById('s-academicyear').value = s.academicYear;
  document.getElementById('s-batch').value = s.batch;
  document.getElementById('s-email').value = s.email;
  document.getElementById('s-email').disabled = true;
  document.getElementById('s-phone').value = s.phone;
  document.getElementById('s-password').value = '';

  openModal('student-modal');
}

async function saveStudent(e) {
  e.preventDefault();
  const id = document.getElementById('s-id').value;
  const btn = document.getElementById('save-student-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const umisVal = document.getElementById('s-umis') ? document.getElementById('s-umis').value.trim() : (document.getElementById('s-rollno') ? document.getElementById('s-rollno').value.trim() : '');

  const payload = {
    name: document.getElementById('s-name').value.trim(),
    registerNumber: document.getElementById('s-regno').value.trim(),
    umisId: umisVal,
    rollNumber: umisVal,
    department: document.getElementById('s-dept').value.trim(),
    course: document.getElementById('s-course').value.trim(),
    academicYear: document.getElementById('s-academicyear').value.trim(),
    batch: document.getElementById('s-batch').value.trim(),
    email: document.getElementById('s-email').value.trim(),
    phone: document.getElementById('s-phone').value.trim(),
  };

  const pass = document.getElementById('s-password').value;
  if (pass) payload.password = pass;

  try {
    if (id) {
      await API.students.update(id, payload);
      showToast('Student details updated successfully', 'success');
    } else {
      await API.students.create(payload);
      showToast('Student registered successfully', 'success');
    }
    closeModal('student-modal');
    await loadStudents();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Student';
  }
}

async function deleteStudent(id, name) {
  if (!confirm(`Are you sure you want to permanently delete student '${name}'? This cannot be undone.`)) return;

  try {
    await API.students.delete(id);
    showToast('Student deleted successfully', 'success');
    await loadStudents();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 2: FINAL-YEAR PROJECT REPORT
// ════════════════════════════════════════════════════════════════
async function loadFinalProjects() {
  try {
    const res = await API.finalProjects.getAll();
    allFyp = res.data || [];
    renderFinalProjects(allFyp);
  } catch (err) {
    showToast('Failed to load FYP reports: ' + err.message, 'error');
  }
}

function renderFinalProjects(projects) {
  const tbody = document.getElementById('fyp-tbody');
  if (!tbody) return;

  if (projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--slate-400);">No final-year project reports uploaded.</td></tr>`;
    return;
  }

  tbody.innerHTML = projects
    .map(
      (p) => `
    <tr>
      <td><strong>${escapeHtml(p.studentName)}</strong></td>
      <td><span class="badge badge-info">${escapeHtml(p.registerNumber)}</span></td>
      <td><strong>${escapeHtml(p.projectTitle)}</strong></td>
      <td><small>${escapeHtml(p.technologyUsed || '—')}</small></td>
      <td>${escapeHtml(p.projectGuide || '—')}</td>
      <td>${formatDate(p.submissionDate)}</td>
      <td>
        ${
          p.reportPdf
            ? `<div style="display:flex;gap:6px;">
                <button class="btn btn-outline btn-sm" onclick="previewPdf('fyp', '${p._id}', '${escapeHtml(p.projectTitle)}')">Preview</button>
                <a href="${API.getFileDownloadUrl('fyp', p._id)}" target="_blank" class="btn btn-secondary btn-sm">Download</a>
               </div>`
            : '<span style="color:var(--slate-400);font-size:12px;">No PDF</span>'
        }
      </td>
      <td>${statusBadge(p.status || 'Submitted')}</td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="editFyp('${p._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteFyp('${p._id}')">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

function filterFyp() {
  const q = (document.getElementById('fyp-search')?.value || '').toLowerCase().trim();
  const filtered = allFyp.filter(
    (p) =>
      !q ||
      p.studentName.toLowerCase().includes(q) ||
      p.registerNumber.toLowerCase().includes(q) ||
      p.projectTitle.toLowerCase().includes(q) ||
      (p.projectGuide && p.projectGuide.toLowerCase().includes(q))
  );
  renderFinalProjects(filtered);
}

function openAddFypModal() {
  document.getElementById('fyp-modal-title').textContent = 'Add Final-Year Project Report';
  document.getElementById('fyp-id').value = '';
  document.getElementById('fyp-form').reset();
  document.getElementById('fyp-date').valueAsDate = new Date();
  openModal('fyp-modal');
}

function editFyp(id) {
  const p = allFyp.find((item) => item._id === id);
  if (!p) return;

  document.getElementById('fyp-modal-title').textContent = 'Edit Project Report';
  document.getElementById('fyp-id').value = p._id;
  document.getElementById('fyp-regno').value = p.registerNumber;
  document.getElementById('fyp-title').value = p.projectTitle;
  document.getElementById('fyp-tech').value = p.technologyUsed || '';
  document.getElementById('fyp-guide').value = p.projectGuide || '';
  document.getElementById('fyp-status').value = p.status || 'Submitted';
  document.getElementById('fyp-desc').value = p.projectDescription || '';
  if (p.submissionDate) {
    document.getElementById('fyp-date').value = new Date(p.submissionDate).toISOString().split('T')[0];
  }
  openModal('fyp-modal');
}

async function saveFyp(e) {
  e.preventDefault();
  const id = document.getElementById('fyp-id').value;
  const btn = document.getElementById('save-fyp-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const formData = new FormData();
  formData.append('registerNumber', document.getElementById('fyp-regno').value.trim());
  formData.append('projectTitle', document.getElementById('fyp-title').value.trim());
  formData.append('technologyUsed', document.getElementById('fyp-tech').value.trim());
  formData.append('projectGuide', document.getElementById('fyp-guide').value.trim());
  formData.append('status', document.getElementById('fyp-status').value);
  formData.append('projectDescription', document.getElementById('fyp-desc').value.trim());
  formData.append('submissionDate', document.getElementById('fyp-date').value);

  const fileInput = document.getElementById('fyp-file');
  if (fileInput.files.length > 0) {
    formData.append('reportPdf', fileInput.files[0]);
  }

  try {
    if (id) {
      await API.finalProjects.update(id, formData);
      showToast('Project report updated successfully', 'success');
    } else {
      await API.finalProjects.create(formData);
      showToast('Final-year project report added', 'success');
    }
    closeModal('fyp-modal');
    await loadFinalProjects();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save FYP Report';
  }
}

async function deleteFyp(id) {
  if (!confirm('Are you sure you want to delete this project report?')) return;
  try {
    await API.finalProjects.delete(id);
    showToast('Project report deleted', 'success');
    await loadFinalProjects();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 3: INTERNSHIP PROJECT REPORT
// ════════════════════════════════════════════════════════════════
async function loadInternships() {
  try {
    const res = await API.internships.getAll();
    allInternships = res.data || [];
    renderInternships(allInternships);
  } catch (err) {
    showToast('Failed to load internship reports: ' + err.message, 'error');
  }
}

function renderInternships(internships) {
  const tbody = document.getElementById('internships-tbody');
  if (!tbody) return;

  if (internships.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--slate-400);">No internship reports found.</td></tr>`;
    return;
  }

  tbody.innerHTML = internships
    .map(
      (int) => `
    <tr>
      <td><strong>${escapeHtml(int.studentName)}</strong></td>
      <td><span class="badge badge-info">${escapeHtml(int.registerNumber)}</span></td>
      <td><strong>${escapeHtml(int.companyName)}</strong></td>
      <td>${escapeHtml(int.internshipDomain)}</td>
      <td>${escapeHtml(int.projectTitle)}</td>
      <td>${escapeHtml(int.duration)}</td>
      <td>${statusBadge(int.completionStatus || 'Completed')}</td>
      <td>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">
          ${
            int.reportPdf
              ? `<a href="${API.getFileDownloadUrl('internship-report', int._id)}" target="_blank" class="btn btn-outline btn-sm">Report</a>`
              : ''
          }
          ${
            int.certificatePdf
              ? `<a href="${API.getFileDownloadUrl('internship-cert', int._id)}" target="_blank" class="btn btn-secondary btn-sm">Cert</a>`
              : ''
          }
        </div>
      </td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="editInternship('${int._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteInternship('${int._id}')">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

function filterInternships() {
  const q = (document.getElementById('internship-search')?.value || '').toLowerCase().trim();
  const filtered = allInternships.filter(
    (int) =>
      !q ||
      int.studentName.toLowerCase().includes(q) ||
      int.registerNumber.toLowerCase().includes(q) ||
      int.companyName.toLowerCase().includes(q) ||
      int.internshipDomain.toLowerCase().includes(q) ||
      int.projectTitle.toLowerCase().includes(q)
  );
  renderInternships(filtered);
}

function openAddInternshipModal() {
  document.getElementById('internship-modal-title').textContent = 'Add Internship Project Report';
  document.getElementById('int-id').value = '';
  document.getElementById('internship-form').reset();
  document.getElementById('int-date').valueAsDate = new Date();
  openModal('internship-modal');
}

function editInternship(id) {
  const int = allInternships.find((item) => item._id === id);
  if (!int) return;

  document.getElementById('internship-modal-title').textContent = 'Edit Internship Report';
  document.getElementById('int-id').value = int._id;
  document.getElementById('int-regno').value = int.registerNumber;
  document.getElementById('int-company').value = int.companyName;
  document.getElementById('int-domain').value = int.internshipDomain;
  document.getElementById('int-title').value = int.projectTitle;
  document.getElementById('int-tech').value = int.technologyUsed || '';
  document.getElementById('int-duration').value = int.duration;
  document.getElementById('int-status').value = int.completionStatus || 'Completed';
  if (int.submissionDate) {
    document.getElementById('int-date').value = new Date(int.submissionDate).toISOString().split('T')[0];
  }
  openModal('internship-modal');
}

async function saveInternship(e) {
  e.preventDefault();
  const id = document.getElementById('int-id').value;
  const btn = document.getElementById('save-int-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const formData = new FormData();
  formData.append('registerNumber', document.getElementById('int-regno').value.trim());
  formData.append('companyName', document.getElementById('int-company').value.trim());
  formData.append('internshipDomain', document.getElementById('int-domain').value.trim());
  formData.append('projectTitle', document.getElementById('int-title').value.trim());
  formData.append('technologyUsed', document.getElementById('int-tech').value.trim());
  formData.append('duration', document.getElementById('int-duration').value.trim());
  formData.append('completionStatus', document.getElementById('int-status').value);
  formData.append('submissionDate', document.getElementById('int-date').value);

  const repFile = document.getElementById('int-report-file');
  if (repFile.files.length > 0) formData.append('reportPdf', repFile.files[0]);

  const certFile = document.getElementById('int-cert-file');
  if (certFile.files.length > 0) formData.append('certificatePdf', certFile.files[0]);

  try {
    if (id) {
      await API.internships.update(id, formData);
      showToast('Internship report updated successfully', 'success');
    } else {
      await API.internships.create(formData);
      showToast('Internship project report added', 'success');
    }
    closeModal('internship-modal');
    await loadInternships();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Internship Report';
  }
}

async function deleteInternship(id) {
  if (!confirm('Are you sure you want to delete this internship report?')) return;
  try {
    await API.internships.delete(id);
    showToast('Internship report deleted', 'success');
    await loadInternships();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 4: SEMESTER MARK LIST (Split by Batch & Semester 1-6)
// ════════════════════════════════════════════════════════════════
let selectedSemBatch = '';
let selectedSemNumber = '';

function getBatchBadge(batch) {
  const b = String(batch || '').trim();
  if (b.includes('2023')) return `<span class="badge-batch badge-batch-2023">🎓 2023 Batch</span>`;
  if (b.includes('2024')) return `<span class="badge-batch badge-batch-2024">📘 2024 Batch</span>`;
  if (b.includes('2025')) return `<span class="badge-batch badge-batch-2025">⚡ 2025 Batch</span>`;
  if (b.includes('2026')) return `<span class="badge-batch badge-batch-2026">🎓 2026 Batch</span>`;
  return `<span class="badge-batch badge-batch-other">${escapeHtml(b || 'General')}</span>`;
}

async function loadSemesterMarks() {
  try {
    const res = await API.semesterMarks.getAll();
    allSemesterMarks = res.data || [];
    filterSemesterMarks();
  } catch (err) {
    showToast('Failed to load semester marks: ' + err.message, 'error');
  }
}

function renderSemesterMarks(marks) {
  const tbody = document.getElementById('semestermarks-tbody');
  if (!tbody) return;

  if (marks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:36px;color:var(--slate-400);">No semester marks match the selected Batch &amp; Semester filter.</td></tr>`;
    return;
  }

  tbody.innerHTML = marks
    .map(
      (m) => `
    <tr>
      <td><strong>${escapeHtml(m.studentName)}</strong></td>
      <td><span class="badge badge-info">${escapeHtml(m.registerNumber)}</span></td>
      <td>${getBatchBadge(m.batch)}</td>
      <td><span class="badge badge-primary">Semester ${m.semester}</span></td>
      <td><strong>${escapeHtml(m.subjectCode)}</strong></td>
      <td>${escapeHtml(m.subjectName)}</td>
      <td><strong>${m.obtainedMarks}</strong> / ${m.maxMarks}</td>
      <td><span class="badge ${m.resultStatus === 'Pass' ? 'badge-success' : 'badge-danger'}">${m.resultStatus}</span></td>
      <td>${escapeHtml(m.academicYear)}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="btn btn-outline btn-sm" onclick="openStudentAcademicDetailsModal('${escapeHtml(m.registerNumber)}', ${m.semester})">👁️ Detail View</button>
          <a href="${API.semesterMarks.getMarklistPdfUrl(m.registerNumber, m.semester)}" target="_blank" class="btn btn-secondary btn-sm" title="View/Print Marksheet PDF">📄 PDF</a>
        </div>
      </td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="editSemesterMark('${m._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteSemesterMark('${m._id}')">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

function selectBatchFilter(batch) {
  selectedSemBatch = batch;

  // Update pills UI
  const pills = document.querySelectorAll('#batch-filter-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));

  if (!batch) {
    document.getElementById('pill-batch-all')?.classList.add('active');
  } else if (batch === '2023') {
    document.getElementById('pill-batch-2023')?.classList.add('active');
  } else if (batch === '2024') {
    document.getElementById('pill-batch-2024')?.classList.add('active');
  } else if (batch === '2025') {
    document.getElementById('pill-batch-2025')?.classList.add('active');
  }

  // Sync dropdown
  const dd = document.getElementById('sem-batch-filter');
  if (dd) dd.value = batch;

  filterSemesterMarks();
}

function selectSemFilter(sem) {
  selectedSemNumber = sem;

  // Update pills UI
  const pills = document.querySelectorAll('#sem-filter-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));

  if (!sem) {
    document.getElementById('pill-sem-all')?.classList.add('active');
  } else {
    document.getElementById(`pill-sem-${sem}`)?.classList.add('active');
  }

  // Sync dropdown
  const dd = document.getElementById('sem-filter');
  if (dd) dd.value = sem;

  filterSemesterMarks();
}

function onBatchDropdownChange() {
  const val = document.getElementById('sem-batch-filter')?.value || '';
  selectBatchFilter(val);
}

function onSemDropdownChange() {
  const val = document.getElementById('sem-filter')?.value || '';
  selectSemFilter(val);
}

function resetSemesterFilters() {
  const searchInput = document.getElementById('sem-mark-search');
  if (searchInput) searchInput.value = '';
  selectBatchFilter('');
  selectSemFilter('');
}

function filterSemesterMarks() {
  const q = (document.getElementById('sem-mark-search')?.value || '').toLowerCase().trim();
  const batchFilter = selectedSemBatch.trim();
  const semFilter = selectedSemNumber.trim();

  const filtered = allSemesterMarks.filter((m) => {
    const matchQ =
      !q ||
      (m.studentName || '').toLowerCase().includes(q) ||
      (m.registerNumber || '').toLowerCase().includes(q) ||
      (m.subjectCode || '').toLowerCase().includes(q) ||
      (m.subjectName || '').toLowerCase().includes(q) ||
      (m.batch || '').toLowerCase().includes(q);

    const matchBatch = !batchFilter || (m.batch && m.batch.includes(batchFilter));
    const matchSem = !semFilter || String(m.semester) === String(semFilter);

    return matchQ && matchBatch && matchSem;
  });

  // Update status bar labels
  const batchLabel = document.getElementById('sem-filter-status-batch');
  if (batchLabel) {
    batchLabel.textContent = batchFilter ? `${batchFilter} Batch` : 'All Batches';
  }

  const semLabel = document.getElementById('sem-filter-status-sem');
  if (semLabel) {
    semLabel.textContent = semFilter ? `Semester ${semFilter}` : 'All Semesters (1-6)';
  }

  const countBadge = document.getElementById('sem-filter-count-badge');
  if (countBadge) {
    countBadge.textContent = `(Showing ${filtered.length} of ${allSemesterMarks.length} records)`;
  }

  renderSemesterMarks(filtered);
}

function onSemMarkRegNoInput() {
  const reg = (document.getElementById('sm-regno')?.value || '').trim().toUpperCase();
  if (!reg || !allStudents) return;
  const s = allStudents.find((stu) => stu.registerNumber.toUpperCase() === reg);
  if (s && s.batch) {
    const batchSel = document.getElementById('sm-batch');
    if (batchSel) {
      // Find matching option or select
      let matched = false;
      for (let i = 0; i < batchSel.options.length; i++) {
        if (batchSel.options[i].value === s.batch || batchSel.options[i].text.includes(s.batch)) {
          batchSel.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        const opt = new Option(`${s.batch} Batch`, s.batch);
        batchSel.add(opt);
        batchSel.value = s.batch;
      }
    }
  }
}

function openAddSemesterMarkModal() {
  document.getElementById('sem-mark-modal-title').textContent = 'Enter Semester Marks';
  document.getElementById('sm-id').value = '';
  document.getElementById('sem-mark-form').reset();
  document.getElementById('sm-max').value = '100';
  document.getElementById('sm-year').value = '2023-2024';
  if (selectedSemNumber) {
    document.getElementById('sm-semester').value = selectedSemNumber;
  }
  if (selectedSemBatch) {
    const batchSel = document.getElementById('sm-batch');
    if (batchSel) {
      for (let i = 0; i < batchSel.options.length; i++) {
        if (batchSel.options[i].value.includes(selectedSemBatch)) {
          batchSel.selectedIndex = i;
          break;
        }
      }
    }
  }
  openModal('sem-mark-modal');
}

function editSemesterMark(id) {
  const m = allSemesterMarks.find((item) => item._id === id);
  if (!m) return;

  document.getElementById('sem-mark-modal-title').textContent = 'Edit Semester Mark';
  document.getElementById('sm-id').value = m._id;
  document.getElementById('sm-regno').value = m.registerNumber;
  document.getElementById('sm-semester').value = m.semester;
  document.getElementById('sm-code').value = m.subjectCode;
  document.getElementById('sm-name').value = m.subjectName;
  document.getElementById('sm-max').value = m.maxMarks;
  document.getElementById('sm-obt').value = m.obtainedMarks;
  document.getElementById('sm-year').value = m.academicYear;
  document.getElementById('sm-status').value = m.resultStatus || 'Pass';

  const batchSel = document.getElementById('sm-batch');
  if (batchSel && m.batch) {
    let matched = false;
    for (let i = 0; i < batchSel.options.length; i++) {
      if (batchSel.options[i].value === m.batch || batchSel.options[i].value.includes(m.batch)) {
        batchSel.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      batchSel.add(new Option(`${m.batch}`, m.batch));
      batchSel.value = m.batch;
    }
  }

  openModal('sem-mark-modal');
}

async function saveSemesterMark(e) {
  e.preventDefault();
  const id = document.getElementById('sm-id').value;
  const max = Number(document.getElementById('sm-max').value);
  const obt = Number(document.getElementById('sm-obt').value);

  // Validation: obtainedMarks cannot exceed maxMarks
  if (obt > max) {
    showToast(`Validation error: Obtained marks (${obt}) cannot exceed maximum marks (${max})`, 'warning');
    return;
  }

  const payload = {
    registerNumber: document.getElementById('sm-regno').value.trim(),
    batch: document.getElementById('sm-batch')?.value.trim() || '2022-2026',
    semester: Number(document.getElementById('sm-semester').value),
    subjectCode: document.getElementById('sm-code').value.trim(),
    subjectName: document.getElementById('sm-name').value.trim(),
    maxMarks: max,
    obtainedMarks: obt,
    academicYear: document.getElementById('sm-year').value.trim(),
    resultStatus: document.getElementById('sm-status').value,
  };

  const btn = document.getElementById('save-sem-mark-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    if (id) {
      await API.semesterMarks.update(id, payload);
      showToast('Semester mark record updated', 'success');
    } else {
      await API.semesterMarks.create(payload);
      showToast('Semester mark record added', 'success');
    }
    closeModal('sem-mark-modal');
    await loadSemesterMarks();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Semester Marks';
  }
}

async function deleteSemesterMark(id) {
  if (!confirm('Are you sure you want to delete this semester mark record?')) return;
  try {
    await API.semesterMarks.delete(id);
    showToast('Semester mark record deleted', 'success');
    await loadSemesterMarks();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 5: CIA MARKS (UNIFIED CIA 1, CIA 2, CIA 3)
// ════════════════════════════════════════════════════════════════
async function loadCiaMarks() {
  try {
    const res = await API.ciaMarks.getAll({});
    allCiaMarks = res.data || [];
    filterCiaMarks();
  } catch (err) {
    showToast('Failed to load CIA marks: ' + err.message, 'error');
  }
}

function selectAdminCiaTypeFilter(type) {
  adminCiaSelectedType = type;
  const pills = document.querySelectorAll('#admin-cia-type-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));
  if (!type) document.getElementById('admin-pill-cia-type-all')?.classList.add('active');
  else if (type === 'CIA 1') document.getElementById('admin-pill-cia-type-1')?.classList.add('active');
  else if (type === 'CIA 2') document.getElementById('admin-pill-cia-type-2')?.classList.add('active');
  else if (type === 'CIA 3') document.getElementById('admin-pill-cia-type-3')?.classList.add('active');
  filterCiaMarks();
}

function selectAdminCiaBatchFilter(batch) {
  adminCiaSelectedBatch = batch;
  const pills = document.querySelectorAll('#admin-cia-batch-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));
  if (!batch) document.getElementById('admin-pill-cia-batch-all')?.classList.add('active');
  else document.getElementById(`admin-pill-cia-batch-${batch}`)?.classList.add('active');
  filterCiaMarks();
}

function selectAdminCiaSemFilter(sem) {
  adminCiaSelectedSem = sem;
  const pills = document.querySelectorAll('#admin-cia-sem-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));
  if (!sem) document.getElementById('admin-pill-cia-sem-all')?.classList.add('active');
  else document.getElementById(`admin-pill-cia-sem-${sem}`)?.classList.add('active');
  filterCiaMarks();
}

function resetAdminCiaFilters() {
  adminCiaSelectedType = '';
  adminCiaSelectedBatch = '';
  adminCiaSelectedSem = '';
  const searchInput = document.getElementById('ciamarks-search');
  if (searchInput) searchInput.value = '';
  selectAdminCiaTypeFilter('');
  selectAdminCiaBatchFilter('');
  selectAdminCiaSemFilter('');
}

function renderCiaMarks(marks) {
  const tbody = document.getElementById('ciamarks-tbody');
  if (!tbody) return;

  if (marks.length === 0) {
    const typeNotice = adminCiaSelectedType ? ` for ${adminCiaSelectedType}` : '';
    const batchNotice = adminCiaSelectedBatch ? ` in ${adminCiaSelectedBatch} Batch` : '';
    const semNotice = adminCiaSelectedSem ? ` Semester ${adminCiaSelectedSem}` : '';
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:36px;color:var(--slate-400);">No CIA assessment records found${typeNotice}${batchNotice}${semNotice}.</td></tr>`;
    return;
  }

  tbody.innerHTML = marks
    .map(
      (m) => `
    <tr>
      <td><strong>${escapeHtml(m.studentName)}</strong></td>
      <td><span class="badge badge-info">${escapeHtml(m.registerNumber)}</span></td>
      <td><span class="badge ${m.assessmentType === 'CIA 1' ? 'badge-primary' : m.assessmentType === 'CIA 2' ? 'badge-warning' : 'badge-info'}">${escapeHtml(m.assessmentType)}</span></td>
      <td>Semester ${m.semester}</td>
      <td><strong>${escapeHtml(m.subjectCode)}</strong></td>
      <td>${escapeHtml(m.subjectName)} <small style="color:var(--slate-400);">(${escapeHtml(m.subjectType || 'Theory')})</small></td>
      <td><strong>${m.obtainedMarks}</strong> / ${m.maxMarks}</td>
      <td>${formatDate(m.examDate)}</td>
      <td><span class="badge ${m.resultStatus === 'Pass' ? 'badge-success' : 'badge-danger'}">${m.resultStatus}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="editCiaMark('${m._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteCiaMark('${m._id}', '${m.assessmentType}')">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

function filterCiaMarks() {
  const q = (document.getElementById('ciamarks-search')?.value || '').toLowerCase().trim();
  const type = adminCiaSelectedType;
  const sem = adminCiaSelectedSem;
  const batch = adminCiaSelectedBatch;

  const typeLabel = document.getElementById('admin-cia-type-label');
  if (typeLabel) typeLabel.textContent = type ? type : 'All CIA';

  const batchLabel = document.getElementById('admin-cia-batch-label');
  if (batchLabel) batchLabel.textContent = batch ? `${batch} Batch` : 'All Batches';

  const semLabel = document.getElementById('admin-cia-sem-label');
  if (semLabel) semLabel.textContent = sem ? `Semester ${sem}` : 'All Semesters';

  const filtered = allCiaMarks.filter((m) => {
    const matchQ =
      !q ||
      (m.studentName || '').toLowerCase().includes(q) ||
      (m.registerNumber || '').toLowerCase().includes(q) ||
      (m.subjectCode || '').toLowerCase().includes(q) ||
      (m.subjectName || '').toLowerCase().includes(q);
    const matchType = !type || m.assessmentType === type;
    const matchSem = !sem || String(m.semester) === String(sem);
    const matchBatch = !batch || (m.batch && m.batch.includes(batch));
    return matchQ && matchType && matchSem && matchBatch;
  });

  const countBadge = document.getElementById('admin-cia-count-badge');
  if (countBadge) countBadge.textContent = `(${filtered.length} of ${allCiaMarks.length} records)`;

  renderCiaMarks(filtered);
}

function openAddCiaMarkModal(type) {
  document.getElementById('cia-mark-modal-title').textContent = 'Enter CIA Marks';
  document.getElementById('cia-id').value = '';
  document.getElementById('cia-mark-form').reset();
  if (type) document.getElementById('cia-type').value = type;
  else if (adminCiaSelectedType) document.getElementById('cia-type').value = adminCiaSelectedType;
  else document.getElementById('cia-type').value = 'CIA 1';
  document.getElementById('cia-max').value = '50';
  document.getElementById('cia-date').valueAsDate = new Date();
  openModal('cia-mark-modal');
}

function editCiaMark(id) {
  const m = allCiaMarks.find((item) => item._id === id);
  if (!m) return;

  document.getElementById('cia-mark-modal-title').textContent = `Edit ${m.assessmentType} Mark`;
  document.getElementById('cia-id').value = m._id;
  document.getElementById('cia-type').value = m.assessmentType;
  document.getElementById('cia-regno').value = m.registerNumber;
  document.getElementById('cia-semester').value = m.semester;
  document.getElementById('cia-code').value = m.subjectCode;
  document.getElementById('cia-name').value = m.subjectName;
  document.getElementById('cia-max').value = m.maxMarks;
  document.getElementById('cia-obt').value = m.obtainedMarks;
  if (m.examDate) {
    document.getElementById('cia-date').value = new Date(m.examDate).toISOString().split('T')[0];
  }
  document.getElementById('cia-status').value = m.resultStatus || 'Pass';
  openModal('cia-mark-modal');
}

async function saveCiaMark(e) {
  e.preventDefault();
  const id = document.getElementById('cia-id').value;
  const asmtType = document.getElementById('cia-type').value;
  const max = Number(document.getElementById('cia-max').value);
  const obt = Number(document.getElementById('cia-obt').value);

  if (obt > max) {
    showToast(`Validation error: Obtained marks (${obt}) cannot exceed maximum marks (${max}) for ${asmtType}.`, 'warning');
    return;
  }

  const payload = {
    assessmentType: asmtType,
    registerNumber: document.getElementById('cia-regno').value.trim(),
    semester: Number(document.getElementById('cia-semester').value),
    subjectCode: document.getElementById('cia-code').value.trim(),
    subjectName: document.getElementById('cia-name').value.trim(),
    maxMarks: max,
    obtainedMarks: obt,
    examDate: document.getElementById('cia-date').value,
    resultStatus: document.getElementById('cia-status').value,
  };

  const btn = document.getElementById('save-cia-mark-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    if (id) {
      await API.ciaMarks.update(id, payload);
      showToast(`${asmtType} marks updated successfully`, 'success');
    } else {
      await API.ciaMarks.create(payload);
      showToast(`${asmtType} marks recorded successfully`, 'success');
    }
    closeModal('cia-mark-modal');
    await loadCiaMarks();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save CIA Marks';
  }
}

async function deleteCiaMark(id, type) {
  if (!confirm(`Are you sure you want to delete this ${type || 'CIA'} mark record?`)) return;
  try {
    await API.ciaMarks.delete(id);
    showToast('CIA mark record deleted', 'success');
    await loadCiaMarks();
    loadDashboardStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}
  }
}

// ════════════════════════════════════════════════════════════════
//  STAFF MANAGEMENT & ASSIGNMENTS
// ════════════════════════════════════════════════════════════════
async function loadStaff() {
  try {
    const res = await API.staff.getAll();
    allStaff = res.data || [];
    renderStaff(allStaff);
  } catch (err) {
    showToast('Failed to load staff accounts: ' + err.message, 'error');
  }
}

function renderStaff(staffMembers) {
  const tbody = document.getElementById('staff-tbody');
  if (!tbody) return;

  if (staffMembers.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--slate-400);">No staff members found.</td></tr>`;
    return;
  }

  tbody.innerHTML = staffMembers
    .map(
      (st) => `
    <tr>
      <td><strong>${escapeHtml(st.name)}</strong></td>
      <td>${escapeHtml(st.email)}</td>
      <td>${escapeHtml(st.department || '—')}</td>
      <td>${escapeHtml(st.phone || '—')}</td>
      <td><span class="badge badge-info">${st.assignedStudentCount || 0} Students</span></td>
      <td><span class="badge ${st.isActive ? 'badge-success' : 'badge-danger'}">${st.isActive ? 'Active' : 'Inactive'}</span></td>
      <td>
        <div style="display:flex;gap:6px;">
          <button class="btn btn-secondary btn-sm" onclick="editStaff('${st._id}')">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteStaff('${st._id}', '${escapeHtml(st.name)}')">Delete</button>
        </div>
      </td>
    </tr>`
    )
    .join('');
}

function openAddStaffModal() {
  document.getElementById('staff-modal-title').textContent = 'Add Staff Member';
  document.getElementById('staff-id').value = '';
  document.getElementById('staff-form').reset();
  document.getElementById('staff-password-group').style.display = 'block';
  document.getElementById('staff-email').disabled = false;
  openModal('staff-modal');
}

function editStaff(id) {
  const st = allStaff.find((item) => item._id === id);
  if (!st) return;

  document.getElementById('staff-modal-title').textContent = 'Edit Staff Member';
  document.getElementById('staff-id').value = st._id;
  document.getElementById('staff-name').value = st.name;
  document.getElementById('staff-email').value = st.email;
  document.getElementById('staff-email').disabled = true;
  document.getElementById('staff-dept').value = st.department || '';
  document.getElementById('staff-phone').value = st.phone || '';
  document.getElementById('staff-password').value = '';
  openModal('staff-modal');
}

async function saveStaff(e) {
  e.preventDefault();
  const id = document.getElementById('staff-id').value;
  const btn = document.getElementById('save-staff-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const payload = {
    name: document.getElementById('staff-name').value.trim(),
    email: document.getElementById('staff-email').value.trim(),
    department: document.getElementById('staff-dept').value.trim(),
    phone: document.getElementById('staff-phone').value.trim(),
  };

  const pass = document.getElementById('staff-password').value;
  if (pass) payload.password = pass;

  try {
    if (id) {
      await API.staff.update(id, payload);
      showToast('Staff account updated successfully', 'success');
    } else {
      if (!pass) payload.password = 'staff123';
      await API.staff.create(payload);
      showToast('Staff account created successfully', 'success');
    }
    closeModal('staff-modal');
    await loadStaff();
    populateStaffSelectDropdown();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Staff';
  }
}

async function deleteStaff(id, name) {
  if (!confirm(`Are you sure you want to delete staff account '${name}'? This will unassign all linked students.`)) return;
  try {
    await API.staff.delete(id);
    showToast('Staff account deleted', 'success');
    await loadStaff();
    await loadStudents();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── PDF Document Preview ──────────────────────────────────────
function previewPdf(type, id, title = 'Document Preview') {
  const iframe = document.getElementById('pdf-preview-iframe');
  const modalTitle = document.getElementById('pdf-preview-title');
  if (iframe) iframe.src = API.getFilePreviewUrl(type, id);
  if (modalTitle) modalTitle.textContent = title;
  openModal('pdf-preview-modal');
}


// ── Student Academic Details Modal & Marklist PDF View ───────
async function openStudentAcademicDetailsModal(regNo, sem) {
  const modalBody = document.getElementById('student-academic-modal-body');
  if (!modalBody) return;
  modalBody.innerHTML = '<div style="text-align:center;padding:40px;color:#64748b;">Loading academic details...</div>';
  openModal('student-academic-modal');

  try {
    const res = await API.semesterMarks.getStudentSummary(regNo, sem);
    if (!res.success || !res.data) throw new Error(res.message || 'Failed to load details');
    renderStudentAcademicCard(modalBody, res.data);
  } catch (err) {
    modalBody.innerHTML = `<div style="text-align:center;padding:30px;color:#ef4444;">Error loading details: ${escapeHtml(err.message)}</div>`;
  }
}

function renderStudentAcademicCard(container, data) {
  const subjectRows = (data.subjects || []).map(s => `
    <tr>
      <td>
        <span class="subj-name">${escapeHtml(s.subjectName)}</span>
        <span class="subj-type">${escapeHtml(s.subjectCode)} · ${escapeHtml(s.subjectType || 'Theory')}</span>
      </td>
      <td style="text-align:center;">${s.maxMarks}</td>
      <td style="text-align:right;font-weight:700;">${s.obtainedMarks}</td>
      <td style="text-align:center;">
        <span class="${s.resultStatus === 'Pass' ? 'academic-badge-pass' : 'academic-badge-fail'}">${s.resultStatus}</span>
      </td>
    </tr>
  `).join('');

  container.innerHTML = `
    <div class="academic-details-card">
      <div class="academic-details-header">
        <h3>Student Academic Details</h3>
        <span class="badge-sample">Sample</span>
      </div>

      <div class="academic-meta-grid">
        <div class="academic-meta-item">
          <div class="meta-label">Student Name</div>
          <div class="meta-value">${escapeHtml(data.studentName)}</div>
        </div>
        <div class="academic-meta-item">
          <div class="meta-label">Course</div>
          <div class="meta-value">${escapeHtml(data.course || 'B.Sc. CS with Cyber Security')}</div>
        </div>
        <div class="academic-meta-item">
          <div class="meta-label">Semester</div>
          <div class="meta-value">Semester ${data.semester}</div>
        </div>
        <div class="academic-meta-item">
          <div class="meta-label">Academic Year</div>
          <div class="meta-value">${escapeHtml(data.academicYear || '2024–2027')}</div>
        </div>
      </div>

      <div class="academic-sub-title">Semester ${data.semester} – Mark Details</div>

      <table class="academic-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th style="text-align:center;width:90px;">Max</th>
            <th style="text-align:right;width:100px;">Obtained</th>
            <th style="text-align:center;width:90px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${subjectRows || '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">No subjects recorded.</td></tr>'}
        </tbody>
      </table>

      <div class="academic-summary-row">
        <div class="academic-summary-item">
          <div class="label">Total Marks</div>
          <div class="academic-total-marks">${data.totalMarks}/${data.totalMax}</div>
          <div class="${data.overallStatus === 'PASS' ? 'academic-badge-pass' : 'academic-badge-fail'}">${data.overallStatus}</div>
        </div>
        <div class="academic-summary-item" style="text-align:right;">
          <div class="label">Percentage</div>
          <div class="academic-percentage">${data.percentage}%</div>
        </div>
      </div>

      <div class="academic-note">Illustrative student marks only.</div>

      <div class="academic-action-bar">
        <a href="${API.semesterMarks.getMarklistPdfUrl(data.registerNumber, data.semester)}" target="_blank" class="btn btn-primary btn-sm">
          📄 View Marklist PDF
        </a>
        <button class="btn btn-secondary btn-sm" onclick="window.print()">
          🖨️ Print Marksheet
        </button>
      </div>
    </div>
  `;
}
