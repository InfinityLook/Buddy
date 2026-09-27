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
                <strong>🎮 Aplikace (Souboj, Music Studio, úkoly)</strong>
                <p>Všechny hry a aktivity, kterými se můžeš zábavou zlepšovat.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>👥 Social (Profily, Chaty, Komunita)</strong>
                <p>Setkání s ostatními hráči, chat a sdílení obsahu.</p>
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
              <li><strong>🔍 Hledat</strong> – Vyhledávání v Socialu</li>
              <li><strong>🤖 Buddy</strong> – Promluvit s asistent (uprostřed)</li>
              <li><strong>💬 Chat</strong> – Zprávy od přátel</li>
              <li><strong>⚙️ Settings</strong> – Nastavení aplikace</li>
            </ul>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">💡 Tip</span>
            <p className="settings-card-sub">
              Tlačítko Buddy v liště je speciální — kliknutím si s ním můžeš promluvit a získat rady, nebo si poslechnout nějakou historku!
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default HubNavod
