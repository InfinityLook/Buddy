import { assetUrl } from '../assetUrl'
import { Zbran, ZBRANE } from '../combat/weapons'
import React from 'react'
import { MaskotDef } from '../types'
import { BossDef } from '../data/bossove'
import { BuddyWorldHud } from '../scene/useBuddyWorldScene'
import { obrazekKonceptu } from '../data/koncept'
import { SurfaceThemeScope } from '@/features/appearance/SurfaceAppearance'

// ==========================================
// 2D HUD přes 3D scénu — hráčovo HP/XP/level, útočné a obranné
// tlačítko a HP toho, co je právě "ve hledáčku" (nejbližší běžný
// nepřítel, nebo boss, pokud s ním souboj probíhá). Tahle komponenta
// nic nekreslí uvnitř Threejs, je to plain React/DOM přes scénu —
// stejná konvence jako Survival Nightovo HUD.tsx.
//
// Druhé pokračování vývoje (druhý typ nepřítele, boss, obrana) tuhle
// komponentu přepsalo z appčina původního jediného `nepritelDef`
// prop na čtení `hud.nepritelFocus`/`hud.bossFocus` — appka tím
// nikdy neukáže víc než jednu HP lištu najednou (bossí a běžná se
// navzájem vylučují, viz useBuddyWorldScene.ts's komentář u
// BuddyWorldHud), a boss tak dostane svou vlastní, odlišně
// zbarvenou lištu a jméno namísto sdílení appčiny obyčejné.
//
// Útočné/obranné tlačítko a portréty appka zkusí vykreslit z
// BuddyWorld_ArtPack.zip (data/koncept.ts) — appka se vždycky umí
// vrátit ke svému dřívějšímu emoji, pokud daný obrázek nenajde.
//
// Třetí pokračování vývoje (Fáze 0+1, BuddyWorld_Complete_Project_
// Pack.zip) sem přidalo poslední blok, dev diagnostický přehled —
// ten se zobrazí jen v dev buildu (import.meta.env.DEV), nikdy v
// produkci (viz useBuddyWorldScene.ts's BuddyWorldDiagnostika).
// ==========================================

const UTOK_IKONA = obrazekKonceptu('ui.ikona.utok')
const OBRANA_IKONA = obrazekKonceptu('ui.ikona.obrana')

interface Props {
  hud: BuddyWorldHud
  maskot: MaskotDef
  bossDef: BossDef
  vybranaZbran: Zbran
  onZvolZbran: (zbran: Zbran) => void
  onUtocit: () => void
  onObranit: () => void
  onVyzvatBosse: () => void
  onZpet: () => void
  onZkusitZnovu: () => void
}

