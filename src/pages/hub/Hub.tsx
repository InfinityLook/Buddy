import './Hub.css'
import mascot from '../../assets/mascot.png'

const ACTIONS = [
  { key: 'profile', label: 'Profil', icon: 'user', side: 'left' },
  { key: 'community', label: 'Komunita', icon: 'users', side: 'right' },
  { key: 'app', label: 'App', icon: 'grid', side: 'left' },
  { key: 'shop', label: 'Shop', icon: 'bag', side: 'right' },
  { key: 'rewards', label: 'Rewards', icon: 'gift', side: 'left', badge: 'NEW' },
  { key: 'cloud', label: 'Cloud', icon: 'cloud', side: 'right' },
  { key: 'sound', label: 'Sound', icon: 'speaker', side: 'left' },
  { key: 'settings', label: 'Settings', icon: 'gear', side: 'right' }
]

function Icon({ name }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'user':
      return (
        <svg {...common}><circle cx="12" cy="8" r="3.4" /><path d="M5 20c1.2-3.6 4-5.4 7-5.4s5.8 1.8 7 5.4" /></svg>
      )
    case 'users':
      return (
        <svg {...common}><circle cx="9" cy="8.5" r="3" /><path d="M2.5 20c1-3 3.3-4.7 6.5-4.7s5.5 1.7 6.5 4.7" /><circle cx="17" cy="9" r="2.4" /><path d="M15.5 14.4c2.5.3 4 1.8 4.8 4.1" /></svg>
      )
    case 'grid':
      return (
        <svg {...common}><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg>
      )
    case 'bag':
      return (
        <svg {...common}><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
      )
    case 'gift':
      return (
        <svg {...common}><rect x="3.5" y="9" width="17" height="11" rx="1.5" /><path d="M3.5 9h17M12 9v11" /><path d="M12 9C9 9 8 7 8 5.8A2.3 2.3 0 0 1 12 4.4 2.3 2.3 0 0 1 16 5.8C16 7 15 9 12 9z" /></svg>
      )
    case 'cloud':
      return (
        <svg {...common}><path d="M7 18a4.2 4.2 0 0 1-.6-8.35 5.2 5.2 0 0 1 10-1.7A4 4 0 0 1 17 18H7z" /></svg>
      )
    case 'speaker':
      return (
        <svg {...common}><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 9a4 4 0 0 1 0 6" /><path d="M18 7a7 7 0 0 1 0 10" /></svg>
      )
    case 'gear':
      return (
        <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 12a7.4 7.4 0 0 0-.1-1l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-1.7-1l-.4-2.5h-4l-.4 2.5a7.6 7.6 0 0 0-1.7 1l-2.4-.9-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 1.7-1l2.4.9 2-3.4-2-1.6c.07-.33.1-.66.1-1z" /></svg>
      )
    case 'mic':
      return (
        <svg {...common}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></svg>
      )
    case 'controller':
      return (
        <svg {...common}><rect x="2.5" y="8" width="19" height="9" rx="4" /><path d="M7 10.5v4M5 12.5h4" /><circle cx="16" cy="11" r="1" /><circle cx="18.3" cy="13.3" r="1" /></svg>
      )
    case 'logout':
      return (
        <svg {...common}><path d="M9 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h3" /><path d="M14 8l4 4-4 4" /><path d="M18 12H9" /></svg>
      )
    default:
      return null
  }
}

export default function Hub({ onLogout }) {
  return (
    <div className="hub-screen">
      <header className="hub-topbar">
        <div className="hub-brand">
          <span className="hub-brand__mark">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z" fill="url(#hub-brand-gradient)" />
              <defs>
                <linearGradient id="hub-brand-gradient" x1="3" y1="2" x2="21" y2="20">
                  <stop offset="0" stopColor="#35c4f0" />
                  <stop offset="1" stopColor="#8a5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span className="hub-brand__name">SchoolBuddy</span>
        </div>

        <div className="hub-level">
          <span className="hub-level__star">★</span>
          <div className="hub-level__meta">
            <span className="hub-level__label">ÚROVEŇ 12</span>
            <div className="hub-level__bar">
              <div className="hub-level__fill" style={{ width: '38%' }} />
            </div>
          </div>
          <button className="hub-level__logout" onClick={onLogout} aria-label="Odhlásit se">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      {/* Slot for a rotating banner / streak alert — swap for real content later */}
      <section className="hub-banner hub-banner--alert">
        <span className="hub-banner__eyebrow">Denní výzva</span>
        <p className="hub-banner__title">Dnes tě čeká 3 úkoly z matematiky</p>
      </section>

      <main className="hub-main">
        <div className="hub-actions hub-actions--left">
          {ACTIONS.filter((a) => a.side === 'left').map((a) => (
            <ActionButton key={a.key} action={a} />
          ))}
        </div>

        <div className="hub-mascot-area">
          <div className="hub-speech-bubble">
            Ahoj! 👋 Jsem Buddy, tvůj studijní parťák. Společně to zvládneme!
            <span className="hub-speech-bubble__heart">💙</span>
          </div>
          <img className="hub-mascot" src={mascot} alt="Buddy, maskot SchoolBuddy" />
          <div className="hub-mascot-glow" aria-hidden="true" />
        </div>

        <div className="hub-actions hub-actions--right">
          {ACTIONS.filter((a) => a.side === 'right').map((a) => (
            <ActionButton key={a.key} action={a} />
          ))}
        </div>
      </main>

      {/* Slot for a positive-reinforcement banner (streak saved, XP gained, etc.) */}
      <section className="hub-banner hub-banner--success">
        <span className="hub-banner__eyebrow">Tvůj postup</span>
        <p className="hub-banner__title">Zbývá 120 XP do další úrovně 🎉</p>
      </section>

      <footer className="hub-bottombar">
        <button className="hub-icon-btn" aria-label="Zvuk">
          <Icon name="speaker" />
        </button>

        <button className="hub-talk-btn">
          <Icon name="mic" />
          <span>PROMLUV SI SE MNOU</span>
        </button>

        <button className="hub-icon-btn" aria-label="Hry">
          <Icon name="controller" />
        </button>
      </footer>
    </div>
  )
}

function ActionButton({ action }) {
  return (
    <button className="hub-action-btn">
      <span className="hub-action-btn__icon">
        <Icon name={action.icon} />
        {action.badge && <span className="hub-action-btn__badge">{action.badge}</span>}
      </span>
      <span className="hub-action-btn__label">{action.label}</span>
    </button>
  )
}
