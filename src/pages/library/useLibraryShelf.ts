import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { MAX_POLICE, validateLibraryShelfData } from '@/core/utils/libraryShelfValidation'

// ==========================================
// Moje police — id děl, která si uživatel uložil. Zatím jen v zařízení
// (stejně jako ostatní uživatelská data); cloudová synchronizace do
// library_shelf je samostatný krok. Nejnovější přidané dílo je první.
// ==========================================

interface ShelfState {
  ids: string[]
  /** Přidá, nebo odebere. Vrací true, když dílo po akci na polici je. */
  prepnout: (id: string) => boolean
}

export const useLibraryShelf = create<ShelfState>()(
  persist(
    (set, get) => ({
      ids: [],
      prepnout: (id) => {
        const jeNaPolici = get().ids.includes(id)
        set({
          ids: jeNaPolici ? get().ids.filter((x) => x !== id) : [id, ...get().ids].slice(0, MAX_POLICE),
        })
        return !jeNaPolici
      },
    }),
    {
      name: 'schoolbuddy-library-shelf-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => ({ ...current, ...validateLibraryShelfData(persisted) }),
    },
  ),
)
