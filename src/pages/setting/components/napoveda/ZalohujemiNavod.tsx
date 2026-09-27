import React from 'react'

interface Props {
  onVratit: () => void
}

export const ZalohujemiNavod: React.FC<Props> = ({ onVratit }) => {
  return (
    <>
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">💾</span>
          <div>
            <h2 className="settings-card-title">Zálohování dat</h2>
            <p className="settings-card-sub">Bezpečně ulož svou práci</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-field">
            <span className="napoveda-podtitlek">Co je zálohování?</span>
            <p className="settings-card-sub">
              Zálohování ti umožňuje uložit si kopii všech dat z aplikace. Pokud si vezmeš nový telefon nebo si omylem smazeš data, můžeš je obnovit.
            </p>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">Jak funguje?</span>
            <div className="napoveda-seznam">
              <div className="napoveda-polozka">
                <strong>1. Stáhnout zálohu</strong>
                <p>Klikneš na tlačítko a aplikace ti uloží kompletní soubor se všemi tvými daty na zařízení nebo do cloudu.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>2. Obnovit ze zálohy</strong>
                <p>Když máš starou zálohu, můžeš si ji nahrát zpátky a všechna data se vrátí jak byla.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>3. Pokračovat kde jsi skončil</strong>
                <p>Po obnovení budeš mít všechny úkoly, body a nastavení přesně jak byla.</p>
              </div>
            </div>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">Kdy si udělat zálohu?</span>
            <ul className="napoveda-seznam">
              <li>Po důležitých akcích (když skončíš velký úkol, získaš achievement)</li>
              <li>Před vypnutím či obnovou zařízení</li>
              <li>Každý týden minimálně jednou</li>
              <li>Když se chystáš změnit telefon</li>
            </ul>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">Cloud synchronizace</span>
            <p className="settings-card-sub">
              Pokud máš zapnutou Cloud sync, Buddy automaticky synchronizuje tvoje XP a odznaky mezi všemi zařízeními, která používáš. To znamená:
            </p>
            <ul className="napoveda-seznam">
              <li>✓ XP a odznaky se synchronizují</li>
              <li>✗ Ostatní data (nastavení, fotky) zůstávají jen na tom zařízení</li>
            </ul>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">⚠️ Důležité</span>
            <p className="settings-card-sub">
              Zálohování není povinné, ale velmi se doporučuje. Bez něj se můžeš zbavit všech svých dat, pokud si zařízení smažeš nebo ho ztratíš!
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default ZalohujemiNavod
