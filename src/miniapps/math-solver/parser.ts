// ==========================================
// Vyhodnocení matematických výrazů a lineárních rovnic.
//
// Dřív se tu volal Function(`return (${vstup})`), tedy v podstatě eval.
// Vstup sice chodil jen z klávesnice v UI, ale komentář nad tím tvrdil,
// že jde o "bezpečné vyhodnocení", což nebyla pravda — nic se
// nekontrolovalo. Tenhle parser místo toho rozumí jen tomu, co má:
// číslům, čtyřem operacím, procentům, závorkám a neznámé x.
//
// Každý výraz se vyhodnocuje na lineární tvar a·x + b. Když je a nulové,
// je výsledkem obyčejné číslo (kalkulačka); když ne, dá se z obou stran
// rovnice dopočítat x. Jeden parser tak obslouží obojí.
// ==========================================

export interface Linear {
  a: number // koeficient u x
  b: number // absolutní člen
}

export class MathError extends Error {}

type Token = { kind: 'num'; value: number } | { kind: 'x' } | { kind: 'op'; value: string }

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = []
  let i = 0
  const src = input.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/,/g, '.')

  while (i < src.length) {
    const ch = src[i]

    if (ch === ' ') {
      i += 1
      continue
    }

    if (/[0-9.]/.test(ch)) {
      let num = ''
      while (i < src.length && /[0-9.]/.test(src[i])) num += src[i++]
      const value = Number(num)
      if (!Number.isFinite(value)) throw new MathError(`Neplatné číslo: ${num}`)
      tokens.push({ kind: 'num', value })
      continue
    }

    if (ch === 'x' || ch === 'X') {
      tokens.push({ kind: 'x' })
      i += 1
      continue
    }

    if ('+-*/%()'.includes(ch)) {
      tokens.push({ kind: 'op', value: ch })
      i += 1
      continue
    }

    throw new MathError(`Neznámý znak: ${ch}`)
  }

  return tokens
}

const konst = (value: number): Linear => ({ a: 0, b: value })

const scitani = (l: Linear, r: Linear): Linear => ({ a: l.a + r.a, b: l.b + r.b })
const odcitani = (l: Linear, r: Linear): Linear => ({ a: l.a - r.a, b: l.b - r.b })

const nasobeni = (l: Linear, r: Linear): Linear => {
  if (l.a === 0) return { a: r.a * l.b, b: r.b * l.b }
  if (r.a === 0) return { a: l.a * r.b, b: l.b * r.b }
  // x * x by dalo kvadratický člen, který lineární tvar neumí podchytit
  throw new MathError('Umím jen lineární výrazy — x krát x nezvládnu.')
}

const deleni = (l: Linear, r: Linear): Linear => {
  if (r.a !== 0) throw new MathError('Dělit výrazem s neznámou neumím.')
  if (r.b === 0) throw new MathError('Dělení nulou.')
  return { a: l.a / r.b, b: l.b / r.b }
}

// Rekurzivní sestup: expr → term → factor → primary
const parseExpression = (tokens: Token[]): Linear => {
  let pos = 0

  const peek = (): Token | undefined => tokens[pos]
  const eatOp = (value: string): boolean => {
    const t = peek()
    if (t && t.kind === 'op' && t.value === value) {
      pos += 1
      return true
    }
    return false
  }

  const expr = (): Linear => {
    let left = term()
    for (;;) {
      if (eatOp('+')) left = scitani(left, term())
      else if (eatOp('-')) left = odcitani(left, term())
      else return left
    }
  }

  const term = (): Linear => {
    let left = factor()
    for (;;) {
      if (eatOp('*')) left = nasobeni(left, factor())
      else if (eatOp('/')) left = deleni(left, factor())
      else {
        // Implicitní násobení: 3x, 2(x+1), (x+1)(x-1) je už nelineární
        const t = peek()
        if (t && (t.kind === 'num' || t.kind === 'x' || (t.kind === 'op' && t.value === '('))) {
          left = nasobeni(left, factor())
        } else {
          return left
        }
      }
    }
  }

  const factor = (): Linear => {
    if (eatOp('-')) return odcitani(konst(0), factor())
    if (eatOp('+')) return factor()

    let value = primary()

    // Procento je postfix "děleno stem": 10 % = 0,1, takže 200 × 10 % = 20
    while (eatOp('%')) value = deleni(value, konst(100))

    return value
  }

  const primary = (): Linear => {
    const t = peek()
    if (!t) throw new MathError('Výraz je neúplný.')

    if (t.kind === 'num') {
      pos += 1
      return konst(t.value)
    }

    if (t.kind === 'x') {
      pos += 1
      return { a: 1, b: 0 }
    }

    if (t.kind === 'op' && t.value === '(') {
      pos += 1
      const inner = expr()
      if (!eatOp(')')) throw new MathError('Chybí uzavírací závorka.')
      return inner
    }

    throw new MathError('Výrazu nerozumím.')
  }

  const result = expr()
  if (pos !== tokens.length) throw new MathError('Výrazu nerozumím.')
  return result
}

