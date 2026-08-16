import React from 'react'
import { ProfilIcon } from './ProfilIcon'

export interface NotificationItem {
  id: string
  title: string
  time: string
}

export const NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: 'Kairo ti poslal novou výzvu na dnešek 🔥', time: 'před 5 min' },
  { id: 'n2', title: 'Dokončil jsi lekci "Zlomky" — +40 XP', time: 'před 2 h' },
  { id: 'n3', title: 'Tvoje série je na 12 dnech. Nepřeruš ji!', time: 'včera' }
]

interface ProfilNotificationsProps {
  open: boolean
  readIds: string[]
  onMarkRead: (id: string) => void
  onClose: () => void
}

export const ProfilNotifications: React.FC<ProfilNotificationsProps> = ({
  open,
  readIds,
  onMarkRead,
  onClose
}) => {
  return (
    <>
      <div className={`profil-dropdown-overlay ${open ? 'open' : ''}`} onClick={onClose} />
      <div className={`profil-notif-dropdown ${open ? 'open' : ''}`}>
        <div className="profil-notif-header">
          <span>Notifikace</span>
          <button className="profil-icon-btn small" onClick={onClose} aria-label="Zavřít">
            <ProfilIcon name="x" size={14} />
          </button>
        </div>
        <div className="profil-notif-list">
          {NOTIFICATIONS.map((n) => {
            const isRead = readIds.includes(n.id)
            return (
              <button
                key={n.id}
                className={`profil-notif-item ${isRead ? 'read' : ''}`}
                onClick={() => onMarkRead(n.id)}
              >
                {!isRead && <span className="profil-notif-dot" />}
                <div className="profil-notif-text">
                  <div className="profil-notif-title">{n.title}</div>
                  <div className="profil-notif-time">{n.time}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
