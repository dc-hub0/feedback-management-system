/**
 * Feedback Management System - Single Page Application Client
 * Web Technology Lab Mini Project
 * Supports 3 Roles: Admin, Faculty/Staff (User 2), Student (User 1)
 */

// Application State
const state = {
  user: null,
  token: null,
  departments: [],
  staffList: [],
  feedbacks: [],
  users: [],
  analytics: null,
  currentStarRating: 5
};

// Base API helper
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(`/api${endpoint}`, options);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Request failed');
    }
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠'}</span>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// -------------------------------------------------------------
// Initialization & Authentication
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  setupStarRatingListeners();

  const savedToken = localStorage.getItem('fms_token');
  const savedUser = localStorage.getItem('fms_user');

  if (savedToken && savedUser) {
    state.token = savedToken;
    try {
      state.user = JSON.parse(savedUser);
      // Verify token with backend
      const res = await apiCall('/auth/me');
      state.user = res.user;
      localStorage.setItem('fms_user', JSON.stringify(state.user));
    } catch {
      handleLogout(false);
      return;
    }
  }

  await loadDepartments();
  updateView();
});

// Quick 1-Click Demo Login for Lab Examiner / Evaluation
async function quickLogin(email, password) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = password;
  await performLogin(email, password);
}

// Handle Login Form Submit
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  await performLogin(email, password);
}

async function performLogin(email, password) {
  const submitBtn = document.getElementById('loginSubmitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Signing in...';
  }

  try {
    const data = await apiCall('/auth/login', 'POST', { email, password });
    state.token = data.token;
    state.user = data.user;

    localStorage.setItem('fms_token', state.token);
    localStorage.setItem('fms_user', JSON.stringify(state.user));

    showToast(`Welcome back, ${state.user.name}!`);
    await updateView();
  } catch (err) {
    // Handled in apiCall
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'Sign In to Dashboard';
    }
  }
}

// Handle Register Form Submit
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const role = document.getElementById('regRole').value;
  const department = document.getElementById('regDepartment').value;
  const extraVal = document.getElementById('regExtraField').value.trim();

  const body = {
    name,
    email,
    password,
    role,
    department,
    rollNo: role === 'student' ? extraVal : null,
    title: role === 'staff' ? extraVal : null
  };

  try {
    const data = await apiCall('/auth/register', 'POST', body);
    state.token = data.token;
    state.user = data.user;

    localStorage.setItem('fms_token', state.token);
    localStorage.setItem('fms_user', JSON.stringify(state.user));

    showToast('Account registered successfully!');
    await updateView();
  } catch {
    // Handled in apiCall
  }
}

function handleLogout(notify = true) {
  if (state.token) {
    apiCall('/auth/logout', 'POST').catch(() => {});
  }
  state.token = null;
  state.user = null;
  localStorage.removeItem('fms_token');
  localStorage.removeItem('fms_user');

  if (notify) showToast('Logged out successfully');
  updateView();
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('tabLogin');
  const regTab = document.getElementById('tabRegister');
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');

  if (tab === 'login') {
    loginTab.classList.add('active');
    regTab.classList.remove('active');
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
  } else {
    regTab.classList.add('active');
    loginTab.classList.remove('active');
    regForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
  }
}

function toggleRegRoleFields() {
  const role = document.getElementById('regRole').value;
  const label = document.getElementById('regExtraLabel');
  const input = document.getElementById('regExtraField');

  if (role === 'staff') {
    label.innerText = 'Academic Title / Designation';
    input.placeholder = 'e.g. Associate Professor / HOD';
  } else {
    label.innerText = 'Roll / Registration Number';
    input.placeholder = 'e.g. CS2026-042';
  }
}

