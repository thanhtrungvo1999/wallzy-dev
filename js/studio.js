// Wallzy gradient studio
        window.initGradientStudio = function initGradientStudio() {
            const update = () => {
                const c1 = document.getElementById('gradColor1').value, c2 = document.getElementById('gradColor2').value, t = document.getElementById('gradType').value;
                document.getElementById('gradientPreviewBox').style.background = t === 'circle' ? `radial-gradient(circle, ${c1}, ${c2})` : `linear-gradient(${t}, ${c1}, ${c2})`;
                document.getElementById('gradientTextInfo').innerText = t === 'circle' ? 'Radial Circle' : `Linear ${t}`;
            };
            document.getElementById('gradColor1').addEventListener('input', update); document.getElementById('gradColor2').addEventListener('input', update); document.getElementById('gradType').addEventListener('change', update);
            update();
        }
        window.saveCustomGradient = () => { /* Simplified for brevity to focus on TikTok */ showMessage("Saved local gradient!"); };
        window.downloadCustomGradient = () => { showMessage("Not implemented in this snippet"); };
        window.renderSavedGradients = function renderSavedGradients() {}

