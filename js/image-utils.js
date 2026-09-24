function getThumbnailUrl(originalUrl, width = 640, quality = 68) {
    if (!originalUrl || originalUrl.startsWith('data:') || originalUrl.startsWith('blob:')) return originalUrl;
    try {
        return `https://images.weserv.nl/?url=${encodeURIComponent(originalUrl)}&w=${width}&q=${quality}&output=webp&fit=cover`;
    } catch (e) {
        return originalUrl;
    }
}

function revealImage(imgElement) {
    imgElement.classList.remove('opacity-0');
    imgElement.previousElementSibling?.remove();
}

function fallbackToOriginal(imgElement) {
    const originalUrl = imgElement.dataset.originalSrc;
    if (!originalUrl) return false;
    if (imgElement.dataset.thumbnailFallback === '1') return false;

    imgElement.dataset.thumbnailFallback = '1';
    imgElement.removeAttribute('src');
    imgElement.src = originalUrl;
    return true;
}

window.handleImageError = (imgElement) => {
    if (fallbackToOriginal(imgElement)) return;

    imgElement.onerror = null;
    imgElement.src = 'https://placehold.co/600x900/0a0a0c/ffffff?text=Image+Unavailable';
    revealImage(imgElement);
    imgElement.onclick = null;

    const card = imgElement.closest('.group');
    if (card) {
        card.classList.remove('cursor-pointer');
        const favBtn = card.querySelector('button');
        if (favBtn) favBtn.style.display = 'none';
    }
};

window.handleModalImageError = (imgElement) => {
    if (fallbackToOriginal(imgElement)) return;

    imgElement.onerror = null;
    imgElement.src = 'https://placehold.co/600x900/0a0a0c/ffffff?text=Image+Unavailable';
    imgElement.classList.remove('opacity-0');
    document.getElementById('modalImgSkel')?.classList.add('hidden');
    window.showMessage?.("Error: Unable to load images from the server.");
};


export { getThumbnailUrl };
