import React from 'react'
import { VSECHNY_POSTAVY } from '../combat/postavy'
import { SEZNAM_AREN } from '../arena/areny'

interface Props {
  onZpet: () => void
}

// ==========================================
// Jedenácté kolo vylepšení — "Návod" (movelist). Souboj do tohohle
// kola narostl na dost skrytých mechanik (chyt, tech, sražení k zemi,
// hype finisher, clash, náhlá smrt, vztek, komba, perfektní blok), že
// nikdo, kdo hru otevře poprvé, nemá šanci je sám objevit — appka je
// tu sepisuje na jedno místo, čistě čtecí obrazovka, žádná interakce
// se zápasem samotným. Data se čtou přímo z už existujících tabulek
// (POSTAVY/ARENY), ne z druhé, ručně psané kopie, co by se s nimi
// mohla časem rozejít.
// ==========================================

export const Navod: React.FC<Props> = ({ onZpet }) => {
  return (
    <div className="souboj-page">
      <header className="souboj-top-bar">
        <button className="souboj-back-btn" onClick={onZpet}>
          ← Zpět
        </button>
        <h1 className="souboj-title">Návod</h1>
      </header>

      <div className="souboj-navod">
        <section className="souboj-navod-sekce">
          <h2 className="souboj-navod-nadpis">Základy</h2>
          <ul className="souboj-navod-seznam">
            <li>👊 Úder / 🦵 Kop — obyčejné útoky, kop dá víc, ale je pomalejší.</li>
            <li>🛡️ Blok — sníží poškození, drž ho co nejkratší dobu na perfektní blok (viz níž).</li>
            <li>✨ Speciál — vlastní každé postavě, stojí manu (viz dole).</li>
            <li>👊 + 🛡️ současně = Chyt — neblokovatelný, ale slabší a kratší dosah.</li>
          </ul>
        </section>

        <section className="souboj-navod-sekce">
          <h2 className="souboj-navod-nadpis">Pokročilé techniky</h2>
          <ul className="souboj-navod-seznam">
            <li>
              <strong>Perfektní blok</strong> — zablokuj přesně v okamžiku zásahu (ne dopředu) a soupeř dostane
              žádné poškození vůbec, plus se sám na chvíli omráčí.
            </li>
            <li>
              <strong>Kombo</strong> — několik zásahů rychle po sobě dá každý další víc poškození.
            </li>
            <li>
              <strong>Comeback</strong> — bojuješ-li pod 30 % HP, tvé útoky dávají víc poškození.
            </li>
            <li>
              <strong>Vztek</strong> — plní se, když DOSTÁVÁŠ zásahy. Jakmile je plný, tvůj příští útok dá o
              hodně víc poškození.
            </li>
            <li>
              <strong>Hype</strong> — druhý, pomalejší ukazatel, co roste z každého zásahu (dávaného i
              přijímaného). Jakmile je plný, další speciál je zdarma a mnohem silnější — "finisher".
            </li>
            <li>
              <strong>Tech na chyt</strong> — zkusí-li obě strany chyt ve stejnou chvíli, žádná neuspěje, jen se
              obě na okamžik zapotácí.
            </li>
            <li>
              <strong>Simultánní clash</strong> — trefí-li se dva útoky proti sobě přesně ve stejnou chvíli, oba
              se odrazí, bez poškození pro kohokoli.
            </li>
            <li>
              <strong>Sražení k zemi</strong> — silný kop nebo speciál, co dopadne naplno, srazí soupeře na zem.
              Ležící bojovník je nezranitelný, ale nemůže nic dělat — drž při vstávání blok pro bezpečné probuzení.
            </li>
            <li>
              <strong>Náhlá smrt</strong> — dojde-li čas se shodným HP, kolo pokračuje s narůstajícím poškozením,
              dokud se HP nerozejdou.
            </li>
          </ul>
        </section>

        <section className="souboj-navod-sekce">
          <h2 className="souboj-navod-nadpis">Bojovníci a jejich speciál</h2>
          <div className="souboj-navod-postavy">
            {VSECHNY_POSTAVY.map((p) => (
              <div key={p.id} className="souboj-navod-postava">
                <span className="souboj-navod-postava-ikona" aria-hidden="true">
                  {p.ikona}
                </span>
                <div className="souboj-navod-postava-text">
                  <span className="souboj-navod-postava-jmeno">{p.jmeno}</span>
                  <span className="souboj-navod-postava-special">✨ {p.nazevSpecialu}</span>
                  <span className="souboj-navod-postava-podtitul">{p.podtitul}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="souboj-navod-sekce">
          <h2 className="souboj-navod-nadpis">Arény a jejich vlastnosti</h2>
          <ul className="souboj-navod-seznam">
            {SEZNAM_AREN.map((a) => (
              <li key={a.id}>
                {a.ikona} <strong>{a.nazev}</strong>
                {a.nebezpeciOkraje ? ' — odražení až ke kraji dá poškození navíc' : ''}
                {a.udalost === 'balvan' ? ' — periodicky padá balvan doprostřed' : ''}
                {a.udalost === 'zatmeni' ? ' — periodicky se na chvíli zatmí' : ''}
                {!a.nebezpeciOkraje && !a.udalost ? ' — klidná aréna, žádná vnější událost' : ''}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
