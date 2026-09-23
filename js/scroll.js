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


window.initTopControlsHideOnScroll = initTopControlsHideOnScroll;
export { initTopControlsHideOnScroll };
