import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BuddyPage } from '@/components/buddy-ui/BuddyPage'
import { BuddyConfirm, type BuddyConfirmation } from '@/components/buddy-ui/BuddyConfirm'
import { useAuthStore } from '@/core/store/useAuthStore'
import { useHasPermission } from '@/core/role'
import { useCloudStatus, syncNow } from '@/core/supabase/cloudSync'
import { flushVsechnySynchronizace } from '@/core/supabase/flushAllSync'
import { signOut } from '@/core/supabase/auth'
import { APP_VERSION, applyUpdateNow, checkForUpdates, hasNewerVersion } from '@/core/utils/registerSW'
import { exportFullBackupWithFiles, importZipBackup, jeZipZaloha, restoreFilesFromZip } from '@/core/utils/fileBackup'
import { importDataFromJson, restoreFullBackup } from '@/core/utils/backup'
import {
  SNAPSHOT_SOURCE_LABEL, SnapshotInfo, autoSnapshotIfDue, deleteSnapshot,
  formatSnapshotDate, formatSnapshotSize, getSnapshot, listSnapshots, saveSnapshot,
} from '@/core/utils/backupHistory'
import { OsobniUdajeSekce } from './components/OsobniUdajeSekce'
import { ZabezpeceniSekce } from './components/ZabezpeceniSekce'
import { SoukromiSocialSekce } from './components/SoukromiSocialSekce'
import { VzhledARamecekSekce } from './components/VzhledARamecekSekce'
import { ZvukSekce } from './components/ZvukSekce'
import { JazykSekce } from './components/JazykSekce'
import { ZakladniNastaveniSekce } from './components/ZakladniNastaveniSekce'
import { SurfaceThemeScope } from '@/features/appearance/SurfaceAppearance'
import type { SurfaceId } from '@/features/appearance/themeCatalog'
import './SettingsModule.css'

export type Sekce =
  | 'osobni' | 'zabezpeceni' | 'soukromi' | 'synchronizace'
  | 'vzhled' | 'motivy' | 'ramecky' | 'zvuk' | 'jazyk'
  | 'funkce' | 'moduly' | 'oznameni' | 'vychozi' | 'smazat-profil'
  | 'zalohovani' | 'obnoveni' | 'uloziste' | 'aktualizace' | 'informace'
  | 'napoveda' | 'podpora' | 'problem' | 'administrace'

interface MenuPolozka { id: Sekce; ikona: string; barva: string; nazev: string; popis: string }
interface MenuSkupina { skupinaNazev: string; polozky: MenuPolozka[] }
const polozka = (id: Sekce, ikona: string, nazev: string, popis: string, barva = 'blue'): MenuPolozka => ({ id, ikona, nazev, popis, barva })

