import { OBLASTI_SVETA } from '../data/oblasti'
import { Minimapa } from './Minimapa'
import { oblastUkolu, cilNavigace, navigacniUdaje } from '../data/navigace'
import { aktivniUkol } from '../questTracker'
import { Zbran, zbranJeDostupna } from '../combat/weapons'
import { buddyElementPoskozeni } from '../combat/buddySkills'
import React, { useEffect, useState } from 'react'
import { useBuddyWorldScene } from '../scene/useBuddyWorldScene'
import { VirtualniJoystick } from '@/game/components/VirtualniJoystick'
import { HUD } from './HUD'
import { AktivniUkolHud } from './AktivniUkolHud'
import { useVillageStore } from '../useVillageStore'
import { ukolProObyvatele, stavUkolu } from '../npcQuests'
import { OsadaPanel } from './OsadaPanel'
import { MaskotDef, BuddyWorldHracStav } from '../types'
import { BossDef } from '../data/bossove'

// ==========================================
// Buddy World — "hra" obrazovka appka vytáhla do SAMOSTATNÉ komponenty
// ze stejného důvodu, co appka už jednou vyřešila u Buddyho Trhu
// (useCtyriKralovstviScene.ts/HerniDeska): useBuddyWorldScene() si
// svůj Threejs renderer/scénu/RAF smyčku postaví jen JEDNOU, uvnitř
// useEffectu s pevnou závislostí [maskot, bossDef] — a appčin
// canvas-container div (.bw-arena-canvas) existuje v DOMu jen na téhle
// obrazovce, ne na appčině dřívější obrazovce výběru maskota.
//
// Dřív appka volala useBuddyWorldScene() přímo z BuddyWorldModule.tsx,
// co je namountovaný od prvního appčina vykreslení (appčina obrazovka
// 'vyber') — appčin useEffect se tak spustil JEDNOU, s
// containerRef.current === null (appčin canvas div na 'vyber'
// obrazovce vůbec neexistuje), tiše appku vrátil (`if (!container)
// return`) a appka ho PAK UŽ NIKDY ZNOVU NESPUSTILA: appčin maskot i
// bossDef jsou appkou stabilní reference (maskotPodleId/bossPodleId
// appku vrací přímo appčin objekt z appčina modulového pole, ne nový
// klon), appka proto React effect depsů nikdy "nezmění identitu", i
// když appka obrazovku přepne na 'hra'. Výsledek na reálném appčině
// telefonu: renderer/scéna/RAF smyčka appku nikdy nevznikly, appčin
// canvas zůstal prázdný div a appka viděla jen zamrzlý, appkou
// nehýbající se obraz — appčina chyba appku nikdy neukázala v appčině
// sandboxu, protože appčina dřívější komponentová ověřovací appka
// mountovala appku už přímo na 'hra', ne přes appčin skutečný tok
// (appka mountuje nejdřív na 'vyber', appka přepne teprve po klikutí).
//
// Fix: appka tuhle komponentu namountuje poprvé přesně tehdy, kdy
// appka přepne na 'hra' — appčin canvas div v tu chvíli UŽ existuje
// (React appku připojí ref dřív, než appka spustí efekty téhož
// commitu), takže appčin useBuddyWorldScene() efekt teď poprvé běží
// se skutečným, správně rozměřeným containerem.
// ==========================================

interface Props {
  maskot: MaskotDef
  bossDef: BossDef
  pocatecniHracStav: BuddyWorldHracStav
  onZabitiNepritele: (xpOdmena: number) => void
  onZabitiBosse: (xpOdmena: number) => void
  onPostupZmena: (level: number, xp: number) => void
  onZpet: () => void
}

