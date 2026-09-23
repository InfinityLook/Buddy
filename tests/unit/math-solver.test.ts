import { describe, it, expect } from 'vitest'
import {
  FUNCTION_NAMES,
  MathError,
  degreeOf,
  formatNumber,
  parsePoly,
  solve,
} from '@/miniapps/math-solver/parser'

// ==========================================
// parser.ts nemělo doteď žádné permanentní testy, přestože je to
// nejsložitější čistá funkce v Math Solveru — hlavně solve()'s postup
// řešení lineárních i kvadratických rovnic (solveLinear/solveQuadratic),
// který appka v UI zobrazuje jako "Postup:". Tenhle soubor to dorovnává
// bez potřeby komponenty nebo store.
// ==========================================

describe('solve — kalkulačka (výraz bez x, žádné "=")', () => {
  it('sečte a vynásobí podle priority operátorů', () => {
    expect(solve('2+3*4').result).toBe('14')
  })

  it('respektuje závorky', () => {
    expect(solve('(2+3)*4').result).toBe('20')
  })

  it('mocnina', () => {
    expect(solve('2^3').result).toBe('8')
  })

  it('procento jako postfix dělení stem', () => {
    expect(solve('200*10%').result).toBe('20')
  })

  it('odmocnina přes symbol √', () => {
    expect(solve('√(16)').result).toBe('4')
  })

  it('implicitní násobení: 2(3+4)', () => {
    expect(solve('2(3+4)').result).toBe('14')
  })

  it('pojmenovaná konstanta pi', () => {
    // formatNumber zaokrouhluje neceločíselný výsledek na 6 desetinných
    // míst kvůli zobrazení, takže víc přesnosti odtud čekat nejde.
    expect(Number(solve('pi').result)).toBeCloseTo(Math.PI, 5)
  })

  it('log je dekadický, ln přirozený', () => {
    expect(solve('log(100)').result).toBe('2')
    expect(solve('ln(e)').result).toBe('1')
  })

  it('kalkulačka nemá steps', () => {
    const vysledek = solve('2+2')
    expect(vysledek.kind).toBe('calc')
    if (vysledek.kind === 'calc') expect('steps' in vysledek).toBe(false)
  })

  it('0.1 + 0.2 nezobrazí plovoucí odchylku', () => {
    expect(solve('0.1+0.2').result).toBe('0.3')
  })
})

describe('solve — goniometrie a režim úhlu', () => {
  it('sin(30) ve stupních je 0.5', () => {
    expect(Number(solve('sin(30)', 'deg').result)).toBeCloseTo(0.5, 6)
  })

  it('sin(90) v radiánech se liší od stupňů', () => {
    const rad = Number(solve('sin(90)', 'rad').result)
    const deg = Number(solve('sin(90)', 'deg').result)
    expect(deg).toBeCloseTo(1, 6)
    expect(rad).toBeCloseTo(Math.sin(90), 6)
    expect(rad).not.toBeCloseTo(deg, 2)
  })
})

describe('solve — lineární rovnice', () => {
  it('x = 5 je už vyřešená, postup to poznamená bez dělení jedničkou', () => {
    const vysledek = solve('x=5')
    expect(vysledek.kind).toBe('equation')
    expect(vysledek.result).toBe('x = 5')
    if (vysledek.kind === 'equation') {
      expect(vysledek.steps[0]).toBe('x = 5')
      expect(vysledek.steps.at(-1)).toBe('x = 5')
    }
  })

  it('2x + 3 = 11 spočítá x = 4 a ukáže dělení koeficientem', () => {
    const vysledek = solve('2x+3=11')
    expect(vysledek.result).toBe('x = 4')
    if (vysledek.kind === 'equation') {
      expect(vysledek.steps.some((s) => s.includes('Vydělíme'))).toBe(true)
      expect(vysledek.steps.at(-1)).toBe('x = 4')
    }
  })

  it('3(x-1) = 2x+4 vyřeší i se závorkami na obou stranách', () => {
    // 3x - 3 = 2x + 4  →  x = 7
    expect(solve('3(x-1)=2x+4').result).toBe('x = 7')
  })

  it('neznámá se vyruší a obě strany se rovnají — nekonečně řešení', () => {
    expect(solve('5=5').result).toBe('Platí pro každé x')
  })

  it('neznámá se vyruší, ale strany se nerovnají — žádné řešení', () => {
    expect(solve('5=6').result).toBe('Rovnice nemá řešení')
  })
})

