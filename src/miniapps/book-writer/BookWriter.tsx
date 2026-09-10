import React, { useState } from 'react'
import { useBookWriter } from './useBookWriter'
import {
  Kniha,
  SABLONY_KAPITOL,
  celkovyPocetSlov,
  odhadCteniMinut,
  pocetSlov,
  serazenoPodleUpravy,
  sestavEpub,
  sestavTextKnihy,
} from './types'
import { plural } from '@/core/utils/pluralCZ'
import { stahnoutBlob, stahnoutTextovySoubor } from '@/core/utils/download'
import { formatujNaposledyUpraveno } from '@/flagships/writer-room/writerRoomFormat'
import { dalsiStav, emojiStavu, oznaceniStavu, StavPolozky } from '@/flagships/writer-room/writerRoomStav'
import { najdiUryvek, obsahujeDotaz } from '@/flagships/writer-room/writerRoomSearch'
import { najdiNaduzivanaSlova } from '@/flagships/writer-room/writerRoomStyl'
import { useWriterCheckpoints, checkpointyProDilo } from '@/flagships/writer-room/useWriterCheckpoints'
import './BookWriter.css'

export const BookWriter: React.FC = () => {
  const {
    knihy,
    addKniha,
    updateKniha,
    deleteKniha,
    setCilSlov,
    addKapitola,
    updateKapitola,
    deleteKapitola,
    presunKapitolu,
    pridatSablonu,
    nahradVKnize,
    obnovZeCheckpointu,
    duplikovatKniha,
  } = useBookWriter()
  const [aktivniKnihaId, setAktivniKnihaId] = useState<string | null>(null)
  const [novyNazev, setNovyNazev] = useState('')

  const aktivniKniha = knihy.find((k) => k.id === aktivniKnihaId) ?? null

  const zalozitKnihu = () => {
    if (!novyNazev.trim()) return
    const id = addKniha(novyNazev)
    setNovyNazev('')
    setAktivniKnihaId(id)
  }

  const smazatKnihu = (k: Kniha) => {
    if (window.confirm(`Smazat knihu „${k.nazev}“?`)) deleteKniha(k.id)
  }

  const duplikovat = (k: Kniha) => {
    const novaId = duplikovatKniha(k.id)
    if (novaId) setAktivniKnihaId(novaId)
  }

  if (!aktivniKniha) {
    return (
      <div className="bw-app">
        <div className="bw-header">
          <h2>📖 Kniha</h2>
        </div>

        <div className="bw-nova-radek">
          <input
            type="text"
            placeholder="Název nové knihy"
            value={novyNazev}
            onChange={(e) => setNovyNazev(e.target.value)}
            maxLength={60}
            onKeyDown={(e) => e.key === 'Enter' && zalozitKnihu()}
          />
          <button className="bw-ulozit-btn" onClick={zalozitKnihu}>
            Založit
          </button>
        </div>

        <div className="bw-seznam">
          {knihy.length === 0 && <p className="bw-prazdno">Zatím žádná kniha. Založ první výš.</p>}
          {serazenoPodleUpravy(knihy).map((k) => (
            <div className="bw-radek" key={k.id}>
              <button className="bw-radek-otevrit" onClick={() => setAktivniKnihaId(k.id)}>
                <strong>{k.nazev}</strong>
                <span>
                  {k.kapitoly.length} {plural(k.kapitoly.length, 'kapitola', 'kapitoly', 'kapitol')} ·{' '}
                  {celkovyPocetSlov(k)} {plural(celkovyPocetSlov(k), 'slovo', 'slova', 'slov')}
                </span>
                <span className="bw-radek-cas">{formatujNaposledyUpraveno(k.upravenoAt)}</span>
              </button>
              <button className="bw-icon-btn" onClick={() => duplikovat(k)} aria-label={`Duplikovat ${k.nazev}`}>
                ⧉
              </button>
              <button className="bw-icon-btn danger" onClick={() => smazatKnihu(k)} aria-label={`Smazat ${k.nazev}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <KnihaEditor
      kniha={aktivniKniha}
      onZpet={() => setAktivniKnihaId(null)}
      updateKniha={updateKniha}
      addKapitola={addKapitola}
      updateKapitola={updateKapitola}
      deleteKapitola={deleteKapitola}
      presunKapitolu={presunKapitolu}
      setCilSlov={setCilSlov}
      pridatSablonu={pridatSablonu}
      nahradVKnize={nahradVKnize}
      obnovZeCheckpointu={obnovZeCheckpointu}
    />
  )
}

interface KnihaEditorProps {
  kniha: Kniha
  onZpet: () => void
  updateKniha: (id: string, nazev: string) => void
  addKapitola: (knihaId: string, nazev: string) => void
  updateKapitola: (
    knihaId: string,
    kapitolaId: string,
    data: { nazev?: string; text?: string; stav?: StavPolozky; poznamka?: string; stitky?: string }
  ) => void
  deleteKapitola: (knihaId: string, kapitolaId: string) => void
  presunKapitolu: (knihaId: string, kapitolaId: string, smer: 'nahoru' | 'dolu') => void
  setCilSlov: (knihaId: string, cil: number | null) => void
  pridatSablonu: (knihaId: string, nazvyKapitol: string[]) => void
  nahradVKnize: (knihaId: string, hledat: string, nahradit: string) => number
  obnovZeCheckpointu: (knihaId: string, snapshot: unknown) => boolean
}

const KnihaEditor: React.FC<KnihaEditorProps> = ({
  kniha,
  onZpet,
  updateKniha,
  addKapitola,
  updateKapitola,
  deleteKapitola,
  presunKapitolu,
  setCilSlov,
  pridatSablonu,
  nahradVKnize,
  obnovZeCheckpointu,
}) => {
  const [aktivniKapitolaId, setAktivniKapitolaId] = useState<string | null>(kniha.kapitoly[0]?.id ?? null)
  const [nahledOtevren, setNahledOtevren] = useState(false)
  const [osnovaOtevrena, setOsnovaOtevrena] = useState(false)
  const [zalohyOtevreny, setZalohyOtevreny] = useState(false)
  const [fokusRezim, setFokusRezim] = useState(false)
  const [sablonyOtevrene, setSablonyOtevrene] = useState(false)
  const indexAktivni = kniha.kapitoly.findIndex((k) => k.id === aktivniKapitolaId)
  const aktivniKapitola = indexAktivni >= 0 ? kniha.kapitoly[indexAktivni] : null

  const pridatKapitolu = () => {
    const poradi = kniha.kapitoly.length + 1
    addKapitola(kniha.id, `Kapitola ${poradi}`)
  }

  const pouzitSablonu = (nazvyKapitol: string[]) => {
    pridatSablonu(kniha.id, nazvyKapitol)
    setSablonyOtevrene(false)
  }

  const smazatAktivniKapitolu = () => {
    if (!aktivniKapitola) return
    if (window.confirm(`Smazat kapitolu „${aktivniKapitola.nazev}“?`)) {
      deleteKapitola(kniha.id, aktivniKapitola.id)
      setAktivniKapitolaId(null)
    }
  }

  const celkem = celkovyPocetSlov(kniha)
  const cilProcenta = kniha.cilSlov && kniha.cilSlov > 0 ? Math.min(100, Math.round((celkem / kniha.cilSlov) * 100)) : null

  if (nahledOtevren) {
    return <KnihaNahled kniha={kniha} onZpet={() => setNahledOtevren(false)} />
  }

  if (osnovaOtevrena) {
    return (
      <KnihaOsnova
        kniha={kniha}
        onZpet={() => setOsnovaOtevrena(false)}
        onOtevritKapitolu={(id) => {
          setAktivniKapitolaId(id)
          setOsnovaOtevrena(false)
        }}
        nahradVKnize={nahradVKnize}
      />
    )
  }

  if (zalohyOtevreny) {
    return (
      <KnihaZalohy
        kniha={kniha}
        onZpet={() => setZalohyOtevreny(false)}
        obnovZeCheckpointu={obnovZeCheckpointu}
      />
    )
  }

  return (
    <div className={`bw-app${fokusRezim ? ' bw-app--fokus' : ''}`}>
      <div className="bw-header">
        <button className="bw-zpet-btn" onClick={onZpet} aria-label="Zpět na seznam knih">
          ←
        </button>
        <div className="bw-header-text">
          <input
            className="bw-header-nazev"
            value={kniha.nazev}
            onChange={(e) => updateKniha(kniha.id, e.target.value)}
            maxLength={60}
            aria-label="Název knihy"
            spellCheck
            lang="cs"
          />
          <span>
            {celkem} {plural(celkem, 'slovo', 'slova', 'slov')}
            {kniha.cilSlov ? ` / ${kniha.cilSlov}` : ''}
          </span>
          <span>📖 odhad čtení: ~{odhadCteniMinut(kniha)} min (hrubý odhad)</span>
        </div>
        <button className="bw-nahled-btn" onClick={() => setNahledOtevren(true)} aria-label="Otevřít náhled celé knihy">
          👁 Náhled
        </button>
      </div>

      <div className="bw-akce-radek">
        <button className="bw-nahled-btn" onClick={() => setOsnovaOtevrena(true)}>
          🔍 Osnova
        </button>
        <button className="bw-nahled-btn" onClick={() => setZalohyOtevreny(true)}>
          💾 Zálohy
        </button>
        <button className="bw-nahled-btn" onClick={() => setFokusRezim((f) => !f)} aria-pressed={fokusRezim}>
          {fokusRezim ? '🎯 Zpět z fokusu' : '🎯 Fokus'}
        </button>
      </div>

      {cilProcenta !== null && (
        <div className="bw-cil-lista" role="progressbar" aria-valuenow={cilProcenta} aria-valuemin={0} aria-valuemax={100}>
          <div className="bw-cil-vypln" style={{ width: `${cilProcenta}%` }} />
        </div>
      )}

      <div className="bw-chip-row">
        {kniha.kapitoly.map((k, i) => (
          <button
            key={k.id}
            className={`bw-chip${aktivniKapitolaId === k.id ? ' active' : ''}`}
            onClick={() => setAktivniKapitolaId(k.id)}
          >
            Kap. {i + 1}
          </button>
        ))}
        <button className="bw-plus-chip" onClick={pridatKapitolu} aria-label="Přidat kapitolu">
          +
        </button>
        <button className="bw-plus-chip" onClick={() => setSablonyOtevrene((s) => !s)} aria-label="Přidat kapitoly podle šablony">
          📐
        </button>
      </div>

      {sablonyOtevrene && (
        <div className="bw-sablony-seznam">
          {SABLONY_KAPITOL.map((sablona) => (
            <button key={sablona.id} className="bw-sablona-btn" onClick={() => pouzitSablonu(sablona.kapitoly)}>
              <strong>{sablona.nazev}</strong>
              <span>{sablona.kapitoly.join(' → ')}</span>
            </button>
          ))}
        </div>
      )}

      {!aktivniKapitola ? (
        <p className="bw-prazdno">Zatím žádná kapitola. Přidej první tlačítkem „+“.</p>
      ) : (
        <>
          <div className="bw-kapitola-hlavicka">
            <input
              className="bw-kapitola-nazev"
              value={aktivniKapitola.nazev}
              onChange={(e) => updateKapitola(kniha.id, aktivniKapitola.id, { nazev: e.target.value })}
              maxLength={60}
            />
            <button
              className={`bw-stav-badge bw-stav-badge--${aktivniKapitola.stav}`}
              onClick={() => updateKapitola(kniha.id, aktivniKapitola.id, { stav: dalsiStav(aktivniKapitola.stav) })}
              aria-label="Přepnout stav kapitoly"
            >
              {emojiStavu(aktivniKapitola.stav)} {oznaceniStavu(aktivniKapitola.stav)}
            </button>
            <div className="bw-posun-btns">
              <button
                className="bw-posun-btn"
                onClick={() => presunKapitolu(kniha.id, aktivniKapitola.id, 'nahoru')}
                disabled={indexAktivni <= 0}
                aria-label="Posunout kapitolu nahoru"
              >
                ↑
              </button>
              <button
                className="bw-posun-btn"
                onClick={() => presunKapitolu(kniha.id, aktivniKapitola.id, 'dolu')}
                disabled={indexAktivni >= kniha.kapitoly.length - 1}
                aria-label="Posunout kapitolu dolů"
              >
                ↓
              </button>
            </div>
          </div>

          <textarea
            className="bw-editor"
            value={aktivniKapitola.text}
            onChange={(e) => updateKapitola(kniha.id, aktivniKapitola.id, { text: e.target.value })}
            placeholder="Piš sem text kapitoly…"
            rows={fokusRezim ? 22 : 12}
            spellCheck
            lang="cs"
          />

          <div className="bw-spodni-radek">
            <span>
              {pocetSlov(aktivniKapitola.text)} {plural(pocetSlov(aktivniKapitola.text), 'slovo', 'slova', 'slov')} v téhle kapitole
            </span>
            <button className="bw-icon-btn danger" onClick={smazatAktivniKapitolu}>
              Smazat kapitolu
            </button>
          </div>

          <input
            type="text"
            className="bw-poznamka"
            placeholder="Poznámka jen pro tebe (nezobrazí se v Náhledu ani exportu)…"
            value={aktivniKapitola.poznamka}
            onChange={(e) => updateKapitola(kniha.id, aktivniKapitola.id, { poznamka: e.target.value })}
            maxLength={200}
            spellCheck
            lang="cs"
          />

          {aktivniKapitola.stitky.trim() && (
            <div className="bw-stitek-row">
              {aktivniKapitola.stitky
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .map((stitek) => (
                  <span className="bw-stitek" key={stitek}>
                    #{stitek}
                  </span>
                ))}
            </div>
          )}
          <input
            type="text"
            className="bw-poznamka"
            placeholder="Vlastní štítky, oddělené čárkou (např. „akce, důležité“)…"
            value={aktivniKapitola.stitky}
            onChange={(e) => updateKapitola(kniha.id, aktivniKapitola.id, { stitky: e.target.value })}
            maxLength={100}
          />
        </>
      )}

      <div className="bw-cil-radek">
        <label htmlFor="bw-cil">Cíl počtu slov na celou knihu</label>
        <input
          id="bw-cil"
          type="number"
          min={0}
          placeholder="např. 50000"
          value={kniha.cilSlov ?? ''}
          onChange={(e) => setCilSlov(kniha.id, e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
        />
      </div>
    </div>
  )
}

const KnihaNahled: React.FC<{ kniha: Kniha; onZpet: () => void }> = ({ kniha, onZpet }) => (
  <div className="bw-app">
    <div className="bw-header">
      <button className="bw-zpet-btn" onClick={onZpet} aria-label="Zpět na editor">
        ←
      </button>
      <div className="bw-header-text">
        <strong>{kniha.nazev}</strong>
        <span>Náhled celé knihy</span>
      </div>
      <button className="bw-nahled-btn" onClick={() => window.print()}>
        🖨 Tisk
      </button>
      <button
        className="bw-nahled-btn"
        onClick={() => stahnoutTextovySoubor(`${kniha.nazev || 'kniha'}.txt`, sestavTextKnihy(kniha))}
      >
        ⬇ .txt
      </button>
      <button
        className="bw-nahled-btn"
        onClick={async () => stahnoutBlob(`${kniha.nazev || 'kniha'}.epub`, await sestavEpub(kniha))}
      >
        ⬇ EPUB
      </button>
    </div>

    <div className="bw-nahled">
      {kniha.kapitoly.length === 0 ? (
        <p className="bw-prazdno">Kniha zatím nemá žádnou kapitolu.</p>
      ) : (
        kniha.kapitoly.map((k, i) => (
          <div className="bw-nahled-kapitola" key={k.id}>
            <h3>
              {i + 1}. {k.nazev}
            </h3>
            <p className="bw-nahled-text">{k.text.trim() || '(prázdná kapitola)'}</p>
          </div>
        ))
      )}
    </div>
  </div>
)

// Osnova celé knihy na jednu obrazovku plus fulltextové vyhledávání v
// jednom — hledací pole nemá co filtrovat bez seznamu, a seznam beze
// dneška, který kapitolu vlastně hledáš, potřebuje nějaké řazení, tak
// se to nestaví jako dvě samostatné obrazovky. Bez dotazu ukazuje jen
// pořadí/název/stav/počet slov; s dotazem filtruje na kapitoly, kde se
// dotaz najde v názvu NEBO v textu, a u zásahu v textu přidá krátký
// úryvek okolí.
const KnihaOsnova: React.FC<{
  kniha: Kniha
  onZpet: () => void
  onOtevritKapitolu: (id: string) => void
  nahradVKnize: (knihaId: string, hledat: string, nahradit: string) => number
}> = ({ kniha, onZpet, onOtevritKapitolu, nahradVKnize }) => {
  const [dotaz, setDotaz] = useState('')
  const [nahraditFormOtevren, setNahraditFormOtevren] = useState(false)
  const [nahraditZa, setNahraditZa] = useState('')
  const [vysledekNahrazeni, setVysledekNahrazeni] = useState<number | null>(null)
  const [naduzivanaOtevrena, setNaduzivanaOtevrena] = useState(false)

  const provestNahrazeni = () => {
    if (!dotaz.trim()) return
    setVysledekNahrazeni(nahradVKnize(kniha.id, dotaz, nahraditZa))
  }

  const polozky = kniha.kapitoly
    .map((k, i) => ({ kapitola: k, poradi: i + 1 }))
    .filter(
      ({ kapitola }) =>
        obsahujeDotaz(kapitola.nazev, dotaz) || obsahujeDotaz(kapitola.text, dotaz) || obsahujeDotaz(kapitola.stitky, dotaz)
    )

  const naduzivana = najdiNaduzivanaSlova(kniha.kapitoly.map((k) => k.text))

  return (
    <div className="bw-app">
      <div className="bw-header">
        <button className="bw-zpet-btn" onClick={onZpet} aria-label="Zpět na editor">
          ←
        </button>
        <div className="bw-header-text">
          <strong>{kniha.nazev}</strong>
          <span>Osnova a vyhledávání</span>
        </div>
      </div>

      <input
        type="text"
        placeholder="Hledat v názvech i textu kapitol…"
        value={dotaz}
        onChange={(e) => {
          setDotaz(e.target.value)
          setVysledekNahrazeni(null)
        }}
        autoFocus
      />

      <button className="bw-nahled-btn" onClick={() => setNahraditFormOtevren((f) => !f)}>
        🔁 Nahradit
      </button>

      {nahraditFormOtevren && (
        <div className="bw-nahradit-radek">
          <input
            type="text"
            placeholder="Nahradit za…"
            value={nahraditZa}
            onChange={(e) => setNahraditZa(e.target.value)}
          />
          <button className="bw-ulozit-btn" onClick={provestNahrazeni} disabled={!dotaz.trim()}>
            Nahradit vše
          </button>
        </div>
      )}
      {vysledekNahrazeni !== null && (
        <p className="bw-prazdno">
          {vysledekNahrazeni === 0 ? 'Nic k nahrazení se nenašlo.' : `Nahrazeno ${vysledekNahrazeni}×.`}
        </p>
      )}

      <button className="bw-nahled-btn" onClick={() => setNaduzivanaOtevrena((o) => !o)}>
        🔠 Nadužívaná slova
      </button>
      {naduzivanaOtevrena && (
        <div className="bw-seznam">
          {naduzivana.length === 0 ? (
            <p className="bw-prazdno">Žádné slovo se v knize neopakuje nápadně často.</p>
          ) : (
            naduzivana.map((n) => (
              <div className="bw-stat-radek" key={n.slovo}>
                <span>{n.slovo}</span>
                <span>{n.pocet}×</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="bw-seznam">
        {polozky.length === 0 && (
          <p className="bw-prazdno">{dotaz ? 'Nic se nenašlo.' : 'Kniha zatím nemá žádnou kapitolu.'}</p>
        )}
        {polozky.map(({ kapitola: k, poradi }) => {
          const uryvek = obsahujeDotaz(k.nazev, dotaz) ? null : najdiUryvek(k.text, dotaz)
          return (
            <div className="bw-radek" key={k.id}>
              <button className="bw-radek-otevrit" onClick={() => onOtevritKapitolu(k.id)}>
                <strong>
                  {poradi}. {k.nazev}
                </strong>
                <span>
                  {emojiStavu(k.stav)} {oznaceniStavu(k.stav)} · {pocetSlov(k.text)}{' '}
                  {plural(pocetSlov(k.text), 'slovo', 'slova', 'slov')}
                </span>
                {uryvek && <span className="bw-osnova-uryvek">„{uryvek}“</span>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Ruční záložní verze (checkpointy) — malá bezpečnostní síť před
// velkou úpravou, ne plná historie verzí. Schválně jiná appka než
// hlavní "Zálohy v aplikaci" v Nastavení (backupHistory.ts): ta dělá
// snímek úplně celé appky, tohle jen jedné konkrétní knihy, kterou
// autor sám pojmenuje.
const KnihaZalohy: React.FC<{
  kniha: Kniha
  onZpet: () => void
  obnovZeCheckpointu: (knihaId: string, snapshot: unknown) => boolean
}> = ({ kniha, onZpet, obnovZeCheckpointu }) => {
  const { checkpointy, vytvorCheckpoint, smazCheckpoint } = useWriterCheckpoints()
  const [novyNazev, setNovyNazev] = useState('')
  const [zprava, setZprava] = useState<string | null>(null)

  const seznam = checkpointyProDilo(checkpointy, 'kniha', kniha.id)

  const ulozitZalohu = () => {
    vytvorCheckpoint('kniha', kniha.id, novyNazev || `Záloha ${seznam.length + 1}`, kniha)
    setNovyNazev('')
    setZprava('Záloha uložena.')
  }

  const obnovit = (nazev: string, data: unknown) => {
    if (!window.confirm(`Obnovit knihu ze zálohy „${nazev}“? Aktuální stav kapitol se přepíše.`)) return
    setZprava(obnovZeCheckpointu(kniha.id, data) ? 'Verze obnovena.' : 'Nepovedlo se obnovit — záloha je poškozená.')
  }

  return (
    <div className="bw-app">
      <div className="bw-header">
        <button className="bw-zpet-btn" onClick={onZpet} aria-label="Zpět na editor">
          ←
        </button>
        <div className="bw-header-text">
          <strong>{kniha.nazev}</strong>
          <span>Ruční zálohy</span>
        </div>
      </div>

      <div className="bw-nova-radek">
        <input
          type="text"
          placeholder={`Název zálohy (např. „Před přepsáním konce“)`}
          value={novyNazev}
          onChange={(e) => setNovyNazev(e.target.value)}
          maxLength={60}
        />
        <button className="bw-ulozit-btn" onClick={ulozitZalohu}>
          Uložit
        </button>
      </div>

      {zprava && <p className="bw-prazdno">{zprava}</p>}

      <div className="bw-seznam">
        {seznam.length === 0 && <p className="bw-prazdno">Zatím žádná ruční záloha téhle knihy.</p>}
        {seznam.map((c) => (
          <div className="bw-radek" key={c.id}>
            <button className="bw-radek-otevrit" onClick={() => obnovit(c.nazev, c.data)}>
              <strong>{c.nazev}</strong>
              <span>{formatujNaposledyUpraveno(c.createdAt)}</span>
            </button>
            <button className="bw-icon-btn danger" onClick={() => smazCheckpoint(c.id)} aria-label={`Smazat zálohu ${c.nazev}`}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
