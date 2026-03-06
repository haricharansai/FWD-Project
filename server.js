const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const START_PORT = parseInt(process.env.PORT || '3000', 10);
const MAX_PORT_ATTEMPTS = 20;

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'growclean-store.json');
const COMPLAINT_TEXT_FILE = path.join(DATA_DIR, 'complaints-record.txt');
const LOGIN_PROFILE_TEXT_FILE = path.join(DATA_DIR, 'login-profile-record.txt');

function ensureDataFile() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DATA_FILE)) {
        const initial = {
            growclean_users: {},
            growclean_complaints: {},
            growclean_login_logs: [],
            growclean_next_counter: '1'
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf8');
    }

    if (!fs.existsSync(COMPLAINT_TEXT_FILE)) {
        fs.writeFileSync(COMPLAINT_TEXT_FILE, 'GrowClean Complaint Records\n\nNo complaints recorded yet.\n', 'utf8');
    }

    if (!fs.existsSync(LOGIN_PROFILE_TEXT_FILE)) {
        fs.writeFileSync(LOGIN_PROFILE_TEXT_FILE, 'GrowClean Login & Profile Records\n\nNo users recorded yet.\n', 'utf8');
    }
}

function readStore() {
    ensureDataFile();
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    } catch (_error) {
        return {
            growclean_users: {},
            growclean_complaints: {},
            growclean_login_logs: [],
            growclean_next_counter: '1'
        };
    }
}

function writeStore(snapshot) {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(snapshot, null, 2), 'utf8');
}

function complaintToText(complaint) {
    return [
        `ID: ${complaint.id || 'N/A'}`,
        `Owner: ${complaint.owner || 'N/A'}`,
        `Category: ${complaint.category || 'N/A'}`,
        `Location: ${complaint.location || 'N/A'}`,
        `Status: ${complaint.status || 'pending'}`,
        `Progress: ${complaint.progress || 0}%`,
        `Date Filed: ${complaint.dateFiled || 'N/A'}`,
        `Description: ${complaint.description || 'N/A'}`,
        `Phone: ${complaint.phone || 'N/A'}`
    ].join('\n');
}

function writeComplaintTextFile(store) {
    const complaints = Object.values(store.growclean_complaints || {});
    if (complaints.length === 0) {
        fs.writeFileSync(COMPLAINT_TEXT_FILE, 'GrowClean Complaint Records\n\nNo complaints recorded yet.\n', 'utf8');
        return;
    }

    const lines = ['GrowClean Complaint Records', `Generated: ${new Date().toISOString()}`, ''];
    complaints
        .sort((a, b) => (b.dateFiled || '').localeCompare(a.dateFiled || ''))
        .forEach((complaint, index) => {
            lines.push(`Record ${index + 1}`);
            lines.push(complaintToText(complaint));
            lines.push('');
        });

    fs.writeFileSync(COMPLAINT_TEXT_FILE, lines.join('\n'), 'utf8');
}

function writeLoginProfileTextFile(store) {
    const users = Object.values(store.growclean_users || {});
    const logs = Array.isArray(store.growclean_login_logs) ? store.growclean_login_logs : [];

    if (users.length === 0) {
        fs.writeFileSync(LOGIN_PROFILE_TEXT_FILE, 'GrowClean Login & Profile Records\n\nNo users recorded yet.\n', 'utf8');
        return;
    }

    const lines = ['GrowClean Login & Profile Records', `Generated: ${new Date().toISOString()}`, ''];
    lines.push('User Profiles');
    users
        .sort((a, b) => (a.username || '').localeCompare(b.username || ''))
        .forEach((user, index) => {
            lines.push(`User ${index + 1}`);
            lines.push(`Username: ${user.username || 'N/A'}`);
            lines.push(`Email: ${user.email || 'N/A'}`);
            lines.push(`Role: ${user.role || 'N/A'}`);
            lines.push(`Created: ${user.createdAt || 'N/A'}`);
            lines.push(`Last Login: ${user.lastLoginAt || 'N/A'}`);
            lines.push('');
        });

    lines.push('Recent Login Attempts');
    if (logs.length === 0) {
        lines.push('No login attempts recorded.');
    } else {
        logs.slice(0, 200).forEach((log, index) => {
            lines.push(
                `${index + 1}. ${log.username || 'unknown'} | ${log.role || 'N/A'} | ${log.success ? 'SUCCESS' : 'FAILED'} | ${log.at || 'N/A'}${log.note ? ` | ${log.note}` : ''}`
            );
        });
    }

    fs.writeFileSync(LOGIN_PROFILE_TEXT_FILE, lines.join('\n'), 'utf8');
}

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/store', (_req, res) => {
    const store = readStore();
    res.json(store);
});

app.get('/api/complaints', (_req, res) => {
    const store = readStore();
    const complaints = Object.values(store.growclean_complaints || {});
    res.json(complaints);
});

app.get('/api/complaints/text', (_req, res) => {
    ensureDataFile();
    try {
        const content = fs.readFileSync(COMPLAINT_TEXT_FILE, 'utf8');
        res.type('text/plain').send(content);
    } catch (_error) {
        res.type('text/plain').send('Complaint record file is empty.');
    }
});

app.get('/api/login-profile/text', (_req, res) => {
    ensureDataFile();
    try {
        const content = fs.readFileSync(LOGIN_PROFILE_TEXT_FILE, 'utf8');
        res.type('text/plain').send(content);
    } catch (_error) {
        res.type('text/plain').send('Login/profile record file is empty.');
    }
});

app.post('/api/store', (req, res) => {
    const snapshot = req.body;

    if (!snapshot || typeof snapshot !== 'object') {
        res.status(400).json({ error: 'Invalid snapshot payload' });
        return;
    }

    writeStore(snapshot);
    writeComplaintTextFile(snapshot);
    writeLoginProfileTextFile(snapshot);
    res.json({ ok: true });
});

app.get('/', (_req, res) => {
    res.sendFile(path.join(__dirname, 'Home.html'));
});

function startServer(port, attemptsLeft) {
    const server = app.listen(port, () => {
        const existingStore = readStore();
        writeComplaintTextFile(existingStore);
        writeLoginProfileTextFile(existingStore);
        console.log(`GrowClean running at http://localhost:${port}`);
        console.log(`Data file: ${DATA_FILE}`);
        console.log(`Complaint text file: ${COMPLAINT_TEXT_FILE}`);
        console.log(`Login/profile text file: ${LOGIN_PROFILE_TEXT_FILE}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
            const nextPort = port + 1;
            console.warn(`Port ${port} is in use. Trying ${nextPort}...`);
            startServer(nextPort, attemptsLeft - 1);
            return;
        }

        console.error('Failed to start server:', err.message);
        process.exit(1);
    });
}

startServer(START_PORT, MAX_PORT_ATTEMPTS);
