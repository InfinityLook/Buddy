import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateProfileData } from '@/core/utils/profileValidation'

// ==========================================
// Perzistence profilu. Vše, co uživatel v Profilu upraví (jméno, e-mail,
// avatar, motto, zabezpečení, přečtené notifikace), se uloží a při dalším
// otevření aplikace načte.
//
// Dřív to byla vlastní vrstva nad localStorage s vlastním klíčem, mimo
// Zustand i mimo secureStorage a bez validace — jako jediná část
// aplikace. Teď drží stejný vzorec jako ostatní story.
// ==========================================

const STORAGE_KEY = 'schoolbuddy-profile-storage'
const LEGACY_STORAGE_KEY = 'buddy_profile_v1'

export interface ProfileSecurity {
  biometrics: boolean
  loginAlerts: boolean
  // Id WebAuthn credentialu založeného core/utils/biometrics.ts —
  // váže se na konkrétní zařízení a prohlížeč, nesynchronizuje se
  // s cloudem. Chybí, dokud uživatel biometrii poprvé nezapne.
  biometricCredentialId?: string
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
// Data URI (a ne import z assets/) proto, že se hodnota ukládá mezi data
// uživatele: cesta do /assets/ nese hash buildu, takže po každém
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
// pro gamifikaci je useGamificationStore.
export const DEFAULT_PROFILE: ProfileData = {
  name: 'Student',
  email: '',
  motto: 'Každý den je nová šance stát se lepší verzí sebe.',
  avatar: DEFAULT_AVATAR,
  security: { biometrics: false, loginAlerts: true },
  readNotifications: [],
}

// Doplní chybějící pole a vymění dosluhující vzdálený avatar
const normalizeProfile = (saved: ProfileData | undefined): ProfileData => {
  if (!saved) return DEFAULT_PROFILE

  const merged: ProfileData = {
    ...DEFAULT_PROFILE,
    ...saved,
    security: { ...DEFAULT_PROFILE.security, ...(saved.security ?? {}) },
    readNotifications: Array.isArray(saved.readNotifications) ? saved.readNotifications : [],
  }

  if (typeof merged.avatar !== 'string' || merged.avatar.startsWith(LEGACY_REMOTE_AVATAR) || !merged.avatar) {
    merged.avatar = DEFAULT_AVATAR
  }

  const validation = validateProfileData(merged)
  return validation.success ? validation.data : DEFAULT_PROFILE
}

// Přenese profil ze starého klíče (nezašifrovaný localStorage) do nového
// úložiště. Běží jednou při načtení modulu, ještě než se store zrehydratuje,
// aby uživatelé o dosavadní profil nepřišli.
const migrateLegacyProfile = () => {
  if (typeof window === 'undefined') return

  try {
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!legacy) return

    // Když už nové úložiště existuje, starý klíč je jen zbytek — zahodíme ho
    if (window.localStorage.getItem(STORAGE_KEY)) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
      return
    }

    // Normalizujeme ještě před zápisem, jinak by v úložišti zůstal
    // třeba dosluhující odkaz na avatar až do první další změny profilu
    const profile = normalizeProfile(JSON.parse(legacy))

    secureStorage.setItem(STORAGE_KEY, JSON.stringify({ state: { profile }, version: 1 }))
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  } catch {
    // Poškozený starý profil není důvod aplikaci shodit — začne se od výchozího
  }
}

migrateLegacyProfile()

interface ProfileState {
  profile: ProfileData
  updateProfile: (patch: Partial<ProfileData>) => void
  updateSecurity: (patch: Partial<ProfileSecurity>) => void
  markNotificationRead: (id: string) => void
  resetProfile: () => void
}

// Store je exportovaný kvůli cloudové synchronizaci, která si na něj
// potřebuje pověsit odběr změn mimo React (viz core/supabase/cloudSync).
export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,

      updateProfile: (patch) => set((state) => ({ profile: { ...state.profile, ...patch } })),

      updateSecurity: (patch) =>
        set((state) => ({
          profile: { ...state.profile, security: { ...state.profile.security, ...patch } },
        })),

      markNotificationRead: (id) =>
        set((state) =>
          state.profile.readNotifications.includes(id)
            ? state
            : {
                profile: {
                  ...state.profile,
                  readNotifications: [...state.profile.readNotifications, id],
                },
              }
        ),

      resetProfile: () => set({ profile: DEFAULT_PROFILE }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ profile: state.profile }),

      merge: (persisted, current) => {
        const saved = persisted as { profile?: ProfileData } | undefined
        return { ...current, profile: normalizeProfile(saved?.profile) }
      },
    }
  )
)

export function useProfileData() {
  return useProfileStore()
}
