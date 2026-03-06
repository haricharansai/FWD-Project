(function () {
    function safeJsonParse(value, fallback) {
        try {
            return JSON.parse(value);
        } catch (_error) {
            return fallback;
        }
    }

    function normalizeRole(role) {
        const normalized = (role || '').toLowerCase().trim();
        if (normalized === 'admin') return 'administrator';
        return normalized || 'citizen';
    }

    function toDisplayRole(role) {
        const normalized = normalizeRole(role);
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }

    const GrowClean = {
        usersKey: 'growclean_users',
        roleKey: 'growclean_role',
        userKey: 'growclean_user',
        complaintsKey: 'growclean_complaints',
        nextCounterKey: 'growclean_next_counter',
        loginLogKey: 'growclean_login_logs',
        syncTimer: null,
        ready: null,
        hasWritableServerStore: true,

        getUsers() {
            return safeJsonParse(localStorage.getItem(this.usersKey) || '{}', {});
        },

        saveUser(user) {
            if (!user || !user.username) return;

            const users = this.getUsers();
            const existing = users[user.username] || {};
            const createdAt = existing.createdAt || new Date().toISOString();
            const role = normalizeRole(user.role || existing.role || 'citizen');
            const assignedArea = role === 'worker'
                ? (user.assignedArea || existing.assignedArea || '').trim()
                : '';

            users[user.username] = {
                username: user.username,
                email: user.email || existing.email || '',
                password: user.password || existing.password || '',
                role,
                assignedArea,
                createdAt,
                lastLoginAt: existing.lastLoginAt || ''
            };

            localStorage.setItem(this.usersKey, JSON.stringify(users));
            this.scheduleSync();
        },

        getUser(username) {
            const users = this.getUsers();
            if (users[username]) return users[username];

            const key = Object.keys(users).find(
                (k) => k.toLowerCase() === (username || '').toLowerCase()
            );
            return key ? users[key] : null;
        },

        getUsersByRole(role) {
            const normalizedRole = normalizeRole(role);
            return Object.values(this.getUsers()).filter((u) => normalizeRole(u.role) === normalizedRole);
        },

        setCurrentUser(username) {
            localStorage.setItem(this.userKey, username || '');
            this.scheduleSync();
        },

        getCurrentUser() {
            return localStorage.getItem(this.userKey) || null;
        },

        setRole(role) {
            localStorage.setItem(this.roleKey, normalizeRole(role));
            this.scheduleSync();
        },

        getRole() {
            return normalizeRole(localStorage.getItem(this.roleKey) || '');
        },

        getLoginLogs() {
            return safeJsonParse(localStorage.getItem(this.loginLogKey) || '[]', []);
        },

        addLoginLog(entry) {
            const logs = this.getLoginLogs();
            logs.unshift({
                username: entry.username || 'unknown',
                role: normalizeRole(entry.role || ''),
                success: Boolean(entry.success),
                note: entry.note || '',
                at: entry.at || new Date().toISOString()
            });

            localStorage.setItem(this.loginLogKey, JSON.stringify(logs.slice(0, 300)));
            this.scheduleSync();
        },

        getLoginLogsForUser(username) {
            return this.getLoginLogs().filter((log) => (log.username || '').toLowerCase() === (username || '').toLowerCase());
        },

        updateLastLogin(username) {
            if (!username) return;
            const users = this.getUsers();
            if (!users[username]) return;
            users[username].lastLoginAt = new Date().toISOString();
            localStorage.setItem(this.usersKey, JSON.stringify(users));
            this.scheduleSync();
        },

        getComplaints() {
            return safeJsonParse(localStorage.getItem(this.complaintsKey) || '{}', {});
        },

        saveComplaints(obj) {
            localStorage.setItem(this.complaintsKey, JSON.stringify(obj));
            this.scheduleSync();
        },

        saveComplaint(compl) {
            const all = this.getComplaints();
            all[compl.id] = compl;
            this.saveComplaints(all);
        },

        getComplaintStatusCounts(items) {
            const complaints = Array.isArray(items) ? items : Object.values(this.getComplaints());
            const counts = { pending: 0, 'in-progress': 0, resolved: 0, total: complaints.length };

            complaints.forEach((c) => {
                const status = (c.status || 'pending').toLowerCase();
                if (Object.prototype.hasOwnProperty.call(counts, status)) {
                    counts[status] += 1;
                }
            });

            return counts;
        },

        getUserComplaintSummary(username) {
            const complaints = Object.values(this.getComplaints()).filter(
                (c) => (c.owner || '').toLowerCase() === (username || '').toLowerCase()
            );
            return this.getComplaintStatusCounts(complaints);
        },

        generateComplaintId() {
            const year = new Date().getFullYear();
            let counter = parseInt(localStorage.getItem(this.nextCounterKey) || '1', 10);
            const id = `GC-${year}-${String(counter).padStart(3, '0')}`;
            localStorage.setItem(this.nextCounterKey, String(counter + 1));
            this.scheduleSync();
            return id;
        },

        toDisplayRole,

        getSnapshot() {
            return {
                [this.usersKey]: this.getUsers(),
                [this.complaintsKey]: this.getComplaints(),
                [this.loginLogKey]: this.getLoginLogs(),
                [this.nextCounterKey]: localStorage.getItem(this.nextCounterKey) || '1'
            };
        },

        applySnapshot(snapshot) {
            if (!snapshot || typeof snapshot !== 'object') return;

            if (snapshot[this.usersKey]) {
                localStorage.setItem(this.usersKey, JSON.stringify(snapshot[this.usersKey]));
            }
            if (snapshot[this.complaintsKey]) {
                localStorage.setItem(this.complaintsKey, JSON.stringify(snapshot[this.complaintsKey]));
            }
            if (snapshot[this.loginLogKey]) {
                localStorage.setItem(this.loginLogKey, JSON.stringify(snapshot[this.loginLogKey]));
            }
            if (typeof snapshot[this.nextCounterKey] !== 'undefined') {
                localStorage.setItem(this.nextCounterKey, String(snapshot[this.nextCounterKey]));
            }
        },

        async hydrateFromServer() {
            try {
                const response = await fetch('/api/store', { cache: 'no-store' });
                if (!response.ok) {
                    this.hasWritableServerStore = false;
                    return this.hydrateFromStaticSeed();
                }

                const snapshot = await response.json();
                const hasData = snapshot && (
                    Object.keys(snapshot[this.usersKey] || {}).length > 0 ||
                    Object.keys(snapshot[this.complaintsKey] || {}).length > 0 ||
                    (Array.isArray(snapshot[this.loginLogKey]) && snapshot[this.loginLogKey].length > 0)
                );

                if (!hasData) return false;
                this.applySnapshot(snapshot);
                this.hasWritableServerStore = true;
                return true;
            } catch (_error) {
                this.hasWritableServerStore = false;
                return this.hydrateFromStaticSeed();
            }
        },

        async hydrateFromStaticSeed() {
            try {
                const response = await fetch('/data/growclean-store.json', { cache: 'no-store' });
                if (!response.ok) return false;

                const snapshot = await response.json();
                const hasData = snapshot && (
                    Object.keys(snapshot[this.usersKey] || {}).length > 0 ||
                    Object.keys(snapshot[this.complaintsKey] || {}).length > 0 ||
                    (Array.isArray(snapshot[this.loginLogKey]) && snapshot[this.loginLogKey].length > 0)
                );

                if (!hasData) return false;
                this.applySnapshot(snapshot);
                return true;
            } catch (_error) {
                return false;
            }
        },

        async persistToServer() {
            if (!this.hasWritableServerStore) return;
            try {
                await fetch('/api/store', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(this.getSnapshot())
                });
            } catch (_error) {
                this.hasWritableServerStore = false;
                // Keep localStorage as fallback when server is unavailable.
            }
        },

        scheduleSync() {
            clearTimeout(this.syncTimer);
            this.syncTimer = setTimeout(() => {
                this.persistToServer();
            }, 150);
        },

        ensureDefaultAccounts() {
            const users = this.getUsers();
            let changed = false;

            Object.keys(users).forEach((username) => {
                const user = users[username] || {};
                if (!user.role) {
                    user.role = 'citizen';
                    changed = true;
                }
                if (!user.createdAt) {
                    user.createdAt = new Date().toISOString();
                    changed = true;
                }
                if (typeof user.lastLoginAt === 'undefined') {
                    user.lastLoginAt = '';
                    changed = true;
                }
                if (typeof user.assignedArea === 'undefined') {
                    user.assignedArea = '';
                    changed = true;
                }
                users[username] = user;
            });

            if (changed) {
                localStorage.setItem(this.usersKey, JSON.stringify(users));
            }

            if (Object.keys(users).length > 0) return;

            const defaults = [
                {
                    username: 'citizen1',
                    email: 'citizen1@growclean.local',
                    password: 'citizen123',
                    role: 'citizen'
                },
                {
                    username: 'worker1',
                    email: 'worker1@growclean.local',
                    password: 'worker123',
                    role: 'worker',
                    assignedArea: 'Central Zone'
                },
                {
                    username: 'admin1',
                    email: 'admin1@growclean.local',
                    password: 'admin123',
                    role: 'administrator'
                }
            ];

            defaults.forEach((u) => this.saveUser(u));
        }
    };

    window.GrowClean = GrowClean;

    GrowClean.ready = (async function initStorage() {
        await GrowClean.hydrateFromServer();
        GrowClean.ensureDefaultAccounts();
        await GrowClean.persistToServer();
        return true;
    })();
})();