export const HUD: React.FC<Props> = ({ hud, maskot, bossDef, vybranaZbran, onZvolZbran, onUtocit, onObranit, onVyzvatBosse, onZpet, onZkusitZnovu }) => {
  const hpProcenta = Math.max(0, Math.min(100, (hud.hrac.hp / hud.hrac.maxHp) * 100))
  const xpProcenta = Math.max(0, Math.min(100, (hud.hrac.xp / hud.xpProDalsiUroven) * 100))

  const nepritelFocus = hud.nepritelFocus
  const nepritelProcenta = nepritelFocus ? Math.max(0, Math.min(100, (nepritelFocus.hp / nepritelFocus.maxHp) * 100)) : 0
  const nepritelIlustrace = nepritelFocus ? obrazekKonceptu(`nepritel.${nepritelFocus.def.id}`) : null

  const bossFocus = hud.bossFocus
  const bossProcenta = bossFocus ? Math.max(0, Math.min(100, (bossFocus.hp / bossFocus.maxHp) * 100)) : 0
  const bossIlustrace = obrazekKonceptu(`nepritel.${bossDef.id}`)

  return (
    // Buddy v2 (viz CLAUDE.md "Vzhled aplikace") — "view" podobrazovka se
    // zděděným themeParent: 'buddyworld-entry' (viz themeCatalog.ts),
    // stejný už zavedený vzor jako admin.tsx's sedm panelů a
    // SkolaStatistiky.tsx/SkolaUpozorneni.tsx: appka ji obaluje jen do
    // <SurfaceThemeScope>, žádný <SurfaceBackdrop> ani ruční
    // rootAttributes. Tenhle 2D HUD overlay (stav zdraví/XP/zbraně,
    // tlačítka útoku/obrany) se kreslí nad opravdovou appčinou 3D
    // scénou (useBuddyWorldScene.ts), ne nad plochou katalogovou
    // fotkou — motiv proto správně zdědí od svého rodiče 'buddyworld-entry'.
    <SurfaceThemeScope surfaceId="buddyworld-hud">
    <div className="bw-hud">
      <div className="bw-hud-horni">
        <div className="bw-hud-hrac">
          <div className="bw-hud-radek">
            <span className="bw-hud-level">Lv {hud.hrac.level}</span>
            <div className="bw-hud-bar bw-hud-bar--hp">
              <div className="bw-hud-bar-vypln" style={{ width: `${hpProcenta}%` }} />
              <span className="bw-hud-bar-text">
                {Math.ceil(hud.hrac.hp)} / {hud.hrac.maxHp} HP
              </span>
            </div>
          </div>
          <div className="bw-hud-bar bw-hud-bar--xp">
            <div className="bw-hud-bar-vypln" style={{ width: `${xpProcenta}%` }} />
            <span className="bw-hud-bar-text">
              {hud.hrac.xp} / {hud.xpProDalsiUroven} XP
            </span>
          </div>
        </div>

        <button type="button" className="bw-hud-zpet" onClick={onZpet} aria-label="Zpět do Hubu">
          ✕
        </button>
      </div>

      {bossFocus ? (
        <div className={`bw-hud-boss${bossFocus.zuri ? ' bw-hud-boss--zuri' : ''}`}>
          <span className="bw-hud-boss-jmeno">
            {bossIlustrace ? (
              <img src={assetUrl(bossIlustrace)} alt="" className="bw-hud-boss-portret" />
            ) : (
              <span aria-hidden="true">{bossDef.ikona} </span>
            )}
            {bossDef.jmeno}
            {bossFocus.zuri && <span className="bw-hud-boss-znacka"> ⚡ ZUŘÍ</span>}
          </span>
          <div className="bw-hud-bar bw-hud-bar--boss">
            <div className="bw-hud-bar-vypln" style={{ width: `${bossProcenta}%` }} />
          </div>
        </div>
      ) : (
        nepritelFocus && (
          <div className="bw-hud-nepritel">
            <span className="bw-hud-nepritel-jmeno">
              {nepritelIlustrace ? (
                <img src={assetUrl(nepritelIlustrace)} alt="" className="bw-hud-nepritel-portret" />
              ) : (
                <span aria-hidden="true">{nepritelFocus.def.ikona} </span>
              )}
              {nepritelFocus.def.jmeno}
            </span>
            <div className="bw-hud-bar bw-hud-bar--nepritel">
              <div className="bw-hud-bar-vypln" style={{ width: `${nepritelProcenta}%` }} />
            </div>
          </div>
        )
      )}

      {hud.muzeVyzvatBosse && (
        <button type="button" className="bw-hud-vyzvat" onClick={onVyzvatBosse}>
          <span aria-hidden="true">{bossDef.ikona}</span> Vyzvat {bossDef.jmeno}
        </button>
      )}

      <div className="bw-hud-maskot" aria-hidden="true">
        <span className="bw-hud-maskot-ikona" style={{ color: maskot.barvaJadro }}>
          {maskot.ikona}
        </span>
        <span className="bw-hud-maskot-jmeno">{maskot.jmeno}</span>
      </div>

      <div className="bw-zbrane" role="group" aria-label="Výběr zbraně">
        {Object.values(ZBRANE).map((z) => (
          <button key={z.id} type="button" onClick={() => onZvolZbran(z.id)}
            disabled={hud.hrac.level < z.minLevel} aria-pressed={vybranaZbran === z.id}
            title={`${z.nazev} – dosah ${z.dosah} m, úroveň ${z.minLevel}`}>
            {z.id === 'mec' ? '⚔️' : z.id === 'luk' ? '🏹' : '🪄'} {z.nazev}{hud.hrac.level < z.minLevel ? ` (Lv ${z.minLevel})` : ''}
          </button>
        ))}
      </div>
      <div className="bw-hud-spodni">
        <button
          type="button"
          className={`bw-hud-obrana${hud.obranaAktivni ? ' bw-hud-obrana--aktivni' : ''}`}
          onClick={onObranit}
          disabled={!hud.obranaPripravena}
          aria-label="Obrana"
        >
          {OBRANA_IKONA ? (
            <img src={assetUrl(OBRANA_IKONA)} alt="" className="bw-hud-obrana-ikona" />
          ) : (
            <span aria-hidden="true">🛡️</span>
          )}
          <span className="bw-hud-obrana-text">Obrana</span>
        </button>

        <button
          type="button"
          className={`bw-hud-utok${hud.utokPripraven ? ' bw-hud-utok--pripraven' : ''}`}
          onClick={onUtocit}
          disabled={!hud.utokPripraven}
        >
          {UTOK_IKONA ? (
            <img src={assetUrl(UTOK_IKONA)} alt="" className="bw-hud-utok-ikona" />
          ) : (
            <span aria-hidden="true">⚔️</span>
          )}
          <span className="bw-hud-utok-text">Útok</span>
        </button>
      </div>

      {hud.mrtvyHrac && (
        <div className="bw-hud-smrt">
          <div className="bw-hud-smrt-karta">
            <p className="bw-hud-smrt-text">Poraženo…</p>
            <button type="button" className="bw-hud-smrt-btn" onClick={onZkusitZnovu}>
              Zkusit znovu
            </button>
          </div>
        </div>
      )}

      {import.meta.env.DEV && hud.diagnostika && (
        <div className="bw-hud-diag" aria-hidden="true">
          <p className="bw-hud-diag-nadpis">🛠 Dev diagnostika (Fáze 0+1)</p>
          <p>
            Plátno: {hud.diagnostika.sirkaPlatna}×{hud.diagnostika.vyskaPlatna}px · {hud.diagnostika.fps} FPS
          </p>
          <p>
            Dekorace: {hud.diagnostika.pocetDekoraciStromy} stromů, {hud.diagnostika.pocetDekoraciKameny} kamenů
          </p>
          <ul className="bw-hud-diag-assety">
            {Object.entries(hud.diagnostika.stavAssetu).map(([klic, stav]) => (
              <li key={klic} className={`bw-hud-diag-asset bw-hud-diag-asset--${stav}`}>
                {klic}: {stav === 'nahravaji' ? '…nahrává se' : stav === 'ok' ? '✓ GLB OK' : '✗ fallback'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </SurfaceThemeScope>
  )
}
