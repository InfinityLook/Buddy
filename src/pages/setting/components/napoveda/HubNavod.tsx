import React from 'react'

interface Props {}

export const HubNavod: React.FC<Props> = () => {
  return (
    <>
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon blue" aria-hidden="true">🏠</span>
          <div>
            <h2 className="settings-card-title">Hub — Tvůj domov</h2>
            <p className="settings-card-sub">Hlavní místo pro všechno důležité</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-field">
            <span className="napoveda-podtitlek">Co je Hub?</span>
            <p className="settings-card-sub">
              Hub je „domovská obrazovka" aplikace Buddy. Když aplikaci otevřeš, ocitneš se tady. Je to místo, kde si můžeš vybrat, kam dál chceš jít.
            </p>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">Hlavní funkce na Hubu</span>
            <div className="napoveda-seznam">
              <div className="napoveda-polozka">
                <strong>Rooms a aplikace</strong>
                <p>Vyber si místnost nebo otevři Plánovač, Pomodoro, poznámky či Music Studio.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>Feed a chaty</strong>
                <p>Příspěvky, profily a rozhovory s ostatními.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>🏆 Odměny a Statistiky</strong>
                <p>Sleduj svůj progress, XP a odznaky, které jsi získal.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>⚙️ Nastavení</strong>
                <p>Všechny osobní údaje, bezpečnost a vzhled aplikace.</p>
              </div>
            </div>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">Spodní navigační lišta</span>
            <p className="settings-card-sub">
              Na konci obrazovky najdeš lištu s pěti tlačítky:
            </p>
            <ul className="napoveda-seznam">
              <li><strong>🏠 Home</strong> – Zpět na Hub</li>
              <li><strong>🔍 Hledat</strong> – Vyhledávání lidí a hashtagů</li>
              <li><strong>👤 Profil</strong> – Tvůj profil a upozornění</li>
              <li><strong>💬 Chat</strong> – Zprávy od přátel</li>
              <li><strong>⚙️ Settings</strong> – Nastavení aplikace</li>
            </ul>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">💡 Tip</span>
            <p className="settings-card-sub">
              Buddyho otevřeš přes Menu → AI. Tlačítkem Chat otevřeš rozhovor.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default HubNavod
