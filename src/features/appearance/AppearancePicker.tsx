import { useEffect, useId, useState } from 'react'
import { DEFAULT_BUDDY_THEME, SURFACE_IDS, SURFACES, THEME_FAMILIES, THEME_IDS, type BuddyThemeId, type SurfaceId } from './themeCatalog'
import { SurfaceThemeIcon, themeAssetUrl } from './SurfaceAppearance'
import { useAppearanceStore } from './useAppearanceStore'
import './appearance-picker.css'

type Target = 'all' | SurfaceId
type Draft = BuddyThemeId | 'inherit'

interface AppearancePickerProps {
  availablePermissions?: readonly string[]
  /**
   * Buddy v2 integrace, krok "Profil a Achievementy": katalog motivů popisuje 72 obrazovek,
   * ale jen pár jich je k tomuto kroku skutečně napojeno (má buddy-theme-scope + SurfaceBackdrop).
   * Když je tahle vlastnost zadaná, nabídka "Kde změnit vzhled" se omezí jen na tyto id,
   * ať appka nepředstírá, že jde přepnout obrazovku, která to ještě neumí.
   * Bez vlastnosti se appka chová přesně jako původní balíček (nic se neomezuje navíc).
   */
  wiredSurfaceIds?: readonly SurfaceId[]
}

/** Insert this section into Settings > Vzhled. No new route or application data required. */
export function AppearancePicker({ availablePermissions = [], wiredSurfaceIds }: AppearancePickerProps) {
  const uid = useId()
  const [target, setTarget] = useState<Target>('all')
  const global = useAppearanceStore((s) => s.globalThemeId)
  const overrides = useAppearanceStore((s) => s.surfaceOverrides)
  const sceneryOverrides = useAppearanceStore((s) => s.sceneryOverrides)
  const setGlobal = useAppearanceStore((s) => s.setGlobalTheme)
  const setSurface = useAppearanceStore((s) => s.setSurfaceTheme)
  const setScenery = useAppearanceStore((s) => s.setSurfaceScenery)
  const saved: Draft = target === 'all' ? global : (overrides[target] ?? 'inherit')
  const savedScenery = target === 'all' ? false : (sceneryOverrides[target] ?? SURFACES[target].defaultScenery)
  const [draft, setDraft] = useState<Draft>(saved)
  const [scenery, setSceneryDraft] = useState(savedScenery)
  const [status, setStatus] = useState('')
  const visibleSurfaces = SURFACE_IDS.filter((id) => SURFACES[id].customizable &&
    (SURFACES[id].permission === null || availablePermissions.includes(SURFACES[id].permission)) &&
    (!wiredSurfaceIds || wiredSurfaceIds.includes(id)))
  useEffect(() => { setDraft(saved); setSceneryDraft(savedScenery) }, [target, saved, savedScenery])
  useEffect(() => { setStatus('') }, [target])
  const previewId = draft === 'inherit' ? global : draft
  const preview = THEME_FAMILIES[previewId] ?? THEME_FAMILIES[DEFAULT_BUDDY_THEME]
  const changed = draft !== saved || (target !== 'all' && scenery !== savedScenery)
  return (
    <section className="buddy-appearance-picker buddy-theme-scope" data-buddy-theme={previewId} aria-labelledby={`${uid}-title`}>
      <div className="buddy-appearance-heading"><h2 id={`${uid}-title`}>Vzhled Buddyho</h2><span>Pozadí, barvy a ikony</span></div>
      <label className="buddy-appearance-target" htmlFor={`${uid}-target`}>Kde změnit vzhled
        <select id={`${uid}-target`} value={target} onChange={(e) => setTarget(e.target.value as Target)}>
          <option value="all">Společný motiv</option>
          <optgroup label="Hlavní moduly">{visibleSurfaces.filter((id) => SURFACES[id].kind !== 'room' && SURFACES[id].kind !== 'app').map((id) => <option key={id} value={id}>{SURFACES[id].name}</option>)}</optgroup>
          <optgroup label="Místnosti">{visibleSurfaces.filter((id) => SURFACES[id].kind === 'room').map((id) => <option key={id} value={id}>{SURFACES[id].name}</option>)}</optgroup>
          <optgroup label="Aplikace">{visibleSurfaces.filter((id) => SURFACES[id].kind === 'app').map((id) => <option key={id} value={id}>{SURFACES[id].name}</option>)}</optgroup>
        </select>
      </label>
      <p>Společný motiv platí pro obrazovky bez vlastního nastavení. Funkce a tvoje data zůstávají stejné.</p>
      <fieldset className="buddy-appearance-grid">
        <legend className="buddy-appearance-sr-only">Vyber motiv</legend>
        {target !== 'all' && <label className="buddy-appearance-option buddy-appearance-inherit" data-selected={draft === 'inherit'}>
          <input type="radio" name={`${uid}-theme`} checked={draft === 'inherit'} onChange={() => setDraft('inherit')} />
          <strong>Podle společného motivu</strong><span>{THEME_FAMILIES[global].name}</span>
        </label>}
        {THEME_IDS.map((id) => <label key={id} className="buddy-appearance-option" data-selected={draft === id}>
          <input type="radio" name={`${uid}-theme`} checked={draft === id} onChange={() => { setDraft(id); setStatus('') }} />
          <img src={themeAssetUrl(THEME_FAMILIES[id].assets.preview)} alt="" loading="lazy" width={240} height={300} />
          <strong>{THEME_FAMILIES[id].name}</strong><span>{THEME_FAMILIES[id].description}</span>
        </label>)}
      </fieldset>
      <div className="buddy-appearance-detail">
        {target !== 'all' && <SurfaceThemeIcon surfaceId={target} themeId={previewId} tile size={80} />}
        <div><h3>{preview.name}</h3><p>{target === 'all' ? 'Pro všechny obrazovky bez vlastního motivu.' : SURFACES[target].name}</p></div>
      </div>
      {target !== 'all' && <label className="buddy-appearance-scenery"><input type="checkbox" checked={scenery} onChange={(e) => setSceneryDraft(e.target.checked)} /> Scénické pozadí z Hubu</label>}
      <div className="buddy-appearance-actions">
        <button type="button" className="buddy-appearance-apply" disabled={!changed} onClick={() => {
          if (target === 'all' && draft !== 'inherit') setGlobal(draft)
          else if (target !== 'all') { setSurface(target, draft === 'inherit' ? null : draft); setScenery(target, scenery) }
          setStatus(`Motiv ${preview.name} je uložený.`)
        }}>Použít motiv</button>
        <button type="button" disabled={!changed} onClick={() => { setDraft(saved); setSceneryDraft(savedScenery); setStatus('Změny byly zrušeny.') }}>Zrušit změny</button>
      </div>
      <p role="status" aria-live="polite">{status}</p>
    </section>
  )
}
