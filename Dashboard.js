document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('divMain');
    if (!container) return;

    if (window.GrowClean && window.GrowClean.ready) {
        try {
            await window.GrowClean.ready;
        } catch (_error) {
            // Continue with localStorage fallback.
        }
    }

    const currentUser = window.GrowClean && window.GrowClean.getCurrentUser ? window.GrowClean.getCurrentUser() : null;
    if (!currentUser) {
        window.location.href = 'Login.html';
        return;
    }

    const currentUserRecord = window.GrowClean && window.GrowClean.getUser ? window.GrowClean.getUser(currentUser) : null;
    if (!currentUserRecord) {
        window.location.href = 'Login.html';
        return;
    }

    const roleFromStorage = window.GrowClean && window.GrowClean.getRole ? window.GrowClean.getRole() : '';
    const roleFromQuery = new URLSearchParams(window.location.search).get('role') || '';
    const role = (roleFromStorage || roleFromQuery || currentUserRecord.role || 'citizen').toLowerCase();
    if (window.GrowClean && window.GrowClean.setRole) {
        window.GrowClean.setRole(role);
    }

    const allComplaintsMap = window.GrowClean && window.GrowClean.getComplaints ? window.GrowClean.getComplaints() : {};
    const allComplaints = Object.values(allComplaintsMap).sort((a, b) => (b.dateFiled || '').localeCompare(a.dateFiled || ''));

    let visibleComplaints = [];
    if (role === 'citizen') {
        visibleComplaints = allComplaints.filter((c) => (c.owner || '').toLowerCase() === currentUser.toLowerCase());
    } else if (role === 'worker') {
        const assignedArea = (currentUserRecord.assignedArea || '').toLowerCase();
        visibleComplaints = assignedArea
            ? allComplaints.filter((c) => (c.location || '').toLowerCase().includes(assignedArea))
            : allComplaints;
    } else if (role === 'administrator') {
        visibleComplaints = allComplaints;
    }

    renderComplaintList(container, visibleComplaints);
    renderRoleBasedRecords(container, role, currentUser, currentUserRecord, allComplaints);
});

