import { useEffect, useRef, useState } from 'react'

// ==========================================
// Perzistence profilu v localStorage.
// Vše, co uživatel v Profilu upraví (jméno, e-mail,
// avatar, motto, nastavení zabezpečení, přečtené
// notifikace...), se automaticky uloží a při dalším
// otevření appky se znovu načte.
// ==========================================

const STORAGE_KEY = 'buddy_profile_v1'

export interface ProfileStats {
  lessons: number
  tasks: number
  hours: number
  rating: number
}

export interface ProfileSecurity {
  biometrics: boolean
  loginAlerts: boolean
}

export interface ProfileData {
  name: string
  email: string
  motto: string
  avatar: string
  level: number
  xp: number
  xpToNext: number
  streak: number
  stats: ProfileStats
  security: ProfileSecurity
  readNotifications: string[]
}

export const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=300'

export const DEFAULT_PROFILE: ProfileData = {
  name: 'Kairo',
  email: 'kairo.student@email.com',
  motto: 'Každý den je nová šance stát se lepší verzí sebe.',
  avatar: DEFAULT_AVATAR,
  level: 24,
  xp: 4250,
  xpToNext: 5000,
  streak: 12,
  stats: { lessons: 128, tasks: 32, hours: 48, rating: 4.8 },
  security: { biometrics: false, loginAlerts: true },
  readNotifications: []
}

function loadProfile(): ProfileData {
  if (typeof window === 'undefined') return DEFAULT_PROFILE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROFILE
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      stats: { ...DEFAULT_PROFILE.stats, ...(parsed.stats ?? {}) },
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
