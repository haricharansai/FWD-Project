const loginForm = document.getElementById('loginForm') || document.querySelector('form');

function recordLogin(username, role, success, note) {
    if (window.GrowClean && window.GrowClean.addLoginLog) {
        window.GrowClean.addLoginLog({ username, role, success, note });
    }
}

async function handleLogin(e) {
    if (e) e.preventDefault();

    if (window.GrowClean && window.GrowClean.ready) {
        try {
            await window.GrowClean.ready;
        } catch (_error) {
            // Continue with localStorage fallback.
        }
    }

    const username = document.getElementById('Username') ? document.getElementById('Username').value.trim() : '';
    const password = document.getElementById('Password') ? document.getElementById('Password').value : '';
    const selectedRole = document.getElementById('role') ? document.getElementById('role').value.toLowerCase().trim() : '';

    if (!username || !password || !selectedRole) {
        alert('Please fill all fields.');
        return;
    }

    const userRecord = window.GrowClean && window.GrowClean.getUser ? window.GrowClean.getUser(username) : null;

    if (!userRecord) {
        recordLogin(username, selectedRole, false, 'User not found');
        alert('User not found. Please register first.');
        return;
    }

    if (userRecord.password !== password) {
        recordLogin(username, selectedRole, false, 'Incorrect password');
        alert('Invalid credentials.');
        return;
    }

    const actualRole = (userRecord.role || '').toLowerCase();
    if (actualRole !== selectedRole) {
        recordLogin(username, selectedRole, false, 'Role mismatch');
        alert(`Role mismatch. This account is registered as ${window.GrowClean.toDisplayRole(actualRole)}.`);
        return;
    }

    try {
        if (window.GrowClean && window.GrowClean.setRole) {
            window.GrowClean.setRole(actualRole);
        }
        if (window.GrowClean && window.GrowClean.setCurrentUser) {
            window.GrowClean.setCurrentUser(userRecord.username || username);
        }
        if (window.GrowClean && window.GrowClean.updateLastLogin) {
            window.GrowClean.updateLastLogin(userRecord.username || username);
        }
        recordLogin(userRecord.username || username, actualRole, true, 'Login successful');
    } catch (error) {
        console.warn('Unable to persist session', error);
    }

    window.location.href = `Dashboard.html?role=${encodeURIComponent(actualRole)}`;
}

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        handleLogin(e);
    });
}
