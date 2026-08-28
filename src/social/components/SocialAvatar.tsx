import React from 'react'
import { avatarGradient } from '../avatarColor'
import type { AvatarFrame } from '../avatarFrames'

interface Props {
  /** Id uživatele — základ barvy prstenu, ne jen ozdoba, viz avatarColor.ts */
  id: string
  jmeno: string
  /** Skupinový chat má pevnou barvu (#), ne barvu podle id — id skupiny
   *  totiž nikoho konkrétního neznačí. */
  jeSkupina?: boolean
  /** Emoji skupiny (Chat.ikona) — bez ní se drží výchozí "#". U víc
   *  skupin najednou to bylo jinak nerozeznatelné, viz Chat.ikona. */
  ikona?: string | null
  /** Skutečná fotka profilu (core/supabase/avatarStorage.ts) — když je,
   *  vyplní celý kruh místo iniciály. Barevný prsten okolo zůstává
   *  i s fotkou, ať jde poznat "moje/jeho" na první pohled stejně
   *  jako dřív. */
  avatarUrl?: string | null
  /** Už vyhodnocený rámeček (social/avatarFrames.ts's resolveActiveFrameId)
   *  — komponenta sama neřeší VIP platnost, to už udělal volající, kde
   *  je po ruce role majitele avataru. Bez něj (většina míst) se drží
   *  výchozí prsten podle avatarGradient(id). */
  frame?: AvatarFrame | null
  /** Příchozí žádost dostane pulzující prstenec, ať upoutá pozornost
   *  dřív, než si člověk přečte text vedle ní. */
  pulzuje?: boolean
  /** Zablokovaný účet je schválně bez barvy — viz komentář v BlokovaniPanel.css. */
  tlumeny?: boolean
  /** Appka-wide "má appku otevřenou" mezi přáteli (social/presence.ts's
   *  useOnlineFriends) — volající sem dá už vyhodnocené `true`/`false`,
   *  komponenta sama žádnou přítomnost neřeší, stejně jako u `frame`
   *  výš. U skupiny appka tečku nikdy nekreslí — nikdo konkrétní. */
  online?: boolean
  velikost?: number
}

export const SocialAvatar: React.FC<Props> = ({
  id,
  jmeno,
  jeSkupina,
  ikona,
  avatarUrl,
  frame,
  pulzuje,
  tlumeny,
  online,
  velikost = 34,
}) => {
  const barvy = jeSkupina ? null : frame ? { a: frame.a, b: frame.b } : avatarGradient(id)

  const style = barvy
    ? ({ '--sa-a': barvy.a, '--sa-b': barvy.b } as React.CSSProperties)
    : undefined

  return (
    <span
      className={`social-avatar-wrap ${tlumeny ? 'je-tlumeny' : ''} ${frame ? 'ma-ramecek' : ''}`}
      style={{ width: velikost, height: velikost, ...style }}
      aria-hidden="true"
    >
      {pulzuje && <span className="social-avatar-pulz" />}
      <span className="social-avatar-prstenec" />
      {!jeSkupina && avatarUrl && !tlumeny ? (
        <img src={avatarUrl} alt="" className="social-avatar social-avatar--foto" />
      ) : (
        <span className={`social-avatar ${jeSkupina ? 'is-skupina' : ''}`}>
          {jeSkupina ? ikona ?? '#' : jmeno.charAt(0).toUpperCase()}
        </span>
      )}
      {online && !jeSkupina && !tlumeny && (
        <span className="social-avatar-online-tecka" aria-label="Online" title="Online" />
      )}
    </span>
  )
}