export const BuddyWorldHra: React.FC<Props> = ({
  maskot,
  bossDef,
  pocatecniHracStav,
  onZabitiNepritele,
  onZabitiBosse,
  onPostupZmena,
  onZpet,
}) => {
  const [vybranaZbran, setVybranaZbran] = useState<Zbran>('mec')
  const [navigaceId, setNavigaceId] = useState<string | null>(null)
  const { containerRef, selhalo, nastavJoystick, utocit, pouzijBuddySchopnost, buddySkillCooldown, zvolZbran, obranit, sebrat, postavit, presunout, potvrditStavbu, zrusitNahled, otocitNahled, nahledPlatny, vyzvatBosse, obnovitPoSmrti, hud, blizkyObyvatel, poziceHrace } = useBuddyWorldScene({
    maskot,
    bossDef,
    pocatecniHracStav,
    onZabitiNepritele,
    onZabitiBosse,
  })

  const vesnice = useVillageStore()
  const aktualniUkol = aktivniUkol(vesnice.splneneUkoly, vesnice)
  const doporucenaOblast = oblastUkolu(aktualniUkol?.ukol.id)
  const navigacniCil = cilNavigace(navigaceId)
  const navigacniStav = navigacniCil ? navigacniUdaje(poziceHrace, navigacniCil.stred) : null
  const [zpravaNpc, setZpravaNpc] = useState('')
  const ukolNpc = blizkyObyvatel ? ukolProObyvatele(blizkyObyvatel.jmeno, vesnice.splneneUkoly) : null
  const [nahledAktivni, setNahledAktivni] = useState(false)
  const [otevrenyDialog, setOtevrenyDialog] = useState<string | null>(null)

  // appka uloží appčin postup (level/XP), jakmile se doopravdy změní
  // — appčina komponenta existuje jen na téhle obrazovce, appka proto
  // nepotřebuje dřívější "if (obrazovka !== 'hra') return" appčinu
  // podmínku, appčin efekt se stejně spustí jen, dokud appka tahle
  // komponenta zůstává namountovaná.
  useEffect(() => {
    onPostupZmena(hud.hrac.level, hud.hrac.xp)
  }, [hud.hrac.level, hud.hrac.xp, onPostupZmena])

  return (
    <div className="bw-arena">
      <div className="bw-arena-canvas" ref={containerRef}>
        {selhalo && (
          <div className="bw-arena-selhalo">
            <p>3D vykreslení se na tomhle zařízení nepovedlo spustit.</p>
          </div>
        )}
      </div>

      {blizkyObyvatel && <div className="bw-npc-dialog" role="region" aria-label="Rozhovor s obyvatelem">
        <strong>{blizkyObyvatel.role} {blizkyObyvatel.jmeno}</strong>
        {otevrenyDialog === blizkyObyvatel.id && <div>
          <p>{ukolNpc ? ukolNpc.dialog : blizkyObyvatel.dialog}</p>
          {ukolNpc && <>
            <p><strong>{ukolNpc.nazev}</strong> — {ukolNpc.cil}</p>
            <p>Odměna: {ukolNpc.odmena.drevo} 🪵, {ukolNpc.odmena.kamen} 🪨, {ukolNpc.odmena.krystaly} 💎</p>
            <button type="button" disabled={stavUkolu(ukolNpc, vesnice) !== 'pripraveno'} onClick={() => {
              const ok = vesnice.prevzitOdmenu(ukolNpc.id)
              setZpravaNpc(ok ? 'Úkol dokončen, odměna připsána.' : 'Úkol zatím nelze dokončit.')
            }}>{stavUkolu(ukolNpc, vesnice) === 'pripraveno' ? 'Dokončit úkol' : 'Pokračovat v úkolu'}</button>
          </>}
          {!ukolNpc && <p>Další příběhový úkol zadává jiný obyvatel nebo jsou úkoly dokončené.</p>}
          {zpravaNpc && <p role="status">{zpravaNpc}</p>}
        </div>}
        <button type="button" onClick={() => { setZpravaNpc(''); setOtevrenyDialog(
          otevrenyDialog === blizkyObyvatel.id ? null : blizkyObyvatel.id
        ) }}>{otevrenyDialog === blizkyObyvatel.id ? 'Zavřít' : 'Promluvit'}</button>
      </div>}
      <details className="bw-objevovani" aria-label="Průzkum světa">
        <summary>🧭 Svět {vesnice.objeveneOblasti.length}/{OBLASTI_SVETA.length}</summary>
        <div className="bw-objevovani-seznam">
          {OBLASTI_SVETA.map((oblast) => {
            const objevena = vesnice.objeveneOblasti.includes(oblast.id as typeof vesnice.objeveneOblasti[number])
            return <div key={oblast.id}>{objevena ? `${oblast.symbol} ${oblast.nazev} ✓` : '🔒 Neobjevená oblast'}</div>
          })}
          <small>Nové oblasti objevíš vstupem na jejich území. Za první návštěvu získáš suroviny.</small>
        </div>
      </details>
      <Minimapa pozice={poziceHrace} objevene={vesnice.objeveneOblasti} navigaceId={navigaceId} />
      <div className="bw-navigace" aria-label="Navigace po světě">
        <label htmlFor="bw-navigace-cil">🧭 Cíl cesty</label>
        <select id="bw-navigace-cil" value={navigaceId ?? ''} onChange={e => setNavigaceId(e.target.value || null)}>
          <option value="">Bez navigace</option>
          {OBLASTI_SVETA.filter(o => vesnice.objeveneOblasti.includes(o.id as typeof vesnice.objeveneOblasti[number])).map(o =>
            <option key={o.id} value={o.id}>{o.symbol} {o.nazev}</option>)}
        </select>
        {doporucenaOblast && !navigaceId && <button type="button" onClick={() => setNavigaceId(doporucenaOblast)}>📜 Navigovat k úkolu</button>}
        {navigacniStav && <small role="status">{navigacniStav.dosazeno ? '✓ Jsi v cíli' : `${Math.round(navigacniStav.vzdalenost)} m · ${Math.round(navigacniStav.stupne)}° od severu`}</small>}
      </div>
      <AktivniUkolHud />
      <HUD
        hud={hud}
        maskot={maskot}
        bossDef={bossDef}
        vybranaZbran={vybranaZbran}
        onZvolZbran={(zbran) => { if (zbranJeDostupna(zbran, hud.hrac.level)) { setVybranaZbran(zbran); zvolZbran(zbran) } }}
        onUtocit={utocit}
        onObranit={obranit}
        onVyzvatBosse={vyzvatBosse}
        onZpet={onZpet}
        onZkusitZnovu={obnovitPoSmrti}
      />

      <OsadaPanel onPostavit={(typ) => { postavit(typ); setNahledAktivni(true) }} onPresunout={(id) => { presunout(id); setNahledAktivni(true) }} />
      {nahledAktivni && <div className="bw-preview-controls" role="group" aria-label="Náhled stavby">
        <span>{nahledPlatny ? '🟢 Volné místo' : '🔴 Nelze umístit – změň polohu'}</span>
        <button type="button" onClick={otocitNahled}>↻ Otočit</button>
        <button type="button" disabled={!nahledPlatny} onClick={() => { potvrditStavbu(); setNahledAktivni(false) }}>✓ Potvrdit</button>
        <button type="button" onClick={() => { zrusitNahled(); setNahledAktivni(false) }}>✕ Zrušit</button>
      </div>}
      <button type="button" className="bw-sber-button" onClick={sebrat}
        aria-label="Sebrat dřevo, kámen nebo krystaly v blízkosti hráče">🪵 Sebrat</button>
      <button type="button" className="bw-buddy-skill-button" onClick={pouzijBuddySchopnost}
        disabled={buddySkillCooldown > 0 || hud.mrtvyHrac}
        aria-label="Buddyho bojová schopnost, dosah pět metrů">
        🦊 Buddy {buddySkillCooldown > 0 ? `(${buddySkillCooldown} s)` : `✨ ${buddyElementPoskozeni(hud.hrac.level, maskot.id)} HP`}
      </button>
      <VirtualniJoystick onZmena={nastavJoystick} />
    </div>
  )
}

export default BuddyWorldHra
