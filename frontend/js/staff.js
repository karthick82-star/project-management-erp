// ============================================================
//  js/staff.js — Staff Portal Logic for College ERP
//  Faculty management of student records and academic modules
// ============================================================

let currentStaff = null;
let assignedStudents = [];
let staffStudents = [];
let staffFyp = [];
let staffInternships = [];
let staffSemesterMarks = [];
let staffCiaMarks = [];
let staffCiaSelectedType = '';
let staffCiaSelectedBatch = '';
let staffCiaSelectedSem = '';
let staffCurrentSection = 'dashboard';

// ── Bootstrap & Auth Guard ────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  currentStaff = Auth.requireAuth(['staff']);
  if (!currentStaff) return;

  // Ensure name is updated to HOD even if cached in localStorage
  if (!currentStaff.name || currentStaff.name.includes('Priya') || currentStaff.name.includes('Staff')) {
    currentStaff.name = 'HOD';
    Auth.setUser(currentStaff);
  }

  try {
    const meRes = await API.auth.me();
    if (meRes && meRes.success && meRes.user) {
      currentStaff = { ...currentStaff, ...meRes.user };
      Auth.setUser(currentStaff);
    }
  } catch (err) {
    // Non-blocking fallback
  }

  const nameEl = document.getElementById('staff-name');
  const avatarEl = document.getElementById('staff-avatar');
  if (nameEl) nameEl.textContent = currentStaff.name || 'HOD';
  if (avatarEl) {
    let initials = 'HOD';
    if (currentStaff.name && currentStaff.name.toUpperCase() !== 'HOD') {
      initials = currentStaff.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 3)
        .toUpperCase();
    }
    avatarEl.textContent = initials || 'HOD';
  }

  await Promise.all([
    loadStaffStats(),
    loadStaffStudents(),
    loadStaffFyp(),
    loadStaffInternships(),
    loadStaffSemesterMarks(),
    loadStaffCiaMarks(),
  ]);
});

// ── Navigation ────────────────────────────────────────────────
const staffTitles = {
  dashboard: { title: 'Staff Dashboard', sub: 'Academic overview & student records' },
  students: { title: 'Students Directory', sub: 'Module 1: Student details & academic contacts' },
  finalprojects: { title: 'Final-Year Project Report', sub: 'Module 2: Student project reports & documentation' },
  internships: { title: 'Internship Project Report', sub: 'Module 3: Student industry internship documentation' },
  semestermarks: { title: 'Semester Mark List', sub: 'Module 4: Semester examination grade records' },
  ciamarks: { title: 'CIA Marks', sub: 'Module 5: Continuous Internal Assessment (CIA 1, CIA 2, CIA 3)' },
};

function navigateToStaff(section) {
  staffCurrentSection = section;
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));

  const sec = document.getElementById(`section-${section}`);
  const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (sec) sec.classList.add('active');
  if (nav) nav.classList.add('active');

  const info = staffTitles[section] || { title: section, sub: '' };
  const ttl = document.getElementById('topbar-title');
  const sub = document.getElementById('topbar-sub');
  if (ttl) ttl.textContent = info.title;
  if (sub) sub.textContent = info.sub;

  document.querySelector('.sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('active');
}

function refreshStaffSection() {
  loadStaffStats();
  if (staffCurrentSection === 'students') loadStaffStudents();
  else if (staffCurrentSection === 'finalprojects') loadStaffFyp();
  else if (staffCurrentSection === 'internships') loadStaffInternships();
  else if (staffCurrentSection === 'semestermarks') loadStaffSemesterMarks();
  else if (staffCurrentSection === 'ciamarks') loadStaffCiaMarks();
  showToast('Refreshed assigned records', 'info');
}

