/* CivicAI: lightweight browser-only civic reporting prototype. */
const STORAGE_KEY = 'civicai-reports-v1';
const SESSION_KEY = 'civicai-demo-session-v1';
const issueMeta = {
  Pothole: { icon: '⌁', cls: 'pothole', department: 'Transportation', severity: 'Medium', score: 54 },
  Streetlight: { icon: '☼', cls: 'streetlight', department: 'Street Lighting', severity: 'Medium', score: 48 },
  Graffiti: { icon: '✎', cls: 'graffiti', department: 'Maintenance', severity: 'Low', score: 31 },
  'Trash & dumping': { icon: '♻', cls: 'trash', department: 'Environmental Services', severity: 'Medium', score: 46 },
  'Water leak': { icon: '≋', cls: 'water', department: 'Water Bureau', severity: 'High', score: 79 },
  Other: { icon: '＋', cls: 'other', department: 'Customer Service', severity: 'Low', score: 28 }
};
let selectedIssue = 'Pothole';
let selectedFilter = 'All';
let toastTimeout;
let authMode = 'login';

function readSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
  catch { return null; }
}
function showApplication(user) {
  const name = user?.name || user?.email?.split('@')[0] || 'Community member';
  const initials = name.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(part => part[0].toUpperCase()).join('') || 'JD';
  document.querySelector('#login-shell').classList.add('hidden');
  document.querySelector('#app-shell').classList.remove('hidden');
  document.querySelector('#profile-button .avatar').textContent = initials;
  document.querySelector('#profile-button .profile-copy strong').textContent = name;
  document.querySelector('#profile-email').textContent = user?.email || 'Demo account';
  document.querySelector('.top-avatar').textContent = initials;
}
function logout() {
  localStorage.removeItem(SESSION_KEY);
  document.querySelector('#profile-popover').classList.add('hidden');
  document.querySelector('#app-shell').classList.add('hidden');
  document.querySelector('#login-shell').classList.remove('hidden');
  history.replaceState(null, '', location.pathname + location.search);
  setAuthMode('login');
}
function setAuthMode(mode) {
  authMode = mode;
  const signup = mode === 'signup';
  document.querySelector('#auth-eyebrow').textContent = signup ? 'JOIN YOUR COMMUNITY' : 'WELCOME BACK';
  document.querySelector('#auth-title').textContent = signup ? 'Let’s make a difference.' : 'Good to see you.';
  document.querySelector('#auth-subtitle').textContent = signup ? 'Create an account to report issues and follow their progress.' : 'Sign in to stay connected to your community.';
  document.querySelector('#auth-name').classList.toggle('hidden', !signup);
  document.querySelector('#name-label').classList.toggle('hidden', !signup);
  document.querySelector('#auth-name').required = signup;
  document.querySelector('#auth-password').autocomplete = signup ? 'new-password' : 'current-password';
  document.querySelector('#auth-submit-label').textContent = signup ? 'Create account' : 'Sign in';
  document.querySelector('#auth-switch').innerHTML = signup ? 'Already part of CivicAI? <button type="button" id="auth-switch-button">Sign in</button>' : 'New to CivicAI? <button type="button" id="auth-switch-button">Create an account</button>';
  document.querySelector('#auth-error').textContent = '';
  document.querySelector('#auth-password').value = '';
}

