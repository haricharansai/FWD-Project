const searchBtn = document.getElementById('searchBtn');
const complaintIdInput = document.getElementById('complaintId');
const statusResult = document.getElementById('statusResult');
const noResult = document.getElementById('noResult');
const newProgress = document.getElementById('newProgress');
const newProgressText = document.getElementById('newProgressText');
const workQueueList = document.getElementById('workQueueList');
const updatePhotoInput = document.getElementById('updatePhoto');
const updatePhotoPreview = document.getElementById('updatePhotoPreview');

function normalizeRole(role) {
    return (role || '').toLowerCase().trim();
}

function getCurrentRole() {
    const stored = window.GrowClean && window.GrowClean.getRole ? window.GrowClean.getRole() : '';
    const qRole = new URLSearchParams(window.location.search).get('role') || '';
    return normalizeRole(stored || qRole || 'guest');
}

function getStoredComplaints() {
    return window.GrowClean && window.GrowClean.getComplaints ? window.GrowClean.getComplaints() : {};
}

function persistComplaint(complaint) {
    if (window.GrowClean && window.GrowClean.saveComplaint) {
        window.GrowClean.saveComplaint(complaint);
    }
}

function mapComplaint(raw) {
    return {
        id: raw.id,
        category: raw.category || 'N/A',
        description: raw.description || raw.complaint || '',
        location: raw.location || 'N/A',
        dateFiled: raw.dateFiled || raw.dateSubmitted || '',
        status: raw.status || 'pending',
        progress: Number.isFinite(Number(raw.progress)) ? Number(raw.progress) : 0,
        updates: Array.isArray(raw.updates) ? raw.updates : []
    };
}

function loadAllComplaints() {
    const stored = getStoredComplaints();
    const merged = {};

    Object.keys(stored).forEach((key) => {
        const item = stored[key];
        if (item && item.id) {
            merged[item.id] = mapComplaint(item);
        }
    });

    return merged;
}

function getAllComplaintsSorted() {
    return Object.values(loadAllComplaints()).sort((a, b) => {
        const statusOrder = { pending: 0, 'in-progress': 1, resolved: 2 };
        const aStatus = statusOrder[a.status] ?? 3;
        const bStatus = statusOrder[b.status] ?? 3;
        if (aStatus !== bStatus) return aStatus - bStatus;
        return (b.dateFiled || '').localeCompare(a.dateFiled || '');
    });
}

function getComplaintById(id) {
    const all = loadAllComplaints();
    return all[id] || null;
}

function searchComplaint() {
    if (!complaintIdInput) return;
    const complaintId = complaintIdInput.value.trim().toUpperCase();

    if (!complaintId) {
        alert('Please enter a complaint ID');
        return;
    }

    const complaint = getComplaintById(complaintId);

    if (!complaint) {
        if (statusResult) statusResult.style.display = 'none';
        if (noResult) noResult.style.display = 'block';
        return;
    }

    displayComplaint(complaint);
    if (statusResult) statusResult.style.display = 'block';
    if (noResult) noResult.style.display = 'none';
}

function openComplaintById(complaintId) {
    if (!complaintIdInput) return;
    complaintIdInput.value = complaintId;
    searchComplaint();
}

function displayComplaint(complaint) {
    const idEl = document.getElementById('displayComplaintId');
    const categoryEl = document.getElementById('displayCategory');
    const descriptionEl = document.getElementById('displayDescription');
    const locationEl = document.getElementById('displayLocation');
    const dateEl = document.getElementById('displayDate');
    const statusEl = document.getElementById('displayStatus');
    const badge = document.getElementById('statusBadge');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    if (idEl) idEl.textContent = complaint.id;
    if (categoryEl) categoryEl.textContent = complaint.category;
    if (descriptionEl) descriptionEl.textContent = complaint.description;
    if (locationEl) locationEl.textContent = complaint.location;
    if (dateEl) dateEl.textContent = formatDate(complaint.dateFiled);
    if (statusEl) statusEl.textContent = getStatusText(complaint.status);

    if (badge) {
        badge.className = `status-badge ${complaint.status}`;
        badge.textContent = getStatusText(complaint.status);
    }

    if (progressFill) progressFill.style.width = `${complaint.progress}%`;
    if (progressText) progressText.textContent = `${complaint.progress}% Complete`;

    displayTimeline(complaint.updates);
    configureUpdatePanel(complaint);
}

function configureUpdatePanel(complaint) {
    const role = getCurrentRole();
    const updatePanel = document.getElementById('updatePanel');
    if (!updatePanel) return;

    const allowedRoles = (updatePanel.dataset.role || '').split(',').map((r) => r.trim().toLowerCase());
    if (!allowedRoles.includes(role)) {
        updatePanel.style.display = 'none';
        return;
    }

    updatePanel.style.display = '';

    const newStatusEl = document.getElementById('newStatus');
    const updateNoteEl = document.getElementById('updateNote');
    const saveBtn = document.getElementById('saveUpdateBtn');
    const updatePhotoHelp = document.getElementById('updatePhotoHelp');

    if (newStatusEl) newStatusEl.value = complaint.status || 'pending';
    if (newProgress) newProgress.value = complaint.progress || 0;
    if (newProgressText) newProgressText.textContent = `${complaint.progress || 0}%`;
    if (updateNoteEl) updateNoteEl.value = '';
    if (updatePhotoInput) updatePhotoInput.value = '';
    if (updatePhotoPreview) updatePhotoPreview.innerHTML = '';
    if (updatePhotoHelp) {
        updatePhotoHelp.style.display = role === 'worker' ? '' : 'none';
    }

    if (saveBtn) {
        saveBtn.onclick = (ev) => saveUpdateHandler(ev, complaint.id);
    }
}