const MENU_SKUPINY: MenuSkupina[] = [
  { skupinaNazev: 'Můj účet', polozky: [
    polozka('osobni', '👤', 'Osobní údaje', 'Jméno, e-mail a informace na profilu'),
    polozka('zabezpeceni', '🛡️', 'Zabezpečení', 'Přihlášení a ochrana účtu', 'purple'),
    polozka('soukromi', '🔒', 'Soukromí', 'Viditelnost profilu a sociální nastavení', 'purple'),
    polozka('synchronizace', '☁️', 'Synchronizace', 'Stav cloudu a ruční synchronizace'),
  ] },
  { skupinaNazev: 'Přizpůsobení', polozky: [
    polozka('vzhled', '🎨', 'Vzhled aplikace', 'Barevné nastavení aplikace', 'purple'),
    polozka('motivy', '🪄', 'Motivy', 'Motivy jednotlivých obrazovek', 'gradient'),
    polozka('ramecky', '🖼️', 'Rámečky', 'Vzhled rámečku avatáru', 'purple'),
    polozka('zvuk', '🔊', 'Zvuk', 'Hlasitost aplikace a jednotlivých částí'),
    polozka('jazyk', '🇨🇿', 'Jazyk', 'Jazyk aplikace'),
  ] },
  { skupinaNazev: 'Správa Buddy', polozky: [
    polozka('funkce', '🧩', 'Správa funkcí', 'Nastavení dostupných funkcí'),
    polozka('moduly', '📦', 'Aktivní moduly', 'Přehled zapnutých modulů'),
    polozka('oznameni', '🔔', 'Oznámení', 'Nastavení upozornění'),
    polozka('vychozi', '⚙️', 'Výchozí nastavení', 'Obnovení výchozích preferencí'),
    polozka('smazat-profil', '🗑️', 'Smazat profil', 'Tato funkce zatím není dostupná', 'red'),
  ] },
  { skupinaNazev: 'Data a systém', polozky: [
    polozka('zalohovani', '💾', 'Zálohování', 'Stáhnout zálohu dat i souborů'),
    polozka('obnoveni', '📥', 'Obnovení dat', 'Obnovit data ze záložního souboru'),
    polozka('uloziste', '🗄️', 'Úložiště', 'Informace o místním úložišti'),
    polozka('aktualizace', '🔄', 'Aktualizace', 'Verze aplikace a kontrola aktualizací', 'purple'),
    polozka('informace', 'ℹ️', 'Informace o aplikaci', 'Verze a základní informace o Buddym'),
  ] },
  { skupinaNazev: 'Podpora', polozky: [
    polozka('napoveda', '❓', 'Nápověda', 'Jak Buddyho používat'),
    polozka('podpora', '💬', 'Kontakt na podporu', 'Napiš nám svůj dotaz'),
    polozka('problem', '🚩', 'Nahlásit problém', 'Pomoz nám opravit potíže'),
  ] },
]

const POVRCHY: Partial<Record<Sekce, SurfaceId>> = {
  osobni: 'settings-personal', zabezpeceni: 'settings-security', soukromi: 'settings-privacy',
  vzhled: 'settings-appearance', motivy: 'settings-appearance', ramecky: 'settings-appearance',
  zvuk: 'settings-sound', jazyk: 'settings-language',
}
const NADPISY: Record<Sekce, string> = {
  osobni: 'Osobní údaje', zabezpeceni: 'Zabezpečení', soukromi: 'Soukromí', synchronizace: 'Synchronizace',
  vzhled: 'Vzhled aplikace', motivy: 'Motivy', ramecky: 'Rámečky', zvuk: 'Zvuk', jazyk: 'Jazyk',
  funkce: 'Správa funkcí', moduly: 'Aktivní moduly', oznameni: 'Oznámení', vychozi: 'Výchozí nastavení',
  'smazat-profil': 'Smazat profil', zalohovani: 'Zálohování', obnoveni: 'Obnovení dat', uloziste: 'Úložiště',
  aktualizace: 'Aktualizace', informace: 'Informace o aplikaci', napoveda: 'Nápověda', podpora: 'Kontakt na podporu',
  problem: 'Nahlásit problém', administrace: 'Administrace',
}
const CLOUD_LABELS: Record<string, string> = {
  off: 'Cloud není nastavený — data zůstávají jen v tomhle zařízení', connecting: 'Připojuji…',
  synced: 'XP a odznaky zálohované v cloudu', offline: 'Offline — odešle se, až bude signál',
  error: 'Synchronizace se nepovedla, můžeš zkusit nový pokus',
}

