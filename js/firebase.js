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
        { getFirestore, collection, doc, getDocs, onSnapshot, query, orderBy, limit, startAfter }
    ] = await Promise.all([
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"),
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"),
        import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
    ]);

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const auth = getAuth(app);

    const imagesCollection = collection(db, 'artifacts', 'public', 'uploaded_images_v3');
    let lastImageDoc = null;
    let imagesExhausted = false;
    let imagesLoading = false;

    async function loadImagePage() {
        if (imagesLoading || imagesExhausted) return { images: [], hasMore: false };

        imagesLoading = true;
        try {
            const constraints = [orderBy('timestamp', 'desc'), limit(20)];
            if (lastImageDoc) constraints.push(startAfter(lastImageDoc));
            const pageQuery = query(imagesCollection, ...constraints);
            const snapshot = await getDocs(pageQuery);

            const images = [];
            snapshot.forEach(docSnap => images.push({ id: docSnap.id, ...docSnap.data() }));
            lastImageDoc = snapshot.docs[snapshot.docs.length - 1] || lastImageDoc;
            imagesExhausted = snapshot.size < 20;

            console.info('[Wallzy] Firestore image page loaded:', images.length);
            return { images, hasMore: !imagesExhausted };
        } finally {
            imagesLoading = false;
        }
    }

    loadImagePage().then(page => {
        onImagesLoaded?.(page.images, page.hasMore);
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

    return { app, db, auth, appId, loadMoreImages: async () => {
        const page = await loadImagePage();
        onImagesLoaded?.(page.images, page.hasMore);
        return page;
    }};
}