// ── Dashboard Stats ───────────────────────────────────────────
async function loadStaffStats() {
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
//  MODULE 1: STUDENTS DIRECTORY
// ════════════════════════════════════════════════════════════════
async function loadStaffStudents() {
  try {
    const res = await API.students.getAll();
    assignedStudents = res.data || [];
    staffStudents = assignedStudents;
    renderStaffStudents(assignedStudents);
    populateStaffStudentDropdowns();
  } catch (err) {
    showToast('Failed to load students: ' + err.message, 'error');
  }
}

function renderStaffStudents(students) {
  const tbody = document.getElementById('staff-students-tbody');
  if (!tbody) return;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--slate-400);">No students found in directory.</td></tr>`;
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
      <td>${escapeHtml(s.email)}</td>
      <td>${escapeHtml(s.phone)}</td>
    </tr>`
    )
    .join('');
}

function filterStaffStudents() {
  const q = (document.getElementById('staff-student-search')?.value || '').toLowerCase().trim();
  const filtered = assignedStudents.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.registerNumber.toLowerCase().includes(q) ||
      (s.umisId && s.umisId.toLowerCase().includes(q)) ||
      (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
      s.email.toLowerCase().includes(q)
  );
  renderStaffStudents(filtered);
}

function populateStaffStudentDropdowns() {
  const dropdownIds = ['staff-fyp-regno', 'staff-int-regno', 'staff-sm-regno', 'staff-cia-regno'];
  const optionsHtml =
    '<option value="">Select Student</option>' +
    assignedStudents.map((s) => `<option value="${s.registerNumber}">${escapeHtml(s.name)} (${s.registerNumber})</option>`).join('');

  dropdownIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = optionsHtml;
  });
}

// ════════════════════════════════════════════════════════════════
//  MODULE 2: FINAL-YEAR PROJECT REPORT
// ════════════════════════════════════════════════════════════════
async function loadStaffFyp() {
  try {
    const res = await API.finalProjects.getAll();
    staffFyp = res.data || [];
    renderStaffFyp(staffFyp);
  } catch (err) {
    showToast('Failed to load FYP reports: ' + err.message, 'error');
  }
}

function renderStaffFyp(projects) {
  const tbody = document.getElementById('staff-fyp-tbody');
  if (!tbody) return;

  if (projects.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--slate-400);">No FYP reports submitted by your assigned students.</td></tr>`;
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
                <button class="btn btn-outline btn-sm" onclick="previewStaffPdf('fyp', '${p._id}', '${escapeHtml(p.projectTitle)}')">Preview</button>
                <a href="${API.getFileDownloadUrl('fyp', p._id)}" target="_blank" class="btn btn-secondary btn-sm">Download</a>
               </div>`
            : '<span style="color:var(--slate-400);font-size:12px;">No PDF</span>'
        }
      </td>
      <td>${statusBadge(p.status || 'Submitted')}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="editStaffFyp('${p._id}')">Update</button>
      </td>
    </tr>`
    )
    .join('');
}

function openStaffFypModal() {
  document.getElementById('staff-fyp-title').textContent = 'Upload Final-Year Project Report';
  document.getElementById('staff-fyp-id').value = '';
  document.getElementById('staff-fyp-form').reset();
  openModal('staff-fyp-modal');
}

function editStaffFyp(id) {
  const p = staffFyp.find((item) => item._id === id);
  if (!p) return;

  document.getElementById('staff-fyp-title').textContent = 'Update FYP Report';
  document.getElementById('staff-fyp-id').value = p._id;
  document.getElementById('staff-fyp-regno').value = p.registerNumber;
  document.getElementById('staff-fyp-proj-title').value = p.projectTitle;
  document.getElementById('staff-fyp-tech').value = p.technologyUsed || '';
  document.getElementById('staff-fyp-status').value = p.status || 'Submitted';
  document.getElementById('staff-fyp-desc').value = p.projectDescription || '';
  openModal('staff-fyp-modal');
}

