import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '@/core/supabase/auth'
import { useAuthStore } from '@/core/store/useAuthStore'
import { useHasPermission } from '@/core/role'
import { useCloudStatus, syncNow } from '@/core/supabase/cloudSync'
import { APP_VERSION, applyUpdateNow, checkForUpdates, hasNewerVersion } from '@/core/utils/registerSW'
import { importDataFromJson, restoreFullBackup } from '@/core/utils/backup'
import {
  exportFullBackupWithFiles,
  importZipBackup,
  jeZipZaloha,
  restoreFilesFromZip,
} from '@/core/utils/fileBackup'
import {
  SNAPSHOT_SOURCE_LABEL,
  SnapshotInfo,
  autoSnapshotIfDue,
  deleteSnapshot,
  formatSnapshotDate,
  formatSnapshotSize,
  getSnapshot,
  listSnapshots,
  saveSnapshot,
} from '@/core/utils/backupHistory'
import { AppBottomNav } from '@/components/AppBottomNav'
import { useModulovySwipe } from '@/core/navigation/useModulovySwipe'
import { OsobniUdajeSekce } from './components/OsobniUdajeSekce'
import { ZvukSekce } from './components/ZvukSekce'
import { VzhledARamecekSekce } from './components/VzhledARamecekSekce'
import { ZabezpeceniSekce } from './components/ZabezpeceniSekce'
import { SoukromiSocialSekce } from './components/SoukromiSocialSekce'
import './SettingsModule.css'

// ==========================================
// Nastavení aplikace. Šestnácté kolo vylepšení (viz CLAUDE.md)
// přepsalo hlavní stránku z jedné dlouhé sady karet na menu — pět
// položek (Osobní údaje/Zvuk/Vzhled a rámečky/Zabezpečení/Soukromí a
// Social) teď otevírá vlastní podobrazovku na celou obrazovku
// (stejný "menu řádků → celoobrazovková sekce s tlačítkem zpět" vzor,
// jaký AdminModule.tsx/social/NastaveniPanel.tsx už používají), místo
// aby byly rovnou vidět jako karty pod sebou. Zálohování dat zůstává
// přímo tady, jen jako rozbalovací akordeon (appka ho dřív měla
// natrvalo otevřené). Synchronizace/Verze aplikace/Podpora/
// Administrace/Odhlásit se zůstávají beze změny — appka je nikam
// nepřesouvá, jen se posunuly pod nové menu.
// ==========================================

type Sekce = 'osobni' | 'zvuk' | 'vzhled' | 'zabezpeceni' | 'soukromi'

const MENU_POLOZKY: { id: Sekce; ikona: string; barva: string; nazev: string; popis: string }[] = [
  { id: 'osobni', ikona: '👤', barva: 'blue', nazev: 'Osobní údaje', popis: 'Jméno, e-mail a motto na profilu' },
  { id: 'zvuk', ikona: '🔊', barva: 'blue', nazev: 'Zvuk', popis: 'Hlasitost appky, Buddyho, hry a Music Studia' },
  { id: 'vzhled', ikona: '🎨', barva: 'gradient', nazev: 'Vzhled a rámečky', popis: 'Barva appky a rámeček avatáru' },
  { id: 'zabezpeceni', ikona: '🛡️', barva: 'purple', nazev: 'Zabezpečení', popis: 'Přihlášení a ochrana účtu' },
  {
    id: 'soukromi',
    ikona: '🔒',
    barva: 'purple',
    nazev: 'Soukromí a Social',
    popis: 'Kdo tě vidí, blokovaní lidé, nahlášený obsah',
  },
]

const NADPISY: Record<Sekce, string> = {
  osobni: 'Osobní údaje',
  zvuk: 'Zvuk',
  vzhled: 'Vzhled a rámečky',
  zabezpeceni: 'Zabezpečení',
  soukromi: 'Soukromí a Social',
}

// Popis stavu synchronizace pro kartu Synchronizace. Musí být srozumitelný
// i pro toho, kdo o Supabase nikdy neslyšel.
const CLOUD_LABELS: Record<string, string> = {
  off: 'Cloud není nastavený — data zůstávají jen v tomhle zařízení',
  connecting: 'Připojuji…',
  synced: 'XP a odznaky zálohované v cloudu',
  offline: 'Offline — odešle se, až bude signál',
  error: 'Synchronizace se nepovedla, klepni pro nový pokus',
}

