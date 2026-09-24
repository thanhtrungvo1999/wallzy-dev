const appId = 'quan-ly-tai-chinh-d0bf1';

const firebaseConfig = {
    apiKey: "AIzaSyDHOQSdlPxPstS3cTzAgg43qIK-HjGrZxI",
    authDomain: "quan-ly-tai-chinh-d0bf1.firebaseapp.com",
    projectId: "quan-ly-tai-chinh-d0bf1",
    storageBucket: "quan-ly-tai-chinh-d0bf1.firebasestorage.app",
    messagingSenderId: "1054695985785",
    appId: "1:1054695985785:web:c24cfb396738010438baa8",
    measurementId: "G-H9E9B4NLYJ"
};

export async function initFirebase({
    onImagesLoaded,
    onImagesError,
    onCategoriesLoaded,
    onAuthUser,
    onFavorites,
    onGradients
} = {}) {
    const [
        { initializeApp },
        { getAuth, onAuthStateChanged },
        { getFirestore, collection, doc, getDoc, getDocs, onSnapshot, query, orderBy, limit, startAfter }
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

    getDocs(imagesCollection).then(snapshot => {
        const categories = Array.from(new Set(snapshot.docs.map(docSnap => docSnap.data()?.category?.trim()).filter(Boolean)));
        onCategoriesLoaded?.(categories);
    }).catch(error => console.warn('[Wallzy] Category metadata load failed:', error));

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
    }, getImageById: async id => {
        if (!id) return null;
        const snapshot = await getDoc(doc(imagesCollection, String(id)));
        return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    }};
}
