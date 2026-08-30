import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '@/core/supabase/auth'
import { useAuthStore } from '@/core/store/useAuthStore'
import { useProfileData } from '@/pages/profil/hooks/useProfileData'
import { useHasPermission } from '@/core/role'
import { useThemeStore, VSECHNY_VZHLEDY } from '@/core/theme'
import { jeBiometrieDostupna, zaregistrujBiometrii } from '@/core/utils/biometrics'
import { nactiZarizeni, type PrihlaseneZarizeni } from '@/core/security/loginDevices'
import { AVATAR_FRAMES } from '@/social/avatarFrames'
import { useCloudStatus, syncNow } from '@/core/supabase/cloudSync'
import { APP_VERSION, applyUpdateNow, checkForUpdates, hasNewerVersion } from '@/core/utils/registerSW'
import * as api from '@/social/api'
import './SettingsModule.css'

// ==========================================
// Nastavení aplikace. Zatím obsahuje osobní údaje a zabezpečení, ale je
// to místo, kam patří všechno další nastavení — dřív bylo schované
// v bottom sheetu nad profilem, kam se víc sekcí rozumně nevejde.
// ==========================================

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
  const { logout } = useAuthStore()
  const { profile, updateProfile, updateSecurity, resetProfile } = useProfileData()
  const smiAdmin = useHasPermission('admin.panel')
  const smiModerovat = useHasPermission('moderation.content')
  // Stejné oprávnění, jaké už uděluje prémiová kosmetika v obchodě —
  // vzhled aplikace je jen další kus kosmetiky, ne nová kategorie.
  const smiPremium = useHasPermission('cosmetics.premium')
  const themeId = useThemeStore((s) => s.themeId)
  const setThemeId = useThemeStore((s) => s.setThemeId)
  const cloudStatus = useCloudStatus((state) => state.status)
  // Důvod selhání. Bez něj karta jen oznámí, že se to nepovedlo, a
  // dohledat proč šlo pouze přes konzoli prohlížeče — na telefonu tedy
  // prakticky vůbec.
  const cloudError = useCloudStatus((state) => state.error)

  const [form, setForm] = useState({
    name: profile.name,
    email: profile.email,
    motto: profile.motto,
    bio: profile.bio,
  })
  const [toast, setToast] = useState<string | null>(null)
  const [biometrieProbiha, setBiometrieProbiha] = useState(false)
  const [updateChecking, setUpdateChecking] = useState(false)
  const [soukromy, setSoukromy] = useState(false)
  const [meniSoukromi, setMeniSoukromi] = useState(false)
  const [skrytOnline, setSkrytOnline] = useState(false)
  const [meniSkrytOnline, setMeniSkrytOnline] = useState(false)
  const [zarizeni, setZarizeni] = useState<PrihlaseneZarizeni[]>([])

  // Soukromí i skrytí online stavu žijí na profiles v cloudu, ne
  // v lokálním useProfileData — appka je proto natáhne zvlášť, stejným
  // způsobem jako VerejnyProfilDialog.tsx čte cizí profil.
  useEffect(() => {
    void api.nactiSoukromy().then(setSoukromy)
    void api.nactiSkrytOnline().then(setSkrytOnline)
    // login_devices se plní z App.tsx's startLoginNotify() při startu —
    // tenhle dotaz jen čte, co tam už je, ať přepínač níž má vedle sebe
    // vidět skutečnou historii, ne jen prázdný přepínač.
    void nactiZarizeni().then(setZarizeni)
  }, [])

  // Když se profil změní jinde (obnova ze zálohy), formulář se srovná
  useEffect(() => {
    setForm({ name: profile.name, email: profile.email, motto: profile.motto, bio: profile.bio })
  }, [profile.name, profile.email, profile.motto, profile.bio])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      showToast('Jméno nemůže být prázdné')
      return
    }
    updateProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      motto: form.motto.trim(),
      bio: form.bio.trim(),
    })
    showToast('Uloženo ✓')
  }

  const vybratRamecek = (id: string | null, vip: boolean, nazev: string) => {
    if (vip && !smiPremium) {
      showToast('Tenhle rámeček je jen pro VIP.')
      return
    }
    updateProfile({ frameId: id })
    showToast(id ? `Rámeček „${nazev}“ nastaven ✓` : 'Rámeček zrušen ✓')
  }

  const handleResetProfile = () => {
    if (window.confirm('Opravdu chceš smazat profil a vrátit ho do výchozího stavu? Úkoly, poznámky ani XP se nesmažou.')) {
      resetProfile()
      showToast('Profil byl vrácen do výchozího stavu')
    }
  }

  // Odhlášení musí ukončit i relaci v Supabase, ne jen místní příznak —
  // jinak by relace zůstala v prohlížeči a po obnovení stránky by se
  // appka tvářila, že je uživatel pořád přihlášený (stejná dvojice
  // volání jako App.tsx's odhlasit()). Tohle tlačítko sem přibylo, když
  // Hub's redesign odstranil jediné dosavadní místo appky s odhlášením
  // (svůj vlastní header) — appka bez tohohle by neměla žádnou cestu
  // ven z účtu vůbec.
  const handleLogout = () => {
    if (!window.confirm('Opravdu se chceš odhlásit?')) return
    void signOut()
    logout()
    navigate('/')
  }

  const vybratVzhled = (id: (typeof VSECHNY_VZHLEDY)[number]['id'], vip: boolean, nazev: string) => {
    if (vip && !smiPremium) {
      showToast('Tenhle vzhled je jen pro VIP.')
      return
    }
    setThemeId(id)
    showToast(`Vzhled „${nazev}“ nastaven ✓`)
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

  return (
    <div className="settings-page">
      <div className="settings-top-bar">
        <button className="settings-back-btn" onClick={() => navigate('/profil')}>
          ← Zpět na profil
        </button>
        <h1 className="settings-title">Nastavení</h1>
      </div>

      {/* Osobní údaje */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">👤</span>
          <div>
            <h2 className="settings-card-title">Osobní údaje</h2>
            <p className="settings-card-sub">Jméno, e-mail a motto na profilu</p>
          </div>
        </div>

        <form className="settings-form" onSubmit={handleSavePersonal}>
          <label className="settings-field">
            <span>Jméno</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Tvoje jméno"
            />
          </label>

          <label className="settings-field">
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="tvuj@email.cz"
              autoComplete="email"
            />
          </label>

          <label className="settings-field">
            <span>Motto</span>
            <input
              value={form.motto}
              onChange={(e) => setForm((f) => ({ ...f, motto: e.target.value }))}
              placeholder="Tvoje osobní motto"
            />
          </label>

          <label className="settings-field">
            <span>O mně</span>
            <textarea
              className="settings-textarea"
              value={form.bio}
              maxLength={300}
              rows={3}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              placeholder="Pár vět o sobě — zájmy, oblíbený předmět, cokoli chceš"
            />
          </label>

          <button type="submit" className="settings-save-btn">Uložit změny</button>
        </form>
      </section>

      {/* Zvuk.
          Přepínač zvuků Buddyho stával v Hubu ve spodní liště. Patří ale
          mezi ostatní nastavení, ne mezi tlačítka, kterými se aplikace
          ovládá — v liště jen zabíral místo. */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">🔊</span>
          <div>
            <h2 className="settings-card-title">Zvuk</h2>
            <p className="settings-card-sub">Jak se Buddy ozývá</p>
          </div>
        </div>

        {/* Zatím jen řádek s poznámkou, ne přepínač: přepínat by nebylo co
            a vypínač, který nic nedělá, je horší než žádný. */}
        <div className="settings-toggle-row settings-toggle-row--soon">
          <div className="settings-toggle-text">
            <span className="settings-toggle-title">
              Zvuky Buddyho
              <span className="settings-badge-soon">BRZY</span>
            </span>
            <span className="settings-toggle-sub">Ozvučení reakcí a odměn</span>
          </div>
        </div>
      </section>

      {/* Vzhled aplikace — 5 barevných palet, 3 volné a 2 pro VIP (viz
          core/theme/themes.ts). Karta jen vykresluje VSECHNY_VZHLEDY —
          přidat šestý vzhled znamená dopsat ho tam, ne sem. */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span
            className="settings-card-icon"
            style={{ background: 'linear-gradient(135deg, #a855f7, #f5c451)' }}
            aria-hidden="true"
          >
            🎨
          </span>
          <div>
            <h2 className="settings-card-title">Vzhled aplikace</h2>
            <p className="settings-card-sub">5 barevných vzhledů — 3 volně, 2 jen pro VIP</p>
          </div>
        </div>

        <div className="settings-theme-grid">
          {VSECHNY_VZHLEDY.map((tema) => {
            const zamceno = tema.vip && !smiPremium
            const aktivni = tema.id === themeId

            return (
              <button
                key={tema.id}
                className={`settings-theme-card ${aktivni ? 'is-aktivni' : ''} ${zamceno ? 'je-zamceno' : ''}`}
                onClick={() => vybratVzhled(tema.id, tema.vip, tema.nazev)}
              >
                <div
                  className="settings-theme-swatch"
                  style={{
                    background: `linear-gradient(135deg, ${tema.bgPanel}, ${tema.bgPanelRaised})`,
                    borderColor: tema.borderStrong,
                  }}
                >
                  <span className="settings-theme-dot" style={{ background: tema.accentCyan }} />
                  <span className="settings-theme-dot" style={{ background: tema.accentViolet }} />
                  <span className="settings-theme-dot" style={{ background: tema.accentMagenta }} />

                  {tema.vip && (
                    <span className="settings-theme-vip">{zamceno ? '🔒' : '👑'} VIP</span>
                  )}
                  {aktivni && <span className="settings-theme-check">✓</span>}
                </div>

                <span className="settings-theme-nazev">
                  {tema.ikona} {tema.nazev}
                </span>
                <span className="settings-theme-popis">{tema.popis}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Rámeček avataru — pevná paleta místo barvy podle id, viz
          social/avatarFrames.ts. Stejná mřížka jako Vzhled aplikace výš,
          jen náhled je kruh (jak rámeček doopravdy vypadá), ne obdélník. */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span
            className="settings-card-icon"
            style={{ background: 'linear-gradient(135deg, #7dd3fc, #fbbf24)' }}
            aria-hidden="true"
          >
            🖼️
          </span>
          <div>
            <h2 className="settings-card-title">Rámeček avataru</h2>
            <p className="settings-card-sub">Pevná barva prstenu místo té podle jména — 2 volně, 2 jen pro VIP</p>
          </div>
        </div>

        <div className="settings-theme-grid">
          <button
            className={`settings-theme-card ${profile.frameId === null ? 'is-aktivni' : ''}`}
            onClick={() => vybratRamecek(null, false, 'Výchozí')}
          >
            <div className="settings-ramecek-nahled" style={{ background: 'var(--bg-panel-raised)' }}>
              {profile.frameId === null && <span className="settings-theme-check">✓</span>}
            </div>
            <span className="settings-theme-nazev">Výchozí</span>
            <span className="settings-theme-popis">Barva prstenu podle jména</span>
          </button>

          {AVATAR_FRAMES.map((ramecek) => {
            const zamceno = ramecek.vip && !smiPremium
            const aktivni = ramecek.id === profile.frameId

            return (
              <button
                key={ramecek.id}
                className={`settings-theme-card ${aktivni ? 'is-aktivni' : ''} ${zamceno ? 'je-zamceno' : ''}`}
                onClick={() => vybratRamecek(ramecek.id, ramecek.vip, ramecek.nazev)}
              >
                <div
                  className="settings-ramecek-nahled"
                  style={{ background: `conic-gradient(from 0deg, ${ramecek.a}, ${ramecek.b}, ${ramecek.a})` }}
                >
                  {ramecek.vip && <span className="settings-theme-vip">{zamceno ? '🔒' : '👑'} VIP</span>}
                  {aktivni && <span className="settings-theme-check">✓</span>}
                </div>
                <span className="settings-theme-nazev">{ramecek.nazev}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Zabezpečení */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon purple" aria-hidden="true">🛡️</span>
          <div>
            <h2 className="settings-card-title">Zabezpečení</h2>
            <p className="settings-card-sub">Přihlášení a ochrana účtu</p>
          </div>
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-text">
            <span className="settings-toggle-title">Biometrické přihlášení</span>
            <span className="settings-toggle-sub">
              Otisk prstu nebo Face ID zamkne appku na tomhle zařízení
            </span>
          </div>
          <button
            className={`settings-switch ${profile.security.biometrics ? 'on' : ''}`}
            role="switch"
            aria-checked={profile.security.biometrics}
            aria-label="Biometrické přihlášení"
            disabled={biometrieProbiha}
            onClick={async () => {
              // Vypnutí nepotřebuje žádné ověření — appka WebAuthn credential
              // z JS smazat neumí (rozhraní to nenabízí), jen si přestane
              // pamatovat jeho id, takže se appka na něj přestane ptát.
              if (profile.security.biometrics) {
                updateSecurity({ biometrics: false, biometricCredentialId: undefined })
                showToast('Biometrie vypnuta')
                return
              }

              setBiometrieProbiha(true)
              const dostupna = await jeBiometrieDostupna()
              if (!dostupna) {
                setBiometrieProbiha(false)
                showToast('Tohle zařízení nebo prohlížeč biometrii nepodporuje.')
                return
              }

              const credentialId = await zaregistrujBiometrii(profile.name)
              setBiometrieProbiha(false)

              if (!credentialId) {
                showToast('Nepovedlo se to. Zkus to znovu.')
                return
              }

              updateSecurity({ biometrics: true, biometricCredentialId: credentialId })
              showToast('Biometrie zapnuta ✓')
            }}
          >
            <span className="settings-switch-knob" />
          </button>
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-text">
            <span className="settings-toggle-title">Upozornění na přihlášení</span>
            <span className="settings-toggle-sub">Dát vědět o novém přihlášení</span>
          </div>
          <button
            className={`settings-switch ${profile.security.loginAlerts ? 'on' : ''}`}
            role="switch"
            aria-checked={profile.security.loginAlerts}
            aria-label="Upozornění na přihlášení"
            onClick={() => {
              const zapnuto = !profile.security.loginAlerts
              updateSecurity({ loginAlerts: zapnuto })
              showToast(zapnuto ? 'Upozornění zapnuta' : 'Upozornění vypnuta')
            }}
          >
            <span className="settings-switch-knob" />
          </button>
        </div>

        {/* Nedávná přihlášení — dává přepínači výš vidět obsah, ne jen
            samotný spínač. core/security/loginDevices.ts's login_devices,
            nahlašuje se sama appka při startu (startLoginNotify), tenhle
            seznam tu jen čte, co tam už je. */}
        {zarizeni.length > 0 && (
          <div className="settings-zarizeni">
            <span className="settings-zarizeni-label">NEDÁVNÁ PŘIHLÁŠENÍ</span>
            {zarizeni.map((z) => (
              <div key={z.deviceId} className="settings-zarizeni-radek">
                <span>{z.popis}</span>
                <span className="settings-zarizeni-cas">
                  {new Date(z.posledniAt).toLocaleString('cs-CZ', {
                    day: 'numeric',
                    month: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))}
          </div>
        )}

        <button className="settings-danger-btn" onClick={handleResetProfile}>
          🗑️ Vrátit profil do výchozího stavu
        </button>
      </section>

      {/* Soukromí — přepínač veřejný/soukromý účet. U veřejného se
          sledování stane rovnou (bez potvrzení), u soukromého čeká na
          schválení a příspěvky vidí jen schválení sledující. Plain
          sloupec profiles.soukromy (social/api.ts), žádná zvláštní
          databázová funkce — stejné právo jako na jméno/motto.
          Skrýt online stav (profiles.skryt_online) je druhý přepínač
          ve stejné kartě — obojí je "co o mně ostatní vidí", stejné
          téma, jedna karta. */}
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon purple" aria-hidden="true">🔒</span>
          <div>
            <h2 className="settings-card-title">Soukromí</h2>
            <p className="settings-card-sub">Kdo tě může sledovat a vidět tvoje příspěvky</p>
          </div>
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-text">
            <span className="settings-toggle-title">Soukromý účet</span>
            <span className="settings-toggle-sub">
              Nové sledování musí schválit — příspěvky uvidí jen schválení sledující
            </span>
          </div>
          <button
            className={`settings-switch ${soukromy ? 'on' : ''}`}
            role="switch"
            aria-checked={soukromy}
            aria-label="Soukromý účet"
            disabled={meniSoukromi}
            onClick={async () => {
              setMeniSoukromi(true)
              const nove = !soukromy
              const vysledek = await api.nastavSoukromy(nove)
              if (vysledek.ok) {
                setSoukromy(nove)
                showToast(nove ? 'Účet je teď soukromý' : 'Účet je teď veřejný')
              } else {
                showToast(vysledek.chyba ?? 'Nepovedlo se to.')
              }
              setMeniSoukromi(false)
            }}
          >
            <span className="settings-switch-knob" />
          </button>
        </div>

        <div className="settings-toggle-row">
          <div className="settings-toggle-text">
            <span className="settings-toggle-title">Skrýt online stav</span>
            <span className="settings-toggle-sub">
              Přátelé neuvidí zelenou tečku, že máš appku zrovna otevřenou
            </span>
          </div>
          <button
            className={`settings-switch ${skrytOnline ? 'on' : ''}`}
            role="switch"
            aria-checked={skrytOnline}
            aria-label="Skrýt online stav"
            disabled={meniSkrytOnline}
            onClick={async () => {
              setMeniSkrytOnline(true)
              const nove = !skrytOnline
              const vysledek = await api.nastavSkrytOnline(nove)
              if (vysledek.ok) {
                setSkrytOnline(nove)
                showToast(nove ? 'Online stav je teď skrytý' : 'Online stav je teď vidět přátelům')
              } else {
                showToast(vysledek.chyba ?? 'Nepovedlo se to.')
              }
              setMeniSkrytOnline(false)
            }}
          >
            <span className="settings-switch-knob" />
          </button>
        </div>
      </section>

      {/* Synchronizace a Verze aplikace — přesunuté sem z Profilu spolu se
          zbytkem menu nastavení (Osobní informace/Zabezpečení/Vzhled
          aplikace tam byly jen odkazy sem, takže zmizely beze zbytku —
          duplikovat kartu, která už na týhle stránce existuje, nemá
          smysl). Na rozdíl od těch tří tahle dvě řešila něco skutečného
          přímo na místě (stav cloudu, kontrola aktualizací), proto sem
          šly jako plnohodnotné karty, ne jen coby smazaný odkaz. */}
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

      {toast && <div className="settings-toast">{toast}</div>}
    </div>
  )
}

export default SettingsModule
