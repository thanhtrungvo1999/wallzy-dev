export function createWallpaperRenderer({
    getWallpapers,
    getCloudFavorites,
    getCurrentCategory,
    getSearchQuery,
    getDisplayedCount,
    getHasMoreCloudImages,
    isSkeletonActive,
    getThumbnailUrl,
    refreshCurrentView
}) {
    let shuffledAll = [];
    let shuffledSignature = '';
    let renderedIds = new Set();
    let renderedViewSignature = '';

    function getStableAllOrder(list) {
        const signature = list.map(w => String(w.id)).join('|');
        if (signature !== shuffledSignature) {
            shuffledSignature = signature;
            shuffledAll = [...list];
            for (let i = shuffledAll.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledAll[i], shuffledAll[j]] = [shuffledAll[j], shuffledAll[i]];
            }
        }
        return shuffledAll;
    }

    function filterItemsBySearchAndCategory(list, category) {
        let res = category === 'all'
            ? list
            : list.filter(w => (w.category || '').toLowerCase().includes(category.toLowerCase()));

        const query = getSearchQuery();
        if (query.length > 0) {
            res = res.filter(w => JSON.stringify(w).toLowerCase().includes(query));
        }
        return res;
    }

    function bindImage(img, wallpaper) {
        img.addEventListener('load', () => {
            img.classList.remove('opacity-0');
            img.previousElementSibling?.remove();
        });
        img.addEventListener('error', () => window.handleImageError?.(img));
        img.addEventListener('click', () => window.openModalById?.(wallpaper.id));
    }

    function createWallpaperCard(w, isFav) {
        const card = document.createElement('div');
        card.className = 'wallzy-card relative group rounded-3xl overflow-hidden bg-[#0a0a0c] aspect-[9/16] cursor-pointer shadow border border-white/10';

        const skeleton = document.createElement('div');
        skeleton.className = 'absolute inset-0 skeleton-wave z-0';

        const img = document.createElement('img');
        img.dataset.originalSrc = w.url || '';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.className = 'w-full h-full object-cover relative z-10 transition-opacity duration-500 opacity-0';
        bindImage(img, w);
        img.src = getThumbnailUrl(w.url);

        // Cached images can finish before the load listener is observed.
        // Reveal them immediately when the browser already has the image.
        if (img.complete) {
            if (img.naturalWidth > 0) {
                img.classList.remove('opacity-0');
                img.previousElementSibling?.remove();
            } else {
                window.handleImageError?.(img);
            }
        }

        const favButton = document.createElement('button');
        favButton.type = 'button';
        favButton.className = 'absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-xs text-white hover:bg-black/80 transition border border-white/20';
        favButton.addEventListener('click', event => {
            event.stopPropagation();
            window.toggleFavorite?.(w.id);
        });

        const icon = document.createElement('i');
        icon.dataset.favoriteId = w.id;
        icon.className = isFav ? 'fa-solid text-white fa-heart' : 'fa-regular text-white fa-heart';
        favButton.appendChild(icon);

        card.append(skeleton, img, favButton);
        return card;
    }

    function renderWallpapers(category = 'all') {
        const grid = document.getElementById('wallpaperGrid');
        const paginationContainer = document.getElementById('paginationContainer');
        if (!grid) return;

        const viewSignature = category + '|' + getSearchQuery();
        if (viewSignature !== renderedViewSignature) {
            renderedViewSignature = viewSignature;
            grid.replaceChildren();
            renderedIds.clear();
        }

        if (isSkeletonActive()) {
            grid.replaceChildren();
            renderedIds.clear();
            for (let i = 0; i < 4; i++) {
                const skeleton = document.createElement('div');
                skeleton.className = 'relative group rounded-3xl overflow-hidden aspect-[9/16] shadow-sm skeleton-wave';
                grid.appendChild(skeleton);
            }
            paginationContainer?.classList.add('hidden');
            return;
        }

        let filtered = filterItemsBySearchAndCategory(getWallpapers(), category);

        // Keep one stable random order for "All Wallpapers" so pagination
        // continues through the same data without reshuffling/duplicating items.
        if (category === 'all' && !getSearchQuery()) {
            filtered = getStableAllOrder(filtered);
        }

        if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'col-span-2 text-center py-12 text-gray-500 text-xs';
            empty.textContent = 'No matching wallpapers found.';
            grid.appendChild(empty);
            paginationContainer?.classList.add('hidden');
            return;
        }

        const fragment = document.createDocumentFragment();
        filtered.slice(0, getDisplayedCount()).forEach(w => {
            if (renderedIds.has(String(w.id))) return;
            fragment.appendChild(
                createWallpaperCard(w, getCloudFavorites().some(f => f.id === w.id))
            );
            renderedIds.add(String(w.id));
        });
        grid.appendChild(fragment);

        if (getHasMoreCloudImages?.()) paginationContainer?.classList.remove('hidden');
        else paginationContainer?.classList.add('hidden');
    }

    function renderFavoritesView() {
        const grid = document.getElementById('wallpaperGrid');
        document.getElementById('paginationContainer')?.classList.add('hidden');
        if (!grid) return;

        grid.replaceChildren();
        renderedIds.clear();

        const filtered = filterItemsBySearchAndCategory(getCloudFavorites(), getCurrentCategory());
        if (filtered.length === 0) {
            const wrapper = document.createElement('div');
            wrapper.className = 'col-span-2 flex items-center justify-center px-4 py-6';

            const card = document.createElement('div');
            card.className = 'w-full max-w-sm rounded-[28px] border border-white/10 bg-[#0a0a0c]/80 backdrop-blur-xl px-6 py-8 text-center shadow-2xl';

            const iconBox = document.createElement('div');
            iconBox.className = 'mx-auto mb-5 w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center';
            const icon = document.createElement('i');
            icon.className = 'fa-regular fa-heart text-2xl text-white/50';
            iconBox.appendChild(icon);

            const title = document.createElement('h3');
            title.className = 'text-white text-sm font-semibold tracking-wide mb-2';
            title.textContent = 'Your favorites are empty';

            const text = document.createElement('p');
            text.className = 'text-white/40 text-xs leading-5 max-w-[260px] mx-auto';
            text.textContent = 'Save wallpapers you love and they’ll appear here.';

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'mt-6 px-5 py-2.5 rounded-full bg-white text-black text-xs font-semibold active:scale-95 transition-transform';
            button.textContent = 'Explore wallpapers';
            button.addEventListener('click', () => window.navigateWallzy?.('explore'));

            card.append(iconBox, title, text, button);
            wrapper.appendChild(card);
            grid.appendChild(wrapper);
            return;
        }

        const fragment = document.createDocumentFragment();
        filtered.forEach(w => fragment.appendChild(createWallpaperCard(w, true)));
        grid.appendChild(fragment);
    }

    return { filterItemsBySearchAndCategory, renderWallpapers, renderFavoritesView };
}
