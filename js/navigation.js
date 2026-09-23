export function createNavigationController({
    getCurrentTab,
    setCurrentTab,
    routeForTab,
    setAppRoute,
    refreshCurrentView,
    renderSavedGradients,

    
}) {
    window.switchMainTab = (tab, el) => {
        setCurrentTab(tab);
        if (!window.__wallzyApplyingRoute && typeof routeForTab === 'function') {
            const route = routeForTab(tab);
            if (window.location.pathname !== route) setAppRoute(route);
        }

        const gridContainer = document.getElementById('wallpaperGridContainer');
        const studioContainer = document.getElementById('gradientStudioContainer');
        const tiktokContainer = document.getElementById('tiktokDownloaderContainer');
        const categoryNav = document.getElementById('categoryNav');
        const searchBarContainer = document.getElementById('searchBarContainer');
        if (!gridContainer || !studioContainer || !tiktokContainer || !categoryNav || !searchBarContainer) return;

        ['navExploreBtn', 'navFavBtn', 'navStudioBtn', 'navTikTokBtn'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.className = 'flex flex-col items-center space-y-0.5 text-gray-400 hover:text-white cursor-pointer transition';
            const icon = btn.querySelector('i');
            if (icon) icon.className = icon.className.replace('text-white', 'text-gray-400');
        });

        if (el) {
            el.className = 'flex flex-col items-center space-y-0.5 text-white cursor-pointer transition';
            const icon = el.querySelector('i');
            if (icon) icon.className = icon.className.replace('text-gray-400', 'text-white');
        }

        gridContainer.classList.add('hidden');
        studioContainer.classList.add('hidden');
        tiktokContainer.classList.add('hidden');

        if (tab === 'studio') {
            if (!window.wallzyGradientStudioReady) {
                try { window.initGradientStudio?.(); } catch (e) {}
                window.wallzyGradientStudioReady = true;
            }
            studioContainer.classList.remove('hidden');
            categoryNav.classList.add('hidden');
            searchBarContainer.classList.add('hidden');
            renderSavedGradients?.();
        } else if (tab === 'tiktok') {
            tiktokContainer.classList.remove('hidden');
            categoryNav.classList.add('hidden');
            searchBarContainer.classList.add('hidden');
        } else {
            gridContainer.classList.remove('hidden');
            categoryNav.classList.remove('hidden');
            searchBarContainer.classList.remove('hidden');
            refreshCurrentView();
        }
        window.refreshTopControlsHeight?.();
    };
}
