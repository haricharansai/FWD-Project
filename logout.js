// Clears auth session and redirects to Home.
function logout() {
    try {
        localStorage.removeItem('growclean_user');
        localStorage.removeItem('growclean_role');
        sessionStorage.removeItem('growclean_user');
        sessionStorage.removeItem('growclean_role');
    } catch (_error) {
        // Ignore storage failures and still redirect.
    }

    const indicator = document.getElementById('roleIndicator');
    if (indicator) indicator.remove();

    window.location.replace('Home.html');
}

// Expose for manual debugging from console.
window.logout = logout;

// Event delegation ensures logout works for current and future elements.
document.addEventListener('click', (e) => {
    const trigger = e.target && e.target.closest ? e.target.closest('[data-logout]') : null;
    if (!trigger) return;
    e.preventDefault();
    logout();
});