// -------------------------------------------------------------
// View Switching & Role Dashboard Routing
// -------------------------------------------------------------
async function updateView() {
  const authSection = document.getElementById('authSection');
  const studentSection = document.getElementById('studentSection');
  const staffSection = document.getElementById('staffSection');
  const adminSection = document.getElementById('adminSection');
  const navAuth = document.getElementById('navAuth');
  const navLinks = document.getElementById('navLinks');

  // Hide all sections first
  authSection.classList.add('hidden');
  studentSection.classList.add('hidden');
  staffSection.classList.add('hidden');
  adminSection.classList.add('hidden');

  if (!state.user) {
    // Show Authentication Screen
    authSection.classList.remove('hidden');
    navAuth.innerHTML = '';
    navLinks.innerHTML = `
      <span class="nav-link active" onclick="switchAuthTab('login')">Sign In</span>
      <span class="nav-link" onclick="switchAuthTab('register')">Register</span>
    `;
    return;
  }

  // Render Logged-in Navbar
  const roleName =
    state.user.role === 'admin'
      ? 'Admin'
      : state.user.role === 'staff'
      ? 'Faculty (User 2)'
      : 'Student (User 1)';
  const roleClass = `role-${state.user.role}`;

  navAuth.innerHTML = `
    <div class="user-badge">
      <span class="user-badge-role ${roleClass}">${roleName}</span>
      <strong>${escapeHtml(state.user.name)}</strong>
    </div>
    <button class="btn btn-outline btn-sm" onclick="handleLogout()">Sign Out</button>
  `;

  // Render role-specific navigation and section
  if (state.user.role === 'student') {
    studentSection.classList.remove('hidden');
    navLinks.innerHTML = `
      <span class="nav-link active">Student Portal</span>
      <span class="nav-link" onclick="openFeedbackModal()">+ New Feedback</span>
    `;
    await loadStudentDashboard();
  } else if (state.user.role === 'staff') {
    staffSection.classList.remove('hidden');
    navLinks.innerHTML = `
      <span class="nav-link active">Faculty Console</span>
    `;
    await loadStaffDashboard();
  } else if (state.user.role === 'admin') {
    adminSection.classList.remove('hidden');
    navLinks.innerHTML = `
      <span class="nav-link active">Master Admin Console</span>
    `;
    await loadAdminDashboard();
  }
}

