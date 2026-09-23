// Wallzy TikTok image extraction
        window.pasteToTikTokInput = async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    document.getElementById('tiktokUrlInput').value = text;
                }
            } catch (err) {
                showMessage("Unable to read the clipboard automatically. Please paste it manually.");
            }
        };

        window.fetchTikTokImages = async () => {
            const urlInput = document.getElementById('tiktokUrlInput').value.trim();
            if (!urlInput) {
                showMessage("Please paste a valid TikTok link.");
                return;
            }

            const btn = document.getElementById('fetchTikTokBtn');
            const icon = document.getElementById('tiktokBtnIcon');
            const text = document.getElementById('tiktokBtnText');
            
            btn.disabled = true;
            btn.classList.add('opacity-70', 'cursor-not-allowed');
            icon.className = "fa-solid fa-spinner fa-spin";
            text.innerText = "Extracting...";

            try {
                const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(urlInput)}&hd=1`;
                const response = await fetch(apiUrl);
                const json = await response.json();

                if (json.code === 0 && json.data) {
                    if (json.data.images && json.data.images.length > 0) {
                        renderTikTokImages(json.data.images);
                        document.getElementById('tiktokResultArea').classList.remove('hidden');
                        showMessage("Images extracted successfully!");
                    } else if (json.data.play) {
                        showMessage("This link is a video. Please enter a photo post (Photo Slide) link to download images.");
                    } else {
                        showMessage("No images were found at this link.");
                    }
                } else {
                    showMessage("Error: The link does not exist or the API rejected it. " + (json.msg || ''));
                }
            } catch (error) {
                console.error("TikTok Fetch Error:", error);
                showMessage("Server connection error. Please check your network or try again later.");
            } finally {
                btn.disabled = false;
                btn.classList.remove('opacity-70', 'cursor-not-allowed');
                icon.className = "fa-solid fa-magnifying-glass";
                text.innerText = "Get Images";
            }
        };

        function renderTikTokImages(imagesArray) {
            const grid = document.getElementById('tiktokImageGrid');
            const count = document.getElementById('tiktokImageCount');
            grid.innerHTML = '';
            count.innerText = imagesArray.length;

            const fragment = document.createDocumentFragment();
            imagesArray.forEach((imgUrl, index) => {
                const card = document.createElement('div');
                card.className = 'wallzy-card relative group rounded-2xl overflow-hidden bg-[#0a0a0c] aspect-[9/16] cursor-pointer shadow border border-white/10';
                
                // When a TikTok image is tapped, show the 5-second ad popup, then download the file directly like Explore
                card.onclick = () => {
                    window.openAdModal(imgUrl, `tiktok-img-${Date.now()}-${index + 1}.jpg`);
                };

                card.innerHTML = `
                    <div class="absolute inset-0 skeleton-wave z-0"></div>
                    <img src="${imgUrl}" class="w-full h-full object-cover relative z-10 transition-opacity duration-500 opacity-0" onload="this.classList.remove('opacity-0'); this.previousElementSibling?.remove();" onerror="this.src='https://placehold.co/600x900/0a0a0c/ffffff?text=Error'">
                    <div class="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-bold text-white tracking-widest uppercase border border-white/20">Slide ${index + 1}</div>
                    
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-30 flex items-center justify-center backdrop-blur-sm">
                        <div class="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                            <i class="fa-solid fa-download text-sm"></i>
                        </div>
                    </div>
                `;
                fragment.appendChild(card);
            });
            grid.appendChild(fragment);
        }