describe('solve — kvadratická rovnice', () => {
  it('x² - 5x + 6 = 0 má dva reálné kořeny (x-2)(x-3)', () => {
    const vysledek = solve('x^2-5x+6=0')
    expect(vysledek.result).toBe('x₁ = 3, x₂ = 2')
    if (vysledek.kind === 'equation') {
      expect(vysledek.steps.some((s) => s.includes('Diskriminant'))).toBe(true)
    }
  })

  it('x² - 4x + 4 = 0 má jeden dvojnásobný kořen (D = 0)', () => {
    const vysledek = solve('x^2-4x+4=0')
    expect(vysledek.result).toBe('x = 2')
    if (vysledek.kind === 'equation') {
      expect(vysledek.steps.some((s) => s.includes('D = 0'))).toBe(true)
    }
  })

  it('x² + 1 = 0 nemá reálné řešení (D < 0)', () => {
    expect(solve('x^2+1=0').result).toBe('Rovnice nemá reálné řešení')
  })

  it('kvadratická rovnice generuje víc kroků než lineární', () => {
    const vysledek = solve('x^2-5x+6=0')
    if (vysledek.kind === 'equation') expect(vysledek.steps.length).toBeGreaterThan(3)
  })
})

describe('solve — chybové stavy', () => {
  it('prázdný výraz', () => {
    expect(() => solve('')).toThrow(MathError)
  })

  it('výraz s x bez "=" appka odmítne, i když by šel spočítat jako rovnice', () => {
    expect(() => solve('x+1')).toThrow(MathError)
  })

  it('dělení nulou', () => {
    expect(() => solve('1/0')).toThrow(MathError)
  })

  it('odmocnina ze záporného čísla', () => {
    expect(() => solve('sqrt(-1)')).toThrow(MathError)
  })

  it('logaritmus z nekladného čísla', () => {
    expect(() => solve('log(0)')).toThrow(MathError)
    expect(() => solve('log(-5)')).toThrow(MathError)
  })

  it('neznámé písmeno mimo x se nepovažuje za platnou proměnnou', () => {
    expect(() => solve('a=1')).toThrow(MathError)
  })

  it('víc než jedno "=" v rovnici', () => {
    expect(() => solve('2=1=3')).toThrow(MathError)
  })

  it('x na třetí — appka umí jen do druhého stupně', () => {
    expect(() => solve('x^3=0')).toThrow(MathError)
  })

  it('neznámá v exponentu', () => {
    expect(() => solve('2^x=0')).toThrow(MathError)
  })

  it('dělení výrazem s neznámou', () => {
    expect(() => solve('x/x=1')).toThrow(MathError)
  })

  it('neznámý znak ve vstupu', () => {
    expect(() => solve('2 & 3')).toThrow(MathError)
  })
})

describe('parsePoly a degreeOf', () => {
  it('rozezná stupeň mnohočlenu podle nenulových koeficientů', () => {
    expect(degreeOf(parsePoly('x^2+x+1'))).toBe(2)
    expect(degreeOf(parsePoly('x+1'))).toBe(1)
    expect(degreeOf(parsePoly('5'))).toBe(0)
  })
})

describe('formatNumber', () => {
  it('zaokrouhlí plovoucí odchylku na čisté číslo', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3')
  })

  it('celé číslo nezobrazí desetinnou tečku', () => {
    expect(formatNumber(4)).toBe('4')
  })

  it('nekonečno vyhodí chybu místo "Infinity" v UI', () => {
    expect(() => formatNumber(Infinity)).toThrow(MathError)
    expect(() => formatNumber(NaN)).toThrow(MathError)
  })
})

describe('FUNCTION_NAMES', () => {
  it('obsahuje všechny podporované funkce z klávesnice appky', () => {
    expect(FUNCTION_NAMES).toEqual(
      expect.arrayContaining(['sin', 'cos', 'tan', 'sqrt', 'abs', 'log', 'ln'])
    )
  })
})
