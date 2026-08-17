import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'

// ==========================================
// Stav přihlášení musí přežít reload stránky.
// Dokud byl jen v useState, každé ruční obnovení
// (F5 / stažení dolů na mobilu) uživatele vyhodilo
// zpátky na login, i když byl uprostřed práce.
// ==========================================

interface AuthState {
  isAuthed: boolean
  login: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthed: false,

      login: () => set({ isAuthed: true }),
      logout: () => set({ isAuthed: false }),
    }),
    {
      name: 'schoolbuddy-auth-storage',
      version: 1,
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ isAuthed: state.isAuthed }),
    }
  )
)