function saveUpdateHandler(ev, complaintId) {
    ev.preventDefault();

    const newStatusEl = document.getElementById('newStatus');
    const updateNoteEl = document.getElementById('updateNote');
    const updateMessage = document.getElementById('updateMessage');
    const role = getCurrentRole();
    const updateFiles = updatePhotoInput ? Array.from(updatePhotoInput.files || []) : [];

    const status = newStatusEl ? newStatusEl.value : 'pending';
    const progress = newProgress ? parseInt(newProgress.value, 10) || 0 : 0;
    const note = updateNoteEl && updateNoteEl.value.trim()
        ? updateNoteEl.value.trim()
        : `Status updated to ${getStatusText(status)}`;

    if (role === 'worker' && updateFiles.length === 0) {
        if (updateMessage) updateMessage.textContent = 'Worker update requires at least one photo.';
        return;
    }

    if (updateFiles.length > 5) {
        if (updateMessage) updateMessage.textContent = 'Please upload up to 5 photos.';
        return;
    }

    const allStored = getStoredComplaints();
    let target = allStored[complaintId];

    if (!target) {
        alert('Complaint not found.');
        return;
    }

    target = mapComplaint(target);
    target.status = status;
    target.progress = progress;
    target.updates = target.updates || [];
    target.updates.push({
        date: new Date().toISOString().slice(0, 10),
        text: note,
        completed: status === 'resolved',
        photos: updateFiles.map((file) => ({ name: file.name, size: file.size, type: file.type }))
    });

    persistComplaint(target);
    if (updateMessage) updateMessage.textContent = 'Update saved.';

    displayComplaint(target);
    renderWorkQueue();
}

function displayTimeline(updates) {
    const timelineContainer = document.getElementById('timelineContainer');
    if (!timelineContainer) return;
    timelineContainer.innerHTML = '';

    (updates || []).forEach((update) => {
        const timelineItem = document.createElement('div');
        timelineItem.className = `timeline-item ${update.completed ? 'completed' : ''}`;
        timelineItem.innerHTML = `
            <div class="timeline-date">${formatDate(update.date)}</div>
            <div class="timeline-text">${update.text || ''}</div>
        `;
        timelineContainer.appendChild(timelineItem);
    });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'N/A';

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function getStatusText(status) {
    const statusMap = {
        pending: 'Pending',
        'in-progress': 'In Progress',
        resolved: 'Resolved'
    };
    return statusMap[status] || status;
}

function autoSearchFromQuery() {
    if (!complaintIdInput) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || params.get('complaintId') || params.get('cid');

    if (id) {
        complaintIdInput.value = id;
        searchComplaint();
    }
}

function renderWorkQueue() {
    if (!workQueueList) return;

    const role = getCurrentRole();
    if (role !== 'worker' && role !== 'administrator') {
        workQueueList.innerHTML = '';
        return;
    }

    const complaints = getAllComplaintsSorted();
    if (complaints.length === 0) {
        workQueueList.innerHTML = '<p>No complaints recorded yet.</p>';
        return;
    }

    const items = complaints.map((c) => {
        return `
            <li>
                <strong>${c.id}</strong> - ${c.category} - ${c.location || 'N/A'} - <em>${getStatusText(c.status)}</em>
                <button type="button" class="open-complaint-btn" data-id="${c.id}">Open</button>
            </li>
        `;
    }).join('');

    workQueueList.innerHTML = `<ul class="work-queue">${items}</ul>`;

    Array.from(workQueueList.querySelectorAll('.open-complaint-btn')).forEach((btn) => {
        btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-id');
            if (id) openComplaintById(id);
        });
    });
}

if (searchBtn) {
    searchBtn.addEventListener('click', searchComplaint);
}

if (complaintIdInput) {
    complaintIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchComplaint();
        }
    });
}

if (newProgress) {
    newProgress.addEventListener('input', () => {
        if (newProgressText) {
            newProgressText.textContent = `${newProgress.value}%`;
        }
    });
}

if (updatePhotoInput) {
    updatePhotoInput.addEventListener('change', () => {
        if (!updatePhotoPreview) return;
        updatePhotoPreview.innerHTML = '';

        const files = Array.from(updatePhotoInput.files || []);
        files.slice(0, 5).forEach((file) => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            const img = document.createElement('img');
            img.className = 'preview-thumb';
            reader.onload = (evt) => {
                img.src = evt.target.result;
            };
            reader.readAsDataURL(file);
            updatePhotoPreview.appendChild(img);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    if (complaintIdInput) complaintIdInput.focus();
    renderWorkQueue();
    autoSearchFromQuery();
});
