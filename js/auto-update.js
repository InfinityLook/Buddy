// auto-update.js
(function () {
  let currentVersion = null;
  const CHECK_INTERVAL = 5 * 60 * 1000; // Kontrola každých 5 minut

  async function checkVersion() {
    try {
      // Razítko ?t= zabraňuje prohlížeči kešovat starou verzi souboru
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) return;

      const data = await response.json();

      if (!currentVersion) {
        // Uložení výchozí verze při prvním spuštění
        currentVersion = data.version;
      } else if (currentVersion !== data.version) {
        console.warn('Nalezena nová verze. Obnovuji aplikaci...');
        // Vynucené načtení nové verze
        window.location.reload();
      }
    } catch (err) {
      console.error('Chyba při kontrole verze:', err);
    }
  }

  // 1. Spustit kontrolu ihned po načtení
  checkVersion();

  // 2. Spouštět pravidelně v intervalu
  setInterval(checkVersion, CHECK_INTERVAL);

  // 3. Spustit kontrolu při návratu uživatele (rozsvícení displeje / přepnutí záložky)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkVersion();
    }
  });
})();