export const parseLinear = (input: string): Linear => {
  const tokens = tokenize(input)
  if (tokens.length === 0) throw new MathError('Prázdný výraz.')
  return parseExpression(tokens)
}

// Zaokrouhlení pro zobrazení — 0.1 + 0.2 nemá vypadat jako 0.30000000000000004
export const formatNumber = (value: number): string => {
  if (!Number.isFinite(value)) throw new MathError('Výsledek není konečné číslo.')
  const rounded = Math.round(value * 1e10) / 1e10
  return Number.isInteger(rounded) ? String(rounded) : String(Number(rounded.toFixed(6)))
}

export interface CalcResult {
  kind: 'calc'
  result: string
}

export interface EquationResult {
  kind: 'equation'
  result: string
  steps: string[]
}

export type SolveResult = CalcResult | EquationResult

const formatLinear = (l: Linear): string => {
  const a = Math.round(l.a * 1e10) / 1e10
  const b = Math.round(l.b * 1e10) / 1e10
  if (a === 0) return formatNumber(b)
  const xPart = a === 1 ? 'x' : a === -1 ? '-x' : `${formatNumber(a)}x`
  if (b === 0) return xPart
  return b > 0 ? `${xPart} + ${formatNumber(b)}` : `${xPart} - ${formatNumber(Math.abs(b))}`
}

// Vyřeší rovnici i prostý výraz — podle toho, jestli vstup obsahuje "="
export const solve = (input: string): SolveResult => {
  const trimmed = input.trim()
  if (!trimmed) throw new MathError('Prázdný výraz.')

  const parts = trimmed.split('=')

  if (parts.length === 1) {
    const value = parseLinear(trimmed)
    if (value.a !== 0) throw new MathError('Výraz obsahuje x — napiš rovnici s "=".')
    return { kind: 'calc', result: formatNumber(value.b) }
  }

  if (parts.length > 2) throw new MathError('Rovnice může mít jen jedno "=".')

  const left = parseLinear(parts[0])
  const right = parseLinear(parts[1])

  // Vše s x doleva, čísla doprava: (aL - aR)·x = bR - bL
  const a = left.a - right.a
  const b = right.b - left.b

  const steps: string[] = [`${formatLinear(left)} = ${formatLinear(right)}`]

  if (a === 0) {
    if (b === 0) {
      steps.push('Neznámá se vyruší a obě strany se rovnají.')
      return { kind: 'equation', result: 'Platí pro každé x', steps }
    }
    steps.push('Neznámá se vyruší, ale strany se nerovnají.')
    return { kind: 'equation', result: 'Rovnice nemá řešení', steps }
  }

  steps.push(`Členy s x dáme doleva, čísla doprava: ${formatLinear({ a, b: 0 })} = ${formatNumber(b)}`)

  const x = b / a
  // U koeficientu 1 by krok "vydělíme jedničkou" byl jen šum
  if (a !== 1) {
    steps.push(`Vydělíme obě strany číslem ${formatNumber(a)}: x = ${formatNumber(b)} / ${formatNumber(a)}`)
  }

  steps.push(`x = ${formatNumber(x)}`)

  return { kind: 'equation', result: `x = ${formatNumber(x)}`, steps }
}
