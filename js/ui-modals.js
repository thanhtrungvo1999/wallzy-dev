window.showMessage = msg => { document.getElementById('msgText').innerText = msg; document.getElementById('msgModal').classList.remove('hidden'); };
window.closeMsgModal = () => document.getElementById('msgModal').classList.add('hidden');
window.openInstallModal = () => document.getElementById('installModal').classList.remove('hidden');
window.closeInstallModal = () => document.getElementById('installModal').classList.add('hidden');
window.openAuthModal = () => document.getElementById('authModal').classList.remove('hidden');
window.closeAuthModal = () => document.getElementById('authModal').classList.add('hidden');


export {};