export const SettingsModule: React.FC = () => {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const smiAdmin = useHasPermission('admin.panel')
  const smiModerovat = useHasPermission('moderation.content')
  const cloudStatus = useCloudStatus((state) => state.status)
  const cloudError = useCloudStatus((state) => state.error)
  const [sekce, setSekce] = useState<Sekce | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [updateChecking, setUpdateChecking] = useState(false)
  const [odhlasujiSe, setOdhlasujiSe] = useState(false)
  const [confirmation, setConfirmation] = useState<BuddyConfirmation | null>(null)
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([])
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void autoSnapshotIfDue().then(() => listSnapshots().then(setSnapshots))
  }, [])
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(null), 2600) }
  const handleLogout = async () => {
    if (odhlasujiSe) return
    setOdhlasujiSe(true)
    showToast('Odesílám poslední změny…')
    await flushVsechnySynchronizace()
    void signOut()
    logout()
    navigate('/')
  }
  const handleCheckUpdates = async () => {
    if (updateChecking) return
    if (!navigator.onLine) { showToast('Jsi offline — aktualizace zkusím později'); return }
    setUpdateChecking(true)
    showToast('Kontroluji aktualizace…')
    try {
      if (await hasNewerVersion()) { showToast('Nová verze nalezena, načítám ji…'); await applyUpdateNow(); return }
      await checkForUpdates()
      showToast(`Máš nejnovější verzi (${APP_VERSION}) ✓`)
    } catch { showToast('Kontrolu se nepodařilo dokončit') }
    finally { setUpdateChecking(false) }
  }
  const exportBackup = async () => {
    const ok = await exportFullBackupWithFiles()
    if (ok) { await saveSnapshot('manual'); setSnapshots(await listSnapshots()) }
    showToast(ok ? 'Záloha všech dat (i souborů) byla stažena.' : 'Zálohu se nepodařilo vytvořit.')
  }
  const importBackup = async (file: File) => {
    try {
      const zip = jeZipZaloha(file)
      const { envelope, soubory } = zip
        ? await importZipBackup(file)
        : { envelope: await importDataFromJson<unknown>(file), soubory: new Map<string, Blob>() }
      if (!await saveSnapshot('before-restore')) { showToast('Současná data se nepodařilo zálohovat. Obnova se neprovedla.'); return }
      const result = await restoreFullBackup(envelope)
      if (!result.success) { showToast(result.error ?? 'Soubor není platná záloha.'); return }
      if (!result.legacy) await saveSnapshot('file', envelope as never)
      const obnovenoSouboru = soubory.size ? await restoreFilesFromZip(soubory, envelope) : 0
      showToast(result.legacy
        ? 'Obnoveno ze starší zálohy. Načítám znovu…'
        : `Záloha obnovena (${result.restored.length} částí${obnovenoSouboru ? `, ${obnovenoSouboru} souborů` : ''}). Načítám znovu…`)
      window.setTimeout(() => window.location.reload(), 1200)
    } catch { showToast('Soubor není platná záloha.') }
  }
  const restoreSnapshot = async (info: SnapshotInfo) => {
    const snapshot = await getSnapshot(info.id)
    if (!snapshot) { showToast('Tuhle zálohu se nepodařilo načíst.'); return }
    if (!await saveSnapshot('before-restore')) { showToast('Současná data se nepodařilo zálohovat. Obnova se neprovedla.'); return }
    const result = await restoreFullBackup(snapshot.payload)
    if (!result.success) { showToast(result.error ?? 'Zálohu se nepodařilo obnovit.'); return }
    showToast(`Obnoveno ze zálohy z ${formatSnapshotDate(info.createdAt)}. Načítám znovu…`)
    window.setTimeout(() => window.location.reload(), 1200)
  }
  const otevri = (id: Sekce) => {
    if (id === 'napoveda') { navigate('/navod'); return }
    if (id === 'podpora' || id === 'problem') { navigate('/podpora'); return }
    if (id === 'administrace') { navigate('/admin'); return }
    setSekce(id)
  }

  if (sekce) {
    const surfaceId = POVRCHY[sekce] ?? 'settings'
    return (
      <BuddyPage className="settings-page" surfaceId={surfaceId} title={NADPISY[sekce]} backLabel="Zpět do nastavení" onBack={() => setSekce(null)}>
        {sekce === 'osobni' && <OsobniUdajeSekce onToast={showToast} />}
        {sekce === 'zabezpeceni' && <ZabezpeceniSekce onToast={showToast} />}
        {sekce === 'soukromi' && <SoukromiSocialSekce onToast={showToast} />}
        {sekce === 'zvuk' && <ZvukSekce />}
        {sekce === 'jazyk' && <JazykSekce onToast={showToast} />}
        {(sekce === 'vzhled' || sekce === 'motivy' || sekce === 'ramecky') && <VzhledARamecekSekce onToast={showToast} />}
        {sekce === 'synchronizace' && (
          <section className="settings-card">
            <div className="settings-card-head"><span className="settings-card-icon blue" aria-hidden="true">☁️</span><div>
              <h2 className="settings-card-title">Stav synchronizace <span className={`settings-cloud-dot is-${cloudStatus}`} aria-hidden="true" /></h2>
              <p className="settings-card-sub">{CLOUD_LABELS[cloudStatus] ?? CLOUD_LABELS.off}</p>
              {cloudStatus === 'error' && cloudError && <p className="settings-error-detail">{cloudError}</p>}
            </div></div>
            <button className="settings-save-btn" onClick={() => { void syncNow() }}>Zkusit synchronizaci znovu</button>
          </section>
        )}
        {(sekce === 'zalohovani' || sekce === 'obnoveni') && (
          <SurfaceThemeScope surfaceId="settings-backup" className="settings-sekce-wrap">
            {sekce === 'zalohovani' && <section className="settings-card">
              <p className="settings-card-sub settings-zaloha-popis">Záloha obsahuje data aplikace i soubory ze Správce souborů.</p>
              <button className="settings-save-btn" onClick={() => { void exportBackup() }}>⬇️ Stáhnout zálohu</button>
            </section>}
            <section className="settings-card">
              <p className="settings-card-sub settings-zaloha-popis">Obnova může přepsat současná data. Před obnovou se vytvoří snímek současného stavu.</p>
              <button className="settings-save-btn" onClick={() => importRef.current?.click()}>⬆️ Vybrat záložní soubor</button>
              <input ref={importRef} type="file" accept=".zip,.json,application/zip,application/json" hidden onChange={event => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ''
                if (file) setConfirmation({ title: 'Obnovit ze souboru?', description: `Soubor ${file.name} může přepsat současná data.`, confirmLabel: 'Obnovit data', action: () => importBackup(file) })
              }} />
            </section>
            {sekce === 'zalohovani' && <section className="settings-card settings-zaloha-section">
              <span className="settings-zaloha-head">Zálohy v aplikaci</span>
              {snapshots.length === 0 ? <p className="settings-zaloha-empty">Zatím tu žádná není. Aplikace si první uloží automaticky.</p> : (
                <ul className="settings-zaloha-list">{snapshots.map(snapshot => <li key={snapshot.id} className="settings-zaloha-item">
                  <button className="settings-zaloha-restore" onClick={() => setConfirmation({ title: 'Obnovit uloženou zálohu?', description: `Záloha z ${formatSnapshotDate(snapshot.createdAt)} přepíše současná data. Před obnovou se uloží snímek současného stavu.`, confirmLabel: 'Obnovit zálohu', action: () => restoreSnapshot(snapshot) })}>
                    <span className="settings-zaloha-date">{formatSnapshotDate(snapshot.createdAt)}</span><span className="settings-zaloha-meta">{SNAPSHOT_SOURCE_LABEL[snapshot.source]} · {formatSnapshotSize(snapshot.sizeBytes)}</span>
                  </button>
                  <button className="settings-zaloha-delete" aria-label={`Smazat zálohu z ${formatSnapshotDate(snapshot.createdAt)}`} onClick={() => setConfirmation({ title: 'Smazat uloženou zálohu?', description: formatSnapshotDate(snapshot.createdAt), confirmLabel: 'Smazat zálohu', danger: true, action: async () => { await deleteSnapshot(snapshot.id); setSnapshots(await listSnapshots()) } })}>✕</button>
                </li>)}</ul>
              )}
            </section>}
          </SurfaceThemeScope>
        )}
        {sekce === 'aktualizace' && <section className="settings-card">
          <div className="settings-card-head"><span className="settings-card-icon purple" aria-hidden="true">🔄</span><div><h2 className="settings-card-title">Buddy {APP_VERSION}</h2><p className="settings-card-sub">{updateChecking ? 'Kontroluji…' : 'Aplikace se aktualizuje automaticky.'}</p></div></div>
          <button className="settings-save-btn" disabled={updateChecking} onClick={() => { void handleCheckUpdates() }}>Zkontrolovat aktualizace</button>
        </section>}
        {sekce === 'uloziste' && <ZakladniNastaveniSekce sekce="uloziste" onToast={showToast} />}
        {sekce === 'informace' && <ZakladniNastaveniSekce sekce="informace" onToast={showToast} />}
        {(['funkce', 'moduly', 'oznameni', 'vychozi', 'smazat-profil'] as Sekce[]).includes(sekce) && (
          <ZakladniNastaveniSekce sekce={sekce} onToast={showToast} />
        )}
        {sekce === 'tutorial' && <TutorialSekce />}
        {toast && <div className="settings-toast" role="status">{toast}</div>}
        {confirmation && <BuddyConfirm surfaceId="settings" confirmation={confirmation} onClose={() => setConfirmation(null)} />}
      </BuddyPage>
    )
  }

  return (
    <BuddyPage className="settings-page" surfaceId="settings" title="Nastavení" backLabel="Zpět na profil" onBack={() => navigate('/profil')}>
      {MENU_SKUPINY.map((skupina) => (
        <div key={skupina.skupinaNazev} style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-color, #94a3b8)', margin: '0 0 8px 12px', fontWeight: 600 }}>
            {skupina.skupinaNazev}
          </h3>
          {skupina.polozky.map(p => <section key={p.id} className="settings-card" style={{ marginBottom: 8 }}>
            <button type="button" className="settings-accordion-hlava" onClick={() => otevri(p.id)}>
              <span className={`settings-card-icon ${p.barva !== 'gradient' ? p.barva : ''}`} style={p.barva === 'gradient' ? { background: 'linear-gradient(135deg, #a855f7, #f5c451)' } : undefined} aria-hidden="true">{p.ikona}</span>
              <div><h2 className="settings-card-title">{p.nazev}</h2><p className="settings-card-sub">{p.popis}</p></div>
              <span className="settings-accordion-sipka" aria-hidden="true">›</span>
            </button>
          </section>)}
        </div>
      ))}
      {(smiAdmin || smiModerovat) && <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-color, #94a3b8)', margin: '0 0 8px 12px', fontWeight: 600 }}>Administrace</h3>
        <section className="settings-card"><button type="button" className="settings-accordion-hlava" onClick={() => otevri('administrace')}>
          <span className="settings-card-icon amber" aria-hidden="true">🛠️</span><div><h2 className="settings-card-title">{smiAdmin ? 'Administrace' : 'Moderace'}</h2><p className="settings-card-sub">{smiAdmin ? 'Přehled a nástroje aplikace' : 'Hlášení od uživatelů'}</p></div><span className="settings-accordion-sipka" aria-hidden="true">›</span>
        </button></section>
      </div>}
      <section className="settings-card"><button className="settings-danger-btn" disabled={odhlasujiSe} onClick={() => setConfirmation({
        title: 'Odhlásit se?', description: 'Buddy nejdřív odešle poslední změny k synchronizaci.', confirmLabel: 'Odhlásit se', action: handleLogout,
      })}>{odhlasujiSe ? 'Odesílám poslední změny…' : '🚪 Odhlásit se'}</button></section>
      {toast && <div className="settings-toast" role="status">{toast}</div>}
      {confirmation && <BuddyConfirm surfaceId="settings" confirmation={confirmation} onClose={() => setConfirmation(null)} />}
    </BuddyPage>
  )
}

export default SettingsModule
