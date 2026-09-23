export function createCategoryController({
    getWallpapers,
    getCloudUploadedImages,
    getCurrentCategory,
    setCurrentCategory,
    resetDisplayedCount,
    refreshCurrentView,
    setCategorySEO,
    setAppRoute,
    categoryPath,
    isSkeletonActive
}) {
    function renderCategoryNav() {
        const categoryNav = document.getElementById('categoryNav');
        if (!categoryNav) return;

        categoryNav.replaceChildren();

        if (isSkeletonActive()) {
            const skeletons = [
                'h-9 w-24',
                'h-9 w-28',
                'h-9 w-20'
            ];
            skeletons.forEach(size => {
                const el = document.createElement('div');
                el.className = size + ' rounded-full skeleton-wave flex-shrink-0';
                categoryNav.appendChild(el);
            });
            return;
        }

        let categories = Array.from(new Set(
            getWallpapers()
                .map(w => w.category?.trim())
                .filter(Boolean)
        ));
        categories.sort((a, b) => a.localeCompare(b));

        const otherIndex = categories.findIndex(c => c.toLowerCase() === 'other');
        if (otherIndex > -1) categories.push(categories.splice(otherIndex, 1)[0]);

        const current = getCurrentCategory();

        const createButton = (label, value, active) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = label;
            button.className = active
                ? 'cat-btn inline-flex w-max min-w-max shrink-0 bg-white text-black shadow-sm px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer'
                : 'cat-btn inline-flex w-max min-w-max shrink-0 bg-[#121215] text-gray-400 hover:text-white border border-white/10 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer';

            button.addEventListener('click', () => {
                window.filterCategory(value, button);
            });
            return button;
        };

        categoryNav.appendChild(createButton('All Wallpapers', 'all', current === 'all'));

        categories.forEach(cat => {
            categoryNav.appendChild(
                createButton(cat, cat, current.toLowerCase() === cat.toLowerCase())
            );
        });

        window.refreshTopControlsHeight?.();
    }

    window.filterCategory = (cat, el) => {
        setCurrentCategory(cat);
        resetDisplayedCount();

        const route = categoryPath(cat);
        if (window.location.pathname !== route) setAppRoute(route);

        document.querySelectorAll('.cat-btn').forEach(btn => {
            btn.className = 'cat-btn bg-[#121215] border border-white/10 text-gray-400 hover:text-white px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer';
        });

        if (el) {
            el.className = 'cat-btn bg-white text-black px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer shadow-sm';
        }

        setCategorySEO(cat);
        refreshCurrentView();
    };

    return {
        renderCategoryNav,
        updateWallpapersList(images) {
            const list = getWallpapers();
            list.splice(0);
            list.push(...images);
            renderCategoryNav();
            refreshCurrentView();
        }
    };
}
