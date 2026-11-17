import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateLibraryShelfData, type PolicovyZaznam } from '@/core/utils/libraryShelfValidation'

// ==========================================
// Moje police — díla, která si uživatel uložil. Záznam je měkce
// smazatelný (deletedAt), ať jde odebrání z police synchronizovat mezi
// zařízeními (viz librarySync.ts). Zdrojem pravdy je tenhle lokální store;
// cloud je zrcadlo navíc.
// ==========================================

interface ShelfState {
  zaznamy: PolicovyZaznam[]
  /** Přidá, nebo odebere. Vrací true, když dílo po akci na polici je. */
  prepnout: (id: string) => boolean
}

export const idNaPolici = (zaznamy: readonly PolicovyZaznam[]): string[] =>
  zaznamy.filter((z) => !z.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt).map((z) => z.id)

export const useLibraryShelf = create<ShelfState>()(
  persist(
    (set, get) => ({
      zaznamy: [],
      prepnout: (id) => {
        const ted = Date.now()
        const stavajici = get().zaznamy.find((z) => z.id === id)
        const jeNaPolici = !!stavajici && !stavajici.deletedAt
        const novy: PolicovyZaznam = { id, updatedAt: ted, deletedAt: jeNaPolici ? ted : null }
        set({ zaznamy: [novy, ...get().zaznamy.filter((z) => z.id !== id)] })
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

/** Surový stav pro synchronizaci (včetně tombstonů). */
export const getRawLibraryShelf = () => useLibraryShelf.getState()
export const setRawLibraryShelf = (zaznamy: PolicovyZaznam[]) => useLibraryShelf.setState({ zaznamy })
export const subscribeLibraryShelf = (posluchac: () => void) => useLibraryShelf.subscribe(posluchac)
