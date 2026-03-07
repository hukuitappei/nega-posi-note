/** Service Worker 逋ｻ骭ｲ繝ｻ譖ｴ譁ｰ騾夂衍繝ｻPWA 繧､繝ｳ繧ｹ繝医・繝ｫ繝舌リ繝ｼ繧堤ｮ｡逅・☆繧九Δ繧ｸ繝･繝ｼ繝ｫ */
export function initPWA() {
  // ===== Service Worker 逋ｻ骭ｲ & 譖ｴ譁ｰ讀懷・ =====
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
        reg.update();

        // 譌｢縺ｫ waiting 迥ｶ諷九・ SW 縺後＞繧後・蜊ｳ蠎ｧ縺ｫ譖ｴ譁ｰ繝舌リ繝ｼ繧定｡ｨ遉ｺ
        if (reg.waiting) showUpdateBanner(reg.waiting);

        // 譁ｰ縺励＞ SW 縺後う繝ｳ繧ｹ繝医・繝ｫ髢句ｧ九＠縺溘ｉ逶｣隕・        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            // installed 縺九▽ 譌｢蟄倥・ SW 縺後＞繧・= 譖ｴ譁ｰ迚医′蠕・ｩ滉ｸｭ
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner(newWorker);
            }
          });
        });

        // SW 縺悟・繧頑崛繧上▲縺溘ｉ繝壹・繧ｸ繧偵Μ繝ｭ繝ｼ繝・        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      } catch (err) {
        console.warn('Service Worker 逋ｻ骭ｲ螟ｱ謨・', err);
      }
    });
  }

  // ===== PWA 繧､繝ｳ繧ｹ繝医・繝ｫ繝舌リ繝ｼ =====
  let deferredPrompt = null;
  const installBanner = document.getElementById('installBanner');
  const installBtn    = document.getElementById('installBtn');
  const dismissBtn    = document.getElementById('installDismiss');

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    installBanner.style.display = 'flex';
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') installBanner.style.display = 'none';
    deferredPrompt = null;
  });

  dismissBtn.addEventListener('click', () => {
    installBanner.style.display = 'none';
  });
}

// ===== SW 譖ｴ譁ｰ繝舌リ繝ｼ =====
function showUpdateBanner(worker) {
  const banner    = document.getElementById('updateBanner');
  const reloadBtn = document.getElementById('updateReloadBtn');
  if (!banner) return;

  banner.style.display = 'flex';

  reloadBtn.addEventListener('click', () => {
    banner.style.display = 'none';
    // SW 縺ｫ skipWaiting 繧帝∽ｿ｡ 竊・controllerchange 竊・reload
    worker.postMessage({ type: 'SKIP_WAITING' });
  }, { once: true });
}
