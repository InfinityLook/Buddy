import React from 'react'

interface Props {
  onVratit: () => void
}

export const ProfilNavod: React.FC<Props> = ({ onVratit }) => {
  return (
    <>
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon purple" aria-hidden="true">👤</span>
          <div>
            <h2 className="settings-card-title">Tvůj Profil</h2>
            <p className="settings-card-sub">Osobní údaje a vzhled</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-field">
            <span className="napoveda-podtitlek">Co si můžeš upravit?</span>
            <div className="napoveda-seznam">
              <div className="napoveda-polozka">
                <strong>📛 Jméno</strong>
                <p>Jak se chtceš jmenovat v aplikaci. Ostatní to budou vidět na tvém profilu.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>📧 E-mail</strong>
                <p>Používá se pro přihlášení a obnovení hesla. Měl by být platný.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>💬 Motto</strong>
                <p>Krátký text, kterého si můžeš zvolit sám. Lidé ho uvidí na tvém profilu.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>📝 O mně</strong>
                <p>Prostor pro delší text o sobě — zájmy, favority, co chceš. Maximálně 300 znaků.</p>
              </div>
            </div>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">Kde to najdu?</span>
            <p className="settings-card-sub">
              Jdi do Nastavení → prvá položka je Profil a údaje. Tam si vše můžeš změnit a pak kliknout na „Uložit změny".
            </p>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">Rámeček avatara</span>
            <p className="settings-card-sub">
              V Nastavení → Vzhled a rámečky si můžeš vybrat speciální rámeček kolem své fotky. Některé jsou volné, některé jsou pro VIP.
            </p>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">🔒 Bezpečnost</span>
            <p className="settings-card-sub">
              Tvé osobní údaje jsou uloženy bezpečně. Vidí je jen ty a správcové aplikace. Na sociální části (Profil v Social) si můžeš nastavit, kdo tě sleduje.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default ProfilNavod
