export function createSearchController({ getRefreshCurrentView, setSearchQuery, resetDisplayedCount }) {
    window.handleSearchInput = (val) => {
        setSearchQuery(String(val || '').trim().toLowerCase());
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            const active = String(val || '').trim().length > 0;
            clearBtn.classList.toggle('hidden', !active);
        }
        resetDisplayedCount();
        getRefreshCurrentView();
    };

    window.clearSearch = () => {
        const input = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearchBtn');
        if (input) input.value = '';
        setSearchQuery('');
        if (clearBtn) clearBtn.classList.add('hidden');
        resetDisplayedCount();
        getRefreshCurrentView();
    };
}
