// ============================================================
//  js/student.js — Student Portal Logic for College ERP
//  Displays only personal academic information & authorized reports
// ============================================================

let currentStudentUser = null;
let currentStudentProfile = null;
let currentStudentSection = 'dashboard';

document.addEventListener('DOMContentLoaded', async () => {
  currentStudentUser = Auth.requireAuth(['student']);
  if (!currentStudentUser) return;

  const nameEl = document.getElementById('student-name');
  const avatarEl = document.getElementById('student-avatar');
  if (nameEl) nameEl.textContent = currentStudentUser.name || 'Student';
  if (avatarEl) {
    const initials = (currentStudentUser.name || 'ST')
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    avatarEl.textContent = initials;
  }

  // Load student profile & records
  await loadProfile();
  await Promise.all([
    loadStudentStats(),
    loadStudentFyp(),
    loadStudentInternships(),
    loadStudentSemesterMarks(),
    loadStudentCiaMarks(),
  ]);
});

// ── Navigation ────────────────────────────────────────────────
const studentTitles = {
  dashboard: { title: 'My Dashboard', sub: 'Your personal academic overview' },
  profile: { title: 'My Student Details', sub: 'Module 1: Complete student profile and mentor details' },
  finalproject: { title: 'My Final-Year Project Report', sub: 'Module 2: Project documentation and report download' },
  internship: { title: 'My Internship Project Report', sub: 'Module 3: Internship reports and certificates' },
  semestermarks: { title: 'My Semester Mark List', sub: 'Module 4: Semester examination grade records' },
  ciamarks: { title: 'My CIA Marks', sub: 'Module 5: Continuous Internal Assessment (CIA 1, CIA 2, CIA 3)' },
};

function navigateToStudent(section) {
  currentStudentSection = section;
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));

  const sec = document.getElementById(`section-${section}`);
  const nav = document.querySelector(`.nav-item[data-section="${section}"]`);
  if (sec) sec.classList.add('active');
  if (nav) nav.classList.add('active');

  const info = studentTitles[section] || { title: section, sub: '' };
  const ttl = document.getElementById('topbar-title');
  const sub = document.getElementById('topbar-sub');
  if (ttl) ttl.textContent = info.title;
  if (sub) sub.textContent = info.sub;

  document.querySelector('.sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('active');
}

function refreshStudentSection() {
  loadStudentStats();
  if (currentStudentSection === 'profile') loadProfile();
  else if (currentStudentSection === 'finalproject') loadStudentFyp();
  else if (currentStudentSection === 'internship') loadStudentInternships();
  else if (currentStudentSection === 'semestermarks') loadStudentSemesterMarks();
  else if (currentStudentSection === 'ciamarks') loadStudentCiaMarks();
  showToast('Records refreshed', 'info');
}

