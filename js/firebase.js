const appId = 'wallzy-gold';

const firebaseConfig = {
    apiKey: "AIzaSyDJyZtgmuLg-vHNAwY9xvzvvEambF4jMS8",
    authDomain: "wallzy-gold.firebaseapp.com",
    projectId: "wallzy-gold",
    storageBucket: "wallzy-gold.firebasestorage.app",
    messagingSenderId: "145422325585",
    appId: "1:145422325585:web:d0a4c030e88cf172cd2570",
    measurementId: "G-KLCYTT8MTC"
};

export async function initFirebase({
    onImagesLoaded,
    onImagesError,
    onAuthUser,
    onFavorites,
    onGradients
} = {}) {
    const [
        { initializeApp },
        { getAuth, onAuthStateChanged },
        { getFirestore, collection, doc, getDocs, onSnapshot }
    ] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
    ]);

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    getDocs(collection(db, 'artifacts', 'public', 'uploaded_images_v3')).then(snapshot => {
        const images = [];
        snapshot.forEach(docSnap => images.push({ id: docSnap.id, ...docSnap.data() }));
        images.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        console.info('[Wallzy] Firestore images loaded:', images.length);
        onImagesLoaded?.(images);
    }).catch(error => {
        console.error('[Wallzy] Firestore images load failed:', error);
        onImagesError?.(error);
    });

    onAuthStateChanged(auth, user => {
        onAuthUser?.(user);
        if (!user) return;

        onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'favorites'), d => {
            onFavorites?.(d.exists() ? (d.data().items || []) : []);
        });

        onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'gradients'), d => {
            onGradients?.(d);
        });
    });

    return { app, db, auth, appId };
}