function readReports() {
  try { const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(data) ? data : []; }
  catch { return []; }
}
function saveReports(items) { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function shortDate(value) { return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value)); }
function showToast(message) {
  const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('show');
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => toast.classList.remove('show'), 2400);
}
function iconFor(issue) { return issueMeta[issue]?.icon || '＋'; }
function classFor(issue) { return issueMeta[issue]?.cls || 'other'; }
function render() {
  const reports = readReports();
  const resolved = reports.filter(report => report.status === 'Resolved').length;
  const progress = reports.filter(report => report.status === 'In Progress').length;
  document.querySelector('#stat-reports').textContent = reports.length;
  document.querySelector('#stat-progress').textContent = progress;
  document.querySelector('#stat-resolved').textContent = resolved;
  document.querySelector('#stat-impact').textContent = reports.length ? new Intl.NumberFormat().format(reports.length * 84) : '0';
  document.querySelector('#nav-count').textContent = reports.length;
  document.querySelector('#filter-all').textContent = reports.length;
  renderRecent(reports); renderCases(reports);
}
function reportRow(report) {
  const pill = report.status === 'Resolved' ? 'pill-resolved' : report.status === 'Under Review' ? 'pill-review' : 'pill-progress';
  return `<div class="report-row"><span class="report-symbol issue-${classFor(report.issue)}">${iconFor(report.issue)}</span><div class="report-details"><div class="report-title">${escapeHtml(report.issue)}${report.description ? ` — ${escapeHtml(report.description)}` : ''}</div><div class="report-meta">${escapeHtml(report.address)} · ${shortDate(report.createdAt)} · ${escapeHtml(report.id)}</div></div><span class="status-pill ${pill}">${escapeHtml(report.status.toUpperCase())}</span></div>`;
}
function renderRecent(reports) {
  const target = document.querySelector('#recent-list');
  if (!reports.length) { target.innerHTML = '<div class="empty-state"><strong>Your reports will show up here.</strong>Spotted something? Let’s get it sorted.</div>'; return; }
  target.innerHTML = reports.slice(0, 3).map(reportRow).join('');
}
function renderCases(reports) {
  const query = document.querySelector('#case-search').value.trim().toLowerCase();
  const visible = reports.filter(report => (selectedFilter === 'All' || report.status === selectedFilter) && `${report.issue} ${report.address} ${report.id}`.toLowerCase().includes(query));
  const target = document.querySelector('#cases-list');
  if (!visible.length) { target.innerHTML = `<div class="no-cases">${reports.length ? 'No reports match this filter.' : 'You haven’t reported anything yet. Your first report can help your whole neighborhood.'}</div>`; return; }
  target.innerHTML = visible.map(report => {
    const pill = report.status === 'Resolved' ? 'pill-resolved' : report.status === 'Under Review' ? 'pill-review' : 'pill-progress';
    return `<div class="case-row"><span class="report-symbol issue-${classFor(report.issue)}">${iconFor(report.issue)}</span><div><div class="report-title">${escapeHtml(report.issue)}${report.description ? ` — ${escapeHtml(report.description)}` : ''}</div><div class="case-address">${escapeHtml(report.address)} · ${escapeHtml(report.id)}</div></div><span class="case-date">${shortDate(report.createdAt)}</span><span class="status-pill ${pill}">${escapeHtml(report.status.toUpperCase())}</span><button class="case-arrow" data-case="${escapeHtml(report.id)}" aria-label="View ${escapeHtml(report.id)}">↗</button></div>`;
  }).join('');
}
function navigate(page) {
  const validPages = ['home', 'report', 'cases', 'community'];
  page = validPages.includes(page) ? page : 'home';
  document.querySelectorAll('.page-wrap').forEach(element => element.classList.toggle('hidden', element.id !== `page-${page}`));
  document.querySelectorAll('.nav-link').forEach(link => link.classList.toggle('active', link.dataset.page === page));
  document.querySelector('#breadcrumb-page').textContent = ({ home: 'Overview', report: 'Report an issue', cases: 'My reports', community: 'Community' })[page];
  document.querySelector('#sidebar').classList.remove('open');
  history.replaceState(null, '', `#${page}`);
  if (page === 'cases') renderCases(readReports());
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function generateId(reports) {
  let id;
  do { id = `CAI-${String(Math.floor(Math.random() * 90000) + 10000)}`; } while (reports.some(report => report.id === id));
  return id;
}
function analyzeDuplicate(issue, address, reports) {
  const normalize = text => text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr)\b/g, '').replace(/\s+/g, ' ').trim();
  const normalizedAddress = normalize(address);
  return reports.find(report => report.issue === issue && report.status !== 'Resolved' && normalize(report.address) === normalizedAddress);
}

