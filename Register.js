document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registerForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (window.GrowClean && window.GrowClean.ready) {
            try {
                await window.GrowClean.ready;
            } catch (_error) {
                // Continue with localStorage fallback.
            }
        }

        const username = document.getElementById('Username').value.trim();
        const email = document.getElementById('Email').value.trim().toLowerCase();
        const password = document.getElementById('Password').value;
        const role = 'citizen';

        if (!username || !email || !password) {
            alert('Please fill all fields.');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters.');
            return;
        }

        const existingUser = window.GrowClean && window.GrowClean.getUser ? window.GrowClean.getUser(username) : null;
        if (existingUser) {
            alert('That username is already registered. Please use another username.');
            return;
        }

        if (window.GrowClean && window.GrowClean.getUsers) {
            const users = window.GrowClean.getUsers();
            const emailTaken = Object.values(users).some((u) => (u.email || '').toLowerCase() === email);
            if (emailTaken) {
                alert('That email is already in use. Please use another email.');
                return;
            }
        }

        const userObj = { username, email, password, role };
        if (window.GrowClean && window.GrowClean.saveUser) {
            window.GrowClean.saveUser(userObj);
        }

        alert('Registration successful. Please login.');
        window.location.href = 'Login.html';
    });
});
