// auto-update.js — záchranná brzda proti zaseknuté staré verzi.
//
// Proč vůbec existuje, když je v aplikaci service worker?
// Service worker se umí zaseknout (stará precache, neúspěšná aktivace,
// iOS, který na ploše drží stránku živou celé dny). Tenhle skript je
// nezávislý na bundlu i na SW: porovná verzi PRÁVĚ NASERVÍROVANÉHO HTML
// (meta[name="app-build-id"], kterou doplnil build) s živým /version.json.
// Když se liší, běží stará verze — a to se dá spravit jen tvrdě:
// zahodit cache, odregistrovat SW a načíst aplikaci znovu ze sítě.
//
// Soubor je schválně vyřazený z precache (globIgnores ve vite.config.ts),
// aby na telefonu nikdy nezůstala jeho stará podoba.
(function () {
  'use strict';

  var CHECK_INTERVAL = 60 * 1000; // Pravidelná kontrola každou minutu
  var MIN_CHECK_GAP = 10 * 1000; // Ochrana proti záplavě kontrol při přepínání oken
  var SW_GRACE_MS = 8 * 1000; // Jak dlouho čekáme, než se SW obnoví po dobrém
  var ATTEMPT_KEY = 'sb:update-attempts';
  var MAX_ATTEMPTS = 2; // Kolikrát smíme kvůli jedné verzi obnovit stránku

  var lastCheck = 0;
  var busy = false;
  var refreshing = false; // Jakmile jednou obnovujeme, další kontroly už do toho nemluví

  function meta(name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? el.getAttribute('content') : null;
  }

  // Na localhostu se nekontroluje nic — ve vývoji zařizuje obnovu Vite.
  function isDevHost() {
    var h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.local');
  }

  // Porovnáváme primárně build ID (mění se při každém buildu),
  // verze je záložní pro případ staršího version.json bez build ID.
  function localKey() {
    return meta('app-build-id') || meta('app-version');
  }

  function remoteKey(data) {
    if (!data) return null;
    if (meta('app-build-id') && data.buildId) return data.buildId;
    return data.version || null;
  }

  // Bez pojistky by se aplikace mohla zacyklit v nekonečném reloadu —
  // typicky když se version.json a hotové soubory rozjedou při nasazení.
  function attempts(key) {
    try {
      var raw = sessionStorage.getItem(ATTEMPT_KEY);
      var parsed = raw ? JSON.parse(raw) : null;
      return parsed && parsed.key === key ? parsed.count || 0 : 0;
    } catch (err) {
      return 0;
    }
  }

  function noteAttempt(key) {
    try {
      sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify({ key: key, count: attempts(key) + 1 }));
    } catch (err) {
      /* Privátní režim bez sessionStorage — pojistka prostě nebude fungovat. */
    }
  }

  function clearAttempts() {
    try {
      sessionStorage.removeItem(ATTEMPT_KEY);
    } catch (err) {
      /* nic */
    }
  }

  // Nejdřív slušná cesta: donutit service worker stáhnout nový sw.js.
  // Když se povede, SW se sám aktivuje a aplikace se obnoví (viz registerSW.ts),
  // a hlavně si přitom nechá precache, takže se netahá všechno znovu.
  async function tryServiceWorkerUpdate() {
    if (!('serviceWorker' in navigator)) return false;
    try {
      var reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return false;
      await reg.update();
      return true;
    } catch (err) {
      return false;
    }
  }

  // Tvrdý restart aplikace. Uživatelská data v localStorage zůstávají,
  // mažeme jen cache prohlížeče se starými soubory aplikace.
  async function hardRefresh(key) {
    if (document.visibilityState === 'hidden') {
      // Obnovovat aplikaci na pozadí nemá cenu (a na iOS se to stejně nedokončí).
      // Uvolníme zámek, ať to kontrola zkusí znovu, až se uživatel vrátí.
      refreshing = false;
      return;
    }
    noteAttempt(key);
    try {
      if ('serviceWorker' in navigator) {
        var regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(function (r) { return r.unregister(); }));
      }
      if (window.caches && caches.keys) {
        var names = await caches.keys();
        await Promise.all(names.map(function (n) { return caches.delete(n); }));
      }
    } catch (err) {
      console.warn('[update] Úklid cache se nepovedl, obnovuji i tak:', err);
    }
    // replace() místo reload(), aby se stará stránka nedala vrátit tlačítkem zpět
    location.replace(location.pathname + location.search + location.hash);
  }

  async function checkVersion(force) {
    if (busy || refreshing || isDevHost()) return;
    // Offline nemá kontrola smysl a vymazat cache by aplikaci úplně vyřadilo.
    if (navigator.onLine === false) return;

    var now = Date.now();
    if (!force && now - lastCheck < MIN_CHECK_GAP) return;
    lastCheck = now;
    busy = true;

    try {
      // Razítko ?t= i no-store: version.json se nesmí číst z žádné cache.
      var response = await fetch('/version.json?t=' + now, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) return;

      var data = await response.json();
      var mine = localKey();
      var theirs = remoteKey(data);

      // Když build tokeny nedoplnil, nemáme co porovnávat.
      if (!mine || !theirs || mine.indexOf('__APP_') === 0) return;

      if (mine === theirs) {
        clearAttempts();
        return;
      }

      if (attempts(theirs) >= MAX_ATTEMPTS) {
        console.warn('[update] Nová verze', theirs, 'se nepodařilo načíst ani na', MAX_ATTEMPTS, 'pokusy. Končím, aby se aplikace nezacyklila.');
        return;
      }

      console.warn('[update] Běží stará verze', mine, '→ nasazuji', theirs);
      refreshing = true;

      // Dáme service workeru chvíli, ať se obnoví sám a šetrně.
      // Pokud stránka po SW_GRACE_MS pořád žije, je zaseknutý — jdeme natvrdo.
      var swWillHandleIt = await tryServiceWorkerUpdate();
      if (swWillHandleIt) {
        setTimeout(function () { hardRefresh(theirs); }, SW_GRACE_MS);
        return;
      }

      await hardRefresh(theirs);
    } catch (err) {
      console.warn('[update] Kontrola verze selhala:', err);
    } finally {
      busy = false;
    }
  }

  // 1. Hned po startu — tohle je ten případ „otevřu appku na ploše
  //    a mám tam pořád starou verzi“.
  checkVersion(true);

  // 2. Pravidelně po dobu běhu
  setInterval(function () { checkVersion(false); }, CHECK_INTERVAL);

  // 3. Při návratu k aplikaci. Nainstalovaná PWA se z pozadí neobnovuje,
  //    jen „probudí“, takže tohle je v praxi nejčastější spouštěč.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') checkVersion(false);
  });
  window.addEventListener('focus', function () { checkVersion(false); });
  window.addEventListener('online', function () { checkVersion(true); });

  // 4. Návrat ze zpětné/bfcache — na iOS se takhle PWA vrací nejčastěji.
  window.addEventListener('pageshow', function (event) {
    if (event.persisted) checkVersion(true);
  });
})();
