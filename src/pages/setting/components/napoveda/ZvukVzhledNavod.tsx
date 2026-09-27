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
                <p>Hlas, kterým Buddy k tobě mluví. Sled si tam jeho odpovědi.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>⚔️ Hra</strong>
                <p>Zvukové efekty v Souboji — úderům, zásahům, výhře/prohře.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>🎵 Music</strong>
                <p>Hudba a beaty v Music Studiu. Můžeš si jich poslechnout i v nabídce aplikací.</p>
              </div>
            </div>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">🎨 Vzhled — Barevná témata</span>
            <p className="settings-card-sub">
              V sekci Vzhled si vybereš, jak má aplikace vypadat. Máš několik barevných palet:
            </p>
            <ul className="napoveda-seznam">
              <li><strong>Volné téma</strong> — všichni si jich mohou vybrat</li>
              <li><strong>VIP téma</strong> — speciální pro členy s prémiusí</li>
            </ul>
            <p className="settings-card-sub">
              Změna je okamžitá — jakmile si vybereš, aplikace se hned překreslí v tom novém vzhledu.
            </p>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">💡 Tip</span>
            <p className="settings-card-sub">
              Zkus si třeba hlasitost Master pustit na 50 % a hrát Souboj — nebo si najít svůj oblíbený beat v Music Studiu!
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default ZvukVzhledNavod
