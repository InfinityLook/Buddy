// auto-update.js
(function () {
  let currentVersion = null;
  const CHECK_INTERVAL = 5 * 60 * 1000; // Kontrola každých 5 minut

  async function checkVersion() {
    try {
      // Přidaný časový razítko ?t= zabraňuje prohlížeči kešovat odpověď
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!response.ok) return;

      const data = await response.json();

      if (!currentVersion) {
        currentVersion = data.version;
      } else if (currentVersion !== data.version) {
        console.warn('Nalezena nová verze aplikace. Provádím automatický reload...');
        
        // Volitelně: Obnovit až ve chvíli, kdy uživatel s aplikací zrovna nepracuje
        reloadApp();
      }
    } catch (err) {
      console.error('Chyba při kontrole verze:', err);
    }
  }

  function reloadApp() {
    // Vynucené obnovení stránky bez keše
    window.location.reload(true);
  }

  // Spustit ihned po načtení a následně v intervalu
  checkVersion();
  setInterval(checkVersion, CHECK_INTERVAL);
})();
