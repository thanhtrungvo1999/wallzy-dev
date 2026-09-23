export function createAuthController({ getAuth, onSuccess = () => {}, onError = () => {} } = {}) {
    const auth = getAuth;
    const updateAuthUIState = function updateAuthUIState(user) {
    const btnText = document.getElementById('authButtonText');
    if (user) {
        btnText.innerText = user.displayName ? user.displayName.split(' ')[0] : 'Account';
        document.getElementById('loggedOutView').classList.add('hidden'); document.getElementById('loggedInView').classList.remove('hidden');
        document.getElementById('userAvatar').src = user.photoURL || 'https://placehold.co/100x100/0a0a0c/ffffff?text=User';
        document.getElementById('userName').innerText = user.displayName || 'Google User';
        document.getElementById('userEmail').innerText = user.email || '';
        document.getElementById('userIdDisplay').innerText = `UID: ${user.uid}`;
    } else {
        btnText.innerText = 'Account';
        document.getElementById('loggedOutView').classList.remove('hidden'); document.getElementById('loggedInView').classList.add('hidden');
    }
};

    window.loginWithGoogleReal = async () => {
        if (!auth) return;
        const btn = document.getElementById('googleLoginBtn'), txt = document.getElementById('googleLoginText'), ico = document.getElementById('googleIcon');
        btn.disabled = true; btn.classList.add('opacity-80', 'cursor-not-allowed');
        ico.className = "fa-solid fa-circle-notch fa-spin text-sm text-white mr-2"; txt.innerText = "Signing in...";
        try {
            const { signInWithPopup, GoogleAuthProvider } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
            await signInWithPopup(auth, new GoogleAuthProvider()); closeAuthModal(); showMessage("Login successful!"); onSuccess();
        }
        catch (e) { showMessage("Login failed: " + e.message); onError(e); }
        finally { btn.disabled = false; btn.classList.remove('opacity-80', 'cursor-not-allowed'); ico.className = "fa-brands fa-google text-sm text-black"; txt.innerText = "Sign in with Google"; }
    };

    window.logoutUser = async () => {
        if (!auth) return;
        try {
            const { signOut } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js");
            await signOut(auth); closeAuthModal(); showMessage("Signed out successfully."); onSuccess();
        }
        catch (e) { showMessage("Error signing out."); onError(e); }
    };

    return { updateAuthUIState };
}
