import React from 'react'

interface Props {}

export const PodporaNavod: React.FC<Props> = () => {
  return (
    <>
      <section className="settings-card">
        <div className="settings-card-head">
          <span className="settings-card-icon purple" aria-hidden="true">❓</span>
          <div>
            <h2 className="settings-card-title">Podpora a Nápověda</h2>
            <p className="settings-card-sub">Potřebuješ pomoc?</p>
          </div>
        </div>

        <div className="settings-form">
          <div className="settings-field">
            <span className="napoveda-podtitlek">Jak nás můžeš kontaktovat?</span>
            <p className="settings-card-sub">
              Pokud máš problém, otázku, nebo nápad na vylepšení aplikace, máš několik možností:
            </p>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">📧 Podpora přes formulář</span>
            <p className="settings-card-sub">
              V Nastavení je také sekce „Podpora". Tam najdeš formulář, kam si napíšeš svůj problém. Tým Buddy ti odpovídá co nejrychleji!
            </p>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">💬 Promluvit s Buddym</span>
            <p className="settings-card-sub">
              Buddy není jen hráč — je to i tvůj asistent! Můžeš si s ním promluvit přes tlačítko v dolní liště (🤖 Buddy) a požádat o:
            </p>
            <ul className="napoveda-seznam">
              <li>Tipy a rady na hru</li>
              <li>Vysvětlení pravidel</li>
              <li>Povzbuzení a motivaci</li>
              <li>Zajímavé historky</li>
            </ul>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">❓ Co by mohlo pomoct</span>
            <div className="napoveda-seznam">
              <div className="napoveda-polozka">
                <strong>Nejdříve zkus tuto Nápovědu</strong>
                <p>Tam najdeš odpovědi na základní otázky.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>Zkus restartovat aplikaci</strong>
                <p>Mnoho problémů se vyřeší zavřením a znovu otevřením.</p>
              </div>
              <div className="napoveda-polozka">
                <strong>Vymazat cache</strong>
                <p>Pokud vše trvá dlouho, zkus vyčistit cache aplikace v nastavení zařízení.</p>
              </div>
            </div>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">📝 Co nám napsat</span>
            <p className="settings-card-sub">
              Když napíšeš podporě, je dobré:
            </p>
            <ul className="napoveda-seznam">
              <li>✓ Jasně popsat, co se ti stalo</li>
              <li>✓ Říci, kdy se to stalo (včera, právě teď)</li>
              <li>✓ Zmínit, na jakém zařízení (iPhone/Android, jaká verze)</li>
              <li>✓ Popsat, co jsi zkoušel, aby se to vyřešilo</li>
            </ul>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">💡 Nápady a připomínky</span>
            <p className="settings-card-sub">
              Chceš v aplikaci něco změnit? Máš nápad na novou funkci? Také to můžeš napsat do podpory! Každý nápad si přečteme a zvažujeme ho.
            </p>
          </div>

          <div className="settings-field">
            <span className="napoveda-podtitlek">🤝 Děkujeme!</span>
            <p className="settings-card-sub">
              Děkujeme za to, že používáš Buddy. Tvůj feedback nám pomáhá aplikaci zlepšovat. Budeme se ti věnovat co nejdříve!
            </p>
          </div>
        </div>
      </section>
    </>
  )
}

export default PodporaNavod