document.addEventListener('click', event => {
  if (event.target.closest('#auth-switch-button')) { setAuthMode(authMode === 'login' ? 'signup' : 'login'); return; }
  const pageTarget = event.target.closest('[data-page]');
  if (pageTarget) { event.preventDefault(); navigate(pageTarget.dataset.page); return; }
  const type = event.target.closest('.issue-type');
  if (type) { selectedIssue = type.dataset.issue; document.querySelectorAll('.issue-type').forEach(button => button.classList.toggle('selected', button === type)); }
  const filter = event.target.closest('.filter-tab');
  if (filter) { selectedFilter = filter.dataset.filter; document.querySelectorAll('.filter-tab').forEach(button => button.classList.toggle('active', button === filter)); renderCases(readReports()); }
});
document.querySelector('#mobile-menu').addEventListener('click', () => document.querySelector('#sidebar').classList.toggle('open'));
document.querySelector('#case-search').addEventListener('input', () => renderCases(readReports()));
document.querySelector('#use-location').addEventListener('click', () => {
  const address = document.querySelector('#address');
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => { address.value = `Near ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}, Portland, OR`; showToast('Location added to your report.'); }, () => { address.value = 'Pearl District, Portland, OR'; showToast('Approximate neighborhood added.'); });
  } else { address.value = 'Pearl District, Portland, OR'; showToast('Approximate neighborhood added.'); }
});
document.querySelector('#photo-upload').addEventListener('change', event => {
  const file = event.target.files[0];
  const preview = document.querySelector('#upload-preview');
  if (!file) { preview.textContent = ''; return; }
  if (file.size > 10 * 1024 * 1024) { event.target.value = ''; preview.textContent = ''; showToast('Please choose an image under 10 MB.'); return; }
  preview.textContent = `✓ ${file.name}`;
});
document.querySelector('#report-form').addEventListener('submit', event => {
  event.preventDefault();
  const address = document.querySelector('#address').value.trim();
  if (!address) { document.querySelector('#address').focus(); showToast('Add a street address so the right team can find it.'); return; }
  const reports = readReports();
  const duplicate = analyzeDuplicate(selectedIssue, address, reports);
  const details = issueMeta[selectedIssue];
  const report = { id: generateId(reports), issue: selectedIssue, address, description: document.querySelector('#description').value.trim(), status: 'Under Review', department: details.department, severity: details.severity, score: details.score, duplicateOf: duplicate?.id || null, createdAt: new Date().toISOString() };
  reports.unshift(report); saveReports(reports); render();
  document.querySelector('#ticket-id').textContent = report.id;
  document.querySelector('#ai-summary').innerHTML = `<strong>AI routing suggestion:</strong> ${escapeHtml(report.department)} · ${escapeHtml(report.severity)} priority (${report.score}/100).${duplicate ? `<br><strong>Possible duplicate:</strong> Similar open report ${escapeHtml(duplicate.id)} at this address. Your report is preserved for review.` : ''}`;
  document.querySelector('#success-modal').classList.remove('hidden');
});
function closeModal() { document.querySelector('#success-modal').classList.add('hidden'); document.querySelector('#report-form').reset(); document.querySelector('#upload-preview').textContent = ''; selectedIssue = 'Pothole'; document.querySelectorAll('.issue-type').forEach(button => button.classList.toggle('selected', button.dataset.issue === selectedIssue)); }
document.querySelector('#modal-close').addEventListener('click', closeModal);
document.querySelector('#modal-done').addEventListener('click', () => { closeModal(); navigate('cases'); });
document.querySelector('#success-modal').addEventListener('click', event => { if (event.target.id === 'success-modal') closeModal(); });
document.querySelector('#copy-ticket').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(document.querySelector('#ticket-id').textContent); showToast('Report ID copied.'); }
  catch { showToast(`Report ID: ${document.querySelector('#ticket-id').textContent}`); }
});
document.querySelector('#profile-button').addEventListener('click', () => document.querySelector('#profile-popover').classList.toggle('hidden'));
document.querySelector('#logout-button').addEventListener('click', logout);
document.querySelector('#password-toggle').addEventListener('click', event => {
  const password = document.querySelector('#auth-password');
  const visible = password.type === 'password'; password.type = visible ? 'text' : 'password';
  event.currentTarget.textContent = visible ? 'Hide' : 'Show'; event.currentTarget.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
});
document.querySelector('#auth-form').addEventListener('submit', event => {
  event.preventDefault();
  const email = document.querySelector('#auth-email').value.trim().toLowerCase();
  const password = document.querySelector('#auth-password').value;
  const name = document.querySelector('#auth-name').value.trim();
  if (password.length < 8) { document.querySelector('#auth-error').textContent = 'Use a password with at least 8 characters.'; return; }
  if (authMode === 'signup' && !name) { document.querySelector('#auth-error').textContent = 'Please enter your name.'; return; }
  const user = { name: name || email.split('@')[0], email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  showApplication(user);
  if (location.hash.length > 1) navigate(location.hash.slice(1));
});
document.querySelector('#demo-login').addEventListener('click', () => {
  const user = { name: 'Jordan Davis', email: 'jordan@example.com' };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user)); showApplication(user);
  if (location.hash.length > 1) navigate(location.hash.slice(1));
});
window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
render();
const existingSession = readSession();
if (existingSession) { showApplication(existingSession); if (location.hash.length > 1) navigate(location.hash.slice(1)); }
