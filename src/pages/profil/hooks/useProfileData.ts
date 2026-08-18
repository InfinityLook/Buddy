import { useEffect, useRef, useState } from 'react'

// ==========================================
// Perzistence profilu v localStorage.
// Vše, co uživatel v Profilu upraví (jméno, e-mail,
// avatar, motto, nastavení zabezpečení, přečtené
// notifikace...), se automaticky uloží a při dalším
// otevření appky se znovu načte.
// ==========================================

const STORAGE_KEY = 'buddy_profile_v1'

export interface ProfileSecurity {
  biometrics: boolean
  loginAlerts: boolean
}

export interface ProfileData {
  name: string
  email: string
  motto: string
  avatar: string
  security: ProfileSecurity
  readNotifications: string[]
}

// Výchozí avatar je vložené SVG, ne odkaz na CDN — SchoolBuddy má fungovat
// offline a tohle byl jediný externí požadavek v celé aplikaci.
// Data URI (a ne import z assets/) proto, že se hodnota ukládá do profilu
// v localStorage: cesta do /assets/ nese hash buildu, takže po každém
// nasazení by starým uživatelům obrázek zmizel.
const DEFAULT_AVATAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#35c4f0"/>
      <stop offset="1" stop-color="#8a5cf6"/>
    </linearGradient>
  </defs>
  <rect width="96" height="96" fill="url(#a)"/>
  <circle cx="48" cy="38" r="15" fill="#f2f5fb"/>
  <path d="M48 57c-14 0-25 8-25 18v21h50V75c0-10-11-18-25-18z" fill="#f2f5fb"/>
</svg>`

export const DEFAULT_AVATAR = `data:image/svg+xml,${encodeURIComponent(DEFAULT_AVATAR_SVG)}`

// Avatar, který v profilech leží z dřívějška. Při načtení ho vyměníme
// za lokální, ať uživatelé nezůstanou viset na nefunkčním odkazu.
const LEGACY_REMOTE_AVATAR = 'https://images.unsplash.com/'

// Úroveň, XP ani série tu schválně nejsou — jediným zdrojem pravdy
// pro gamifikaci je useGamificationStore. Dřív tu ležely demo hodnoty
// (level 24, 4250 XP, 128 lekcí), které nikdo nečetl a jen čekaly,
// až je někdo omylem zapojí vedle těch skutečných.
export const DEFAULT_PROFILE: ProfileData = {
  name: 'Student',
  email: '',
  motto: 'Každý den je nová šance stát se lepší verzí sebe.',
  avatar: DEFAULT_AVATAR,
  security: { biometrics: false, loginAlerts: true },
  readNotifications: []
}

function loadProfile(): ProfileData {
  if (typeof window === 'undefined') return DEFAULT_PROFILE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw)
    const avatar =
      typeof parsed.avatar === 'string' && parsed.avatar.startsWith(LEGACY_REMOTE_AVATAR)
        ? DEFAULT_AVATAR
        : parsed.avatar

    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      avatar: avatar ?? DEFAULT_AVATAR,
      security: { ...DEFAULT_PROFILE.security, ...(parsed.security ?? {}) },
      readNotifications: Array.isArray(parsed.readNotifications) ? parsed.readNotifications : []
    }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function useProfileData() {
  const [profile, setProfile] = useState<ProfileData>(loadProfile)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Neukládáme hned při prvním renderu (data právě přišla ze storage).
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
    } catch {
      // Storage může být plný nebo nedostupný (např. soukromý režim) — tiše ignorujeme.
    }
  }, [profile])

  const updateProfile = (patch: Partial<ProfileData>) => {
    setProfile((prev) => ({ ...prev, ...patch }))
  }

  const updateSecurity = (patch: Partial<ProfileSecurity>) => {
    setProfile((prev) => ({ ...prev, security: { ...prev.security, ...patch } }))
  }

  const markNotificationRead = (id: string) => {
    setProfile((prev) =>
      prev.readNotifications.includes(id)
        ? prev
        : { ...prev, readNotifications: [...prev.readNotifications, id] }
    )
  }

  const resetProfile = () => {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    setProfile(DEFAULT_PROFILE)
  }

  return { profile, updateProfile, updateSecurity, markNotificationRead, resetProfile }
      }
