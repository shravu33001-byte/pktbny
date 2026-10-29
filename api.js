// ─── Pocket Bunny — shared helper (loaded by every page) ─────────────────────

// Where the backend lives. When the site is opened from the Express server
// (http://localhost:3000) this is simply "" (same origin). If you open the
// pages with a different tool (double-click / Live Server) it falls back to
// the backend on localhost:3000.
const API_BASE = (function () {
    if (window.PB_API_BASE) return window.PB_API_BASE;
    if (location.protocol === 'file:') return 'http://localhost:3000';
    if (['5500', '5501', '5173', '3001'].indexOf(location.port) !== -1) return 'http://localhost:3000';
    return '';
})();

const TOKEN_KEY = 'pb_token';

function getToken()   { return localStorage.getItem(TOKEN_KEY); }
function setToken(t)  { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

// Call at the top of every page that needs a logged-in user.
function requireLogin() {
    if (!getToken()) window.location.replace('index.html');
}

// Sign out and go back to the login page.
function pbLogout() {
    clearToken();
    window.location.replace('index.html');
}

// For the login / sign-up pages: if the saved login is REALLY still valid, go Home.
// A stale token (e.g. account or database no longer exists) is cleared quietly,
// so the page never bounces back and forth.
async function pbRedirectIfSignedIn() {
    const t = getToken();
    if (!t) return;
    try {
        const r = await fetch(API_BASE + '/auth/me', { headers: { Authorization: 'Bearer ' + t } });
        if (r.ok) window.location.replace('home.html');
        else if (r.status === 401) clearToken();
    } catch (e) { /* server down: just show the form */ }
}

// fetch() wrapper: adds the JWT, parses JSON, and turns errors into Error(message).
async function apiFetch(path, options = {}) {
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    let res;
    try {
        res = await fetch(API_BASE + path, Object.assign({}, options, { headers }));
    } catch (e) {
        throw new Error('Cannot reach the server. Is the backend running? (npm start)');
    }

    let data = {};
    try { data = await res.json(); } catch (e) { /* empty body */ }

    if (!res.ok) {
        // The server says the session is over (missing / expired / deleted account)
        if (data.code === 'TOKEN_INVALID') {
            clearToken();
            window.location.replace('index.html');
        }
        throw new Error(data.error || data.message || ('Request failed (' + res.status + ')'));
    }
    return data;
}

// ─── Small shared utilities (prefixed "pb" so they never clash with page code) ─
function pbEscape(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

// ₹1,500  ·  ₹299.50  ·  -₹1,799.50
function pbINR(n) {
    n = Number(n || 0);
    var neg = n < 0;
    n = Math.abs(n);
    var s = Number.isInteger(n)
        ? n.toLocaleString('en-IN')
        : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (neg ? '-' : '') + '₹' + s;
}

// Reads the user id stored inside the login token.
function pbUserId() {
    try {
        const payload = getToken().split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(payload)).id;
    } catch (e) {
        return 'guest';
    }
}

// Per-user preferences kept on this device (notification toggles, etc.)
function pbGetPref(key, fallback) {
    try {
        const all = JSON.parse(localStorage.getItem('pb_prefs_' + pbUserId()) || '{}');
        return key in all ? all[key] : fallback;
    } catch (e) { return fallback; }
}
function pbSetPref(key, value) {
    try {
        const k = 'pb_prefs_' + pbUserId();
        const all = JSON.parse(localStorage.getItem(k) || '{}');
        all[key] = value;
        localStorage.setItem(k, JSON.stringify(all));
    } catch (e) { /* storage full / blocked – ignore */ }
}
