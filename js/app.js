import "./download.js";
import "./studio.js";
import "./tiktok.js";
import "./scroll.js";
import { getThumbnailUrl } from "./image-utils.js";
import "./ui-modals.js";
import { createSearchController } from "./search.js";
import { createNavigationController } from "./navigation.js";
import { createCategoryController } from "./category.js";
import { createWallpaperRenderer } from "./wallpaper-renderer.js";

        let app, db, auth, appId, userId = null;
        let wallpapers = [], cloudFavorites = [], cloudCustomGradients = [], cloudUploadedImages = [];
        let hasMoreCloudImages = false, isLoadingMoreCloudImages = false, loadMoreImagesFromFirebase = null, getImageByIdFromFirebase = null;
        let currentSelectedWallpaper = null, currentTab = 'explore', currentCategory = 'all', searchQuery = '';
        let displayedCount = 20, loadStepCount = 20, isSkeletonActive = true, isWallpaperDataReady = false, invalidUrlActive = false;
window.__wallzyGetCurrentWallpaper = () => currentSelectedWallpaper;


        setTimeout(() => {
            if (!isWallpaperDataReady) {
                isSkeletonActive = false; isWallpaperDataReady = true;
                updateWallpapersList(); checkUrlParamForImage();
            }
        }, 10000);

        function initTopControlsHideOnScroll() {
            const scrollArea = document.getElementById('mainScrollArea');
            const wrapper = document.getElementById('topControlsWrapper');
            const header = document.getElementById('headerEl');
            const footer = document.getElementById('footerEl');
            if (!scrollArea || !wrapper || !header) return;

            let lastScrollTop = 0, isHidden = false, isHeaderHidden = false, ticking = false;
            const threshold = 6;
            let headerH = header.offsetHeight, wrapperH = wrapper.offsetHeight;

            function applyLayout() {
                wrapper.style.top = (isHeaderHidden ? 0 : headerH) + 'px';
                scrollArea.style.paddingTop = (headerH + wrapperH + 8) + 'px';
                wrapper.style.transform = isHidden ? `translateY(-${wrapperH}px)` : 'translateY(0)';
                header.style.transform = isHeaderHidden ? `translateY(-${headerH}px)` : 'translateY(0)';
            }
            function showHeader() { if (!isHeaderHidden) return; isHeaderHidden = false; header.style.transform = 'translateY(0)'; wrapper.style.top = headerH + 'px'; }
            function hideHeader() { if (isHeaderHidden) return; isHeaderHidden = true; header.style.transform = `translateY(-${headerH}px)`; wrapper.style.top = '0px'; }
            function show() {
                if (!isHidden) return; isHidden = false;
                wrapper.style.transform = 'translateY(0)'; wrapper.style.opacity = '1'; wrapper.style.pointerEvents = '';
                if (footer) { footer.style.transform = 'translateY(0)'; footer.style.opacity = '1'; footer.style.pointerEvents = ''; }
            }
            function hide() {
                if (isHidden) return; isHidden = true;
                wrapper.style.transform = `translateY(-${wrapperH}px)`; wrapper.style.opacity = '0'; wrapper.style.pointerEvents = 'none';
                if (footer) { footer.style.transform = 'translateY(150%)'; footer.style.opacity = '0'; footer.style.pointerEvents = 'none'; }
            }

            applyLayout(); wrapper.style.opacity = '1';
            const remeasure = () => { headerH = header.offsetHeight; wrapperH = wrapper.offsetHeight; applyLayout(); };
            if (window.ResizeObserver) { const ro = new ResizeObserver(remeasure); ro.observe(header); ro.observe(wrapper); } 
            else window.addEventListener('resize', remeasure);

            scrollArea.addEventListener('scroll', () => {
                if (ticking) return; ticking = true;
                requestAnimationFrame(() => {
                    const maxScroll = Math.max(0, scrollArea.scrollHeight - scrollArea.clientHeight);
                    const st = Math.min(Math.max(0, scrollArea.scrollTop), maxScroll);
                    const delta = st - lastScrollTop;
                    if (st <= threshold) { show(); showHeader(); lastScrollTop = st; } 
                    else {
                        hideHeader();
                        if (st >= maxScroll - threshold) lastScrollTop = st;
                        else if (delta > threshold) { hide(); lastScrollTop = st; } 
                        else if (delta < -threshold) { show(); lastScrollTop = st; }
                    }
                    ticking = false;
                });
            }, { passive: true });
            window.refreshTopControlsHeight = remeasure;
        }

        async function bootstrapFirebase() {
            try {
                const [{ initFirebase }, { createAuthController }] = await Promise.all([
                    import("./firebase.js"),
                    import("./auth.js")
                ]);
                let authController;
                const firebase = await initFirebase({
                    onImagesLoaded: (images, hasMore = false) => {
                        if (!isWallpaperDataReady) {
                            cloudUploadedImages = images;
                            displayedCount = images.length;
                        } else if (images?.length) {
                            cloudUploadedImages = [...cloudUploadedImages, ...images];
                            displayedCount += images.length;
                        }
                        hasMoreCloudImages = Boolean(hasMore);
                        isSkeletonActive = false; isWallpaperDataReady = true;
                        updateWallpapersList(); checkUrlParamForImage();
                    },
                    onImagesError: () => {
                        isSkeletonActive = false; isWallpaperDataReady = true; cloudUploadedImages = [];
                        updateWallpapersList(); checkUrlParamForImage();
                    },
                    onAuthUser: user => {
                        if (user) {
                            userId = user.uid; authController?.updateAuthUIState(user);
                        } else {
                            userId = null; authController?.updateAuthUIState(null); cloudFavorites = []; loadLocalGradients();
                            if (currentTab !== 'tiktok') refreshCurrentView();
                        }
                    },
                    onFavorites: items => {
                        cloudFavorites = items;
                        if (currentTab !== 'tiktok') refreshCurrentView();
                    },
                    onGradients: d => {
                        if (d.exists() && d.data().items) cloudCustomGradients = d.data().items;
                        else loadLocalGradients();
                        if (currentTab === 'studio') window.renderSavedGradients?.();
                    }
                });
                app = firebase.app; db = firebase.db; auth = firebase.auth; appId = firebase.appId;
                loadMoreImagesFromFirebase = firebase.loadMoreImages;
                getImageByIdFromFirebase = firebase.getImageById;
                authController = createAuthController({ getAuth: firebase.auth });
            } catch (e) {
                console.error('[Wallzy] Firebase bootstrap failed:', e);
            }
        }


        document.addEventListener('DOMContentLoaded', () => {
            const splashScreen = document.getElementById('splashScreen');
            const body = document.getElementById('bodyElement');
            try { loadLocalGradients(); } catch (e) {}
            try { updateWallpapersList(); } catch (e) {}
            try { initTopControlsHideOnScroll(); } catch (e) {}
            bootstrapFirebase();

            requestAnimationFrame(() => {
                setTimeout(() => {
                    if (splashScreen) {
                        splashScreen.style.opacity = '0'; body.classList.remove('overflow-hidden');
                        setTimeout(() => splashScreen.style.display = 'none', 350);
                    }
                }, 250);
            });
        });

        window.showMessage = msg => { document.getElementById('msgText').innerText = msg; document.getElementById('msgModal').classList.remove('hidden'); };
        window.closeMsgModal = () => document.getElementById('msgModal').classList.add('hidden');
        window.openInstallModal = () => document.getElementById('installModal').classList.remove('hidden');
        window.closeInstallModal = () => document.getElementById('installModal').classList.add('hidden');
        window.openAuthModal = () => document.getElementById('authModal').classList.remove('hidden');
        window.closeAuthModal = () => document.getElementById('authModal').classList.add('hidden');

        function categorySlug(category) {
            return String(category || 'all').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'all';
        }
        function categoryPath(category) {
            return '/category/' + categorySlug(category);
        }
        function findCategoryFromPath(path) {
            const match = path.match(/^\/category\/([^/]+)\/?$/i);
            if (!match) return null;
            const slug = match[1].toLowerCase();
            return wallpapers.find(w => categorySlug(w.category) === slug)?.category
                || cloudUploadedImages.find(w => categorySlug(w.category) === slug)?.category
                || null;
        }
        function setCategorySEO(category) {
            const name = category || 'All Wallpapers';
            const title = name === 'All Wallpapers' ? 'Wallzy - 4K UHD Wallpapers' : name + ' Wallpapers - Wallzy';
            const description = name === 'All Wallpapers'
                ? 'Discover free 4K UHD wallpapers for your phone on Wallzy.'
                : 'Explore free ' + name + ' wallpapers for your phone on Wallzy.';
            document.title = title;
            const descriptionEl = document.getElementById('pageDescription');
            const ogTitle = document.getElementById('ogTitle');
            const ogDescription = document.getElementById('ogDescription');
            const twitterTitle = document.getElementById('twitterTitle');
            const twitterDescription = document.getElementById('twitterDescription');
            const canonical = document.getElementById('canonicalUrl');
            const ogUrl = document.getElementById('ogUrl');
            const twitterUrl = document.getElementById('twitterUrl');
            const url = window.location.origin + window.location.pathname;
            if (descriptionEl) descriptionEl.content = description;
            if (ogTitle) ogTitle.content = title;
            if (ogDescription) ogDescription.content = description;
            if (twitterTitle) twitterTitle.content = title;
            if (twitterDescription) twitterDescription.content = description;
            if (canonical) canonical.href = url;
            if (ogUrl) ogUrl.content = url;
            if (twitterUrl) twitterUrl.content = url;
        }

        function wallpaperSlug(w) { return String(w?.title || w?.category || 'wallpaper').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'wallpaper'; }
        function wallpaperPath(w) { return `/wallpaper/${wallpaperSlug(w)}-${encodeURIComponent(String(w.id))}`; }
        function findWallpaperFromPath() {
            const match = window.location.pathname.match(/^\/wallpaper\/(.+)-([^/-]+)\/?$/i); if (!match) return null;
            let encodedId = match[2]; try { encodedId = decodeURIComponent(encodedId); } catch (e) { return null; }
            return wallpapers.find(w => String(w.id) === String(encodedId)) || cloudFavorites.find(w => String(w.id) === String(encodedId)) || null;
        }
        function clearWallpaperSEO() {
            document.title = 'Wallzy - 4K UHD Wallpapers';
            const canonical = document.getElementById('canonicalUrl');
            const ogUrl = document.getElementById('ogUrl');
            const twitterUrl = document.getElementById('twitterUrl');
            const url = window.location.origin + window.location.pathname;
            if (canonical) canonical.href = url;
            if (ogUrl) ogUrl.content = url;
            if (twitterUrl) twitterUrl.content = url;
        }

        function setAppRoute(route, replace = false) {
            const cleanRoute = route || '/';
            try {
                if (replace) window.history.replaceState({ wallzyRoute: cleanRoute }, '', cleanRoute);
                else window.history.pushState({ wallzyRoute: cleanRoute }, '', cleanRoute);
            } catch (e) {}
        }

        function routeForTab(tab) {
            if (tab === 'favorites') return '/favorites';
            if (tab === 'studio') return '/studio';
            if (tab === 'tiktok') return '/tiktok';
            return '/explore';
        }

        createSearchController({
            getRefreshCurrentView: () => refreshCurrentView(),
            setSearchQuery: value => { searchQuery = value; },
            resetDisplayedCount: () => { displayedCount = 20; }
        });

        createNavigationController({
            getCurrentTab: () => currentTab,
            setCurrentTab: tab => { currentTab = tab; },
            routeForTab,
            setAppRoute,
            refreshCurrentView,
            renderSavedGradients: () => window.renderSavedGradients?.(),
        });


        const wallpaperRenderer = createWallpaperRenderer({
            getWallpapers: () => wallpapers,
            getCloudFavorites: () => cloudFavorites,
            getCurrentCategory: () => currentCategory,
            getSearchQuery: () => searchQuery,
            getDisplayedCount: () => displayedCount,
            getHasMoreCloudImages: () => hasMoreCloudImages,
            isSkeletonActive: () => isSkeletonActive,
            getThumbnailUrl,
            refreshCurrentView: () => refreshCurrentView()
        });

        const categoryController = createCategoryController({
            getWallpapers: () => wallpapers,
            getCloudUploadedImages: () => cloudUploadedImages,
            getCurrentCategory: () => currentCategory,
            setCurrentCategory: value => { currentCategory = value; },
            resetDisplayedCount: () => { displayedCount = 20; },
            refreshCurrentView: () => refreshCurrentView(),
            setCategorySEO,
            setAppRoute,
            categoryPath,
            isSkeletonActive: () => isSkeletonActive
        });

        function updateWallpapersList() {
            wallpapers = [...cloudUploadedImages];
            categoryController.renderCategoryNav();
            refreshCurrentView();
        }

        function refreshCurrentView() {
            if (currentTab === 'explore') wallpaperRenderer.renderWallpapers(currentCategory);
            else if (currentTab === 'favorites') wallpaperRenderer.renderFavoritesView();
        }

        window.loadMoreWallpapers = async () => {
            if (isLoadingMoreCloudImages || !hasMoreCloudImages || !loadMoreImagesFromFirebase) return;

            isLoadingMoreCloudImages = true;
            const button = document.getElementById('loadMoreBtn');
            if (button) {
                button.disabled = true;
                button.textContent = 'Loading...';
            }

            try {
                await loadMoreImagesFromFirebase();
            } catch (error) {
                console.error('[Wallzy] Load more failed:', error);
                showMessage('Unable to load more wallpapers. Please try again.');
            } finally {
                isLoadingMoreCloudImages = false;
                if (button) {
                    button.disabled = false;
                    button.textContent = 'Load more';
                }
            }
        };

        async function applyRouteFromUrl() {
            window.__wallzyApplyingRoute = true;
            const path = window.location.pathname.replace(/\/+$/, '') || '/';
            let wallpaper = findWallpaperFromPath();
            const categoryFromPath = findCategoryFromPath(path);

            if (!wallpaper && /^\/wallpaper\/.+/i.test(path) && getImageByIdFromFirebase) {
                const match = path.match(/^\/wallpaper\/(.+)-([^/-]+)\/?$/i);
                if (match) {
                    try {
                        wallpaper = await getImageByIdFromFirebase(decodeURIComponent(match[2]));
                    } catch (error) {
                        console.error('[Wallzy] Direct wallpaper load failed:', error);
                    }
                }
            }

            if (wallpaper) {
                invalidUrlActive = false;
                document.getElementById('invalidUrlScreen')?.classList.add('hidden');
                currentTab = 'explore';
                refreshCurrentView();
                openModal(wallpaper, false);
                window.__wallzyApplyingRoute = false;
                return;
            }

            let tab = 'explore';
            if (categoryFromPath) {
                currentCategory = categoryFromPath;
                displayedCount = 20;
                invalidUrlActive = false;
                document.getElementById('invalidUrlScreen')?.classList.add('hidden');
                switchMainTab('explore', document.getElementById('navExploreBtn'));
                categoryController.renderCategoryNav();
                setCategorySEO(currentCategory);
                window.__wallzyApplyingRoute = false;
                return;
            }
            if (path === '/' || path === '/explore') tab = 'explore';
            else if (path === '/favorites') tab = 'favorites';
            else if (path === '/studio') tab = 'studio';
            else if (path === '/tiktok') tab = 'tiktok';
            else if (path !== '/') {
                invalidUrlActive = true;
                const screen = document.getElementById('invalidUrlScreen');
                if (screen) {
                    screen.classList.remove('hidden');
                    screen.classList.add('flex');
                    const pathEl = document.getElementById('invalidUrlPath');
                    if (pathEl) pathEl.textContent = window.location.pathname;
                }
                window.__wallzyApplyingRoute = false;
                return;
            }

            invalidUrlActive = false;
            document.getElementById('invalidUrlScreen')?.classList.add('hidden');

            // If Android/iPhone physical Back returned from a wallpaper URL,
            // close the detail modal instead of leaving it visible over the tab.
            const detailModal = document.getElementById('detailModal');
            if (detailModal?.classList.contains('modal-visible')) {
                window.closeModal?.();
            }

            const btnId = tab === 'favorites' ? 'navFavBtn' : tab === 'studio' ? 'navStudioBtn' : tab === 'tiktok' ? 'navTikTokBtn' : 'navExploreBtn';
            switchMainTab(tab, document.getElementById(btnId));
            if (tab === 'explore') {
                currentCategory = 'all';
                categoryController.renderCategoryNav();
            }
            clearWallpaperSEO();
            window.__wallzyApplyingRoute = false;
        }

        window.navigateWallzy = (tab, push = true) => {
            const route = routeForTab(tab);
            if (push && window.location.pathname !== route) setAppRoute(route);
            const btnId = tab === 'favorites' ? 'navFavBtn' : tab === 'studio' ? 'navStudioBtn' : tab === 'tiktok' ? 'navTikTokBtn' : 'navExploreBtn';
            switchMainTab(tab, document.getElementById(btnId));
        };

        window.goHomeFromInvalidUrl = () => {
            document.getElementById('invalidUrlScreen')?.classList.add('hidden');
            invalidUrlActive = false;
            setAppRoute('/explore', true);
            switchMainTab('explore', document.getElementById('navExploreBtn'));
            clearWallpaperSEO();
        };
        window.goBackFromInvalidUrl = () => {
            if (window.history.length > 1) window.history.back();
            else window.goHomeFromInvalidUrl();
        };

        async function checkUrlParamForImage() {
            await applyRouteFromUrl();
        }

        window.addEventListener('popstate', () => {
            if (isWallpaperDataReady) void applyRouteFromUrl();
        });

        window.toggleFavorite = id => {
            if (!userId) { openAuthModal(); showMessage("Please sign in to save wallpapers."); return; }
            const wallpaper = wallpapers.find(w => w.id === id); if (!wallpaper) return;
            let updated = [...cloudFavorites]; const idx = updated.findIndex(f => f.id === id);
            idx > -1 ? updated.splice(idx, 1) : updated.push(wallpaper); cloudFavorites = updated;
            if (userId && db && appId) {
                import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js")
                    .then(({ doc, setDoc }) => setDoc(doc(db, 'artifacts', appId, 'users', userId, 'data', 'favorites'), { items: cloudFavorites }, { merge: true }))
                    .catch(error => console.error('[Wallzy] Favorite sync failed:', error));
            }
            if (currentTab === 'favorites') wallpaperRenderer.renderFavoritesView();
            else document.querySelectorAll('[data-favorite-id]').forEach(icon => { if (icon.dataset.favoriteId === id) icon.className = idx > -1 ? 'fa-regular text-white fa-heart' : 'fa-solid text-white fa-heart'; });
        };

        window.toggleFavoriteCurrent = () => {
            if (!currentSelectedWallpaper) return;
            const id = currentSelectedWallpaper.id;
            window.toggleFavorite(id);
            const icon = document.getElementById('modalFavIcon');
            if (icon) {
                const isFavorite = cloudFavorites.some(item => item.id === id);
                icon.className = isFavorite ? 'fa-solid fa-heart text-white' : 'fa-regular fa-heart text-white';
            }
        };

        window.openModalById = id => { const found = wallpapers.find(w => w.id === id) || cloudFavorites.find(w => w.id === id); if (found) openModal(found, true); };
        
        function openModal(wallpaper, isUserInteraction = true) {
            currentSelectedWallpaper = wallpaper;

            // When a user opens a wallpaper, make its detail URL shareable/bookmarkable.
            // Do not push a new history entry when the modal is being opened from a direct URL.
            if (isUserInteraction && typeof wallpaperPath === 'function') {
                const route = wallpaperPath(wallpaper);
                if (window.location.pathname !== route) {
                    setAppRoute(route);
                }
            }

            document.getElementById('modalCategory').innerText = `${wallpaper.category || 'Database'} • ${wallpaper.quality || '4K'}`;
            const detailImg = document.getElementById('detailImg'); document.getElementById('modalImgSkel')?.classList.remove('hidden'); detailImg.classList.add('opacity-0');
            detailImg.dataset.originalSrc = wallpaper.url; detailImg.src = getThumbnailUrl(wallpaper.url, 900, 76);
            const modal = document.getElementById('detailModal'); modal.classList.remove('hidden'); requestAnimationFrame(() => modal.classList.add('modal-visible'));
        }

        window.closeModal = () => {
            const modal = document.getElementById('detailModal'); modal.classList.remove('modal-visible');
            setTimeout(() => modal.classList.add('hidden'), 220);

            // Restore the current tab URL after closing the wallpaper detail page.
            if (typeof routeForTab === 'function') {
                const route = routeForTab(currentTab || 'explore');
                if (window.location.pathname !== route) {
                    setAppRoute(route, true);
                }
            }
        };

        window.shareCurrentWallpaper = async () => {
            if (!currentSelectedWallpaper) return; const shareUrl = `${window.location.origin}${wallpaperPath(currentSelectedWallpaper)}`;
            if (navigator.share) try { await navigator.share({ title: 'Wallzy Wallpaper', url: shareUrl }); } catch (e) {}
            else navigator.clipboard?.writeText(shareUrl).then(() => showMessage("Link copied successfully!")).catch(() => showMessage("Share link: " + shareUrl));
        };
