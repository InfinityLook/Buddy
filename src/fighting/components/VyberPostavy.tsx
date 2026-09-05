import React, { useState } from 'react'
import { VSECHNY_POSTAVY } from '../combat/postavy'
import type { PostavaId, VariantaPostavy } from '../combat/postavy'
import { nahodnaPostava } from '../combat/ai'
import { jeZlataOdemcena, ZAPASU_PRO_ODEMKNUTI_ZLATE, pocetOdehranychZapasu } from '../kosmetika'
import { PostavaGrafika } from './PostavaGrafika'
import '../FightingModule.css'

interface Props {
  onVybrano: (postavaId: PostavaId) => void
}

// ==========================================
// Fáze 3 — výběr postavy na ovladači, LOKÁLNĚ a PŘED síťovým
// připojením (viz types.ts's PripojitPayload). Dva důvody, proč tenhle
// pořadí: (1) hráč se má vybrat, koho hraje, dřív, než čeká na TV, ne
// až po připojení jako druhý krok navíc; (2) tahle obrazovka je čistě
// místní React stav, žádné síťové volání — jde ji ověřit Playwright
// testem i v sandboxu, který živé Supabase Realtime spojení vůbec
// neumí (viz CLAUDE.md's Souboj sekce, WebSocket limit).
//
// Osmé kolo vylepšení přidalo náhled odemykatelné kosmetické varianty
// (kosmetika.ts) — čistě lokální stav TÉHLE komponenty, žádná změna
// `onVybrano` (viz kosmetika.ts's vlastní komentář, proč appka volbu
// nikam dál neprovlíká). Tlačítko na přepnutí varianty je SOUROZENEC
// hlavního výběrového tlačítka karty, ne jeho potomek — <button>
// uvnitř <button> je neplatné HTML, stejné pravidlo, jaké appka
// dodržuje i jinde (PostavaKarta v RPG, sociální řádky).
//
// Deváté kolo vylepšení přidalo "Překvapte mě" — rovnou zavolá
// onVybrano(nahodnaPostava()) (combat/ai.ts, stejná funkce, jakou už
// používá počítačový soupeř ve Fázi 5), žádné dvoukrokové "vyber pak
// potvrď" navíc, přesně proto, že jde o rychlou zkratku, ne o další
// rozhodování.
// ==========================================

export const VyberPostavy: React.FC<Props> = ({ onVybrano }) => {
  const [vybrana, setVybrana] = useState<PostavaId | null>(null)
  const [varianty, setVarianty] = useState<Partial<Record<PostavaId, VariantaPostavy>>>({})

  const prepniVariantu = (postavaId: PostavaId) => {
    setVarianty((soucasne) => ({
      ...soucasne,
      [postavaId]: soucasne[postavaId] === 'zlata' ? 'vychozi' : 'zlata',
    }))
  }

  return (
    <div className="souboj-vyber-postavy">
      <p className="souboj-vyber-postavy-nadpis">Vyber si bojovníka</p>

      <div className="souboj-postavy-mrizka">
        {VSECHNY_POSTAVY.map((postava) => {
          const varianta = varianty[postava.id] ?? 'vychozi'
          const odemcena = jeZlataOdemcena(postava.id)
          return (
            <div key={postava.id} className="souboj-postava-karta-obal">
              <button
                type="button"
                className={`souboj-postava-karta souboj-postava-karta--${postava.id} ${
                  vybrana === postava.id ? 'je-vybrana' : ''
                }`}
                onClick={() => setVybrana(postava.id)}
              >
                <PostavaGrafika
                  postavaId={postava.id}
                  size={64}
                  animovana
                  varianta={varianta}
                  className="souboj-postava-obrazek"
                />
                <span className="souboj-postava-jmeno">{postava.jmeno}</span>
                <span className="souboj-postava-podtitul">{postava.podtitul}</span>
                <span className="souboj-postava-special">✨ {postava.nazevSpecialu}</span>
              </button>

              {odemcena ? (
                <button
                  type="button"
                  className="souboj-postava-varianta-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    prepniVariantu(postava.id)
                  }}
                >
                  {varianta === 'zlata' ? '🎨 Výchozí' : '🎨 Zlatá'}
                </button>
              ) : (
                <span className="souboj-postava-varianta-zamek">
                  🔒 Zlatá za {ZAPASU_PRO_ODEMKNUTI_ZLATE - pocetOdehranychZapasu(postava.id)} zápasů
                </span>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className="souboj-postava-potvrdit"
        disabled={!vybrana}
        onClick={() => vybrana && onVybrano(vybrana)}
      >
        Pokračovat
      </button>

      <button type="button" className="souboj-postava-nahodna" onClick={() => onVybrano(nahodnaPostava())}>
        🎲 Překvapte mě
      </button>
    </div>
  )
}
