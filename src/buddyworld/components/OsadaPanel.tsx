import { UKOLY } from '../quests'
import { zjistiPribeh } from '../storyProgress'
import React, { useState } from 'react'
import type { StavitelnyTyp } from '../buildingPlacement'
import { useVillageStore } from '../useVillageStore'
import { RECEPTY, muzeVyrobit } from '../crafting'
import { cenaRozsireni, lzeRozsirit, MAX_UROVEN_OSADY } from '../villageProgress'

const NAZVY = ['Malá osada', 'Vesnice', 'Rozvinutá vesnice', 'Městečko', 'Fantasy město']

export const OsadaPanel: React.FC<{ onPostavit: (typ: StavitelnyTyp) => void; onPresunout: (id: string) => void }> = ({ onPostavit, onPresunout }) => {
  const [otevreno, setOtevreno] = useState(false)
  const uroven = useVillageStore((s) => s.uroven)
  const drevo = useVillageStore((s) => s.drevo)
  const kamen = useVillageStore((s) => s.kamen)
  const krystaly = useVillageStore((s) => s.krystaly)
  const inventar = useVillageStore((s) => s.inventar)
  const vyrob = useVillageStore((s) => s.vyrob)
  const umisteneStavby = useVillageStore((s) => s.umisteneStavby)
  const vyzvednoutProdukci = useVillageStore((s) => s.vyzvednoutProdukci)
  const obchod = useVillageStore((s) => s.obchod)
  const [oznameni, setOznameni] = useState('')
  const zbourat = useVillageStore((s) => s.zbourat)
  const [zalozka, setZalozka] = useState<'osada' | 'dilna' | 'staveni' | 'budovy' | 'ukoly'>('osada')
  const splneneUkoly = useVillageStore(s => s.splneneUkoly)
  const prevzitOdmenu = useVillageStore(s => s.prevzitOdmenu)
  const pribeh = zjistiPribeh(splneneUkoly)
  const porazeniNepratele = useVillageStore(s => s.porazeniNepratele)
  const porazeniBossove = useVillageStore(s => s.porazeniBossove)
  const vylepsiOsadu = useVillageStore((s) => s.vylepsiOsadu)
  const cena = cenaRozsireni(uroven)
  const muze = lzeRozsirit({ uroven, drevo, kamen, krystaly, porazeniNepratele: 0, porazeniBossove: 0 })

  return (
    <aside className="bw-osada-panel">
      <button type="button" className="bw-osada-toggle"
        aria-expanded={otevreno} aria-controls="bw-osada-detail"
        onClick={() => setOtevreno((v) => !v)}>
        🏡 {NAZVY[uroven - 1]} · {uroven}/{MAX_UROVEN_OSADY}
      </button>
      {otevreno && (
        <div id="bw-osada-detail" className="bw-osada-detail">
          <div className="bw-osada-tabs">
            <button type="button" aria-pressed={zalozka === 'osada'} onClick={() => setZalozka('osada')}>Osada</button>
            <button type="button" aria-pressed={zalozka === 'dilna'} onClick={() => setZalozka('dilna')}>Dílna</button>
            <button type="button" aria-pressed={zalozka === 'staveni'} onClick={() => setZalozka('staveni')}>Stavění</button>
            <button type="button" aria-pressed={zalozka === 'budovy'} onClick={() => setZalozka('budovy')}>Budovy</button>
            <button type="button" aria-pressed={zalozka === 'ukoly'} onClick={() => setZalozka('ukoly')}>Úkoly</button>
          </div>
          <strong>{zalozka === 'osada' ? 'Rozvoj osady' : zalozka === 'dilna' ? 'Výroba a inventář' : zalozka === 'staveni' ? 'Stavební režim' : zalozka === 'budovy' ? 'Funkce budov' : 'Obyvatelé a úkoly'}</strong>
          <p>🪵 {drevo} dřeva · 🪨 {kamen} kamene · 💎 {krystaly} krystalů</p>
          {zalozka === 'osada' && (uroven < MAX_UROVEN_OSADY ? (
            <>
              <p>Další úroveň: {cena.drevo} 🪵, {cena.kamen} 🪨, {cena.krystaly} 💎</p>
              <button type="button" disabled={!muze} onClick={vylepsiOsadu}>
                {muze ? 'Rozšířit osadu' : 'Sbírej suroviny nebo bojuj'}
              </button>
            </>
          ) : <p>Dosáhl jsi nejvyšší úrovně osady!</p>)}
          {zalozka === 'ukoly' && <div className="bw-crafting-list">
            <p>📖 {pribeh.kapitola === 1 ? 'Kapitola I: Zrození údolí' : 'Kapitola II: Nový úsvit'}</p>
            <label htmlFor="bw-pribeh-postup">Příběh: {pribeh.dokonceno}/{pribeh.celkem} úkolů ({pribeh.procent} %)</label>
            <progress id="bw-pribeh-postup" value={pribeh.dokonceno} max={pribeh.celkem} style={{ width: '100%' }} />
            {pribeh.dokoncenaHra && <div role="status" className="bw-pribeh-finale">
              <strong>🌅 Konec kapitoly: Nový úsvit</strong>
              <p>Společně s Buddym jsi zachránil údolí, ochránil jeho obyvatele a vybudoval nový domov. Dobrodružství může pokračovat volným hraním.</p>
              <p>✓ Příběhové úkoly této verze dokončeny.</p>
            </div>}
            {UKOLY.map((q, index) => {
              const dostupny = index === 0 || splneneUkoly.includes(UKOLY[index - 1].id)
              const splneny = splneneUkoly.includes(q.id)
              const pripraveny = q.hotovo({ uroven, drevo, kamen, krystaly, porazeniNepratele, porazeniBossove })
              return <div className="bw-crafting-recipe" key={q.id}>
                <strong>{index < 8 ? 'I' : 'II'} · {q.zadavatel}: {q.nazev}</strong>
                <p>{dostupny ? q.dialog : 'Nejprve dokonči předchozí úkol.'}</p>
                {dostupny && <><small>{q.cil} Odměna: 🪵{q.odmena.drevo} 🪨{q.odmena.kamen} 💎{q.odmena.krystaly}</small>
                  <button type="button" disabled={splneny || !pripraveny} onClick={() => prevzitOdmenu(q.id)}>
                    {splneny ? '✓ Splněno' : pripraveny ? 'Převzít odměnu' : 'Úkol probíhá'}
                  </button></>}
              </div>
            })}
          </div>}
          {zalozka === 'budovy' && <div className="bw-crafting-list">
            <div className="bw-crafting-recipe">
              <strong>🌾 Farma a sklad (úroveň 2)</strong>
              <p>Každých 5 minut vyrobí 2 dřeva a 1 kámen. Od úrovně 3 získáš 2 kameny. Maximálně 12 cyklů najednou.</p>
              <button type="button" disabled={uroven < 2} onClick={() => {
                const n = vyzvednoutProdukci()
                setOznameni(n ? `Vyzvednuto ${n} výrobních cyklů.` : 'Zatím není co vyzvednout.')
              }}>Vyzvednout produkci</button>
            </div>
            <div className="bw-crafting-recipe">
              <strong>🛒 Obchod (úroveň 3)</strong>
              <button type="button" disabled={uroven < 3 || drevo < 5} onClick={() => obchod('prodej_dreva')}>Prodat 5 dřeva za 1 💎</button>
              <button type="button" disabled={uroven < 3 || kamen < 4} onClick={() => obchod('prodej_kamene')}>Prodat 4 kameny za 1 💎</button>
              <button type="button" disabled={uroven < 3 || krystaly < 2} onClick={() => obchod('nakup_dreva')}>Koupit 5 dřeva za 2 💎</button>
              <button type="button" disabled={uroven < 3 || krystaly < 2} onClick={() => obchod('nakup_kamene')}>Koupit 4 kameny za 2 💎</button>
            </div>
            {oznameni && <p role="status">{oznameni}</p>}
          </div>}
          {zalozka === 'dilna'  && <div className="bw-crafting-list">
            {RECEPTY.map((r) => {
              const odemceno = uroven >= r.minUroven
              const dostupne = muzeVyrobit({ uroven, drevo, kamen, krystaly, porazeniNepratele: 0, porazeniBossove: 0 }, r)
              return <div key={r.id} className="bw-crafting-recipe">
                <strong>{r.nazev} × {inventar[r.id]}</strong>
                <small>{r.popis} · 🪵 {r.drevo} · 🪨 {r.kamen} · 💎 {r.krystaly}</small>
                <button type="button" disabled={!dostupne} onClick={() => vyrob(r.id)}>
                  {!odemceno ? `Odemkne se na úrovni ${r.minUroven}` : dostupne ? 'Vyrobit' : 'Nedostatek surovin'}
                </button>
              </div>
            })}
          </div>}
          {zalozka === 'staveni' && <div className="bw-crafting-list">
            <p>Postava umístí vybraný předmět 3 metry před sebe. Při stavění se spotřebuje 1 kus.</p>
            {(['lucerna', 'prkna', 'kamenny_blok'] as const).map((typ) => <div key={typ} className="bw-crafting-recipe">
              <strong>{typ === 'lucerna' ? '🏮 Lucerna' : typ === 'prkna' ? '🪵 Dřevěná stavba' : '🪨 Kamenný blok'} × {inventar[typ]}</strong>
              <button type="button" disabled={inventar[typ] < 1 || umisteneStavby.length >= 80} onClick={() => { onPostavit(typ); setOtevreno(false) }}>Umístit před postavu</button>
            </div>)}
            <strong>Postavené objekty</strong>
            {umisteneStavby.map((stavba, i) => <div key={stavba.id} className="bw-crafting-recipe">
              <span>{i + 1}. {stavba.typ === 'lucerna' ? '🏮 Lucerna' : stavba.typ === 'prkna' ? '🪵 Dřevěná stavba' : '🪨 Kamenný blok'} ({stavba.x}, {stavba.z})</span>
              <button type="button" onClick={() => { onPresunout(stavba.id); setOtevreno(false) }}>Přesunout před postavu</button>
              <button type="button" onClick={() => zbourat(stavba.id)}>Odstranit a vrátit do inventáře</button>
            </div>)}
            <small>Postaveno: {umisteneStavby.length}/80. Místo musí být volné a uvnitř herní oblasti.</small>
          </div>}
          <small>Dřevo a kámen sbírej ve 3D světě tlačítkem Sebrat. Suroviny se obnoví po 15 sekundách.</small>
        </div>
      )}
    </aside>
  )
}
