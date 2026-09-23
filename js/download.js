// Wallzy download and ad flow
        let downloadAdTimer = null;
        let downloadAdSeconds = 5;
        let downloadAdReady = false;
        let pendingDownloadUrl = null;
        let pendingDownloadFilename = null;

        window.openAdModal = (urlToDownload, customFilename = null) => {
            if (!urlToDownload) return;
            pendingDownloadUrl = urlToDownload;
            pendingDownloadFilename = customFilename;

            const modal = document.getElementById('adModal');
            const countdown = document.getElementById('downloadAdCountdown');
            const waiting = document.getElementById('downloadAdWaiting');
            const skip = document.getElementById('downloadAdSkip');
            const close = document.getElementById('downloadAdClose');
            const slot = document.getElementById('adModalSlot');
            
            if (!modal) {
                // Fallback: if the modal is not found, download directly
                window.startDownloadDirectly(pendingDownloadUrl, pendingDownloadFilename);
                return;
            }

            if (downloadAdTimer) clearInterval(downloadAdTimer);
            downloadAdSeconds = 5;
            downloadAdReady = false;
            countdown.textContent = '5s';
            waiting.textContent = 'Please wait...';
            waiting.classList.remove('hidden');
            skip.disabled = true;
            skip.classList.remove('bg-white', 'text-black', 'cursor-pointer', 'active:scale-[.98]');
            skip.classList.add('bg-white/10', 'text-white/30', 'cursor-not-allowed');
            close?.classList.add('hidden');
            
            // Render the 300x250 native ad code inside a sandboxed iframe.
            slot.innerHTML = '';
            const iframe = document.createElement('iframe');
            iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
            iframe.style.width = '300px';
            iframe.style.height = '250px';
            iframe.style.border = '0';
            iframe.style.overflow = 'hidden';
            iframe.scrolling = 'no';
            iframe.srcdoc = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;}#container-d57e1d0e6497dfaa47e074d39d673693{width:300px;height:250px;overflow:hidden;}</style></head><body>
                <script async="async" data-cfasync="false" src="https://pl31467882.profitableratecpmnetwork.com/d57e1d0e6497dfaa47e074d39d673693/invoke.js"></scr`+`ipt>
                <div id="container-d57e1d0e6497dfaa47e074d39d673693"></div>
            </body></html>`;
            slot.appendChild(iframe);

            modal.classList.remove('hidden');

            downloadAdTimer = setInterval(() => {
                downloadAdSeconds -= 1;
                if (downloadAdSeconds > 0) {
                    countdown.textContent = downloadAdSeconds + 's';
                } else {
                    clearInterval(downloadAdTimer);
                    downloadAdTimer = null;
                    downloadAdReady = true;
                    countdown.textContent = '';
                    waiting.textContent = 'You can continue';
                    skip.disabled = false;
                    skip.classList.remove('bg-white/10', 'text-white/30', 'cursor-not-allowed');
                    skip.classList.add('bg-white', 'text-black', 'cursor-pointer', 'active:scale-[.98]');
                    close?.classList.remove('hidden');
                    close?.classList.add('flex');
                }
            }, 1000);
        };

        window.closeDownloadAdModal = () => {
            if (downloadAdTimer) clearInterval(downloadAdTimer);
            downloadAdTimer = null;
            downloadAdReady = false;
            document.getElementById('adModal')?.classList.add('hidden');
        };

        window.skipDownloadAdAndStart = () => {
            if (!downloadAdReady) return;
            if (downloadAdTimer) clearInterval(downloadAdTimer);
            downloadAdTimer = null;
            downloadAdReady = false;
            document.getElementById('adModal')?.classList.add('hidden');

            // Use the exact same download flow as Explore.
            if (pendingDownloadUrl) {
                window.startDownloadDirectly(pendingDownloadUrl, pendingDownloadFilename);
            }
        };

        window.showRewardedAdThenDownload = () => { 
            if (!window.__wallzyGetCurrentWallpaper?.()?.url) return; 
            openAdModal(window.__wallzyGetCurrentWallpaper?.().url); 
        };
        
        function setDownloadLoading(visible, title = 'Preparing download', status = 'Getting the original wallpaper...') {
            const overlay = document.getElementById('downloadLoadingOverlay');
            if (!overlay) return;
            const titleEl = document.getElementById('downloadLoadingTitle');
            const statusEl = document.getElementById('downloadLoadingStatus');
            if (titleEl) titleEl.textContent = title;
            if (statusEl) statusEl.textContent = status;
            overlay.classList.toggle('hidden', !visible);
        }

        window.startDownloadDirectly = async (urlToDownload = null, customFilename = null) => {
            const targetUrl = urlToDownload || window.__wallzyGetCurrentWallpaper?.()?.url;
            if (!targetUrl) return;

            const originalUrl = targetUrl;
            const wallpaperId = customFilename ? customFilename.replace('.jpg', '') : (window.__wallzyGetCurrentWallpaper?.()?.id || Date.now());
            const defaultFilename = customFilename || `wallzy-${wallpaperId}.jpg`;

            const getExtension = (type) => {
                const clean = (type || '').split(';')[0].toLowerCase();
                if (clean === 'image/png') return 'png';
                if (clean === 'image/webp') return 'webp';
                if (clean === 'image/avif') return 'avif';
                if (clean === 'image/gif') return 'gif';
                return 'jpg';
            };

            const getFilename = (type) => customFilename || `wallzy-${wallpaperId}.${getExtension(type)}`;

            const saveBlobAsFile = (blob, filename) => {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = filename;
                link.setAttribute('download', filename);
                link.rel = 'noopener';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            };

            const fetchImage = async (url, timeout = 12000) => {
                const controller = new AbortController();
                const timer = setTimeout(() => controller.abort(), timeout);
                try {
                    const response = await fetch(url, {
                        mode: 'cors',
                        cache: 'force-cache',
                        credentials: 'omit',
                        signal: controller.signal
                    });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    const blob = await response.blob();
                    if (!blob || !blob.size) throw new Error('Empty image');
                    return { response, blob };
                } finally {
                    clearTimeout(timer);
                }
            };

            setDownloadLoading(true, 'Downloading', 'Getting the original image...');

            try {
                let result;
                try {
                    result = await fetchImage(originalUrl, 15000);
                } catch (directError) {
                    console.warn('Direct image download failed:', directError);
                    
                    const fallbackUrl = `/api/download?url=${encodeURIComponent(originalUrl)}&name=${encodeURIComponent(defaultFilename)}`;
                    setDownloadLoading(true, 'Downloading', 'Preparing the file...');

                    const fallbackLink = document.createElement('a');
                    fallbackLink.href = fallbackUrl;
                    fallbackLink.download = defaultFilename;
                    fallbackLink.setAttribute('download', defaultFilename);
                    fallbackLink.rel = 'noopener';
                    fallbackLink.style.display = 'none';
                    document.body.appendChild(fallbackLink);
                    fallbackLink.click();
                    fallbackLink.remove();

                    setDownloadLoading(false);
                    showMessage('Downloading file...');
                    return;
                }

                const sourceBlob = result.blob;
                const responseType = (result.response.headers.get('content-type') || '').split(';')[0].toLowerCase();
                const imageType = sourceBlob.type.startsWith('image/') ? sourceBlob.type : (responseType.startsWith('image/') ? responseType : 'image/jpeg');
                const fileBlob = sourceBlob.type === imageType ? sourceBlob : new Blob([sourceBlob], { type: imageType });
                const filename = getFilename(imageType);

                setDownloadLoading(false);
                saveBlobAsFile(fileBlob, filename);
                showMessage('Downloading file...');
            } catch (error) {
                setDownloadLoading(false);
                if (error?.name === 'AbortError') {
                    showMessage('The image took too long to load. Please try again.');
                    return;
                }
                console.error('Wallzy download error:', error);
                
                // Ultimate fallback for cross-origin URLs if they don't have Content-Disposition header
                const link = document.createElement('a');
                link.href = originalUrl;
                link.download = defaultFilename;
                link.setAttribute('download', defaultFilename);
                link.target = "_blank";
                document.body.appendChild(link);
                link.click();
                link.remove();
            }
        };

