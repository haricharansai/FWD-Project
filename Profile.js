document.addEventListener('DOMContentLoaded', async () => {
    const details = document.getElementById('profileDetails');
    if (!details) return;

    if (window.GrowClean && window.GrowClean.ready) {
        try {
            await window.GrowClean.ready;
        } catch (_error) {
            // Continue with localStorage fallback.
        }
    }

    const username = window.GrowClean && window.GrowClean.getCurrentUser
        ? window.GrowClean.getCurrentUser()
        : localStorage.getItem('growclean_user');

    if (!username) {
        details.innerHTML = '<p>No user is currently logged in. Redirecting to login...</p>';
        setTimeout(() => {
            window.location.href = 'Login.html';
        }, 700);
        return;
    }

    const user = window.GrowClean && window.GrowClean.getUser ? window.GrowClean.getUser(username) : null;
    if (!user) {
        details.innerHTML = `<p>User <strong>${username}</strong> profile was not found. Redirecting to login...</p>`;
        setTimeout(() => {
            window.location.href = 'Login.html';
        }, 900);
        return;
    }

    const roleLabel = window.GrowClean && window.GrowClean.toDisplayRole
        ? window.GrowClean.toDisplayRole(user.role)
        : (user.role || 'N/A');

    const all = window.GrowClean && window.GrowClean.getComplaints ? window.GrowClean.getComplaints() : {};
    const complaints = Object.values(all).filter((c) => (c.owner || '').toLowerCase() === username.toLowerCase());

    const summary = window.GrowClean && window.GrowClean.getUserComplaintSummary
        ? window.GrowClean.getUserComplaintSummary(username)
        : { total: complaints.length, pending: 0, 'in-progress': 0, resolved: 0 };

    const logs = window.GrowClean && window.GrowClean.getLoginLogsForUser
        ? window.GrowClean.getLoginLogsForUser(username).slice(0, 5)
        : [];

    details.innerHTML = `
        <div style="display:grid;grid-template-columns:160px 1fr;gap:8px;align-items:start">
            <div><strong>Username:</strong></div><div>${user.username}</div>
            <div><strong>Email:</strong></div><div>${user.email || '-'}</div>
            <div><strong>Role:</strong></div><div>${roleLabel}</div>
            ${user.role === 'worker' ? `<div><strong>Assigned Area:</strong></div><div>${user.assignedArea || 'Not assigned'}</div>` : ''}
            <div><strong>Created:</strong></div><div>${formatDateTime(user.createdAt)}</div>
            <div><strong>Last Login:</strong></div><div>${formatDateTime(user.lastLoginAt)}</div>
            <div><strong>Total Complaints:</strong></div><div>${summary.total}</div>
            <div><strong>Pending:</strong></div><div>${summary.pending}</div>
            <div><strong>In Progress:</strong></div><div>${summary['in-progress']}</div>
            <div><strong>Resolved:</strong></div><div>${summary.resolved}</div>
        </div>
    `;

    const listHtml = complaints.length === 0
        ? '<p>No complaints filed yet.</p>'
        : `<ul>${complaints.map((c) => `
            <li><strong>${c.id}</strong> - ${c.category} - ${c.location || 'N/A'} - <em>${c.status}</em> - <a href="Status.html?id=${encodeURIComponent(c.id)}">View</a></li>
        `).join('')}</ul>`;

    const loginHtml = logs.length === 0
        ? '<p>No login records available.</p>'
        : `<ul>${logs.map((log) => `
            <li>${formatDateTime(log.at)} - ${log.success ? 'Success' : 'Failed'}${log.note ? ` (${log.note})` : ''}</li>
        `).join('')}</ul>`;

    details.innerHTML += `<h3 style="margin-top:12px">My Complaints</h3>${listHtml}`;
    details.innerHTML += `<h3 style="margin-top:12px">Recent Login Records</h3>${loginHtml}`;
});

function formatDateTime(value) {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US');
}
