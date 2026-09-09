import React, { useState } from 'react'
import { useScreenplayWriter } from './useScreenplayWriter'
import {
  nadpisSceny,
  odhadStopazeMinut,
  pocetSlov,
  Scenar,
  serazenoPodleUpravy,
  sestavTextScenare,
  TYPY_MIST,
  TypMista,
  ziskejPostavy,
} from './types'
import { plural } from '@/core/utils/pluralCZ'
import { stahnoutTextovySoubor } from '@/core/utils/download'
import { formatujNaposledyUpraveno } from '@/flagships/writer-room/writerRoomFormat'
import { dalsiStav, emojiStavu, oznaceniStavu, StavPolozky } from '@/flagships/writer-room/writerRoomStav'
import { najdiUryvek, obsahujeDotaz } from '@/flagships/writer-room/writerRoomSearch'
import './ScreenplayWriter.css'

export const ScreenplayWriter: React.FC = () => {
  const {
    scenare,
    addScenar,
    updateScenar,
    deleteScenar,
    setCilScen,
    addScena,
    updateScena,
    deleteScena,
    addAkce,
    addDialog,
    updatePrvek,
    deletePrvek,
    presunScenu,
  } = useScreenplayWriter()
  const [aktivniId, setAktivniId] = useState<string | null>(null)
  const [novyNazev, setNovyNazev] = useState('')

  const aktivni = scenare.find((s) => s.id === aktivniId) ?? null

  const zalozit = () => {
    if (!novyNazev.trim()) return
    const id = addScenar(novyNazev)
    setNovyNazev('')
    setAktivniId(id)
  }

  const smazatScenar = (s: Scenar) => {
    if (window.confirm(`Smazat scénář „${s.nazev}“?`)) deleteScenar(s.id)
  }

  if (!aktivni) {
    return (
      <div className="sw-app">
        <div className="sw-header">
          <h2>🎬 Scénář</h2>
        </div>

        <div className="sw-nova-radek">
          <input
            type="text"
            placeholder="Název nového scénáře"
            value={novyNazev}
            onChange={(e) => setNovyNazev(e.target.value)}
            maxLength={60}
            onKeyDown={(e) => e.key === 'Enter' && zalozit()}
          />
          <button className="sw-ulozit-btn" onClick={zalozit}>
            Založit
          </button>
        </div>

        <div className="sw-seznam">
          {scenare.length === 0 && <p className="sw-prazdno">Zatím žádný scénář. Založ první výš.</p>}
          {serazenoPodleUpravy(scenare).map((s) => (
            <div className="sw-radek" key={s.id}>
              <button className="sw-radek-otevrit" onClick={() => setAktivniId(s.id)}>
                <strong>{s.nazev}</strong>
                <span>{s.sceny.length} {plural(s.sceny.length, 'scéna napsána', 'scény napsány', 'scén napsáno')}</span>
                <span className="sw-radek-cas">{formatujNaposledyUpraveno(s.upravenoAt)}</span>
              </button>
              <button className="sw-icon-btn danger" onClick={() => smazatScenar(s)} aria-label={`Smazat ${s.nazev}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <ScenarEditor
      scenar={aktivni}
      onZpet={() => setAktivniId(null)}
      updateScenar={updateScenar}
      setCilScen={setCilScen}
      addScena={addScena}
      updateScena={updateScena}
      deleteScena={deleteScena}
      addAkce={addAkce}
      addDialog={addDialog}
      updatePrvek={updatePrvek}
      deletePrvek={deletePrvek}
      presunScenu={presunScenu}
    />
  )
}

interface ScenarEditorProps {
  scenar: Scenar
  onZpet: () => void
  updateScenar: (id: string, nazev: string) => void
  setCilScen: (scenarId: string, cil: number | null) => void
  addScena: (scenarId: string, data: { typMista: TypMista; misto: string; cas: string }) => void
  updateScena: (
    scenarId: string,
    scenaId: string,
    data: { typMista?: TypMista; misto?: string; cas?: string; stav?: StavPolozky; poznamka?: string }
  ) => void
  deleteScena: (scenarId: string, scenaId: string) => void
  addAkce: (scenarId: string, scenaId: string, text: string) => void
  addDialog: (scenarId: string, scenaId: string, data: { postava: string; text: string; poznamka?: string }) => void
  updatePrvek: (scenarId: string, scenaId: string, prvekId: string, data: { text?: string; postava?: string; poznamka?: string }) => void
  deletePrvek: (scenarId: string, scenaId: string, prvekId: string) => void
  presunScenu: (scenarId: string, scenaId: string, smer: 'nahoru' | 'dolu') => void
}

const ScenarEditor: React.FC<ScenarEditorProps> = ({
  scenar,
  onZpet,
  updateScenar,
  setCilScen,
  addScena,
  updateScena,
  deleteScena,
  addAkce,
  addDialog,
  updatePrvek,
  deletePrvek,
  presunScenu,
}) => {
  const [aktivniScenaId, setAktivniScenaId] = useState<string | null>(scenar.sceny[0]?.id ?? null)
  const [formOtevren, setFormOtevren] = useState<'scena' | 'akce' | 'dialog' | null>(null)
  const [nahledOtevren, setNahledOtevren] = useState(false)
  const [osnovaOtevrena, setOsnovaOtevrena] = useState(false)
  const [fokusRezim, setFokusRezim] = useState(false)

  const [typMista, setTypMista] = useState<TypMista>('INT')
  const [misto, setMisto] = useState('')
  const [cas, setCas] = useState('DEN')
  const [akceText, setAkceText] = useState('')
  const [postava, setPostava] = useState('')
  const [dialogText, setDialogText] = useState('')
  const [poznamka, setPoznamka] = useState('')

  // Stejný formulář slouží k přidání i k úpravě — tahle dvě id říkají,
  // jestli je formulář v editačním režimu (a nad který konkrétní
  // scénu/prvek), nebo jestli přidává úplně nový.
  const [upravovanaScenaId, setUpravovanaScenaId] = useState<string | null>(null)
  const [upravovanyPrvekId, setUpravovanyPrvekId] = useState<string | null>(null)

  const indexAktivni = scenar.sceny.findIndex((s) => s.id === aktivniScenaId)
  const aktivniScena = indexAktivni >= 0 ? scenar.sceny[indexAktivni] : null

  const otevritPridaniSceny = () => {
    setTypMista('INT')
    setMisto('')
    setCas('DEN')
    setUpravovanaScenaId(null)
    setFormOtevren('scena')
  }

  const otevritUpravuSceny = () => {
    if (!aktivniScena) return
    setTypMista(aktivniScena.typMista)
    setMisto(aktivniScena.misto)
    setCas(aktivniScena.cas)
    setUpravovanaScenaId(aktivniScena.id)
    setFormOtevren('scena')
  }

  const otevritPridaniAkce = () => {
    setAkceText('')
    setUpravovanyPrvekId(null)
    setFormOtevren('akce')
  }

  const otevritPridaniDialogu = () => {
    setPostava('')
    setDialogText('')
    setPoznamka('')
    setUpravovanyPrvekId(null)
    setFormOtevren('dialog')
  }

  const pridatScenu = () => {
    if (!misto.trim()) return
    if (upravovanaScenaId) {
      updateScena(scenar.id, upravovanaScenaId, { typMista, misto, cas })
    } else {
      addScena(scenar.id, { typMista, misto, cas })
    }
    setMisto('')
    setUpravovanaScenaId(null)
    setFormOtevren(null)
  }

  const pridatAkci = () => {
    if (!aktivniScena || !akceText.trim()) return
    if (upravovanyPrvekId) {
      updatePrvek(scenar.id, aktivniScena.id, upravovanyPrvekId, { text: akceText })
    } else {
      addAkce(scenar.id, aktivniScena.id, akceText)
    }
    setAkceText('')
    setUpravovanyPrvekId(null)
    setFormOtevren(null)
  }

  const pridatDialog = () => {
    if (!aktivniScena || !dialogText.trim()) return
    if (upravovanyPrvekId) {
      updatePrvek(scenar.id, aktivniScena.id, upravovanyPrvekId, { postava: postava.trim() || 'POSTAVA', text: dialogText, poznamka })
    } else {
      addDialog(scenar.id, aktivniScena.id, { postava, text: dialogText, poznamka })
    }
    setPostava('')
    setDialogText('')
    setPoznamka('')
    setUpravovanyPrvekId(null)
    setFormOtevren(null)
  }

  const zrusitFormular = () => {
    setUpravovanaScenaId(null)
    setUpravovanyPrvekId(null)
    setFormOtevren(null)
  }

  const smazatAktivniScenu = () => {
    if (!aktivniScena) return
    if (window.confirm(`Smazat scénu „${nadpisSceny(aktivniScena, indexAktivni + 1)}“?`)) {
      deleteScena(scenar.id, aktivniScena.id)
      setAktivniScenaId(null)
    }
  }

  const celkem = scenar.sceny.length
  const cilProcenta = scenar.cilScen && scenar.cilScen > 0 ? Math.min(100, Math.round((celkem / scenar.cilScen) * 100)) : null

  if (nahledOtevren) {
    return <ScenarNahled scenar={scenar} onZpet={() => setNahledOtevren(false)} />
  }

  if (osnovaOtevrena) {
    return (
      <ScenarOsnova
        scenar={scenar}
        onZpet={() => setOsnovaOtevrena(false)}
        onOtevritScenu={(id) => {
          setAktivniScenaId(id)
          setOsnovaOtevrena(false)
        }}
      />
    )
  }

  return (
    <div className={`sw-app${fokusRezim ? ' sw-app--fokus' : ''}`}>
      <div className="sw-header">
        <button className="sw-zpet-btn" onClick={onZpet} aria-label="Zpět na seznam scénářů">
          ←
        </button>
        <div className="sw-header-text">
          <input
            className="sw-header-nazev"
            value={scenar.nazev}
            onChange={(e) => updateScenar(scenar.id, e.target.value)}
            maxLength={60}
            aria-label="Název scénáře"
          />
          <span>
            {scenar.sceny.length} {plural(scenar.sceny.length, 'scéna', 'scény', 'scén')}
            {scenar.cilScen ? ` / ${scenar.cilScen}` : ''}
          </span>
          <span>🎬 odhad běhu: ~{odhadStopazeMinut(scenar)} min (hrubý odhad)</span>
        </div>
        <button className="sw-nahled-btn" onClick={() => setNahledOtevren(true)} aria-label="Otevřít náhled celého scénáře">
          👁 Náhled
        </button>
      </div>

      <div className="sw-akce-radek">
        <button className="sw-nahled-btn" onClick={() => setOsnovaOtevrena(true)}>
          🔍 Osnova
        </button>
        <button className="sw-nahled-btn" onClick={() => setFokusRezim((f) => !f)} aria-pressed={fokusRezim}>
          {fokusRezim ? '🎯 Zpět z fokusu' : '🎯 Fokus'}
        </button>
      </div>

      {cilProcenta !== null && (
        <div className="sw-cil-lista" role="progressbar" aria-valuenow={cilProcenta} aria-valuemin={0} aria-valuemax={100}>
          <div className="sw-cil-vypln" style={{ width: `${cilProcenta}%` }} />
        </div>
      )}

      <div className="sw-chip-row">
        {scenar.sceny.map((s, i) => (
          <button
            key={s.id}
            className={`sw-chip${aktivniScenaId === s.id ? ' active' : ''}`}
            onClick={() => setAktivniScenaId(s.id)}
          >
            Sc. {i + 1}
          </button>
        ))}
        <button className="sw-plus-chip" onClick={otevritPridaniSceny} aria-label="Přidat scénu">
          +
        </button>
      </div>

      {formOtevren === 'scena' && (
        <div className="sw-form">
          <div className="sw-form-radek">
            <select value={typMista} onChange={(e) => setTypMista(e.target.value as TypMista)}>
              {TYPY_MIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input type="text" placeholder="Místo, např. Kavárna" value={misto} onChange={(e) => setMisto(e.target.value)} />
          </div>
          <input type="text" placeholder="Čas, např. Den" value={cas} onChange={(e) => setCas(e.target.value)} />
          <div className="sw-form-akce">
            <button className="sw-zrusit-btn" onClick={zrusitFormular}>
              Zrušit
            </button>
            <button className="sw-ulozit-btn" onClick={pridatScenu}>
              {upravovanaScenaId ? 'Uložit změny' : 'Přidat scénu'}
            </button>
          </div>
        </div>
      )}

      {!aktivniScena ? (
        <p className="sw-prazdno">Zatím žádná scéna. Přidej první tlačítkem „+“.</p>
      ) : (
        <>
          <div className="sw-script-page">
            <div className="sw-sc-heading-radek">
              <div className="sw-sc-heading">{nadpisSceny(aktivniScena, indexAktivni + 1)}</div>
              <div className="sw-posun-btns">
                <button
                  className={`sw-stav-badge sw-stav-badge--${aktivniScena.stav}`}
                  onClick={() => updateScena(scenar.id, aktivniScena.id, { stav: dalsiStav(aktivniScena.stav) })}
                  aria-label="Přepnout stav scény"
                >
                  {emojiStavu(aktivniScena.stav)} {oznaceniStavu(aktivniScena.stav)}
                </button>
                <button className="sw-posun-btn" onClick={otevritUpravuSceny} aria-label="Upravit scénu">
                  ✏️
                </button>
                <button
                  className="sw-posun-btn"
                  onClick={() => presunScenu(scenar.id, aktivniScena.id, 'nahoru')}
                  disabled={indexAktivni <= 0}
                  aria-label="Posunout scénu nahoru"
                >
                  ↑
                </button>
                <button
                  className="sw-posun-btn"
                  onClick={() => presunScenu(scenar.id, aktivniScena.id, 'dolu')}
                  disabled={indexAktivni >= scenar.sceny.length - 1}
                  aria-label="Posunout scénu dolů"
                >
                  ↓
                </button>
              </div>
            </div>

            {aktivniScena.prvky.length === 0 && <p className="sw-sc-prazdno">Scéna zatím nemá žádný text.</p>}

            {aktivniScena.prvky.map((p) =>
              p.typ === 'akce' ? (
                <div className="sw-sc-prvek" key={p.id}>
                  <p className="sw-sc-action">{p.text}</p>
                  <div className="sw-sc-prvek-btns">
                    <button
                      className="sw-sc-upravit"
                      onClick={() => {
                        setAkceText(p.text)
                        setUpravovanyPrvekId(p.id)
                        setFormOtevren('akce')
                      }}
                      aria-label="Upravit akci"
                    >
                      ✏️
                    </button>
                    <button className="sw-sc-smazat" onClick={() => deletePrvek(scenar.id, aktivniScena.id, p.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="sw-sc-prvek" key={p.id}>
                  <div className="sw-sc-character">{p.postava.toUpperCase()}</div>
                  {p.poznamka && <div className="sw-sc-paren">({p.poznamka})</div>}
                  <p className="sw-sc-dialogue">{p.text}</p>
                  <div className="sw-sc-prvek-btns">
                    <button
                      className="sw-sc-upravit"
                      onClick={() => {
                        setPostava(p.postava)
                        setDialogText(p.text)
                        setPoznamka(p.poznamka)
                        setUpravovanyPrvekId(p.id)
                        setFormOtevren('dialog')
                      }}
                      aria-label="Upravit repliku"
                    >
                      ✏️
                    </button>
                    <button className="sw-sc-smazat" onClick={() => deletePrvek(scenar.id, aktivniScena.id, p.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              )
            )}
          </div>

          <input
            type="text"
            className="sw-poznamka"
            placeholder="Poznámka jen pro tebe (nezobrazí se v Náhledu ani exportu)…"
            value={aktivniScena.poznamka}
            onChange={(e) => updateScena(scenar.id, aktivniScena.id, { poznamka: e.target.value })}
            maxLength={200}
          />

          {formOtevren === 'akce' && (
            <div className="sw-form">
              <textarea placeholder="Popiš, co se v téhle chvíli děje…" value={akceText} onChange={(e) => setAkceText(e.target.value)} rows={2} />
              <div className="sw-form-akce">
                <button className="sw-zrusit-btn" onClick={zrusitFormular}>
                  Zrušit
                </button>
                <button className="sw-ulozit-btn" onClick={pridatAkci}>
                  {upravovanyPrvekId ? 'Uložit' : 'Přidat akci'}
                </button>
              </div>
            </div>
          )}

          {formOtevren === 'dialog' && (
            <div className="sw-form">
              <input
                type="text"
                list="sw-postavy-list"
                placeholder="Jméno postavy"
                value={postava}
                onChange={(e) => setPostava(e.target.value)}
              />
              <datalist id="sw-postavy-list">
                {ziskejPostavy(scenar).map((jmeno) => (
                  <option key={jmeno} value={jmeno} />
                ))}
              </datalist>
              <input type="text" placeholder="Herecká poznámka (nepovinné)" value={poznamka} onChange={(e) => setPoznamka(e.target.value)} />
              <textarea placeholder="Text repliky…" value={dialogText} onChange={(e) => setDialogText(e.target.value)} rows={2} />
              <div className="sw-form-akce">
                <button className="sw-zrusit-btn" onClick={zrusitFormular}>
                  Zrušit
                </button>
                <button className="sw-ulozit-btn" onClick={pridatDialog}>
                  {upravovanyPrvekId ? 'Uložit' : 'Přidat repliku'}
                </button>
              </div>
            </div>
          )}

          {!formOtevren && (
            <div className="sw-toolbar">
              <button className="sw-btn" onClick={otevritPridaniAkce}>
                + Akce
              </button>
              <button className="sw-btn" onClick={otevritPridaniDialogu}>
                + Postava
              </button>
              <button className="sw-btn" onClick={otevritPridaniSceny}>
                + Scéna
              </button>
            </div>
          )}

          <button className="sw-smazat-scenu" onClick={smazatAktivniScenu}>
            Smazat tuhle scénu
          </button>
        </>
      )}

      <div className="sw-cil-radek">
        <label htmlFor="sw-cil">Cíl počtu scén na celý scénář</label>
        <input
          id="sw-cil"
          type="number"
          min={0}
          placeholder="např. 40"
          value={scenar.cilScen ?? ''}
          onChange={(e) => setCilScen(scenar.id, e.target.value === '' ? null : Math.max(0, Number(e.target.value)))}
        />
      </div>
    </div>
  )
}

const ScenarNahled: React.FC<{ scenar: Scenar; onZpet: () => void }> = ({ scenar, onZpet }) => (
  <div className="sw-app">
    <div className="sw-header">
      <button className="sw-zpet-btn" onClick={onZpet} aria-label="Zpět na editor">
        ←
      </button>
      <div className="sw-header-text">
        <strong>{scenar.nazev}</strong>
        <span>Náhled celého scénáře</span>
      </div>
      <button
        className="sw-nahled-btn"
        onClick={() => stahnoutTextovySoubor(`${scenar.nazev || 'scenar'}.txt`, sestavTextScenare(scenar))}
      >
        ⬇ .txt
      </button>
    </div>

    {scenar.sceny.length === 0 ? (
      <p className="sw-prazdno">Scénář zatím nemá žádnou scénu.</p>
    ) : (
      scenar.sceny.map((s, i) => (
        <div className="sw-script-page" key={s.id}>
          <div className="sw-sc-heading">{nadpisSceny(s, i + 1)}</div>
          {s.prvky.length === 0 && <p className="sw-sc-prazdno">Scéna zatím nemá žádný text.</p>}
          {s.prvky.map((p) =>
            p.typ === 'akce' ? (
              <div className="sw-sc-prvek" key={p.id}>
                <p className="sw-sc-action">{p.text}</p>
              </div>
            ) : (
              <div className="sw-sc-prvek" key={p.id}>
                <div className="sw-sc-character">{p.postava.toUpperCase()}</div>
                {p.poznamka && <div className="sw-sc-paren">({p.poznamka})</div>}
                <p className="sw-sc-dialogue">{p.text}</p>
              </div>
            )
          )}
        </div>
      ))
    )}
  </div>
)

// Osnova + fulltextové vyhledávání v jednom, stejný důvod jako u Knihy
// vedle — hledání beze seznamu, který filtruje, nedává smysl. Navíc
// obsazení (jména postav použitá v dialogu) nahoře, protože Osnova je
// jediné místo, kde appka o celém scénáři přemýšlí najednou, ne po
// jedné scéně.
const ScenarOsnova: React.FC<{ scenar: Scenar; onZpet: () => void; onOtevritScenu: (id: string) => void }> = ({
  scenar,
  onZpet,
  onOtevritScenu,
}) => {
  const [dotaz, setDotaz] = useState('')
  const postavy = ziskejPostavy(scenar)

  const najdiProScenu = (s: Scenar['sceny'][number]): boolean =>
    obsahujeDotaz(s.misto, dotaz) ||
    obsahujeDotaz(s.cas, dotaz) ||
    s.prvky.some((p) => obsahujeDotaz(p.text, dotaz) || (p.typ === 'dialog' && obsahujeDotaz(p.postava, dotaz)))

  const polozky = scenar.sceny.map((s, i) => ({ scena: s, poradi: i + 1 })).filter(({ scena }) => najdiProScenu(scena))

  return (
    <div className="sw-app">
      <div className="sw-header">
        <button className="sw-zpet-btn" onClick={onZpet} aria-label="Zpět na editor">
          ←
        </button>
        <div className="sw-header-text">
          <strong>{scenar.nazev}</strong>
          <span>Osnova a vyhledávání</span>
        </div>
      </div>

      <input
        type="text"
        placeholder="Hledat v místech, časech i replikách…"
        value={dotaz}
        onChange={(e) => setDotaz(e.target.value)}
        autoFocus
      />

      {postavy.length > 0 && (
        <div className="sw-postavy-radek">
          <span className="sw-panel-label">👥 Obsazení</span>
          <div className="sw-chip-row">
            {postavy.map((jmeno) => (
              <span className="sw-chip sw-chip--staticky" key={jmeno}>
                {jmeno}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="sw-seznam">
        {polozky.length === 0 && <p className="sw-prazdno">{dotaz ? 'Nic se nenašlo.' : 'Scénář zatím nemá žádnou scénu.'}</p>}
        {polozky.map(({ scena: s, poradi }) => {
          const zasahVMiste = obsahujeDotaz(s.misto, dotaz) || obsahujeDotaz(s.cas, dotaz)
          const prvekSeZasahem = zasahVMiste
            ? null
            : s.prvky.find((p) => obsahujeDotaz(p.text, dotaz) || (p.typ === 'dialog' && obsahujeDotaz(p.postava, dotaz)))
          const uryvek = prvekSeZasahem ? najdiUryvek(prvekSeZasahem.text, dotaz) ?? prvekSeZasahem.text.slice(0, 60) : null

          return (
            <div className="sw-radek" key={s.id}>
              <button className="sw-radek-otevrit" onClick={() => onOtevritScenu(s.id)}>
                <strong>{nadpisSceny(s, poradi)}</strong>
                <span>
                  {emojiStavu(s.stav)} {oznaceniStavu(s.stav)} · {s.prvky.length}{' '}
                  {plural(s.prvky.length, 'prvek', 'prvky', 'prvků')} ·{' '}
                  {pocetSlov(s.prvky.map((p) => p.text).join(' '))} {plural(pocetSlov(s.prvky.map((p) => p.text).join(' ')), 'slovo', 'slova', 'slov')}
                </span>
                {uryvek && <span className="sw-osnova-uryvek">„{uryvek}“</span>}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
