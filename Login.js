const loginForm = document.getElementById('loginForm') || document.querySelector('form');
const forgotPasswordLink = document.querySelector('.forgot a');

function recordLogin(username, role, success, note) {
    if (window.GrowClean && window.GrowClean.addLoginLog) {
        window.GrowClean.addLoginLog({ username, role, success, note });
    }
}

async function ensureStorageReady() {
    if (window.GrowClean && window.GrowClean.ready) {
        try {
            await window.GrowClean.ready;
        } catch (_error) {
            // Continue with localStorage fallback.
        }
    }
}

async function handleForgotPassword(e) {
    if (e) e.preventDefault();

    await ensureStorageReady();

    const username = prompt('Enter your username to reset password:');
    if (username === null) return;
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
        alert('Username is required.');
        return;
    }

    const userRecord = window.GrowClean && window.GrowClean.getUser ? window.GrowClean.getUser(trimmedUsername) : null;
    if (!userRecord) {
        alert('User not found. Please register first.');
        return;
    }

    const email = prompt('Enter your registered email:');
    if (email === null) return;
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
        alert('Email is required.');
        return;
    }

    if ((userRecord.email || '').toLowerCase() !== trimmedEmail) {
        alert('Email does not match this username.');
        return;
    }

    const newPassword = prompt('Enter your new password (min 6 characters):');
    if (newPassword === null) return;

    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
    }

    const confirmPassword = prompt('Confirm your new password:');
    if (confirmPassword === null) return;

    if (confirmPassword !== newPassword) {
        alert('Passwords do not match.');
        return;
    }

    if (window.GrowClean && window.GrowClean.saveUser) {
        window.GrowClean.saveUser({
            ...userRecord,
            username: userRecord.username || trimmedUsername,
            password: newPassword
        });
    }

    recordLogin(userRecord.username || trimmedUsername, userRecord.role || '', true, 'Password reset successful');
    alert('Password reset successful. Please login with your new password.');

    const usernameInput = document.getElementById('Username');
    const passwordInput = document.getElementById('Password');
    if (usernameInput) usernameInput.value = userRecord.username || trimmedUsername;
    if (passwordInput) passwordInput.value = '';
}

async function handleLogin(e) {
    if (e) e.preventDefault();

    await ensureStorageReady();

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

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
        handleForgotPassword(e);
    });
}
