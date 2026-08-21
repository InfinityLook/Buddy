import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/core/utils/secureStorage'
import { validateGameCharacterData } from '@/core/utils/gameCharacterValidation'
import { PostavaId } from './types'
import { Dovednost, MAX_DOVEDNOST_RANK, PostavaProgres, pripocistXp, vychoziProgres } from './leveling'

// ==========================================
// Vytvořené postavy a jejich postup. Vlastní úložiště, mimo core/store —
// je to herní stav, ne něco, co potřebuje zbytek appky (stejná konvence
// jako usePomodoro.ts ve svém miniapp).
//
// Dřív šlo jen o jedno natrvalo zvolené id; teď appka drží celou
// rozehranou "partu" — kterékoli z pěti postav si hráč může vytvořit
// (a zase smazat), a při každém vstupu do hry si vybírá, za koho
// tentokrát hraje (viz GameModule.tsx — ta volba samotná se nikam
// neukládá, žije jen jako React state po dobu jedné návštěvy /hra).
//
// Postup (úroveň/XP/dovednosti) je NA ROZDÍL od účtového XP/kreditů/
// odznaků (core/store) vázaný na konkrétní postavu — smazání postavy
// smaže i její postup, stejně jako smazání uložené hry. Je to vědomý
// rozdíl od zbytku appky, ne nedopatření.
// ==========================================

interface GameCharacterState {
  postavy: PostavaId[]
  progres: Record<string, PostavaProgres>

  /** Přidá postavu do party. Když už tam je, nic se nestane. */
  vytvoritPostavu: (id: PostavaId) => void
  /** Odebere postavu z party i s jejím postupem. Nemaže žádný jiný
   *  postup — XP, kredity i odznaky jsou sdílené napříč postavami. */
  smazatPostavu: (id: PostavaId) => void
  /** Připočte XP té postavě, která souboj vyhrála — může postoupit
   *  o víc úrovní najednou a získat dovednostní body. */
  pridatXpPostave: (id: PostavaId, xp: number) => void
  /** Utratí jeden dovednostní bod za stupeň vybrané dovednosti. Tiše
   *  nic neudělá, když body nejsou nebo je dovednost na maximu. */
  vylepsitDovednost: (id: PostavaId, dovednost: Dovednost) => void
}

export const useGameCharacter = create<GameCharacterState>()(
  persist(
    (set, get) => ({
      postavy: [],
      progres: {},

      vytvoritPostavu: (id) => {
        if (get().postavy.includes(id)) return
        set((state) => ({
          postavy: [...state.postavy, id],
          progres: { ...state.progres, [id]: state.progres[id] ?? vychoziProgres() },
        }))
      },

      smazatPostavu: (id) => {
        set((state) => {
          const { [id]: _odstraneny, ...zbylyProgres } = state.progres
          return { postavy: state.postavy.filter((p) => p !== id), progres: zbylyProgres }
        })
      },

      pridatXpPostave: (id, xp) => {
        set((state) => {
          const aktualni = state.progres[id] ?? vychoziProgres()
          return { progres: { ...state.progres, [id]: pripocistXp(aktualni, xp) } }
        })
      },

      vylepsitDovednost: (id, dovednost) => {
        set((state) => {
          const aktualni = state.progres[id]
          if (!aktualni || aktualni.dovednostniBody <= 0) return state
          if (aktualni.dovednosti[dovednost] >= MAX_DOVEDNOST_RANK) return state

          return {
            progres: {
              ...state.progres,
              [id]: {
                ...aktualni,
                dovednostniBody: aktualni.dovednostniBody - 1,
                dovednosti: { ...aktualni.dovednosti, [dovednost]: aktualni.dovednosti[dovednost] + 1 },
              },
            },
          }
        })
      },
    }),
    {
      name: 'schoolbuddy-game-character-storage',
      version: 2,
      storage: createJSONStorage(() => secureStorage),

      merge: (persisted, current) => {
        const validace = validateGameCharacterData(persisted)
        if (!validace.success) return current
        return { ...current, postavy: validace.data.postavy, progres: validace.data.progres }
      },

      // Starší appka (verze 1) ukládala jediné { postavaId }. Kdo si
      // postavu už vybral, o ni tímhle přechodem nepřijde — stane se
      // prvním členem jeho nové party místo toho, aby appka mlčky
      // začínala od nuly. Postup (progres) na verzi 1 neexistoval
      // vůbec, takže začíná na výchozích hodnotách — merge výš ho
      // stejně znovu profiltruje přes validateGameCharacterData.
      migrate: (persistedState, verze) => {
        if (verze < 2 && persistedState && typeof persistedState === 'object' && 'postavaId' in persistedState) {
          const stary = (persistedState as { postavaId: unknown }).postavaId
          return { postavy: typeof stary === 'string' ? [stary] : [], progres: {} }
        }
        const validace = validateGameCharacterData(persistedState)
        return validace.success ? validace.data : { postavy: [], progres: {} }
      },
    }
  )
)
