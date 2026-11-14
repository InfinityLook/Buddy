import { Link } from 'react-router-dom'

export function TutorialSekce() {
  return (
    <section className="settings-card">
      <h2 className="settings-card-title">První kroky v Buddy</h2>
      <ol className="settings-tutorial-steps">
        <li>V Hubu otevři Rooms a vyber si místnost podle toho, na čem chceš pracovat.</li>
        <li>Ve školní místnosti otevři Plánovač a zapiš první úkol.</li>
        <li>Spusť Pomodoro a vyber úkol, na který se chceš soustředit.</li>
      </ol>
      <Link className="buddy-ui-button" to="/navod">Otevřít všechny návody</Link>
    </section>
  )
}
