import React from 'react'

interface Props {}

export const ZvukVzhledNavod: React.FC<Props> = () => {
  return (
    <>
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon amber" aria-hidden="true">🎨</span>
          <div>
            <h2 className="settings-card-title">Zvuk a Vzhled</h2>
            <p className="settings-card-sub">Postav si aplikaci po svém</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-field">
            <span className="napoveda-podtitlek">🔊 Zvuk — Hlasitost</span>
            <p className="settings-card-sub">
              V sekci Zvuk nastavíš, jak hlasitě aplikace přehrává zvuky. Máš 4 posuvníky:
            </p>
            <div className="napoveda-seznam">
              <div className="napoveda-polozka">
                <strong>Master</strong>
                <p>Celková hlasitost — když to stáhneš na 0 %, nic neslyšíš, i kdyby ostatní byly nahoru.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>🤖 Buddy</strong>
                <p>Hlasitost mluvených odpovědí Buddyho.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>⚔️ Hra</strong>
                <p>Uložená hlasitost herních efektů. Hry jsou v této verzi skryté.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>🎵 Music</strong>
                <p>Hlasitost hudby a beatů v Music Studiu.</p>
              </div>
            </div>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">🎨 Vzhled — Barevná témata</span>
            <p className="settings-card-sub">
              V nastavení vzhledu si vybereš jeden z pěti motivů pro celou aplikaci.
            </p>
            <p className="settings-card-sub">
              U podporovaných obrazovek můžeš zvolit také vlastní motiv. Náhled v Rooms si prohlédneš před uložením do celé aplikace.
            </p>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">💡 Tip</span>
            <p className="settings-card-sub">
              Hlasitost si můžeš vyzkoušet při přehrávání beatu v Music Studiu.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default ZvukVzhledNavod