async function saveStaffFyp(e) {
  e.preventDefault();
  const id = document.getElementById('staff-fyp-id').value;
  const formData = new FormData();
  formData.append('registerNumber', document.getElementById('staff-fyp-regno').value);
  formData.append('projectTitle', document.getElementById('staff-fyp-proj-title').value.trim());
  formData.append('technologyUsed', document.getElementById('staff-fyp-tech').value.trim());
  formData.append('status', document.getElementById('staff-fyp-status').value);
  formData.append('projectDescription', document.getElementById('staff-fyp-desc').value.trim());

  const fileInput = document.getElementById('staff-fyp-file');
  if (fileInput.files.length > 0) formData.append('reportPdf', fileInput.files[0]);

  try {
    if (id) {
      await API.finalProjects.update(id, formData);
      showToast('Project report updated', 'success');
    } else {
      await API.finalProjects.create(formData);
      showToast('Project report uploaded', 'success');
    }
    closeModal('staff-fyp-modal');
    await loadStaffFyp();
    loadStaffStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 3: INTERNSHIP PROJECT REPORT
// ════════════════════════════════════════════════════════════════
async function loadStaffInternships() {
  try {
    const res = await API.internships.getAll();
    staffInternships = res.data || [];
    renderStaffInternships(staffInternships);
  } catch (err) {
    showToast('Failed to load internships: ' + err.message, 'error');
  }
}

function renderStaffInternships(internships) {
  const tbody = document.getElementById('staff-internships-tbody');
  if (!tbody) return;

  if (internships.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--slate-400);">No internship reports submitted by your assigned students.</td></tr>`;
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
        <div style="display:flex;gap:4px;">
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
        <button class="btn btn-secondary btn-sm" onclick="editStaffInternship('${int._id}')">Update</button>
      </td>
    </tr>`
    )
    .join('');
}

function openStaffInternshipModal() {
  document.getElementById('staff-int-id').value = '';
  document.getElementById('staff-internship-form').reset();
  openModal('staff-internship-modal');
}

function editStaffInternship(id) {
  const int = staffInternships.find((item) => item._id === id);
  if (!int) return;

  document.getElementById('staff-int-id').value = int._id;
  document.getElementById('staff-int-regno').value = int.registerNumber;
  document.getElementById('staff-int-company').value = int.companyName;
  document.getElementById('staff-int-domain').value = int.internshipDomain;
  document.getElementById('staff-int-title').value = int.projectTitle;
  document.getElementById('staff-int-duration').value = int.duration;
  document.getElementById('staff-int-status').value = int.completionStatus || 'Completed';
  openModal('staff-internship-modal');
}

async function saveStaffInternship(e) {
  e.preventDefault();
  const id = document.getElementById('staff-int-id').value;
  const formData = new FormData();
  formData.append('registerNumber', document.getElementById('staff-int-regno').value);
  formData.append('companyName', document.getElementById('staff-int-company').value.trim());
  formData.append('internshipDomain', document.getElementById('staff-int-domain').value.trim());
  formData.append('projectTitle', document.getElementById('staff-int-title').value.trim());
  formData.append('duration', document.getElementById('staff-int-duration').value.trim());
  formData.append('completionStatus', document.getElementById('staff-int-status').value);

  const repFile = document.getElementById('staff-int-report-file');
  if (repFile.files.length > 0) formData.append('reportPdf', repFile.files[0]);

  const certFile = document.getElementById('staff-int-cert-file');
  if (certFile.files.length > 0) formData.append('certificatePdf', certFile.files[0]);

  try {
    if (id) {
      await API.internships.update(id, formData);
      showToast('Internship updated', 'success');
    } else {
      await API.internships.create(formData);
      showToast('Internship added', 'success');
    }
    closeModal('staff-internship-modal');
    await loadStaffInternships();
    loadStaffStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 4: SEMESTER MARKS
// ════════════════════════════════════════════════════════════════
let staffSelectedSemBatch = '';
let staffSelectedSemNumber = '';

function getStaffBatchBadge(batch) {
  const b = String(batch || '').trim();
  if (b.includes('2023')) return `<span class="badge-batch badge-batch-2023">🎓 2023 Batch</span>`;
  if (b.includes('2024')) return `<span class="badge-batch badge-batch-2024">📘 2024 Batch</span>`;
  if (b.includes('2025')) return `<span class="badge-batch badge-batch-2025">⚡ 2025 Batch</span>`;
  if (b.includes('2026')) return `<span class="badge-batch badge-batch-2026">🎓 2026 Batch</span>`;
  return `<span class="badge-batch badge-batch-other">${escapeHtml(b || 'General')}</span>`;
}

async function loadStaffSemesterMarks() {
  try {
    const res = await API.semesterMarks.getAll();
    staffSemesterMarks = res.data || [];
    filterStaffSemesterMarks();
  } catch (err) {
    showToast('Failed to load semester marks: ' + err.message, 'error');
  }
}

function renderStaffSemesterMarks(marks) {
  const tbody = document.getElementById('staff-semestermarks-tbody');
  if (!tbody) return;

  if (marks.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:36px;color:var(--slate-400);">No semester marks match the selected Batch &amp; Semester filter for your assigned students.</td></tr>`;
    return;
  }

  tbody.innerHTML = marks
    .map(
      (m) => `
    <tr>
      <td><strong>${escapeHtml(m.studentName)}</strong></td>
      <td><span class="badge badge-info">${escapeHtml(m.registerNumber)}</span></td>
      <td>${getStaffBatchBadge(m.batch)}</td>
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
        <button class="btn btn-secondary btn-sm" onclick="editStaffSemesterMark('${m._id}')">Edit</button>
      </td>
    </tr>`
    )
    .join('');
}

function selectStaffBatchFilter(batch) {
  staffSelectedSemBatch = batch;

  const pills = document.querySelectorAll('#staff-batch-filter-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));

  if (!batch) {
    document.getElementById('staff-pill-batch-all')?.classList.add('active');
  } else if (batch === '2023') {
    document.getElementById('staff-pill-batch-2023')?.classList.add('active');
  } else if (batch === '2024') {
    document.getElementById('staff-pill-batch-2024')?.classList.add('active');
  } else if (batch === '2025') {
    document.getElementById('staff-pill-batch-2025')?.classList.add('active');
  }

  const dd = document.getElementById('staff-sem-batch-filter');
  if (dd) dd.value = batch;

  filterStaffSemesterMarks();
}

function selectStaffSemFilter(sem) {
  staffSelectedSemNumber = sem;

  const pills = document.querySelectorAll('#staff-sem-filter-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));

  if (!sem) {
    document.getElementById('staff-pill-sem-all')?.classList.add('active');
  } else {
    document.getElementById(`staff-pill-sem-${sem}`)?.classList.add('active');
  }

  const dd = document.getElementById('staff-sem-filter');
  if (dd) dd.value = sem;

  filterStaffSemesterMarks();
}

function onStaffBatchDropdownChange() {
  const val = document.getElementById('staff-sem-batch-filter')?.value || '';
  selectStaffBatchFilter(val);
}

function onStaffSemDropdownChange() {
  const val = document.getElementById('staff-sem-filter')?.value || '';
  selectStaffSemFilter(val);
}

function resetStaffSemesterFilters() {
  const searchInput = document.getElementById('staff-sem-search');
  if (searchInput) searchInput.value = '';
  selectStaffBatchFilter('');
  selectStaffSemFilter('');
}

function filterStaffSemesterMarks() {
  const q = (document.getElementById('staff-sem-search')?.value || '').toLowerCase().trim();
  const batchFilter = staffSelectedSemBatch.trim();
  const semFilter = staffSelectedSemNumber.trim();

  const filtered = staffSemesterMarks.filter((m) => {
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

  const batchLabel = document.getElementById('staff-sem-status-batch');
  if (batchLabel) {
    batchLabel.textContent = batchFilter ? `${batchFilter} Batch` : 'All Batches';
  }

  const semLabel = document.getElementById('staff-sem-status-sem');
  if (semLabel) {
    semLabel.textContent = semFilter ? `Semester ${semFilter}` : 'All Semesters (1-6)';
  }

  const countBadge = document.getElementById('staff-sem-count-badge');
  if (countBadge) {
    countBadge.textContent = `(Showing ${filtered.length} of ${staffSemesterMarks.length} records)`;
  }

  renderStaffSemesterMarks(filtered);
}

function onStaffSemMarkStudentChange() {
  const reg = (document.getElementById('staff-sm-regno')?.value || '').trim();
  if (!reg || !staffStudents) return;
  const s = staffStudents.find((stu) => stu.registerNumber === reg);
  if (s && s.batch) {
    const batchSel = document.getElementById('staff-sm-batch');
    if (batchSel) {
      let matched = false;
      for (let i = 0; i < batchSel.options.length; i++) {
        if (batchSel.options[i].value === s.batch || batchSel.options[i].text.includes(s.batch)) {
          batchSel.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched) {
        batchSel.add(new Option(`${s.batch} Batch`, s.batch));
        batchSel.value = s.batch;
      }
    }
  }
}

function openStaffSemesterMarkModal() {
  document.getElementById('staff-sm-id').value = '';
  document.getElementById('staff-sem-mark-form').reset();
  document.getElementById('staff-sm-max').value = '100';
  document.getElementById('staff-sm-year').value = '2023-2024';

  if (staffSelectedSemNumber) {
    document.getElementById('staff-sm-semester').value = staffSelectedSemNumber;
  }

  // Populate students dropdown
  const sel = document.getElementById('staff-sm-regno');
  sel.innerHTML = '<option value="">-- Select Assigned Student --</option>' +
    staffStudents.map(s => `<option value="${escapeHtml(s.registerNumber)}">${escapeHtml(s.name)} (${escapeHtml(s.registerNumber)})</option>`).join('');

  openModal('staff-sem-mark-modal');
}

function editStaffSemesterMark(id) {
  const m = staffSemesterMarks.find((item) => item._id === id);
  if (!m) return;

  const sel = document.getElementById('staff-sm-regno');
  sel.innerHTML = staffStudents.map(s => `<option value="${escapeHtml(s.registerNumber)}">${escapeHtml(s.name)} (${escapeHtml(s.registerNumber)})</option>`).join('');

  document.getElementById('staff-sm-id').value = m._id;
  document.getElementById('staff-sm-regno').value = m.registerNumber;
  document.getElementById('staff-sm-semester').value = m.semester;
  document.getElementById('staff-sm-code').value = m.subjectCode;
  document.getElementById('staff-sm-name').value = m.subjectName;
  document.getElementById('staff-sm-max').value = m.maxMarks;
  document.getElementById('staff-sm-obt').value = m.obtainedMarks;
  document.getElementById('staff-sm-year').value = m.academicYear;

  const batchSel = document.getElementById('staff-sm-batch');
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

  openModal('staff-sem-mark-modal');
}

async function saveStaffSemesterMark(e) {
  e.preventDefault();
  const id = document.getElementById('staff-sm-id').value;
  const max = Number(document.getElementById('staff-sm-max').value);
  const obt = Number(document.getElementById('staff-sm-obt').value);

  if (obt > max) {
    showToast(`Validation error: Obtained marks (${obt}) cannot exceed maximum marks (${max})`, 'warning');
    return;
  }

  const payload = {
    registerNumber: document.getElementById('staff-sm-regno').value,
    batch: document.getElementById('staff-sm-batch')?.value.trim() || '2022-2026',
    semester: Number(document.getElementById('staff-sm-semester').value),
    subjectCode: document.getElementById('staff-sm-code').value.trim(),
    subjectName: document.getElementById('staff-sm-name').value.trim(),
    maxMarks: max,
    obtainedMarks: obt,
    academicYear: document.getElementById('staff-sm-year').value.trim(),
  };

  try {
    if (id) {
      await API.semesterMarks.update(id, payload);
      showToast('Semester mark updated', 'success');
    } else {
      await API.semesterMarks.create(payload);
      showToast('Semester mark recorded', 'success');
    }
    closeModal('staff-sem-mark-modal');
    await loadStaffSemesterMarks();
    loadStaffStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 5 & 6: CIA 1, 2, 3 MARKS
// ════════════════════════════════════════════════════════════════
//  MODULE 5: CIA MARKS (UNIFIED CIA 1, CIA 2, CIA 3)
// ════════════════════════════════════════════════════════════════
async function loadStaffCiaMarks() {
  try {
    const res = await API.ciaMarks.getAll({});
    staffCiaMarks = res.data || [];
    filterStaffCiaMarks();
  } catch (err) {
    showToast('Failed to load CIA marks: ' + err.message, 'error');
  }
}

function selectStaffCiaTypeFilter(type) {
  staffCiaSelectedType = type;
  const pills = document.querySelectorAll('#staff-cia-type-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));
  if (!type) document.getElementById('staff-pill-cia-type-all')?.classList.add('active');
  else if (type === 'CIA 1') document.getElementById('staff-pill-cia-type-1')?.classList.add('active');
  else if (type === 'CIA 2') document.getElementById('staff-pill-cia-type-2')?.classList.add('active');
  else if (type === 'CIA 3') document.getElementById('staff-pill-cia-type-3')?.classList.add('active');
  filterStaffCiaMarks();
}

function selectStaffCiaBatchFilter(batch) {
  staffCiaSelectedBatch = batch;
  const pills = document.querySelectorAll('#staff-cia-batch-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));
  if (!batch) document.getElementById('staff-pill-cia-batch-all')?.classList.add('active');
  else document.getElementById(`staff-pill-cia-batch-${batch}`)?.classList.add('active');
  filterStaffCiaMarks();
}

function selectStaffCiaSemFilter(sem) {
  staffCiaSelectedSem = sem;
  const pills = document.querySelectorAll('#staff-cia-sem-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));
  if (!sem) document.getElementById('staff-pill-cia-sem-all')?.classList.add('active');
  else document.getElementById(`staff-pill-cia-sem-${sem}`)?.classList.add('active');
  filterStaffCiaMarks();
}

function resetStaffCiaFilters() {
  staffCiaSelectedType = '';
  staffCiaSelectedBatch = '';
  staffCiaSelectedSem = '';
  const searchInput = document.getElementById('staff-ciamarks-search');
  if (searchInput) searchInput.value = '';
  selectStaffCiaTypeFilter('');
  selectStaffCiaBatchFilter('');
  selectStaffCiaSemFilter('');
}

function renderStaffCiaMarks(marks) {
  const tbody = document.getElementById('staff-ciamarks-tbody');
  if (!tbody) return;

  if (marks.length === 0) {
    const typeNotice = staffCiaSelectedType ? ` for ${staffCiaSelectedType}` : '';
    const batchNotice = staffCiaSelectedBatch ? ` in ${staffCiaSelectedBatch} Batch` : '';
    const semNotice = staffCiaSelectedSem ? ` Semester ${staffCiaSelectedSem}` : '';
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
        <button class="btn btn-secondary btn-sm" onclick="editStaffCiaMark('${m._id}')">Edit</button>
      </td>
    </tr>`
    )
    .join('');
}

function filterStaffCiaMarks() {
  const q = (document.getElementById('staff-ciamarks-search')?.value || '').toLowerCase().trim();
  const type = staffCiaSelectedType;
  const sem = staffCiaSelectedSem;
  const batch = staffCiaSelectedBatch;

  const typeLabel = document.getElementById('staff-cia-type-label');
  if (typeLabel) typeLabel.textContent = type ? type : 'All CIA';

  const batchLabel = document.getElementById('staff-cia-batch-label');
  if (batchLabel) batchLabel.textContent = batch ? `${batch} Batch` : 'All Batches';

  const semLabel = document.getElementById('staff-cia-sem-label');
  if (semLabel) semLabel.textContent = sem ? `Semester ${sem}` : 'All Semesters';

  const filtered = staffCiaMarks.filter((m) => {
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

  const countBadge = document.getElementById('staff-cia-count-badge');
  if (countBadge) countBadge.textContent = `(${filtered.length} of ${staffCiaMarks.length} records)`;

  renderStaffCiaMarks(filtered);
}

function openStaffCiaMarkModal(type) {
  document.getElementById('staff-cia-id').value = '';
  document.getElementById('staff-cia-mark-form').reset();
  if (type) document.getElementById('staff-cia-type').value = type;
  else if (staffCiaSelectedType) document.getElementById('staff-cia-type').value = staffCiaSelectedType;
  else document.getElementById('staff-cia-type').value = 'CIA 1';
  document.getElementById('staff-cia-max').value = '50';

  const sel = document.getElementById('staff-cia-regno');
  if (sel && staffStudents) {
    sel.innerHTML = '<option value="">-- Select Student --</option>' +
      staffStudents.map(s => `<option value="${escapeHtml(s.registerNumber)}">${escapeHtml(s.name)} (${escapeHtml(s.registerNumber)})</option>`).join('');
  }

  openModal('staff-cia-mark-modal');
}

function editStaffCiaMark(id) {
  const m = staffCiaMarks.find((item) => item._id === id);
  if (!m) return;

  const sel = document.getElementById('staff-cia-regno');
  if (sel && staffStudents) {
    sel.innerHTML = staffStudents.map(s => `<option value="${escapeHtml(s.registerNumber)}">${escapeHtml(s.name)} (${escapeHtml(s.registerNumber)})</option>`).join('');
  }

  document.getElementById('staff-cia-id').value = m._id;
  document.getElementById('staff-cia-type').value = m.assessmentType;
  document.getElementById('staff-cia-regno').value = m.registerNumber;
  document.getElementById('staff-cia-semester').value = m.semester;
  document.getElementById('staff-cia-code').value = m.subjectCode;
  document.getElementById('staff-cia-name').value = m.subjectName;
  document.getElementById('staff-cia-max').value = m.maxMarks;
  document.getElementById('staff-cia-obt').value = m.obtainedMarks;
  openModal('staff-cia-mark-modal');
}

async function saveStaffCiaMark(e) {
  e.preventDefault();
  const id = document.getElementById('staff-cia-id').value;
  const asmtType = document.getElementById('staff-cia-type').value;
  const max = Number(document.getElementById('staff-cia-max').value);
  const obt = Number(document.getElementById('staff-cia-obt').value);

  if (obt > max) {
    showToast(`Validation error: Obtained marks (${obt}) cannot exceed maximum marks (${max}) for ${asmtType}.`, 'warning');
    return;
  }

  const reg = document.getElementById('staff-cia-regno').value;
  const stu = (staffStudents || []).find(s => s.registerNumber === reg);

  const payload = {
    assessmentType: asmtType,
    registerNumber: reg,
    semester: Number(document.getElementById('staff-cia-semester').value),
    subjectCode: document.getElementById('staff-cia-code').value.trim(),
    subjectName: document.getElementById('staff-cia-name').value.trim(),
    maxMarks: max,
    obtainedMarks: obt,
    batch: stu?.batch || '2024-2027',
    academicYear: stu?.academicYear || '2024 - 2027',
  };

  try {
    if (id) {
      await API.ciaMarks.update(id, payload);
      showToast(`${asmtType} mark updated`, 'success');
    } else {
      await API.ciaMarks.create(payload);
      showToast(`${asmtType} mark added`, 'success');
    }
    closeModal('staff-cia-mark-modal');
    await loadStaffCiaMarks();
    loadStaffStats();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Preview PDF ───────────────────────────────────────────────
function previewStaffPdf(type, id, title = 'Document Preview') {
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
