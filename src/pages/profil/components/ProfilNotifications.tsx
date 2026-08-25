import React, { useEffect, useMemo, useState } from 'react'
import { ProfilIcon } from './ProfilIcon'
import { useGamificationStore } from '@/core/store/useGamificationStore'
import { useStudyPlanner } from '@/miniapps/study-planner/useStudyPlanner'
import { getXpForNextLevel } from '@/core/utils/gamificationUtils'
import { nactiOznameni, sledovatOznameni } from '@/core/notifications/api'

export interface NotificationItem {
  id: string
  title: string
  // Kategorie, ne čas — u odvozených hlášek žádný časový údaj neexistuje
  // a vymýšlet si "před 5 min" by bylo jen další lež v panelu.
  time: string
}

// 6. pád: "na 1 dni", ale "na 2 / 5 dnech"
const sklonujDny = (pocet: number) => (pocet === 1 ? 'dni' : 'dnech')

interface ProfilNotificationsProps {
  open: boolean
  readIds: string[]
  onMarkRead: (id: string) => void
  onClose: () => void
}

// Odvození upozornění je vytažené z komponenty ven, protože stejný seznam
// potřebuje i rozcestník aplikací — ten z něj počítá číslo u zvonku.
// Dvě nezávislé kopie téhle logiky by se dřív nebo později rozešly.
export const useNotificationItems = (): NotificationItem[] => {
  const { level, xp, streakDays, badges } = useGamificationStore()
  const { tasks } = useStudyPlanner()

  // Oznámení od správy (Admin panel → Notifikace) — na rozdíl od
  // zbytku seznamu se nedají odvodit z místního stavu, musí se
  // stáhnout. Živý odběr, ať se zvonek rozsvítí i bez obnovení
  // stránky, když admin zrovna něco pošle.
  const [oznameniItems, setOznameniItems] = useState<NotificationItem[]>([])

  useEffect(() => {
    let zive = true

    const obnov = () => {
      void nactiOznameni().then((seznam) => {
        if (!zive) return
        setOznameniItems(
          seznam.map((o) => ({
            id: `oznameni-${o.id}`,
            title: o.text,
            time: new Date(o.createdAt).toLocaleDateString('cs-CZ'),
          }))
        )
      })
    }

    obnov()
    const zrusit = sledovatOznameni(obnov)

    return () => {
      zive = false
      zrusit()
    }
  }, [])

  // Upozornění se skládají ze skutečného stavu aplikace. Id nese i hodnotu,
  // které se hláška týká (streak-9, level-4...), takže přečtená hláška
  // zůstane přečtená, ale při změně stavu se objeví jako nová.
  return useMemo<NotificationItem[]>(() => {
    // Oznámení od správy jdou první — jsou to věci, o kterých má vědět
    // hned, ne až po vlastním pokroku v appce.
    const items: NotificationItem[] = [...oznameniItems]

    const lastBadge = badges
      .filter((b) => b.unlockedAt !== null)
      .sort((a, b) => (a.unlockedAt! < b.unlockedAt! ? 1 : -1))[0]

    if (lastBadge) {
      items.push({
        id: `badge-${lastBadge.id}`,
        title: `Odemkl jsi odznak ${lastBadge.icon} ${lastBadge.title}`,
        time: new Date(lastBadge.unlockedAt!).toLocaleDateString('cs-CZ'),
      })
    }

    if (streakDays > 0) {
      items.push({
        id: `streak-${streakDays}`,
        title: `Tvoje série je na ${streakDays} ${sklonujDny(streakDays)}. Nepřeruš ji!`,
        time: 'Denní série',
      })
    }

    const pending = tasks.filter((task) => !task.completed).length
    if (pending > 0) {
      items.push({
        id: `tasks-${pending}`,
        title: `V Planeru na tebe čeká nesplněných úkolů: ${pending}`,
        time: 'Úkoly',
      })
    }

    const xpRemaining = Math.max(0, getXpForNextLevel(level) - xp)
    if (xpRemaining > 0) {
      items.push({
        id: `level-${level}-${xpRemaining}`,
        title: `Do úrovně ${level + 1} ti zbývá ${xpRemaining} XP`,
        time: 'Postup',
      })
    }

    return items
  }, [oznameniItems, badges, streakDays, tasks, level, xp])
}

export const ProfilNotifications: React.FC<ProfilNotificationsProps> = ({
  open,
  readIds,
  onMarkRead,
  onClose
}) => {
  const notifications = useNotificationItems()

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
          {notifications.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.75rem', padding: '0.6rem' }}>
              Zatím tu nic není. Jakmile se do něčeho pustíš, dám ti vědět. 🔔
            </p>
          ) : (
            notifications.map((n) => {
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
            })
          )}
        </div>
      </div>
    </>
  )
}