// ── Dashboard Overview Stats ──────────────────────────────────
async function loadStudentStats() {
  try {
    const res = await API.stats.get();
    if (res.success) {
      setText('s-stat-fyp', res.data.finalYearProjects);
      setText('s-stat-internships', res.data.internshipReports);
      setText('s-stat-semester-marks', res.data.semesterMarks);
      setText('s-stat-cia-marks', res.data.ciaMarks);
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 1: MY STUDENT DETAILS
// ════════════════════════════════════════════════════════════════
async function loadProfile() {
  try {
    const res = await API.students.getMyProfile();
    if (!res.success || !res.data) return;

    currentStudentProfile = res.data;
    const s = currentStudentProfile;

    setText('stu-prof-name', s.name);
    setText('stu-prof-sub', `${s.department} · Batch ${s.batch}`);
    setText('stu-prof-regno', s.registerNumber);
    setText('stu-prof-rollno', s.umisId || s.rollNumber || '—');
    setText('stu-prof-umisid', s.umisId || s.rollNumber || '—');
    setText('stu-prof-dept', s.department);
    setText('stu-prof-course-year', `${s.course} (${s.academicYear})`);
    setText('stu-prof-batch', s.batch);
    setText('stu-prof-email', s.email);
    setText('stu-prof-phone', s.phone);

    const avatar = document.getElementById('stu-prof-avatar');
    if (avatar) {
      avatar.textContent = s.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
    }
  } catch (err) {
    showToast('Failed to load student details: ' + err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 2: MY FINAL-YEAR PROJECT REPORT
// ════════════════════════════════════════════════════════════════
async function loadStudentFyp() {
  try {
    const res = await API.finalProjects.getAll();
    const projects = res.data || [];
    const tbody = document.getElementById('student-fyp-tbody');
    if (!tbody) return;

    if (projects.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--slate-400);">No final-year project report on record. Contact your faculty guide.</td></tr>`;
      return;
    }

    tbody.innerHTML = projects
      .map(
        (p) => `
      <tr>
        <td><strong>${escapeHtml(p.projectTitle)}</strong></td>
        <td><small style="color:var(--slate-600);">${escapeHtml(p.projectDescription || 'No description provided')}</small></td>
        <td><small>${escapeHtml(p.technologyUsed || '—')}</small></td>
        <td>${escapeHtml(p.projectGuide || '—')}</td>
        <td>${formatDate(p.submissionDate)}</td>
        <td>${statusBadge(p.status || 'Submitted')}</td>
        <td>
          ${
            p.reportPdf
              ? `<div style="display:flex;gap:6px;">
                  <button class="btn btn-outline btn-sm" onclick="previewStudentPdf('fyp', '${p._id}', '${escapeHtml(p.projectTitle)}')">Preview</button>
                  <a href="${API.getFileDownloadUrl('fyp', p._id)}" target="_blank" class="btn btn-primary btn-sm">Download PDF</a>
                 </div>`
              : '<span style="color:var(--slate-400);font-size:12px;">No document uploaded</span>'
          }
        </td>
      </tr>`
      )
      .join('');
  } catch (err) {
    showToast('Failed to load FYP report: ' + err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 3: MY INTERNSHIP PROJECT REPORT
// ════════════════════════════════════════════════════════════════
async function loadStudentInternships() {
  try {
    const res = await API.internships.getAll();
    const list = res.data || [];
    const tbody = document.getElementById('student-internship-tbody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--slate-400);">No internship reports submitted on record.</td></tr>`;
      return;
    }

    tbody.innerHTML = list
      .map(
        (int) => `
      <tr>
        <td><strong>${escapeHtml(int.companyName)}</strong></td>
        <td>${escapeHtml(int.internshipDomain)}</td>
        <td>${escapeHtml(int.projectTitle)}</td>
        <td><small>${escapeHtml(int.technologyUsed || '—')}</small></td>
        <td>${escapeHtml(int.duration)}</td>
        <td>${statusBadge(int.completionStatus || 'Completed')}</td>
        <td>
          ${
            int.reportPdf
              ? `<div style="display:flex;gap:4px;">
                  <button class="btn btn-outline btn-sm" onclick="previewStudentPdf('internship-report', '${int._id}', 'Internship Report')">Preview</button>
                  <a href="${API.getFileDownloadUrl('internship-report', int._id)}" target="_blank" class="btn btn-primary btn-sm">Download</a>
                 </div>`
              : '<span style="color:var(--slate-400);font-size:12px;">None</span>'
          }
        </td>
        <td>
          ${
            int.certificatePdf
              ? `<a href="${API.getFileDownloadUrl('internship-cert', int._id)}" target="_blank" class="btn btn-secondary btn-sm">Download</a>`
              : '<span style="color:var(--slate-400);font-size:12px;">None</span>'
          }
        </td>
      </tr>`
      )
      .join('');
  } catch (err) {
    showToast('Failed to load internship report: ' + err.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════════
//  MODULE 4: MY SEMESTER MARK LIST
// ════════════════════════════════════════════════════════════════
let studentAllSemesterMarks = [];
let studentSelectedSemNumber = '';

async function loadStudentSemesterMarks() {
  try {
    const res = await API.semesterMarks.getAll();
    studentAllSemesterMarks = res.data || [];

    // Update batch badge
    if (currentStudentProfile && currentStudentProfile.batch) {
      const badge = document.getElementById('student-sem-batch-badge');
      if (badge) {
        const b = currentStudentProfile.batch;
        let badgeClass = 'badge-batch-other';
        if (b.includes('2024')) badgeClass = 'badge-batch-2024';
        else if (b.includes('2025')) badgeClass = 'badge-batch-2025';
        else if (b.includes('2023')) badgeClass = 'badge-batch-2023';
        else if (b.includes('2026')) badgeClass = 'badge-batch-2026';
        badge.className = `badge-batch ${badgeClass}`;
        badge.textContent = `🎓 ${b} Batch`;
      }
    }

    filterStudentSemesterMarks();
    if (currentStudentProfile && currentStudentProfile.registerNumber) {
      renderStudentAcademicCardInline(currentStudentProfile.registerNumber, studentSelectedSemNumber || 1);
    }
  } catch (err) {
    showToast('Failed to load semester marks: ' + err.message, 'error');
  }
}

function selectStudentSemFilter(sem) {
  studentSelectedSemNumber = sem;

  const pills = document.querySelectorAll('#student-sem-filter-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));

  if (!sem) {
    document.getElementById('student-pill-sem-all')?.classList.add('active');
  } else {
    document.getElementById(`student-pill-sem-${sem}`)?.classList.add('active');
  }

  filterStudentSemesterMarks();
  if (currentStudentProfile && currentStudentProfile.registerNumber) {
    renderStudentAcademicCardInline(currentStudentProfile.registerNumber, sem || 1);
  }
}

function filterStudentSemesterMarks() {
  const sem = studentSelectedSemNumber.trim();
  const filtered = studentAllSemesterMarks.filter((m) => {
    return !sem || String(m.semester) === String(sem);
  });

  const label = document.getElementById('student-sem-status-label');
  if (label) {
    label.textContent = sem ? `Semester ${sem}` : 'All Semesters (1-6)';
  }

  const countBadge = document.getElementById('student-sem-count-badge');
  if (countBadge) {
    countBadge.textContent = `(${filtered.length} of ${studentAllSemesterMarks.length} records)`;
  }

  const tbody = document.getElementById('student-sem-tbody');
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:36px;color:var(--slate-400);">No semester marks published for ${sem ? 'Semester ' + sem : 'your records'}.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((m) => {
      const pct = Math.round((m.obtainedMarks / m.maxMarks) * 100);
      const regNo = m.registerNumber || (currentStudentProfile ? currentStudentProfile.registerNumber : '');
      return `
    <tr>
      <td><span class="badge badge-primary">Semester ${m.semester}</span></td>
      <td><span class="badge badge-info">${escapeHtml(m.subjectCode)}</span></td>
      <td><strong>${escapeHtml(m.subjectName)}</strong></td>
      <td><span class="badge ${m.subjectType === 'Practical' ? 'badge-warning' : 'badge-secondary'}">${escapeHtml(m.subjectType || 'Theory')}</span></td>
      <td>${m.maxMarks}</td>
      <td><strong>${m.obtainedMarks}</strong></td>
      <td>${pct}%</td>
      <td><span class="badge ${m.resultStatus === 'Pass' ? 'badge-success' : 'badge-danger'}">${m.resultStatus}</span></td>
      <td>${escapeHtml(m.academicYear)}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          <button class="btn btn-outline btn-sm" onclick="openStudentAcademicDetailsModal('${escapeHtml(regNo)}', ${m.semester})">👁️ Detail View</button>
          <a href="${API.semesterMarks.getMarklistPdfUrl(regNo, m.semester)}" target="_blank" class="btn btn-secondary btn-sm" title="View/Print Marksheet PDF">📄 PDF</a>
        </div>
      </td>
    </tr>`;
    })
    .join('');
}

let allStudentCiaMarks = [];
let studentCiaSelectedType = '';
let studentCiaSelectedSem = '';

// ════════════════════════════════════════════════════════════════
//  MODULE 5: MY CIA MARKS (UNIFIED CIA 1, CIA 2, CIA 3)
// ════════════════════════════════════════════════════════════════
async function loadStudentCiaMarks() {
  try {
    const res = await API.ciaMarks.getAll({});
    allStudentCiaMarks = res.data || [];
    filterStudentCiaMarks();
  } catch (err) {
    showToast('Failed to load CIA marks: ' + err.message, 'error');
  }
}

function selectStudentCiaTypeFilter(type) {
  studentCiaSelectedType = type;
  const pills = document.querySelectorAll('#student-cia-type-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));
  if (!type) document.getElementById('student-pill-cia-type-all')?.classList.add('active');
  else if (type === 'CIA 1') document.getElementById('student-pill-cia-type-1')?.classList.add('active');
  else if (type === 'CIA 2') document.getElementById('student-pill-cia-type-2')?.classList.add('active');
  else if (type === 'CIA 3') document.getElementById('student-pill-cia-type-3')?.classList.add('active');
  filterStudentCiaMarks();
}

function selectStudentCiaSemFilter(sem) {
  studentCiaSelectedSem = sem;
  const pills = document.querySelectorAll('#student-cia-sem-pills .filter-pill');
  pills.forEach((p) => p.classList.remove('active'));
  if (!sem) document.getElementById('student-pill-cia-sem-all')?.classList.add('active');
  else document.getElementById(`student-pill-cia-sem-${sem}`)?.classList.add('active');
  filterStudentCiaMarks();
}

function resetStudentCiaFilters() {
  studentCiaSelectedType = '';
  studentCiaSelectedSem = '';
  selectStudentCiaTypeFilter('');
  selectStudentCiaSemFilter('');
}

function filterStudentCiaMarks() {
  const type = studentCiaSelectedType;
  const sem = studentCiaSelectedSem;
  const filtered = allStudentCiaMarks.filter((m) => {
    const matchType = !type || m.assessmentType === type;
    const matchSem = !sem || String(m.semester) === String(sem);
    return matchType && matchSem;
  });

  const typeLabel = document.getElementById('student-cia-type-label');
  if (typeLabel) typeLabel.textContent = type ? type : 'All CIA';

  const semLabel = document.getElementById('student-cia-sem-label');
  if (semLabel) semLabel.textContent = sem ? `Semester ${sem}` : 'All Semesters';

  const countBadge = document.getElementById('student-cia-count-badge');
  if (countBadge) {
    const typeStr = type || 'All CIA';
    const semStr = sem ? `Semester ${sem}` : 'All Semesters';
    countBadge.textContent = `${typeStr} · ${semStr} (${filtered.length} Records)`;
  }

  const subCount = document.getElementById('student-cia-sub-count');
  if (subCount) subCount.textContent = `(${filtered.length} of ${allStudentCiaMarks.length} records)`;

  renderStudentCiaMarks(filtered);
}

function renderStudentCiaMarks(marks) {
  const tbody = document.getElementById('student-ciamarks-tbody');
  if (!tbody) return;

  if (marks.length === 0) {
    const typeNotice = studentCiaSelectedType ? ` for ${studentCiaSelectedType}` : '';
    const semNotice = studentCiaSelectedSem ? ` Semester ${studentCiaSelectedSem}` : '';
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--slate-400);">No CIA marks found${typeNotice}${semNotice}.</td></tr>`;
    return;
  }

  tbody.innerHTML = marks
    .map(
      (m) => `
    <tr>
      <td><span class="badge ${m.assessmentType === 'CIA 1' ? 'badge-primary' : m.assessmentType === 'CIA 2' ? 'badge-warning' : 'badge-info'}">${escapeHtml(m.assessmentType)}</span></td>
      <td>Semester ${m.semester}</td>
      <td><span class="badge badge-info">${escapeHtml(m.subjectCode)}</span></td>
      <td>${escapeHtml(m.subjectName)}</td>
      <td><span class="badge badge-secondary" style="font-size:11px;">${escapeHtml(m.subjectType || 'Theory')}</span></td>
      <td>${m.maxMarks}</td>
      <td><strong>${m.obtainedMarks}</strong></td>
      <td>${formatDate(m.examDate)}</td>
      <td><span class="badge ${m.resultStatus === 'Pass' ? 'badge-success' : 'badge-danger'}">${m.resultStatus}</span></td>
    </tr>`
    )
    .join('');
}

// ── Preview PDF ───────────────────────────────────────────────
function previewStudentPdf(type, id, title = 'Document Preview') {
  const iframe = document.getElementById('pdf-preview-iframe');
  const modalTitle = document.getElementById('pdf-preview-title');
  if (iframe) iframe.src = API.getFilePreviewUrl(type, id);
  if (modalTitle) modalTitle.textContent = title;
  openModal('pdf-preview-modal');
}

// ── Student Academic Details (Matches Exact User Screenshot) ──
async function renderStudentAcademicCardInline(regNo, sem = 1) {
  const container = document.getElementById('student-academic-card-container');
  if (!container || !regNo) return;

  try {
    const res = await API.semesterMarks.getStudentSummary(regNo, sem);
    if (!res.success || !res.data) {
      container.innerHTML = '';
      return;
    }
    renderStudentAcademicCard(container, res.data);
  } catch (err) {
    console.warn('Could not render inline academic card:', err);
    container.innerHTML = '';
  }
}

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