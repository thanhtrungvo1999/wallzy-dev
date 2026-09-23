(() => {
            const selector = ['button', '[role="button"]', 'img[onclick]', '.cursor-pointer'].join(',');
            const activePointers = new Map();

            function getTarget(e) {
                const target = e.currentTarget;
                if (!target || target.disabled) return null;
                return target;
            }

            function addRipple(e) {
                const target = getTarget(e);
                if (!target) return;

                const rect = target.getBoundingClientRect();
                if (!rect.width || !rect.height) return;

                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));

                const ripple = document.createElement('span');
                ripple.className = 'native-ripple';
                ripple.style.left = `${x}px`;
                ripple.style.top = `${y}px`;
                ripple.style.width = `${radius * 2}px`;
                ripple.style.height = `${radius * 2}px`;
                ripple.style.transform = 'translate(-50%, -50%) scale(0)';
                target.appendChild(ripple);

                ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
                target.classList.remove('ripple-release');
                target.classList.add('ripple-press');
                activePointers.set(e.pointerId, { target, ripple });
            }

            function releaseRipple(e) {
                const data = activePointers.get(e.pointerId);
                if (!data) return;
                data.target.classList.remove('ripple-press');
                data.target.classList.add('ripple-release');
                window.setTimeout(() => data.target.classList.remove('ripple-release'), 190);
                activePointers.delete(e.pointerId);
            }

            function cancelRipple(e) {
                const data = activePointers.get(e.pointerId);
                if (!data) return;
                data.target.classList.remove('ripple-press');
                data.target.classList.add('ripple-release');
                window.setTimeout(() => data.target.classList.remove('ripple-release'), 190);
                activePointers.delete(e.pointerId);
            }

            function bind(root = document) {
                if (!root.querySelectorAll) return;
                const elements = root.matches?.(selector) ? [root, ...root.querySelectorAll(selector)] : [...root.querySelectorAll(selector)];
                elements.forEach(el => {
                    if (el.dataset.nativeRippleBound === '1') return;
                    el.dataset.nativeRippleBound = '1';
                    el.classList.add('ripple-target');
                    if (getComputedStyle(el).position === 'static') el.classList.add('ripple-positioned');
                    el.addEventListener('pointerdown', addRipple, { passive: true });
                    el.addEventListener('pointerup', releaseRipple, { passive: true });
                    el.addEventListener('pointercancel', cancelRipple, { passive: true });
                    el.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') releaseRipple(e); }, { passive: true });
                });
            }

            document.addEventListener('DOMContentLoaded', () => {
                bind();
                const startObserver = () => {
                    const observer = new MutationObserver(mutations => {
                        mutations.forEach(mutation => mutation.addedNodes.forEach(node => { if (node.nodeType === 1) bind(node); }));
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                };
                if ('requestIdleCallback' in window) requestIdleCallback(startObserver, { timeout: 1200 });
                else setTimeout(startObserver, 800);
            });
        })();
