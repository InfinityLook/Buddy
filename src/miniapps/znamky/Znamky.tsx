import React, { useState } from 'react'
import { SurfaceBackdrop, useSurfaceAppearance } from '@/features/appearance/SurfaceAppearance'
import { useZnamky } from './useZnamky'
import {
  MAX_ZNAMKA,
  MIN_ZNAMKA,
  Predmet,
  Znamka,
  celkovyVazenyPrumer,
  soucetKreditu,
  spocitejProcentaCileProumeru,
  sPridanouHypotetickouZnamkou,
  vazenyPrumerPredmetu,
  znamkaSlovy,
} from './types'
import './Znamky.css'

const dnesniDatumIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const Znamky: React.FC = () => {
  const { rootAttributes } = useSurfaceAppearance('znamky')

  const {
    predmety,
    pridatPredmet,
    smazatPredmet,
    pridatZnamku,
    smazatZnamku,
    nastavCilPredmetu,
    upravitPredmet,
    upravitZnamku,
  } = useZnamky()

  const [formPredmetOtevreny, setFormPredmetOtevreny] = useState(false)
  const [nazevPredmetu, setNazevPredmetu] = useState('')
  const [kredityPredmetu, setKredityPredmetu] = useState('')

  const [rozbalenyPredmet, setRozbalenyPredmet] = useState<string | null>(null)
  const [hodnota, setHodnota] = useState(1)
  const [vaha, setVaha] = useState('1')
  const [popis, setPopis] = useState('')

  // Kalkulačka "co kdyby" — id předmětu, u kterého je otevřená, ne
  // globální přepínač, aby otevření jinde nezavíralo tu právě
  // rozjednanou. Hypotetická známka se nikdy neukládá, jen se dočasně
  // přimíchá do kopie seznamu předmětů (sPridanouHypotetickouZnamkou)
  // a appka na ní znovu spustí ty úplně stejné výpočty průměru.
  const [coKdybyOtevreno, setCoKdybyOtevreno] = useState<string | null>(null)
  const [coKdybyHodnota, setCoKdybyHodnota] = useState(1)
  const [coKdybyVaha, setCoKdybyVaha] = useState('1')

  // Cíl průměru pro jeden konkrétní předmět — stejný "otevřený formulář
  // je id předmětu, ne globální přepínač" vzor jako coKdybyOtevreno výš,
  // aby otevření cíle u jednoho předmětu nezavíralo rozjednaný cíl u
  // jiného. cilHodnota se naplní při otevření formuláře, ne live z p.cil,
  // takže psaní do inputu nepřepisuje uložený cíl dřív, než appka
  // dostane "Nastavit".
  const [cilFormOtevreny, setCilFormOtevreny] = useState<string | null>(null)
  const [cilHodnota, setCilHodnota] = useState('')

  // Úprava názvu/kreditů existujícího předmětu — stejný "otevřený
  // formulář je id předmětu, ne globální přepínač" vzor jako
  // cilFormOtevreny/coKdybyOtevreno výš.
  const [upravovanyPredmetId, setUpravovanyPredmetId] = useState<string | null>(null)
  const [upravovanyNazev, setUpravovanyNazev] = useState('')
  const [upravovanyKredity, setUpravovanyKredity] = useState('')

  // Úprava existující známky — formulář pro novou známku (hodnota/vaha/
  // popis výš) se stává dvoj-účelovým: když je tohle nastavené, submit
  // tlačítko se změní na "Uložit" a zavolá upravitZnamku místo
  // pridatZnamku, stejný vzor jako Writer's Roomova "add forma se stává
  // edit formou" u scén/panelů.
  const [upravovanaZnamkaId, setUpravovanaZnamkaId] = useState<string | null>(null)

  const celkovyPrumer = celkovyVazenyPrumer(predmety)
  const celkoveKredity = soucetKreditu(predmety)

  const predmetyCoKdyby = coKdybyOtevreno
    ? sPridanouHypotetickouZnamkou(predmety, coKdybyOtevreno, coKdybyHodnota, Number(coKdybyVaha) || 1)
    : null
  const projektovanyPrumerPredmetu = predmetyCoKdyby
    ? vazenyPrumerPredmetu(predmetyCoKdyby.find((p) => p.id === coKdybyOtevreno)!)
    : null
  const projektovanyCelkovyPrumer = predmetyCoKdyby ? celkovyVazenyPrumer(predmetyCoKdyby) : null

  const pridatNovyPredmet = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nazevPredmetu.trim()) return
    pridatPredmet(nazevPredmetu, Number(kredityPredmetu) || 0)
    setNazevPredmetu('')
    setKredityPredmetu('')
    setFormPredmetOtevreny(false)
  }

  // Zavolá se i při přepínání (sbalení/rozbalení jiného) předmětu — bez
  // téhle reakce by zůstala viset upravovanaZnamkaId ze zavřeného
  // předmětu a formulář "+ Známka" u JINÉHO předmětu by se tiše tvářil,
  // že upravuje cizí (neexistující) známku, místo aby přidal novou.
  const zrusitEditaciZnamky = () => {
    setUpravovanaZnamkaId(null)
    setHodnota(1)
    setVaha('1')
    setPopis('')
  }

  const odebratPredmet = (p: Predmet) => {
    if (!window.confirm(`Smazat předmět „${p.nazev}“ i se všemi známkami?`)) return
    smazatPredmet(p.id)
    if (rozbalenyPredmet === p.id) {
      setRozbalenyPredmet(null)
      zrusitEditaciZnamky()
    }
    // Bez tohohle by "co kdyby" panel zůstal ukazovat na smazaný předmět
    // — projektovanyPrumerPredmetu se počítá na každém renderu bez
    // ohledu na to, jestli je rozbalovací panel vůbec vidět, takže
    // sPridanouHypotetickouZnamkou by vrátila seznam bez téhle položky
    // a .find(...)! by spadl na undefined (viz CLAUDE.md).
    if (coKdybyOtevreno === p.id) setCoKdybyOtevreno(null)
    if (cilFormOtevreny === p.id) setCilFormOtevreny(null)
    if (upravovanyPredmetId === p.id) setUpravovanyPredmetId(null)
  }

  const otevritEditaciPredmetu = (p: Predmet) => {
    setUpravovanyNazev(p.nazev)
    setUpravovanyKredity(p.kredity > 0 ? String(p.kredity) : '')
    setUpravovanyPredmetId(upravovanyPredmetId === p.id ? null : p.id)
  }

  const ulozitEditaciPredmetu = (e: React.FormEvent, predmetId: string) => {
    e.preventDefault()
    if (!upravovanyNazev.trim()) return
    upravitPredmet(predmetId, upravovanyNazev, Number(upravovanyKredity) || 0)
    setUpravovanyPredmetId(null)
  }

  const otevritEditaciZnamky = (z: Znamka) => {
    setUpravovanaZnamkaId(z.id)
    setHodnota(z.hodnota)
    setVaha(String(z.vaha))
    setPopis(z.popis)
  }

  const otevritCilForm = (p: Predmet) => {
    setCilHodnota(p.cil != null ? String(p.cil) : '')
    setCilFormOtevreny(cilFormOtevreny === p.id ? null : p.id)
  }

  const ulozitCilPredmetu = (e: React.FormEvent, predmetId: string) => {
    e.preventDefault()
    const hodnota = Number(cilHodnota)
    if (!cilHodnota.trim() || !Number.isFinite(hodnota)) return
    nastavCilPredmetu(predmetId, Math.max(MIN_ZNAMKA, Math.min(MAX_ZNAMKA, hodnota)))
    setCilFormOtevreny(null)
  }

  const zrusitCilPredmetu = (predmetId: string) => {
    nastavCilPredmetu(predmetId, null)
    setCilFormOtevreny(null)
  }

  // Formulář pod seznamem známek je dvoj-účelový: beze upravovanaZnamkaId
  // přidá novou známku s dnešním datem (jako dřív), s ním upraví
  // existující a zachová jí původní datum (pole na datum appka nikdy
  // nenabízela, takže ho při úpravě nemá smysl nahrazovat dneškem).
  const odeslatFormularZnamky = (e: React.FormEvent, predmetId: string) => {
    e.preventDefault()
    if (upravovanaZnamkaId) {
      const puvodniDatum =
        predmety
          .find((pp) => pp.id === predmetId)
          ?.znamky.find((z) => z.id === upravovanaZnamkaId)?.datum ?? dnesniDatumIso()
      upravitZnamku(predmetId, upravovanaZnamkaId, hodnota, Number(vaha) || 1, popis, puvodniDatum)
      setUpravovanaZnamkaId(null)
    } else {
      pridatZnamku(predmetId, hodnota, Number(vaha) || 1, popis, dnesniDatumIso())
    }
    setPopis('')
    setVaha('1')
  }

  return (
    <div className="znamky buddy-theme-scope" {...rootAttributes}>
      <SurfaceBackdrop surfaceId="znamky" />
      <div className="znamky-souhrn">
        <div className="znamky-souhrn-cislo">
          <span className="znamky-souhrn-hodnota">
            {celkovyPrumer !== null ? celkovyPrumer.toFixed(2) : '—'}
          </span>
          <span className="znamky-souhrn-popisek">Celkový průměr</span>
        </div>
        <div className="znamky-souhrn-cislo">
          <span className="znamky-souhrn-hodnota">{celkoveKredity}</span>
          <span className="znamky-souhrn-popisek">Kreditů celkem</span>
        </div>
      </div>

      <button className="znamky-pridat-btn" onClick={() => setFormPredmetOtevreny((o) => !o)}>
        + Přidat předmět
      </button>

      {formPredmetOtevreny && (
        <form className="znamky-form" onSubmit={pridatNovyPredmet}>
          <input
            placeholder="Název předmětu"
            value={nazevPredmetu}
            onChange={(e) => setNazevPredmetu(e.target.value)}
            spellCheck
            lang="cs"
            autoFocus
            required
          />
          <input
            type="number"
            min={0}
            placeholder="Kredity (nepovinné)"
            value={kredityPredmetu}
            onChange={(e) => setKredityPredmetu(e.target.value)}
          />
          <div className="znamky-form-akce">
            <button type="button" className="znamky-form-zrusit" onClick={() => setFormPredmetOtevreny(false)}>
              Zrušit
            </button>
            <button type="submit" className="znamky-form-ulozit">
              Přidat
            </button>
          </div>
        </form>
      )}

      {predmety.length === 0 && !formPredmetOtevreny && (
        <p className="znamky-prazdno">Zatím žádné předměty — přidej první.</p>
      )}

      <div className="znamky-seznam">
        {predmety.map((p) => {
          const prumer = vazenyPrumerPredmetu(p)
          const rozbaleno = rozbalenyPredmet === p.id
          return (
            <div key={p.id} className="znamky-predmet">
              <button
                className="znamky-predmet-hlavicka"
                onClick={() => {
                  setRozbalenyPredmet(rozbaleno ? null : p.id)
                  // Jinak by formulář "+ Známka" u předmětu, do kterého
                  // uživatel právě přepnul, zůstal tiše v "upravuje se"
                  // módu kvůli znamka-id patřícímu předchozímu předmětu.
                  zrusitEditaciZnamky()
                }}
              >
                <span className="znamky-predmet-nazev">
                  {p.nazev}
                  {p.kredity > 0 && <span className="znamky-predmet-kredity"> · {p.kredity} kr.</span>}
                </span>
                <span className="znamky-predmet-prumer">{prumer !== null ? prumer.toFixed(2) : '—'}</span>
              </button>

              {rozbaleno && (
                <div className="znamky-predmet-detail">
                  <button
                    type="button"
                    className="znamky-predmet-upravit-btn"
                    onClick={() => otevritEditaciPredmetu(p)}
                  >
                    ✎ Upravit předmět
                  </button>

                  {upravovanyPredmetId === p.id && (
                    <form className="znamky-form" onSubmit={(e) => ulozitEditaciPredmetu(e, p.id)}>
                      <input
                        placeholder="Název předmětu"
                        value={upravovanyNazev}
                        onChange={(e) => setUpravovanyNazev(e.target.value)}
                        spellCheck
                        lang="cs"
                        autoFocus
                        required
                      />
                      <input
                        type="number"
                        min={0}
                        placeholder="Kredity (nepovinné)"
                        value={upravovanyKredity}
                        onChange={(e) => setUpravovanyKredity(e.target.value)}
                      />
                      <div className="znamky-form-akce">
                        <button
                          type="button"
                          className="znamky-form-zrusit"
                          onClick={() => setUpravovanyPredmetId(null)}
                        >
                          Zrušit
                        </button>
                        <button type="submit" className="znamky-form-ulozit">
                          Uložit
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="znamky-cil-panel">
                    {(() => {
                      const cilProcenta = spocitejProcentaCileProumeru(prumer, p.cil ?? null)
                      return cilProcenta !== null && p.cil != null ? (
                        <div className="znamky-cil-progres-wrap">
                          <div className="znamky-cil-progres-hlavicka">
                            <span>
                              {prumer!.toFixed(2)} / cíl {p.cil.toFixed(1)}
                            </span>
                            <button
                              type="button"
                              className="znamky-cil-upravit"
                              onClick={() => otevritCilForm(p)}
                            >
                              ✎ Upravit
                            </button>
                          </div>
                          <div
                            className="znamky-cil-progres-bar"
                            role="progressbar"
                            aria-valuenow={cilProcenta}
                            aria-valuemin={0}
                            aria-valuemax={100}
                          >
                            <div
                              className="znamky-cil-progres-vypln"
                              style={{ width: `${cilProcenta}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <button type="button" className="znamky-cil-nastavit-btn" onClick={() => otevritCilForm(p)}>
                          🎯 Nastavit cíl průměru
                        </button>
                      )
                    })()}

                    {cilFormOtevreny === p.id && (
                      <form className="znamky-cil-form" onSubmit={(e) => ulozitCilPredmetu(e, p.id)}>
                        <input
                          type="number"
                          min={MIN_ZNAMKA}
                          max={MAX_ZNAMKA}
                          step={0.1}
                          placeholder={`Cíl (${MIN_ZNAMKA}–${MAX_ZNAMKA})`}
                          value={cilHodnota}
                          onChange={(e) => setCilHodnota(e.target.value)}
                          autoFocus
                        />
                        <button type="submit" className="znamky-cil-ulozit">
                          Uložit
                        </button>
                        {p.cil != null && (
                          <button type="button" className="znamky-cil-zrusit" onClick={() => zrusitCilPredmetu(p.id)}>
                            Zrušit cíl
                          </button>
                        )}
                      </form>
                    )}
                  </div>

                  {p.znamky.length === 0 && <p className="znamky-prazdno">Zatím žádná známka.</p>}
                  <ul className="znamky-znamky-seznam">
                    {p.znamky.map((z) => (
                      <li key={z.id} className="znamky-znamka-radek">
                        <span className={`znamky-znamka-badge znamky-znamka-badge--${z.hodnota}`}>{z.hodnota}</span>
                        <span className="znamky-znamka-text">
                          {znamkaSlovy(z.hodnota)}
                          {z.popis && ` · ${z.popis}`}
                          {z.vaha !== 1 && ` (váha ${z.vaha})`}
                        </span>
                        <button
                          className="znamky-znamka-upravit"
                          aria-label="Upravit známku"
                          onClick={() => otevritEditaciZnamky(z)}
                        >
                          ✎
                        </button>
                        <button
                          className="znamky-znamka-smazat"
                          aria-label="Smazat známku"
                          onClick={() => {
                            if (window.confirm(`Smazat známku ${z.hodnota} z ${p.nazev}?`)) {
                              smazatZnamku(p.id, z.id)
                              // Bez tohohle by rozjednaný formulář zůstal
                              // ukazovat "Uložit" nad teď už smazanou
                              // známkou a submit by tiše nic nezměnil.
                              if (upravovanaZnamkaId === z.id) zrusitEditaciZnamky()
                            }
                          }}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>

                  <form className="znamky-znamka-form" onSubmit={(e) => odeslatFormularZnamky(e, p.id)}>
                    <select value={hodnota} onChange={(e) => setHodnota(Number(e.target.value))}>
                      {Array.from({ length: MAX_ZNAMKA - MIN_ZNAMKA + 1 }, (_, i) => MIN_ZNAMKA + i).map((h) => (
                        <option key={h} value={h}>
                          {h} — {znamkaSlovy(h)}
                        </option>
                      ))}
                    </select>
                    {/* min musí sedět se step, jinak HTML5 constraint
                        validation tiše odmítne submit celého formuláře
                        (žádná viditelná chyba, jen "nic se nestane") — s
                        min={0.1} nebyla výchozí hodnota '1' platný násobek
                        kroku 0.5 od 0.1, takže "+ Známka" nikdy nešlo
                        odeslat, dokud uživatel váhu sám ručně nezměnil.
                        min={0.5} dělá z výchozí '1' platnou hodnotu
                        (1 − 0.5 = 0.5, přesně jeden krok). */}
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      placeholder="Váha"
                      value={vaha}
                      onChange={(e) => setVaha(e.target.value)}
                    />
                    <input
                      placeholder="Popis (test, aktivita…)"
                      value={popis}
                      onChange={(e) => setPopis(e.target.value)}
                      spellCheck
                      lang="cs"
                    />
                    <div className="znamky-znamka-form-akce">
                      <button type="submit" className="znamky-znamka-pridat">
                        {upravovanaZnamkaId ? 'Uložit' : '+ Známka'}
                      </button>
                      {upravovanaZnamkaId && (
                        <button type="button" className="znamky-znamka-zrusit" onClick={zrusitEditaciZnamky}>
                          Zrušit
                        </button>
                      )}
                    </div>
                  </form>

                  <button
                    type="button"
                    className="znamky-cokdyby-btn"
                    onClick={() => setCoKdybyOtevreno(coKdybyOtevreno === p.id ? null : p.id)}
                  >
                    🔮 {coKdybyOtevreno === p.id ? 'Skrýt' : 'Co kdyby…'}
                  </button>

                  {coKdybyOtevreno === p.id && (
                    <div className="znamky-cokdyby">
                      <p className="znamky-cokdyby-popis">
                        Jaký dopad by měla další známka na průměr, než ji doopravdy zapíšeš?
                      </p>
                      <div className="znamky-cokdyby-form">
                        <select value={coKdybyHodnota} onChange={(e) => setCoKdybyHodnota(Number(e.target.value))}>
                          {Array.from({ length: MAX_ZNAMKA - MIN_ZNAMKA + 1 }, (_, i) => MIN_ZNAMKA + i).map((h) => (
                            <option key={h} value={h}>
                              {h} — {znamkaSlovy(h)}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          min={0.5}
                          step={0.5}
                          placeholder="Váha"
                          value={coKdybyVaha}
                          onChange={(e) => setCoKdybyVaha(e.target.value)}
                        />
                      </div>
                      <div className="znamky-cokdyby-vysledek">
                        <span>
                          Průměr předmětu: <strong>{projektovanyPrumerPredmetu?.toFixed(2) ?? '—'}</strong>
                        </span>
                        <span>
                          Celkový průměr: <strong>{projektovanyCelkovyPrumer?.toFixed(2) ?? '—'}</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  <button className="znamky-predmet-smazat" onClick={() => odebratPredmet(p)}>
                    Smazat celý předmět
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Znamky
