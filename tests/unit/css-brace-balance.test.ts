import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// RoomsModule.css skutečně shipnul s nedokončeným `@keyframes` pravidlem
// (chybějící ')' a obě uzavírací '}') - ve zdrojovém souboru to vypadalo
// jako jedno "neškodné" nehotové pravidlo na konci, ale Vite/Rollup
// všechny CSS soubory při produkčním buildu spojí do JEDNOHO bundlu, a
// chybějící uzavírací závorky z jednoho souboru pak "spolknou" VŠECHNA
// následující pravidla ze VŠECH dalších CSS souborů v bundlu jako
// nesmyslnou hodnotu jedné deklarace - a to až do místa, kde se počet
// otevíracích/uzavíracích závorek jinde v bundlu náhodou znovu srovná
// (tady to bylo přes 60 % celého bundlu, ověřeno v reálném Chromiu -
// .rc-overlay i .zeb-xp po opravě skutečně dostaly svoje styly zpátky).
// Test kontroluje KAŽDÝ .css soubor v src/ samostatně (ne spojený bundle,
// tenhle test žádný build nespouští) - selže na úplně stejné nedokončené
// pravidlo, než se vůbec stihne spojit s dalším souborem a rozbít appku.
function najdiCssSoubory(adresar: string): string[] {
  return readdirSync(adresar, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.css'))
    .map(entry => join(entry.parentPath ?? adresar, entry.name))
}

// Appčiny /* ... */ komentáře jsou plné české i anglické prózy s
// apostrofy ("Hub.tsx's", "appka's") - bez odstranění komentářů PŘED
// sledováním uvozovek by takový apostrof vypadal jako začátek
// jednouvozovkového CSS stringu a rozhodil by počítání závorek
// ve zbytku souboru (reálně zachyceno na BootGate.css při psaní tohoto
// testu - 7 z 8 prvních nahlášených "chyb" byly přesně tyhle falešné
// poplachy, ne skutečně nedokončené CSS).
function odeberKomentare(obsah: string): string {
  return obsah.replace(/\/\*[\s\S]*?\*\//g, '')
}

function zkontrolujZavorky(obsah: string): { vyvazeno: boolean; hloubka: number } {
  const bezKomentaru = odeberKomentare(obsah)
  let hloubka = 0
  let vRetezci: string | null = null
  for (let i = 0; i < bezKomentaru.length; i++) {
    const znak = bezKomentaru[i]
    if (vRetezci) {
      if (znak === vRetezci && bezKomentaru[i - 1] !== '\\') vRetezci = null
    } else if (znak === '"' || znak === "'") {
      vRetezci = znak
    } else if (znak === '{') {
      hloubka++
    } else if (znak === '}') {
      hloubka--
    }
  }
  return { vyvazeno: hloubka === 0, hloubka }
}

describe('CSS soubory v src/ mají vyvážené složené závorky', () => {
  const soubory = najdiCssSoubory(join(import.meta.dirname, '..', '..', 'src'))

  it('najde aspoň nějaké .css soubory (ať test skutečně něco kontroluje)', () => {
    expect(soubory.length).toBeGreaterThan(20)
  })

  it.each(soubory)('%s má po načtení celkovou hloubku závorek 0', soubor => {
    const obsah = readFileSync(soubor, 'utf-8')
    const { vyvazeno, hloubka } = zkontrolujZavorky(obsah)
    expect(vyvazeno, `${soubor}: výsledná hloubka ${hloubka} (očekáváno 0) - nějaké pravidlo nemá uzavírací '}'`).toBe(true)
  })

  it('reaguje na skutečně nedokončené pravidlo (reprodukce původní chyby, ne jen prázdná kontrola)', () => {
    const rozbite = `.a { color: red; } @keyframes b { from { opacity: .5; transform: translateY`
    expect(zkontrolujZavorky(rozbite).vyvazeno).toBe(false)
  })

  it('apostrof v komentáři (např. "Hub.tsx\'s") appku do falešného poplachu nedostane', () => {
    const sProzou = `/* stejný ořez jako Hub.tsx's .hub-bg-overlay a appka's vlastní styl */\n.a { color: red; }\n.b { background: url('/x.png'); }`
    expect(zkontrolujZavorky(sProzou)).toEqual({ vyvazeno: true, hloubka: 0 })
  })
})