// -------------------------------------------------------------
// Data Loaders
// -------------------------------------------------------------
async function loadDepartments() {
  try {
    state.departments = await apiCall('/departments');

    // Populate registration dropdown
    const regDept = document.getElementById('regDepartment');
    const fbDept = document.getElementById('fbDepartment');
    const newUserDept = document.getElementById('newUserDept');
    const adminCatFilter = document.getElementById('adminCategoryFilter');

    const optionsHtml = state.departments
      .map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)} (${escapeHtml(d.code)})</option>`)
      .join('');

    if (regDept) regDept.innerHTML = `<option value="">Select Department...</option>` + optionsHtml;
    if (fbDept) fbDept.innerHTML = `<option value="">Select Department...</option>` + optionsHtml;
    if (newUserDept) newUserDept.innerHTML = `<option value="">Select Department...</option>` + optionsHtml;

    if (adminCatFilter) {
      adminCatFilter.innerHTML = `<option value="All">All Categories / Depts</option>` +
        state.departments.map(d => `<option value="${escapeHtml(d.name)}">${escapeHtml(d.name)}</option>`).join('');
    }
  } catch (err) {
    console.error('Failed to load departments', err);
  }
}

async function loadStaffList(department = null) {
  try {
    state.staffList = await apiCall('/staff');
    const fbStaff = document.getElementById('fbStaff');
    if (!fbStaff) return;

    let filtered = state.staffList;
    if (department) {
      filtered = state.staffList.filter(s => s.department === department);
    }

    if (filtered.length === 0) {
      fbStaff.innerHTML = `<option value="">Department Head / General Feedback</option>`;
      return;
    }

    fbStaff.innerHTML =
      `<option value="">General Department Feedback</option>` +
      filtered
        .map(
          s =>
            `<option value="${s.id}">${escapeHtml(s.name)} - ${escapeHtml(s.title)} (${escapeHtml(s.department)})</option>`
        )
        .join('');
  } catch (err) {
    console.error('Failed to load staff list', err);
  }
}

function handleDepartmentChange() {
  const selectedDept = document.getElementById('fbDepartment').value;
  loadStaffList(selectedDept);
}

// -------------------------------------------------------------
// STUDENT PORTAL (User 1)
// -------------------------------------------------------------
async function loadStudentDashboard() {
  try {
    state.feedbacks = await apiCall('/feedback');

    // Calculate stats
    const total = state.feedbacks.length;
    const responded = state.feedbacks.filter(f => f.status === 'Responded' || f.status === 'Resolved').length;
    const pending = state.feedbacks.filter(f => f.status === 'Pending' || f.status === 'Under Review').length;
    const avg = total > 0 ? (state.feedbacks.reduce((a, b) => a + (b.ratings?.overall || 0), 0) / total).toFixed(1) : '0.0';

    document.getElementById('studentStatTotal').innerText = total;
    document.getElementById('studentStatResponded').innerText = responded;
    document.getElementById('studentStatPending').innerText = pending;
    document.getElementById('studentStatAvg').innerText = `${avg} ★`;

    renderStudentFeedbacks(state.feedbacks);
  } catch (err) {
    console.error('Failed loading student dashboard', err);
  }
}

function filterStudentFeedbacks() {
  const query = document.getElementById('studentSearch').value.toLowerCase();
  const status = document.getElementById('studentStatusFilter').value;

  const filtered = state.feedbacks.filter(f => {
    const matchesQuery =
      !query ||
      (f.subject && f.subject.toLowerCase().includes(query)) ||
      (f.comments && f.comments.toLowerCase().includes(query)) ||
      (f.staffName && f.staffName.toLowerCase().includes(query));
    const matchesStatus = status === 'All' || f.status === status;
    return matchesQuery && matchesStatus;
  });

  renderStudentFeedbacks(filtered);
}

function renderStudentFeedbacks(list) {
  const container = document.getElementById('studentFeedbackList');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
        <p style="font-size: 1.1rem; font-weight: 600;">No feedback submissions found</p>
        <p style="font-size: 0.85rem; margin-top: 0.35rem;">Click "+ Submit New Feedback" to submit an evaluation or grievance.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list
    .map(
      f => `
    <div class="feedback-item">
      <div class="feedback-header">
        <div class="feedback-title-box">
          <div class="feedback-subject">${escapeHtml(f.subject)}</div>
          <div class="feedback-meta">
            <span><strong>Target:</strong> ${escapeHtml(f.staffName)}</span>
            <span class="meta-dot">&bull;</span>
            <span>${escapeHtml(f.department)}</span>
            <span class="meta-dot">&bull;</span>
            <span>${escapeHtml(f.category)}</span>
            <span class="meta-dot">&bull;</span>
            <span>${formatDate(f.createdAt)}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="star-badge">★ ${f.ratings?.overall || 5}.0</span>
          <span class="status-badge status-${formatStatusClass(f.status)}">${escapeHtml(f.status)}</span>
        </div>
      </div>

      <div class="feedback-body">${escapeHtml(f.comments)}</div>

      ${
        f.replies && f.replies.length > 0
          ? `
        <div class="reply-thread">
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">Official Responses:</div>
          ${f.replies
            .map(
              r => `
            <div class="reply-bubble">
              <div class="reply-header">
                <span>${escapeHtml(r.userName)}</span>
                <span>${formatDate(r.createdAt)}</span>
              </div>
              <div class="reply-text">${escapeHtml(r.message)}</div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      <div class="feedback-footer">
        <span>Submission mode: <strong>${f.isAnonymous ? 'Anonymous' : 'Identified'}</strong></span>
        ${
          f.status === 'Pending'
            ? `<button class="btn btn-outline btn-sm btn-danger" onclick="deleteFeedback('${f.id}')">Cancel Submission</button>`
            : `<span style="color: var(--success); font-weight: 600;">✓ Acknowledged</span>`
        }
      </div>
    </div>
  `
    )
    .join('');
}

// -------------------------------------------------------------
// FACULTY / STAFF CONSOLE (User 2)
// -------------------------------------------------------------
async function loadStaffDashboard() {
  try {
    state.feedbacks = await apiCall('/feedback');
    state.analytics = await apiCall('/analytics');

    // Update staff KPI cards
    document.getElementById('staffStatTotal').innerText = state.analytics.totalFeedbacks;
    document.getElementById('staffStatRating').innerText = `${state.analytics.avgRating} ★`;
    document.getElementById('staffStatAwaiting').innerText =
      state.analytics.statusDistribution['Pending'] || 0;
    document.getElementById('staffStatResolved').innerText =
      (state.analytics.statusDistribution['Responded'] || 0) +
      (state.analytics.statusDistribution['Resolved'] || 0);

    // Update criteria progress bars
    const crit = state.analytics.criteriaAverages || {};
    updateProgressBar('Teaching', crit.teaching || 0);
    updateProgressBar('Comm', crit.communication || 0);
    updateProgressBar('Punct', crit.punctuality || 0);
    updateProgressBar('Support', crit.support || 0);

    renderStaffFeedbacks(state.feedbacks);
  } catch (err) {
    console.error('Failed loading staff dashboard', err);
  }
}

function updateProgressBar(key, val) {
  const textEl = document.getElementById(`crit${key}`);
  const barEl = document.getElementById(`bar${key}`);
  if (textEl) textEl.innerText = `${val} / 5.0`;
  if (barEl) {
    const percentage = Math.min(100, (parseFloat(val) / 5) * 100);
    barEl.style.width = `${percentage}%`;
  }
}

function filterStaffFeedbacks() {
  const query = document.getElementById('staffSearch').value.toLowerCase();
  const rating = document.getElementById('staffRatingFilter').value;

  const filtered = state.feedbacks.filter(f => {
    const matchesQuery =
      !query ||
      (f.subject && f.subject.toLowerCase().includes(query)) ||
      (f.comments && f.comments.toLowerCase().includes(query)) ||
      (f.userName && f.userName.toLowerCase().includes(query));
    const matchesRating = rating === 'All' || Math.round(f.ratings?.overall || 0) === parseInt(rating, 10);
    return matchesQuery && matchesRating;
  });

  renderStaffFeedbacks(filtered);
}

function renderStaffFeedbacks(list) {
  const container = document.getElementById('staffFeedbackList');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
        <p style="font-size: 1.1rem; font-weight: 600;">No feedback entries found</p>
        <p style="font-size: 0.85rem; margin-top: 0.35rem;">Any feedback submitted for you or your department will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list
    .map(
      f => `
    <div class="feedback-item">
      <div class="feedback-header">
        <div class="feedback-title-box">
          <div class="feedback-subject">${escapeHtml(f.subject)}</div>
          <div class="feedback-meta">
            <span><strong>From:</strong> ${escapeHtml(f.userName)}</span>
            <span class="meta-dot">&bull;</span>
            <span>${escapeHtml(f.category)}</span>
            <span class="meta-dot">&bull;</span>
            <span>${formatDate(f.createdAt)}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="star-badge">★ ${f.ratings?.overall || 5}.0</span>
          <span class="status-badge status-${formatStatusClass(f.status)}">${escapeHtml(f.status)}</span>
        </div>
      </div>

      <div class="feedback-body">${escapeHtml(f.comments)}</div>

      ${
        f.replies && f.replies.length > 0
          ? `
        <div class="reply-thread">
          <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted);">Thread History:</div>
          ${f.replies
            .map(
              r => `
            <div class="reply-bubble">
              <div class="reply-header">
                <span>${escapeHtml(r.userName)}</span>
                <span>${formatDate(r.createdAt)}</span>
              </div>
              <div class="reply-text">${escapeHtml(r.message)}</div>
            </div>
          `
            )
            .join('')}
        </div>
      `
          : ''
      }

      <div class="feedback-footer">
        <div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">Category: <strong>${escapeHtml(f.type || 'Feedback')}</strong></span>
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-primary btn-sm" onclick="openReplyModal('${f.id}')">
            💬 Reply / Change Status
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

// -------------------------------------------------------------
// ADMIN DASHBOARD
// -------------------------------------------------------------
async function loadAdminDashboard() {
  try {
    state.analytics = await apiCall('/analytics');
    state.feedbacks = await apiCall('/feedback');
    state.users = await apiCall('/users');

    // Populate KPI cards
    document.getElementById('adminTotalFeedbacks').innerText = state.analytics.totalFeedbacks;
    document.getElementById('adminAvgScore').innerText = `${state.analytics.avgRating} ★`;
    document.getElementById('adminTotalStaff').innerText = state.analytics.totalStaff;
    document.getElementById('adminTotalStudents').innerText = state.analytics.totalStudents;

    // Render Charts
    renderRatingDistributionChart(state.analytics.ratingDistribution, state.analytics.totalFeedbacks);
    renderCategoryDistribution(state.analytics.categoryBreakdown);

    // Render Tables
    renderAdminFeedbacks(state.feedbacks);
    renderAdminUsers(state.users);
    renderAdminDepartments(state.departments);
  } catch (err) {
    console.error('Failed loading admin dashboard', err);
  }
}

function renderRatingDistributionChart(distribution, total) {
  const container = document.getElementById('chartRatingBars');
  if (!container) return;

  const stars = [5, 4, 3, 2, 1];
  container.innerHTML = stars
    .map(star => {
      const count = distribution[star] || 0;
      const pct = total > 0 ? ((count / total) * 100).toFixed(0) : 0;
      return `
      <div class="chart-bar-item">
        <span class="chart-bar-label">${star} Stars (${count})</span>
        <div class="chart-bar-bg">
          <div class="chart-bar-fill" style="width: ${pct}%"></div>
        </div>
        <span style="font-size: 0.8rem; font-weight: 600; width: 35px; text-align: right;">${pct}%</span>
      </div>
    `;
    })
    .join('');
}

function renderCategoryDistribution(categories) {
  const container = document.getElementById('categoryDistributionList');
  if (!container) return;

  const keys = Object.keys(categories);
  if (keys.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem;">No submissions yet</p>`;
    return;
  }

  container.innerHTML = keys
    .map(
      cat => `
    <div class="category-row">
      <span>${escapeHtml(cat)}</span>
      <span class="badge badge-accent">${categories[cat]} submissions</span>
    </div>
  `
    )
    .join('');
}

function switchAdminTab(tabName) {
  document.querySelectorAll('.admin-subtab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.add('hidden'));

  const tabBtns = document.querySelectorAll('.admin-subtab');
  if (tabName === 'allFeedbacks') {
    tabBtns[0].classList.add('active');
    document.getElementById('adminTabFeedbacks').classList.remove('hidden');
  } else if (tabName === 'users') {
    tabBtns[1].classList.add('active');
    document.getElementById('adminTabUsers').classList.remove('hidden');
  } else if (tabName === 'departments') {
    tabBtns[2].classList.add('active');
    document.getElementById('adminTabDepartments').classList.remove('hidden');
  }
}

function filterAdminFeedbacks() {
  const search = document.getElementById('adminSearch').value.toLowerCase();
  const category = document.getElementById('adminCategoryFilter').value;
  const status = document.getElementById('adminStatusFilter').value;

  const filtered = state.feedbacks.filter(f => {
    const matchesSearch =
      !search ||
      (f.subject && f.subject.toLowerCase().includes(search)) ||
      (f.comments && f.comments.toLowerCase().includes(search)) ||
      (f.staffName && f.staffName.toLowerCase().includes(search)) ||
      (f.userName && f.userName.toLowerCase().includes(search));
    const matchesCategory = category === 'All' || f.category === category || f.department === category;
    const matchesStatus = status === 'All' || f.status === status;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  renderAdminFeedbacks(filtered);
}

function renderAdminFeedbacks(list) {
  const container = document.getElementById('adminFeedbackTableContainer');
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `<p style="padding: 1.5rem; text-align: center; color: var(--text-muted);">No feedback records match the filters.</p>`;
    return;
  }

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Subject & Details</th>
          <th>Submitter</th>
          <th>Assigned Staff / Dept</th>
          <th>Rating</th>
          <th>Status</th>
          <th>Date</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map(
            f => `
          <tr>
            <td>
              <strong>${escapeHtml(f.subject)}</strong>
              <div style="font-size: 0.78rem; color: var(--text-muted); max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(f.comments)}
              </div>
            </td>
            <td>
              <span>${escapeHtml(f.userName)}</span>
              ${f.isAnonymous ? `<br><small style="color: var(--text-light);">(Anonymous)</small>` : ''}
            </td>
            <td>
              <span>${escapeHtml(f.staffName)}</span>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(f.department)}</div>
            </td>
            <td>
              <span class="star-badge">★ ${f.ratings?.overall || 5}.0</span>
            </td>
            <td>
              <span class="status-badge status-${formatStatusClass(f.status)}">${escapeHtml(f.status)}</span>
            </td>
            <td>${formatDate(f.createdAt)}</td>
            <td>
              <div style="display: flex; gap: 0.35rem;">
                <button class="btn btn-outline btn-sm" onclick="openReplyModal('${f.id}')" title="Reply / Status">💬</button>
                <button class="btn btn-outline btn-sm btn-danger" onclick="deleteFeedback('${f.id}')" title="Delete">🗑</button>
              </div>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderAdminUsers(list) {
  const container = document.getElementById('adminUsersTableContainer');
  if (!container) return;

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>User Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Department</th>
          <th>Designation / Roll No</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map(
            u => `
          <tr>
            <td><strong>${escapeHtml(u.name)}</strong></td>
            <td>${escapeHtml(u.email)}</td>
            <td>
              <span class="badge role-${escapeHtml(u.role)}">${escapeHtml(u.role.toUpperCase())}</span>
            </td>
            <td>${escapeHtml(u.department || 'N/A')}</td>
            <td>${escapeHtml(u.title || u.rollNo || '-')}</td>
            <td>${formatDate(u.createdAt)}</td>
            <td>
              ${
                u.id === state.user.id
                  ? '<span style="font-size: 0.8rem; color: var(--text-muted);">Current</span>'
                  : `<button class="btn btn-outline btn-sm btn-danger" onclick="deleteUser('${u.id}')">Remove</button>`
              }
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

function renderAdminDepartments(list) {
  const container = document.getElementById('adminDeptTableContainer');
  if (!container) return;

  container.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Department Name</th>
          <th>Description</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map(
            d => `
          <tr>
            <td><strong>${escapeHtml(d.code)}</strong></td>
            <td>${escapeHtml(d.name)}</td>
            <td>${escapeHtml(d.description || '-')}</td>
            <td>
              <button class="btn btn-outline btn-sm btn-danger" onclick="deleteDepartment('${d.id}')">Remove</button>
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;
}

// -------------------------------------------------------------
// Interactive Star Rating
// -------------------------------------------------------------
function setupStarRatingListeners() {
  const container = document.getElementById('starRatingOverall');
  if (!container) return;

  const stars = container.querySelectorAll('.star');
  const textEl = document.getElementById('starOverallText');

  const ratingDescriptions = {
    1: '1.0 / 5 (Poor / Unsatisfactory)',
    2: '2.0 / 5 (Needs Improvement)',
    3: '3.0 / 5 (Satisfactory / Average)',
    4: '4.0 / 5 (Very Good)',
    5: '5.0 / 5 (Outstanding / Excellent)'
  };

  stars.forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = parseInt(star.getAttribute('data-val'), 10);
      highlightStars(val);
      textEl.innerText = ratingDescriptions[val];
    });

    star.addEventListener('click', () => {
      state.currentStarRating = parseInt(star.getAttribute('data-val'), 10);
      highlightStars(state.currentStarRating);
      textEl.innerText = ratingDescriptions[state.currentStarRating];
    });
  });

  container.addEventListener('mouseleave', () => {
    highlightStars(state.currentStarRating);
    textEl.innerText = ratingDescriptions[state.currentStarRating];
  });

  highlightStars(state.currentStarRating);
}

function highlightStars(count) {
  const stars = document.querySelectorAll('#starRatingOverall .star');
  stars.forEach(s => {
    const v = parseInt(s.getAttribute('data-val'), 10);
    if (v <= count) {
      s.classList.add('active');
    } else {
      s.classList.remove('active');
    }
  });
}

// -------------------------------------------------------------
// Submit Feedback Actions
// -------------------------------------------------------------
function openFeedbackModal() {
  document.getElementById('feedbackModal').classList.remove('hidden');
  loadStaffList(document.getElementById('fbDepartment').value);
}

function closeFeedbackModal() {
  document.getElementById('feedbackModal').classList.add('hidden');
  document.getElementById('newFeedbackForm').reset();
  state.currentStarRating = 5;
  highlightStars(5);
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('btnSubmitFeedback');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Submitting...';

  const body = {
    department: document.getElementById('fbDepartment').value,
    staffId: document.getElementById('fbStaff').value || null,
    category: document.getElementById('fbCategory').value,
    type: document.getElementById('fbType').value,
    subject: document.getElementById('fbSubject').value.trim(),
    ratings: {
      overall: state.currentStarRating,
      teaching: parseInt(document.getElementById('rateTeaching').value, 10),
      communication: parseInt(document.getElementById('rateComm').value, 10),
      punctuality: parseInt(document.getElementById('ratePunct').value, 10),
      support: parseInt(document.getElementById('rateSupport').value, 10)
    },
    comments: document.getElementById('fbComments').value.trim(),
    isAnonymous: document.getElementById('fbAnonymous').checked
  };

  try {
    await apiCall('/feedback', 'POST', body);
    showToast('Feedback submitted successfully!');
    closeFeedbackModal();
    await loadStudentDashboard();
  } catch {
    // Handled in apiCall
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = 'Submit Feedback';
  }
}

async function deleteFeedback(id) {
  if (!confirm('Are you sure you want to delete this feedback entry?')) return;
  try {
    await apiCall(`/feedback/${id}`, 'DELETE');
    showToast('Feedback deleted successfully');
    if (state.user.role === 'admin') {
      await loadAdminDashboard();
    } else {
      await loadStudentDashboard();
    }
  } catch {
    // Handled in apiCall
  }
}

// -------------------------------------------------------------
// Reply & Status Modal (Staff & Admin)
// -------------------------------------------------------------
function openReplyModal(id) {
  const feedback = state.feedbacks.find(f => f.id === id);
  if (!feedback) return;

  const modal = document.getElementById('replyModal');
  const bodyEl = document.getElementById('replyModalBody');

  bodyEl.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <div style="font-size: 1.15rem; font-weight: 700; margin-bottom: 0.25rem;">${escapeHtml(feedback.subject)}</div>
      <div style="font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 0.5rem; flex-wrap: wrap;">
        <span><strong>From:</strong> ${escapeHtml(feedback.userName)}</span>
        <span>&bull;</span>
        <span><strong>Target:</strong> ${escapeHtml(feedback.staffName)}</span>
        <span>&bull;</span>
        <span><strong>Dept:</strong> ${escapeHtml(feedback.department)}</span>
        <span>&bull;</span>
        <span>★ ${feedback.ratings?.overall || 5}.0</span>
      </div>
    </div>

    <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-sm); margin-bottom: 1.25rem; font-size: 0.92rem; line-height: 1.5;">
      ${escapeHtml(feedback.comments)}
    </div>

    ${
      feedback.replies && feedback.replies.length > 0
        ? `
      <div style="margin-bottom: 1.25rem;">
        <div style="font-weight: 700; font-size: 0.85rem; margin-bottom: 0.5rem; color: var(--text-muted);">Previous Replies:</div>
        ${feedback.replies
          .map(
            r => `
          <div class="reply-bubble" style="margin-bottom: 0.5rem;">
            <div class="reply-header">
              <span>${escapeHtml(r.userName)}</span>
              <span>${formatDate(r.createdAt)}</span>
            </div>
            <div class="reply-text">${escapeHtml(r.message)}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `
        : ''
    }

    <!-- Reply & Status Form -->
    <form onsubmit="submitReplyAndStatus(event, '${feedback.id}')">
      <div class="form-row" style="margin-bottom: 1rem;">
        <div class="form-group">
          <label>Update Status</label>
          <select id="modalStatusSelect" class="form-control">
            <option value="Pending" ${feedback.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Under Review" ${feedback.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
            <option value="Responded" ${feedback.status === 'Responded' ? 'selected' : ''}>Responded</option>
            <option value="Resolved" ${feedback.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
            <option value="Closed" ${feedback.status === 'Closed' ? 'selected' : ''}>Closed</option>
          </select>
        </div>
      </div>

      <div class="form-group" style="margin-bottom: 1.25rem;">
        <label>Write Official Response / Remarks</label>
        <textarea id="modalReplyText" class="form-control" rows="3" placeholder="Explain action taken, clarification, or guidance for the student..."></textarea>
      </div>

      <div class="modal-footer" style="margin: 0; padding-top: 0.75rem;">
        <button type="button" class="btn btn-outline" onclick="closeReplyModal()">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Response & Status</button>
      </div>
    </form>
  `;

  modal.classList.remove('hidden');
}

function closeReplyModal() {
  document.getElementById('replyModal').classList.add('hidden');
}

async function submitReplyAndStatus(e, id) {
  e.preventDefault();
  const status = document.getElementById('modalStatusSelect').value;
  const replyText = document.getElementById('modalReplyText').value.trim();

  try {
    // If reply text is provided, post the reply
    if (replyText) {
      await apiCall(`/feedback/${id}/reply`, 'POST', { message: replyText });
    }

    // Update status
    await apiCall(`/feedback/${id}/status`, 'PUT', { status });

    showToast('Feedback updated successfully');
    closeReplyModal();

    if (state.user.role === 'admin') {
      await loadAdminDashboard();
    } else {
      await loadStaffDashboard();
    }
  } catch {
    // Handled in apiCall
  }
}

// -------------------------------------------------------------
// Admin Modal Handlers (Users & Departments)
// -------------------------------------------------------------
function openNewUserModal() {
  document.getElementById('newUserModal').classList.remove('hidden');
}

function closeNewUserModal() {
  document.getElementById('newUserModal').classList.add('hidden');
  document.getElementById('newUserForm').reset();
}

async function handleCreateUser(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('newUserName').value.trim(),
    email: document.getElementById('newUserEmail').value.trim(),
    password: document.getElementById('newUserPassword').value,
    role: document.getElementById('newUserRole').value,
    department: document.getElementById('newUserDept').value
  };

  try {
    await apiCall('/users', 'POST', body);
    showToast('New user account created successfully');
    closeNewUserModal();
    await loadAdminDashboard();
  } catch {
    // Handled in apiCall
  }
}

async function deleteUser(id) {
  if (!confirm('Are you sure you want to remove this user?')) return;
  try {
    await apiCall(`/users/${id}`, 'DELETE');
    showToast('User deleted successfully');
    await loadAdminDashboard();
  } catch {
    // Handled in apiCall
  }
}

function openNewDeptModal() {
  document.getElementById('newDeptModal').classList.remove('hidden');
}

function closeNewDeptModal() {
  document.getElementById('newDeptModal').classList.add('hidden');
  document.getElementById('newDeptForm').reset();
}

async function handleCreateDept(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('deptName').value.trim(),
    code: document.getElementById('deptCode').value.trim(),
    description: document.getElementById('deptDesc').value.trim()
  };

  try {
    await apiCall('/departments', 'POST', body);
    showToast('Department added successfully');
    closeNewDeptModal();
    await loadDepartments();
    await loadAdminDashboard();
  } catch {
    // Handled in apiCall
  }
}

async function deleteDepartment(id) {
  if (!confirm('Are you sure you want to remove this department?')) return;
  try {
    await apiCall(`/departments/${id}`, 'DELETE');
    showToast('Department removed');
    await loadDepartments();
    await loadAdminDashboard();
  } catch {
    // Handled in apiCall
  }
}

// -------------------------------------------------------------
// Data Export (CSV & JSON)
// -------------------------------------------------------------
function exportData(format) {
  if (!state.feedbacks || state.feedbacks.length === 0) {
    showToast('No feedback data to export', 'error');
    return;
  }

  if (format === 'json') {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state.feedbacks, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `feedback_export_${Date.now()}.json`);
    dlAnchor.click();
    showToast('Feedback JSON downloaded');
  } else if (format === 'csv') {
    const headers = ['ID', 'Subject', 'Submitter', 'Department', 'Staff', 'Rating', 'Status', 'Date'];
    const rows = state.feedbacks.map(f => [
      f.id,
      `"${(f.subject || '').replace(/"/g, '""')}"`,
      `"${(f.userName || '').replace(/"/g, '""')}"`,
      `"${(f.department || '').replace(/"/g, '""')}"`,
      `"${(f.staffName || '').replace(/"/g, '""')}"`,
      f.ratings?.overall || 5,
      f.status,
      f.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `feedback_export_${Date.now()}.csv`);
    dlAnchor.click();
    showToast('Feedback CSV downloaded');
  }
}

// -------------------------------------------------------------
// Utility Functions
// -------------------------------------------------------------
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatStatusClass(status) {
  return (status || 'Pending').replace(/\s+/g, '-');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

