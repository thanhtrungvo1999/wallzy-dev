// Wallzy shared ad units — one source for every tab
const WALLZY_ADS = {
    '320x50': { key: '2c49a0e222fe3b51d12473cd1592ca66', width: 320, height: 50, provider: 'highrevenue' },
    '300x250': { key: '66531d847e0e04e4e76d697b014ef012', width: 300, height: 250, provider: 'profitablerate' }
};

function renderWallzyAd(slot, size) {
    const config = WALLZY_ADS[size];
    if (!slot || !config) return;
    slot.innerHTML = '';
    slot.style.width = config.width + 'px';
    slot.style.height = config.height + 'px';
    slot.classList.add('flex', 'items-center', 'justify-center', 'overflow-hidden');
    const iframe = document.createElement('iframe');
    iframe.width = String(config.width);
    iframe.height = String(config.height);
    iframe.style.width = config.width + 'px';
    iframe.style.height = config.height + 'px';
    iframe.style.border = '0';
    iframe.style.overflow = 'hidden';
    iframe.scrolling = 'no';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    if (config.provider === 'highrevenue') {
        iframe.srcdoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>' +
            '<script>atOptions={\'key\':\'' + config.key + '\',\'format\':\'iframe\',\'height\':50,\'width\':320,\'params\':{}};<\/script>' +
            '<script src="https://www.highrevenueformat.com/' + config.key + '/invoke.js"><\/script>' +
            '</body></html>';
    } else {
        iframe.srcdoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>' +
            '<script async="async" data-cfasync="false" src="https://pl31436544.profitableratecpmnetwork.com/' + config.key + '/invoke.js"><\/script>' +
            '<div id="container-' + config.key + '"></div>' +
            '</body></html>';
    }
    slot.appendChild(iframe);
}

function initWallzyAds(root = document) {
    root.querySelectorAll('[data-wallzy-ad]').forEach(slot => {
        if (slot.dataset.wallzyAdReady === 'true') return;
        slot.dataset.wallzyAdReady = 'true';
        renderWallzyAd(slot, slot.dataset.wallzyAd);
    });
}

window.initWallzyAds = initWallzyAds;
window.WALLZY_ADS = WALLZY_ADS;
document.addEventListener('DOMContentLoaded', () => initWallzyAds());