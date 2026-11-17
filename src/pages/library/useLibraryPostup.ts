import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateLibraryPostupData, type PostupZaznam } from '@/core/utils/libraryShelfValidation'

// ==========================================
// Postup čtení po dílech (kapitola, blok, procenta, čas, dočteno).
// Synchronizuje se do library_progress (viz librarySync.ts). Při konfliktu
// mezi zařízeními vyhrává novější updatedAt.
// ==========================================

export type ZmenaPostupu = Partial<Omit<PostupZaznam, 'id' | 'updatedAt' | 'deletedAt'>>

interface PostupState {
  postupy: PostupZaznam[]
  ulozPostup: (id: string, zmena: ZmenaPostupu) => void
}

const VYCHOZI = (id: string): PostupZaznam => ({
  id, updatedAt: 0, deletedAt: null, versionId: null,
  chapterPos: 0, blockIdx: 0, percent: 0, secondsRead: 0, finishedAt: null,
})

export const useLibraryPostup = create<PostupState>()(
  persist(
    (set, get) => ({
      postupy: [],
      ulozPostup: (id, zmena) => {
        const stary = get().postupy.find((p) => p.id === id) ?? VYCHOZI(id)
        const novy: PostupZaznam = { ...stary, ...zmena, id, deletedAt: null, updatedAt: Date.now() }
        set({ postupy: [novy, ...get().postupy.filter((p) => p.id !== id)] })
      },
    }),
    {
      name: 'schoolbuddy-library-postup-storage',
      storage: createJSONStorage(() => secureStorage),
      merge: (persisted, current) => ({ ...current, ...validateLibraryPostupData(persisted) }),
    },
  ),
)

export const getRawLibraryPostup = () => useLibraryPostup.getState()
export const setRawLibraryPostup = (postupy: PostupZaznam[]) => useLibraryPostup.setState({ postupy })
export const subscribeLibraryPostup = (posluchac: () => void) => useLibraryPostup.subscribe(posluchac)