export const SettingsModule: React.FC = () => {
  const navigate = useNavigate()
  // Fáze 5 Social nav reworku — vodorovný swipe mezi Hub/Apps/Profil/
  // Nastavení.
  const swipe = useModulovySwipe()
  const { logout } = useAuthStore()
  const smiAdmin = useHasPermission('admin.panel')
  const smiModerovat = useHasPermission('moderation.content')
  const cloudStatus = useCloudStatus((state) => state.status)
  // Důvod selhání. Bez něj karta jen oznámí, že se to nepovedlo, a
  // dohledat proč šlo pouze přes konzoli prohlížeče — na telefonu tedy
  // prakticky vůbec.
  const cloudError = useCloudStatus((state) => state.error)

  const [sekce, setSekce] = useState<Sekce | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [updateChecking, setUpdateChecking] = useState(false)
  // Zálohování dat — rozbalovací akordeon na hlavní stránce (na rozdíl
  // od pěti položek menu výš appka tohle nikam dál nenavigujue, jen
  // schovává/ukazuje beze změny stránky).
  const [zalohaOtevrena, setZalohaOtevrena] = useState(false)
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const zalohaFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Appka si sama drží posledních pár záloh, ať se má uživatel kam
    // vrátit, i když si soubor nikdy nestáhl.
    void autoSnapshotIfDue().then(() => listSnapshots().then(setSnapshots))
  }, [])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  // Odhlášení musí ukončit i relaci v Supabase, ne jen místní příznak —
  // jinak by relace zůstala v prohlížeči a po obnovení stránky by se
  // appka tvářila, že je uživatel pořád přihlášený.
  const handleLogout = () => {
    if (!window.confirm('Opravdu se chceš odhlásit?')) return
    void signOut()
    logout()
    navigate('/')
  }

  // Ruční pojistka pro případ, že by si automatická aktualizace nevšimla
  // nové verze — třeba když telefon dlouho visel offline.
  const handleCheckUpdates = async () => {
    if (updateChecking) return
    if (!navigator.onLine) {
      showToast('Jsi offline — aktualizace zkusím později')
      return
    }

    setUpdateChecking(true)
    showToast('Kontroluji aktualizace…')
    try {
      const newer = await hasNewerVersion()
      if (newer) {
        showToast('Nová verze nalezena, načítám ji…')
        await applyUpdateNow()
        return
      }
      // I bez nové verze stojí za to pobídnout service worker,
      // kdyby náhodou uvízl na starém buildu.
      await checkForUpdates()
      showToast(`Máš nejnovější verzi (${APP_VERSION}) ✓`)
    } catch {
      showToast('Kontrolu se nepodařilo dokončit')
    } finally {
      setUpdateChecking(false)
    }
  }

  const handleExportBackup = async () => {
    const ok = await exportFullBackupWithFiles()
    if (ok) {
      // Zálohu v aplikaci si necháme jen s metadaty (viz backupHistory.ts) —
      // obsah souborů leží ve stejné IndexedDB, kterou tenhle snímek
      // nepřepisuje, takže se vrácením v rámci JEDNOHO zařízení neztratí.
      // Chybět můžou až po přenosu na jiné zařízení, na to je zip výš.
      await saveSnapshot('manual')
      setSnapshots(await listSnapshots())
    }
    showToast(ok ? 'Záloha všech dat (i souborů) byla stažena.' : 'Zálohu se nepodařilo vytvořit.')
  }

  // Společný závěr obnovy — story jsou v paměti už zrehydratované,
  // nových hodnot v úložišti by si samy nevšimly.
  const finishRestore = (message: string) => {
    showToast(message)
    window.setTimeout(() => window.location.reload(), 1200)
  }

  const handleRestoreSnapshot = async (info: SnapshotInfo) => {
    const snapshot = await getSnapshot(info.id)
    if (!snapshot) {
      showToast('Tuhle zálohu se nepodařilo načíst.')
      return
    }

    // Než přepíšeme současný stav, uložíme si ho — obnova jde takhle vzít zpět
    await saveSnapshot('before-restore')

    const result = restoreFullBackup(snapshot.payload)
    if (!result.success) {
      showToast(result.error ?? 'Zálohu se nepodařilo obnovit.')
      return
    }

    finishRestore(`Obnoveno ze zálohy z ${formatSnapshotDate(info.createdAt)}. Načítám znovu…`)
  }

  const handleDeleteSnapshot = async (id: string) => {
    await deleteSnapshot(id)
    setSnapshots(await listSnapshots())
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // .zip = nová záloha i s obsahem souborů, .json = starší
      // metadata-only formát — obojí musí jít nahrát dál.
      const zipova = jeZipZaloha(file)
      const { envelope: data, soubory } = zipova
        ? await importZipBackup(file)
        : { envelope: await importDataFromJson<unknown>(file), soubory: new Map<string, Blob>() }

      // Současný stav si schováme, ať jde obnova vzít zpět
      await saveSnapshot('before-restore')

      const result = restoreFullBackup(data)

      if (!result.success) {
        showToast(result.error ?? 'Soubor není platná záloha.')
        return
      }

      // Nahraný soubor si necháme i v historii, ať se dá vybrat znovu
      if (!result.legacy) await saveSnapshot('file', data as never)

      const obnovenoSouboru = soubory.size > 0 ? await restoreFilesFromZip(soubory, data) : 0

      finishRestore(
        result.legacy
          ? 'Obnoveno ze starší zálohy (jen seznam aplikací). Načítám znovu…'
          : `Obnoveno (${result.restored.length} částí${
              obnovenoSouboru > 0 ? `, ${obnovenoSouboru} souborů` : ''
            }). Načítám znovu…`
      )
    } catch {
      showToast('Soubor není platná záloha.')
    } finally {
      event.target.value = ''
    }
  }

  if (sekce) {
    return (
      <div className="settings-page" onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
        <div className="settings-top-bar">
          <button className="settings-back-btn" onClick={() => setSekce(null)}>
            ← Zpět do nastavení
          </button>
          <h1 className="settings-title">{NADPISY[sekce]}</h1>
        </div>

        {sekce === 'osobni' && <OsobniUdajeSekce onToast={showToast} />}
        {sekce === 'zvuk' && <ZvukSekce />}
        {sekce === 'vzhled' && <VzhledARamecekSekce onToast={showToast} />}
        {sekce === 'zabezpeceni' && <ZabezpeceniSekce onToast={showToast} />}
        {sekce === 'soukromi' && <SoukromiSocialSekce onToast={showToast} />}

        <AppBottomNav />
        {toast && <div className="settings-toast">{toast}</div>}
      </div>
    )
  }

  return (
    <div className="settings-page" onTouchStart={swipe.onTouchStart} onTouchEnd={swipe.onTouchEnd}>
      <div className="settings-top-bar">
        <button className="settings-back-btn" onClick={() => navigate('/profil')}>
          ← Zpět na profil
        </button>
        <h1 className="settings-title">Nastavení</h1>
      </div>

      {/* Menu — pět položek, každá otevře vlastní podobrazovku výš. */}
      {MENU_POLOZKY.map((p) => (
        <section key={p.id} className="settings-card">
          <button type="button" className="settings-accordion-hlava" onClick={() => setSekce(p.id)}>
            <span
              className={`settings-card-icon ${p.barva !== 'gradient' ? p.barva : ''}`}
              style={p.barva === 'gradient' ? { background: 'linear-gradient(135deg, #a855f7, #f5c451)' } : undefined}
              aria-hidden="true"
            >
              {p.ikona}
            </span>
            <div>
              <h2 className="settings-card-title">{p.nazev}</h2>
              <p className="settings-card-sub">{p.popis}</p>
            </div>
            <span className="settings-accordion-sipka" aria-hidden="true">›</span>
          </button>
        </section>
      ))}

      {/* Zálohování dat — přesunuté sem z Hubu, teď jako rozbalovací
          akordeon místo natrvalo otevřené karty. Stejná logika (export
          do .zip i s obsahem souborů, obnova ze souboru, historie
          posledních snímků), beze změny. */}
      <section className="settings-card">
        <button
          type="button"
          className="settings-accordion-hlava"
          onClick={() => setZalohaOtevrena((v) => !v)}
          aria-expanded={zalohaOtevrena}
        >
          <span className="settings-card-icon blue" aria-hidden="true">☁️</span>
          <div>
            <h2 className="settings-card-title">Zálohování dat</h2>
            <p className="settings-card-sub">Stáhnout, obnovit nebo vrátit dřívější zálohu</p>
          </div>
          <span className={`settings-accordion-sipka ${zalohaOtevrena ? 'je-otevreno' : ''}`} aria-hidden="true">
            ›
          </span>
        </button>

        {zalohaOtevrena && (
          <>
            <p className="settings-card-sub settings-zaloha-popis">
              Data máš uložená přímo v zařízení. Zazálohuj je do souboru (i s obsahem souborů ze Správce souborů)
              nebo obnov z dřívější zálohy. XP, úroveň a odznaky obnova nemění.
            </p>

            <button className="settings-save-btn" onClick={() => { void handleExportBackup() }}>
              ⬇️ Stáhnout zálohu
            </button>

            <button className="settings-save-btn" onClick={() => zalohaFileRef.current?.click()}>
              ⬆️ Obnovit ze souboru
            </button>

            {/* Zálohy uložené v aplikaci — uživatel si vybere, kterou vrátit */}
            <div className="settings-zaloha-section">
              <span className="settings-zaloha-head">Zálohy v aplikaci</span>

              {snapshots.length === 0 ? (
                <p className="settings-zaloha-empty">
                  Zatím tu žádná není. Aplikace si jednu uloží sama, jakmile s ní chvíli pobudeš.
                </p>
              ) : (
                <ul className="settings-zaloha-list">
                  {snapshots.map((snapshot) => (
                    <li key={snapshot.id} className="settings-zaloha-item">
                      <button
                        className="settings-zaloha-restore"
                        onClick={() => { void handleRestoreSnapshot(snapshot) }}
                      >
                        <span className="settings-zaloha-date">{formatSnapshotDate(snapshot.createdAt)}</span>
                        <span className="settings-zaloha-meta">
                          {SNAPSHOT_SOURCE_LABEL[snapshot.source]} · {formatSnapshotSize(snapshot.sizeBytes)}
                        </span>
                      </button>
                      <button
                        className="settings-zaloha-delete"
                        aria-label={`Smazat zálohu z ${formatSnapshotDate(snapshot.createdAt)}`}
                        onClick={() => { void handleDeleteSnapshot(snapshot.id) }}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <input
              ref={zalohaFileRef}
              type="file"
              accept=".zip,.json,application/zip,application/json"
              hidden
              onChange={handleImportFile}
            />
          </>
        )}
      </section>

      {/* Synchronizace a Verze aplikace */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">☁️</span>
          <div>
            <h2 className="settings-card-title">
              Synchronizace
              <span className={`settings-cloud-dot is-${cloudStatus}`} aria-hidden="true" />
            </h2>
            <p className="settings-card-sub">{CLOUD_LABELS[cloudStatus] ?? CLOUD_LABELS.off}</p>
            {cloudStatus === 'error' && cloudError && (
              <p className="settings-error-detail">{cloudError}</p>
            )}
          </div>
        </div>

        <button className="settings-save-btn" onClick={() => { void syncNow() }}>
          Zkusit synchronizaci znovu
        </button>
      </section>

      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon purple" aria-hidden="true">🔄</span>
          <div>
            <h2 className="settings-card-title">Verze aplikace</h2>
            <p className="settings-card-sub">
              {updateChecking ? 'Kontroluji…' : `Buddy ${APP_VERSION}`}
            </p>
          </div>
        </div>

        <button className="settings-save-btn" onClick={() => { void handleCheckUpdates() }}>
          Zkontrolovat aktualizace
        </button>
      </section>

      {/* Podpora — vidí ji každý přihlášený, na rozdíl od Administrace
          níž bez žádné podmínky. Admin otevře stejnou obrazovku a uvidí
          v ní tikety od všech (RLS to rozhoduje, ne tenhle odkaz). */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">💬</span>
          <div>
            <h2 className="settings-card-title">Podpora</h2>
            <p className="settings-card-sub">Máš dotaz nebo problém? Napiš nám.</p>
          </div>
        </div>

        <button className="settings-save-btn" onClick={() => navigate('/podpora')}>
          Otevřít podporu
        </button>
      </section>

      {/* Administrace — vidí ji admin i moderátor, každý přes jiné
          oprávnění. Tlačítko samo nikoho nechrání (role v prohlížeči
          si jde přepsat), skutečná data za ním si přístup ověřují sama
          v databázi — viz komentář v pages/admin/AdminModule.tsx.
          AdminModule.tsx sám omezí, co moderátor uvnitř uvidí. */}
      {(smiAdmin || smiModerovat) && (
        <section className="settings-card">
          <div className="settings-card-head">
            <span className="settings-card-icon amber" aria-hidden="true">🛠️</span>
            <div>
              <h2 className="settings-card-title">{smiAdmin ? 'Administrace' : 'Moderace'}</h2>
              <p className="settings-card-sub">
                {smiAdmin ? 'Přehled, hlášení a konzole aplikace' : 'Hlášení od uživatelů'}
              </p>
            </div>
          </div>

          <button className="settings-save-btn" onClick={() => navigate('/admin')}>
            {smiAdmin ? 'Otevřít Admin panel' : 'Otevřít moderaci'}
          </button>
        </section>
      )}

      <section className="settings-card">
        <button className="settings-danger-btn" onClick={handleLogout}>
          🚪 Odhlásit se
        </button>
      </section>

      {/* Fáze 4 Social nav reworku (viz CLAUDE.md) — stejná sdílená
          lišta jako na Hubu/Apps/Profilu. */}
      <AppBottomNav />

      {toast && <div className="settings-toast">{toast}</div>}
    </div>
  )
}

export default SettingsModule
