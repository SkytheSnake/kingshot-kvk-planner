
(() => {
  let deferredPrompt = null;
  let installHelpVisible = false;

  function isStandalone(){
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function isIos(){
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  }

  function showSplash(){
    const splash = document.createElement('div');
    splash.className = 'pwa-splash';
    splash.innerHTML = `
      <div class="pwa-splash-card">
        <img class="pwa-splash-icon" src="icon-192.png" alt="KvK Planner icon">
        <h2 class="pwa-splash-title">Kingshot KvK Planner</h2>
        <p class="pwa-splash-subtitle">Plan • Coordinate • Win</p>
        <div class="pwa-splash-loader"><span></span></div>
      </div>`;
    document.body.appendChild(splash);
    const hide = () => {
      splash.classList.add('hidden');
      setTimeout(() => splash.remove(), 500);
    };
    window.addEventListener('load', () => setTimeout(hide, 700), { once:true });
    setTimeout(hide, 1800);
  }

  function ensureInstallButton(){
    return document.getElementById('installAppBtn');
  }

  function showInstallButton(label='Install App'){
    const btn = ensureInstallButton();
    if(!btn) return;
    btn.hidden = false;
    btn.classList.add('show');
    btn.textContent = label;
  }

  function hideInstallButton(){
    const btn = ensureInstallButton();
    if(!btn) return;
    btn.hidden = true;
    btn.classList.remove('show');
  }

  function closeInstallHelp(){
    const el = document.querySelector('.install-help');
    if(el) el.remove();
    installHelpVisible = false;
  }

  function openIosHelp(){
    if(installHelpVisible) return;
    installHelpVisible = true;
    const box = document.createElement('div');
    box.className = 'install-help';
    box.innerHTML = `
      <button class="close-install-help" aria-label="Close">×</button>
      <h3>Install on iPhone / iPad</h3>
      <p>Tap <strong>Share</strong> in Safari, then choose <strong>Add to Home Screen</strong>. The planner will install like an app.</p>`;
    document.body.appendChild(box);
    box.querySelector('.close-install-help').addEventListener('click', closeInstallHelp);
    setTimeout(closeInstallHelp, 9000);
  }

  function initInstallPrompt(){
    const btn = ensureInstallButton();
    if(!btn) return;

    if(isStandalone()){
      hideInstallButton();
      return;
    }

    btn.addEventListener('click', async () => {
      if(deferredPrompt){
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch(_) {}
        deferredPrompt = null;
        hideInstallButton();
      } else if(isIos()){
        openIosHelp();
      }
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton('Install App');
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      hideInstallButton();
      closeInstallHelp();
    });

    // Safari/iOS does not fire beforeinstallprompt
    if(isIos() && !isStandalone()){
      showInstallButton('Add to Home Screen');
    }
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      showSplash();
      initInstallPrompt();
    }, { once:true });
  } else {
    showSplash();
    initInstallPrompt();
  }
})();