function renderComplaintList(container, items) {
    const listWrap = document.createElement('section');
    listWrap.className = 'dashboard-content dashboard-records';
    listWrap.innerHTML = '<h2>Complaint Status Records</h2>';

    const list = document.createElement('div');
    if (items.length === 0) {
        list.innerHTML = '<p>No complaints to show.</p>';
    } else {
        const ul = document.createElement('ul');
        ul.className = 'record-list';

        items.forEach((c) => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${c.id}</strong> - ${c.category} - ${c.location || 'N/A'} - <em>${c.status}</em> - <a href="Status.html?id=${encodeURIComponent(c.id)}">View</a>`;
            ul.appendChild(li);
        });

        list.appendChild(ul);
    }

    listWrap.appendChild(list);
    container.insertAdjacentElement('afterend', listWrap);
}

function renderRoleBasedRecords(container, role, currentUser, currentUserRecord, allComplaints) {
    if (role === 'citizen') {
        renderCitizenRecord(container, currentUser);
        return;
    }

    if (role === 'worker') {
        renderWorkerRecord(container, currentUserRecord, allComplaints);
        return;
    }

    if (role === 'administrator') {
        renderAdminRecords(container, allComplaints);
    }
}

function renderCitizenRecord(container, username) {
    const wrap = document.createElement('section');
    wrap.className = 'dashboard-content dashboard-records';

    const user = window.GrowClean && window.GrowClean.getUser ? window.GrowClean.getUser(username) : null;
    const summary = window.GrowClean && window.GrowClean.getUserComplaintSummary
        ? window.GrowClean.getUserComplaintSummary(username)
        : { total: 0, pending: 0, 'in-progress': 0, resolved: 0 };

    const logs = window.GrowClean && window.GrowClean.getLoginLogsForUser
        ? window.GrowClean.getLoginLogsForUser(username).slice(0, 5)
        : [];

    wrap.innerHTML = `
        <h2>My Profile Record</h2>
        <div class="record-grid">
            <div><strong>Username:</strong> ${user ? user.username : 'N/A'}</div>
            <div><strong>Email:</strong> ${user ? user.email : 'N/A'}</div>
            <div><strong>Role:</strong> ${user ? window.GrowClean.toDisplayRole(user.role) : 'N/A'}</div>
            <div><strong>Created:</strong> ${formatDateTime(user && user.createdAt)}</div>
            <div><strong>Last Login:</strong> ${formatDateTime(user && user.lastLoginAt)}</div>
            <div><strong>Total Complaints:</strong> ${summary.total}</div>
            <div><strong>Pending:</strong> ${summary.pending}</div>
            <div><strong>In Progress:</strong> ${summary['in-progress']}</div>
            <div><strong>Resolved:</strong> ${summary.resolved}</div>
        </div>
        <h3>Recent Login Records</h3>
        ${renderLoginList(logs)}
    `;

    container.parentNode.appendChild(wrap);
}

function renderWorkerRecord(container, userRecord, allComplaints) {
    const wrap = document.createElement('section');
    wrap.className = 'dashboard-content dashboard-records';

    const assignedArea = userRecord && userRecord.assignedArea ? userRecord.assignedArea : 'Not assigned';
    const relevantComplaints = userRecord && userRecord.assignedArea
        ? allComplaints.filter((c) => (c.location || '').toLowerCase().includes(userRecord.assignedArea.toLowerCase()))
        : allComplaints;

    const counts = window.GrowClean && window.GrowClean.getComplaintStatusCounts
        ? window.GrowClean.getComplaintStatusCounts(relevantComplaints)
        : { total: relevantComplaints.length, pending: 0, 'in-progress': 0, resolved: 0 };

    wrap.innerHTML = `
        <h2>Worker Details</h2>
        <div class="record-grid">
            <div><strong>Username:</strong> ${userRecord.username}</div>
            <div><strong>Email:</strong> ${userRecord.email || 'N/A'}</div>
            <div><strong>Assigned Area:</strong> ${assignedArea}</div>
            <div><strong>Total Assigned Complaints:</strong> ${counts.total}</div>
            <div><strong>Pending:</strong> ${counts.pending}</div>
            <div><strong>In Progress:</strong> ${counts['in-progress']}</div>
            <div><strong>Resolved:</strong> ${counts.resolved}</div>
        </div>
    `;

    container.parentNode.appendChild(wrap);
}

function renderAdminRecords(container, allComplaints) {
    const users = window.GrowClean && window.GrowClean.getUsers ? Object.values(window.GrowClean.getUsers()) : [];
    const logs = window.GrowClean && window.GrowClean.getLoginLogs ? window.GrowClean.getLoginLogs().slice(0, 15) : [];
    const counts = window.GrowClean && window.GrowClean.getComplaintStatusCounts
        ? window.GrowClean.getComplaintStatusCounts(allComplaints)
        : { total: 0, pending: 0, 'in-progress': 0, resolved: 0 };

    const wrap = document.createElement('section');
    wrap.className = 'dashboard-content dashboard-records';

    wrap.innerHTML = `
        <h2 id="adminAnalytics">Admin Analytics</h2>
        ${renderAdminAnalytics(allComplaints)}
        <h2>User Credential Records (Administrator Only)</h2>
        ${renderUsersTable(users)}
        <h3>Create Worker Account</h3>
        ${renderWorkerForm()}
        <h3>Edit Worker Details</h3>
        ${renderWorkerEditForm(users)}
        <h3>Complaint Summary</h3>
        <div class="record-grid">
            <div><strong>Total:</strong> ${counts.total}</div>
            <div><strong>Pending:</strong> ${counts.pending}</div>
            <div><strong>In Progress:</strong> ${counts['in-progress']}</div>
            <div><strong>Resolved:</strong> ${counts.resolved}</div>
        </div>
        <h3>Recent Login Records</h3>
        ${renderLoginList(logs)}
    `;

    container.parentNode.appendChild(wrap);
    attachWorkerCreateHandler();
    attachWorkerEditHandler();
    autoScrollAnalytics();
}

function renderAdminAnalytics(allComplaints) {
    const total = allComplaints.length;
    const resolved = allComplaints.filter((c) => c.status === 'resolved').length;
    const pending = allComplaints.filter((c) => c.status === 'pending').length;
    const inProgress = allComplaints.filter((c) => c.status === 'in-progress').length;

    const resolvedRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const byCategory = countBy(allComplaints, (c) => (c.category || 'unknown').toLowerCase());
    const byLocation = countBy(allComplaints, (c) => (c.location || 'unknown').toLowerCase());

    const topCategories = toTopList(byCategory, 4);
    const topLocations = toTopList(byLocation, 4);

    return `
        <div class="analytics-grid">
            <div class="analytics-card"><strong>Total Complaints</strong><span>${total}</span></div>
            <div class="analytics-card"><strong>Resolved</strong><span>${resolved}</span></div>
            <div class="analytics-card"><strong>In Progress</strong><span>${inProgress}</span></div>
            <div class="analytics-card"><strong>Pending</strong><span>${pending}</span></div>
            <div class="analytics-card"><strong>Resolution Rate</strong><span>${resolvedRate}%</span></div>
        </div>
        <div class="analytics-split">
            <div>
                <h3>Top Categories</h3>
                ${renderMetricBars(topCategories)}
            </div>
            <div>
                <h3>Top Locations</h3>
                ${renderMetricBars(topLocations)}
            </div>
        </div>
    `;
}

function countBy(items, keyFn) {
    return items.reduce((acc, item) => {
        const key = keyFn(item) || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function toTopList(mapObj, limit) {
    return Object.entries(mapObj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit);
}

function renderMetricBars(entries) {
    if (!entries.length) return '<p>No data available.</p>';
    const max = entries[0][1] || 1;
    return `
        <ul class="metric-bars">
            ${entries.map(([name, value]) => `
                <li>
                    <div class="metric-row">
                        <span>${escapeHtml(titleCase(name))}</span>
                        <strong>${value}</strong>
                    </div>
                    <div class="metric-track"><div class="metric-fill" style="width:${Math.max(8, Math.round((value / max) * 100))}%"></div></div>
                </li>
            `).join('')}
        </ul>
    `;
}

function titleCase(text) {
    return String(text)
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function autoScrollAnalytics() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') !== 'analytics') return;
    const el = document.getElementById('adminAnalytics');
    if (!el) return;
    setTimeout(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
}

function renderUsersTable(users) {
    if (!users.length) return '<p>No users registered.</p>';

    const rows = users
        .sort((a, b) => (a.username || '').localeCompare(b.username || ''))
        .map((u) => `
            <tr>
                <td>${u.username || ''}</td>
                <td>${u.email || ''}</td>
                <td>${window.GrowClean.toDisplayRole(u.role || '')}</td>
                <td>${u.role === 'worker' ? (u.assignedArea || 'N/A') : '-'}</td>
                <td>${formatDateTime(u.createdAt)}</td>
                <td>${formatDateTime(u.lastLoginAt)}</td>
            </tr>
        `)
        .join('');

    return `
        <div class="table-wrap">
            <table class="records-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Assigned Area</th>
                        <th>Created</th>
                        <th>Last Login</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function renderWorkerForm() {
    return `
        <form id="createWorkerForm" class="admin-worker-form">
            <label for="workerUsername">Username</label>
            <input id="workerUsername" type="text" required>

            <label for="workerEmail">Email</label>
            <input id="workerEmail" type="email" required>

            <label for="workerPassword">Password</label>
            <input id="workerPassword" type="password" minlength="6" required>

            <label for="workerArea">Assigned Area / Location</label>
            <input id="workerArea" type="text" required>

            <button type="submit">Create Worker</button>
            <p id="workerCreateMessage" class="form-message"></p>
        </form>
    `;
}

function renderWorkerEditForm(users) {
    const workers = users.filter((u) => (u.role || '').toLowerCase() === 'worker');
    const options = workers.length
        ? workers.map((w) => `<option value="${escapeHtml(w.username)}">${escapeHtml(w.username)} (${escapeHtml(w.assignedArea || 'No area')})</option>`).join('')
        : '<option value="">No workers available</option>';

    return `
        <form id="editWorkerForm" class="admin-worker-form">
            <label for="editWorkerSelect">Select Worker</label>
            <select id="editWorkerSelect" ${workers.length ? '' : 'disabled'}>
                <option value="">--Select Worker--</option>
                ${options}
            </select>

            <label for="editWorkerArea">Assigned Area / Location</label>
            <input id="editWorkerArea" type="text" placeholder="Enter assigned area" ${workers.length ? '' : 'disabled'}>

            <label for="editWorkerPassword">New Password (optional)</label>
            <input id="editWorkerPassword" type="password" minlength="6" placeholder="Leave blank to keep current password" ${workers.length ? '' : 'disabled'}>

            <button type="submit" ${workers.length ? '' : 'disabled'}>Update Worker</button>
            <p id="workerEditMessage" class="form-message"></p>
        </form>
    `;
}

function attachWorkerCreateHandler() {
    const form = document.getElementById('createWorkerForm');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = document.getElementById('workerUsername').value.trim();
        const email = document.getElementById('workerEmail').value.trim().toLowerCase();
        const password = document.getElementById('workerPassword').value;
        const assignedArea = document.getElementById('workerArea').value.trim();
        const msg = document.getElementById('workerCreateMessage');

        if (!username || !email || !password || !assignedArea) {
            if (msg) msg.textContent = 'Please fill all fields.';
            return;
        }

        const existing = window.GrowClean.getUser(username);
        if (existing) {
            if (msg) msg.textContent = 'Username already exists.';
            return;
        }

        const users = window.GrowClean.getUsers();
        const emailExists = Object.values(users).some((u) => (u.email || '').toLowerCase() === email);
        if (emailExists) {
            if (msg) msg.textContent = 'Email already exists.';
            return;
        }

        window.GrowClean.saveUser({
            username,
            email,
            password,
            role: 'worker',
            assignedArea
        });

        if (msg) msg.textContent = 'Worker account created successfully.';
        form.reset();
        setTimeout(() => {
            window.location.reload();
        }, 500);
    });
}

function attachWorkerEditHandler() {
    const form = document.getElementById('editWorkerForm');
    if (!form) return;

    const select = document.getElementById('editWorkerSelect');
    const areaInput = document.getElementById('editWorkerArea');
    const passInput = document.getElementById('editWorkerPassword');
    const msg = document.getElementById('workerEditMessage');

    function populateSelectedWorker() {
        const username = select && select.value ? select.value : '';
        if (!username) {
            if (areaInput) areaInput.value = '';
            if (passInput) passInput.value = '';
            return;
        }

        const user = window.GrowClean.getUser(username);
        if (!user) return;
        if (areaInput) areaInput.value = user.assignedArea || '';
        if (passInput) passInput.value = '';
    }

    if (select) {
        select.addEventListener('change', populateSelectedWorker);
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = select && select.value ? select.value : '';
        if (!username) {
            if (msg) msg.textContent = 'Please select a worker.';
            return;
        }

        const worker = window.GrowClean.getUser(username);
        if (!worker || (worker.role || '').toLowerCase() !== 'worker') {
            if (msg) msg.textContent = 'Selected account is not a worker.';
            return;
        }

        const newArea = areaInput ? areaInput.value.trim() : '';
        const newPassword = passInput ? passInput.value : '';

        if (!newArea) {
            if (msg) msg.textContent = 'Assigned area is required.';
            return;
        }

        if (newPassword && newPassword.length < 6) {
            if (msg) msg.textContent = 'New password must be at least 6 characters.';
            return;
        }

        window.GrowClean.saveUser({
            username: worker.username,
            email: worker.email || '',
            role: 'worker',
            assignedArea: newArea,
            password: newPassword || worker.password
        });

        if (msg) msg.textContent = 'Worker details updated successfully.';
        if (passInput) passInput.value = '';
        setTimeout(() => {
            window.location.reload();
        }, 500);
    });

    populateSelectedWorker();
}

function renderLoginList(logs) {
    if (!logs.length) return '<p>No login records available.</p>';

    const items = logs
        .map((log) => `<li><strong>${log.username}</strong> - ${window.GrowClean.toDisplayRole(log.role)} - ${log.success ? 'Success' : 'Failed'} - ${formatDateTime(log.at)}${log.note ? ` (${log.note})` : ''}</li>`)
        .join('');

    return `<ul class="record-list">${items}</ul>`;
}

function formatDateTime(value) {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('en-US');
}
