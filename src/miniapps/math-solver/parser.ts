// ==========================================
// Vyhodnocení matematických výrazů a rovnic.
//
// Dřív se tu volal Function(`return (${vstup})`), tedy v podstatě eval.
// Vstup sice chodil jen z klávesnice v UI, ale komentář nad tím tvrdil,
// že jde o "bezpečné vyhodnocení", což nebyla pravda — nic se
// nekontrolovalo. Tenhle parser místo toho rozumí jen tomu, co má.
//
// Každý výraz se vyhodnocuje na mnohočlen a·x² + b·x + c. Když jsou a i b
// nulové, je výsledkem obyčejné číslo (kalkulačka); jinak se z obou stran
// rovnice dá dopočítat x — lineárně, nebo přes diskriminant. Jeden parser
// tak obslouží kalkulačku, lineární i kvadratické rovnice.
// ==========================================

export type AngleMode = 'deg' | 'rad'

export interface Poly {
  a: number // koeficient u x²
  b: number // koeficient u x
  c: number // absolutní člen
}

export class MathError extends Error {}

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'x' }
  | { kind: 'func'; name: string }
  | { kind: 'op'; value: string }

// Konstanty, které se dají psát jménem i symbolem
const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  'π': Math.PI,
  e: Math.E,
}

// Funkce berou jen číselný argument — sin(x) není mnohočlen, takže
// s neznámou uvnitř by výsledek nešel vyjádřit.
const FUNCTIONS: Record<string, (value: number, mode: AngleMode) => number> = {
  sin: (v, mode) => Math.sin(toRadians(v, mode)),
  cos: (v, mode) => Math.cos(toRadians(v, mode)),
  tan: (v, mode) => Math.tan(toRadians(v, mode)),
  sqrt: (v) => {
    if (v < 0) throw new MathError('Odmocnina ze záporného čísla.')
    return Math.sqrt(v)
  },
  abs: (v) => Math.abs(v),
  log: (v) => {
    if (v <= 0) throw new MathError('Logaritmus jde jen z kladného čísla.')
    return Math.log10(v)
  },
  ln: (v) => {
    if (v <= 0) throw new MathError('Logaritmus jde jen z kladného čísla.')
    return Math.log(v)
  },
}

export const FUNCTION_NAMES = Object.keys(FUNCTIONS)

const toRadians = (value: number, mode: AngleMode): number =>
  mode === 'deg' ? (value * Math.PI) / 180 : value

const tokenize = (input: string): Token[] => {
  const tokens: Token[] = []
  let i = 0
  const src = input
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/,/g, '.')
    .replace(/√/g, 'sqrt')

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

    // Písmena: neznámá x, pojmenovaná konstanta, nebo funkce
    if (/[a-zA-Zπ]/.test(ch)) {
      let name = ''
      while (i < src.length && /[a-zA-Zπ]/.test(src[i])) name += src[i++]
      const lower = name.toLowerCase()

      if (lower === 'x') {
        tokens.push({ kind: 'x' })
        continue
      }
      if (lower in CONSTANTS) {
        tokens.push({ kind: 'num', value: CONSTANTS[lower] })
        continue
      }
      if (lower in FUNCTIONS) {
        tokens.push({ kind: 'func', name: lower })
        continue
      }
      throw new MathError(`Neznámý výraz: ${name}`)
    }

    if ('+-*/%^()'.includes(ch)) {
      tokens.push({ kind: 'op', value: ch })
      i += 1
      continue
    }

    throw new MathError(`Neznámý znak: ${ch}`)
  }

  return tokens
}

const konst = (value: number): Poly => ({ a: 0, b: 0, c: value })

const isConstant = (p: Poly): boolean => p.a === 0 && p.b === 0

export const degreeOf = (p: Poly): number => (p.a !== 0 ? 2 : p.b !== 0 ? 1 : 0)

const scitani = (l: Poly, r: Poly): Poly => ({ a: l.a + r.a, b: l.b + r.b, c: l.c + r.c })
const odcitani = (l: Poly, r: Poly): Poly => ({ a: l.a - r.a, b: l.b - r.b, c: l.c - r.c })

const nasobeni = (l: Poly, r: Poly): Poly => {
  // Součin počítáme až do čtvrtého stupně a pak zkontrolujeme, že vyšší
  // členy vyšly nulové — jinak by výsledek do tvaru ax²+bx+c nešel.
  const deg4 = l.a * r.a
  const deg3 = l.a * r.b + l.b * r.a

  if (deg4 !== 0 || deg3 !== 0) {
    throw new MathError('Zvládnu nejvýš druhou mocninu x.')
  }

  return {
    a: l.a * r.c + l.b * r.b + l.c * r.a,
    b: l.b * r.c + l.c * r.b,
    c: l.c * r.c,
  }
}

const deleni = (l: Poly, r: Poly): Poly => {
  if (!isConstant(r)) throw new MathError('Dělit výrazem s neznámou neumím.')
  if (r.c === 0) throw new MathError('Dělení nulou.')
  return { a: l.a / r.c, b: l.b / r.c, c: l.c / r.c }
}

const mocnina = (base: Poly, exponent: Poly): Poly => {
  if (!isConstant(exponent)) throw new MathError('V mocnině nesmí být neznámá.')
  const exp = exponent.c

  // Číslo na cokoliv se spočítá rovnou
  if (isConstant(base)) {
    const value = Math.pow(base.c, exp)
    if (!Number.isFinite(value)) throw new MathError('Mocnina nevyšla jako konečné číslo.')
    return konst(value)
  }

  if (!Number.isInteger(exp) || exp < 0) {
    throw new MathError('Neznámou umocňuji jen na celé nezáporné číslo.')
  }
  if (exp === 0) return konst(1)

  let result = base
  for (let i = 1; i < exp; i++) result = nasobeni(result, base)
  return result
}

// Rekurzivní sestup: expr → term → factor → power → primary
const parseExpression = (tokens: Token[], mode: AngleMode): Poly => {
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

  const expr = (): Poly => {
    let left = term()
    for (;;) {
      if (eatOp('+')) left = scitani(left, term())
      else if (eatOp('-')) left = odcitani(left, term())
      else return left
    }
  }

  const term = (): Poly => {
    let left = factor()
    for (;;) {
      if (eatOp('*')) left = nasobeni(left, factor())
      else if (eatOp('/')) left = deleni(left, factor())
      else {
        // Implicitní násobení: 3x, 2(x+1), 2sin(30)
        const t = peek()
        const implicit =
          t &&
          (t.kind === 'num' ||
            t.kind === 'x' ||
            t.kind === 'func' ||
            (t.kind === 'op' && t.value === '('))
        if (implicit) left = nasobeni(left, factor())
        else return left
      }
    }
  }

  const factor = (): Poly => {
    if (eatOp('-')) return odcitani(konst(0), factor())
    if (eatOp('+')) return factor()

    let value = power()

    // Procento je postfix "děleno stem": 10 % = 0,1, takže 200 × 10 % = 20
    while (eatOp('%')) value = deleni(value, konst(100))

    return value
  }

  // Mocnina je pravoasociativní: 2^3^2 je 2^(3^2). Exponent se čte přes
  // factor(), aby fungovalo i 2^-1.
  const power = (): Poly => {
    const base = primary()
    if (eatOp('^')) return mocnina(base, factor())
    return base
  }

  const primary = (): Poly => {
    const t = peek()
    if (!t) throw new MathError('Výraz je neúplný.')

    if (t.kind === 'num') {
      pos += 1
      return konst(t.value)
    }

    if (t.kind === 'x') {
      pos += 1
      return { a: 0, b: 1, c: 0 }
    }

    if (t.kind === 'func') {
      pos += 1
      if (!eatOp('(')) throw new MathError(`Za ${t.name} musí být závorka.`)
      const argument = expr()
      if (!eatOp(')')) throw new MathError('Chybí uzavírací závorka.')
      if (!isConstant(argument)) {
        throw new MathError(`Do ${t.name}() neumím dosadit neznámou.`)
      }
      const value = FUNCTIONS[t.name](argument.c, mode)
      if (!Number.isFinite(value)) throw new MathError('Výsledek není konečné číslo.')
      return konst(value)
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

export const parsePoly = (input: string, mode: AngleMode = 'deg'): Poly => {
  const tokens = tokenize(input)
  if (tokens.length === 0) throw new MathError('Prázdný výraz.')
  return parseExpression(tokens, mode)
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

// Záporné číslo uvnitř součinu nebo mocniny musí do závorek: "-5²"
// se čte jako −(5²) = −25, kdežto myslíme (−5)² = 25.
const zavorka = (value: number): string =>
  value < 0 ? `(${formatNumber(value)})` : formatNumber(value)

// Vyčistí drobné odchylky z plovoucí čárky, ať se koeficient 0.9999999999
// nechová jako nenulový a nedělal z lineární rovnice kvadratickou.
const tidy = (value: number): number => {
  const rounded = Math.round(value * 1e10) / 1e10
  return Object.is(rounded, -0) ? 0 : rounded
}

const tidyPoly = (p: Poly): Poly => ({ a: tidy(p.a), b: tidy(p.b), c: tidy(p.c) })

const formatPoly = (p: Poly): string => {
  const { a, b, c } = tidyPoly(p)
  const parts: string[] = []

  const push = (coef: number, suffix: string) => {
    if (coef === 0) return
    const sign = coef < 0 ? '-' : '+'
    const abs = Math.abs(coef)
    const shown = suffix && abs === 1 ? '' : formatNumber(abs)
    parts.push(parts.length === 0 && sign === '+' ? `${shown}${suffix}` : ` ${sign} ${shown}${suffix}`)
  }

  if (a !== 0 && tidy(a) < 0 && parts.length === 0) {
    parts.push(`${Math.abs(a) === 1 ? '-' : formatNumber(a)}x²`)
  } else {
    push(a, 'x²')
  }

  if (parts.length === 0 && b < 0) parts.push(`${Math.abs(b) === 1 ? '-' : formatNumber(b)}x`)
  else push(b, 'x')

  if (parts.length === 0) return formatNumber(c)
  push(c, '')

  return parts.join('')
}

// Vyřeší rovnici i prostý výraz — podle toho, jestli vstup obsahuje "="
export const solve = (input: string, mode: AngleMode = 'deg'): SolveResult => {
  const trimmed = input.trim()
  if (!trimmed) throw new MathError('Prázdný výraz.')

  const parts = trimmed.split('=')

  if (parts.length === 1) {
    const value = tidyPoly(parsePoly(trimmed, mode))
    if (!isConstant(value)) throw new MathError('Výraz obsahuje x — napiš rovnici s "=".')
    return { kind: 'calc', result: formatNumber(value.c) }
  }

  if (parts.length > 2) throw new MathError('Rovnice může mít jen jedno "=".')

  const left = parsePoly(parts[0], mode)
  const right = parsePoly(parts[1], mode)

  // Vše převedeme na levou stranu: (L - R) = 0
  const diff = tidyPoly(odcitani(left, right))

  const zadani = `${formatPoly(left)} = ${formatPoly(right)}`
  const steps: string[] = [zadani]

  if (diff.a !== 0) return solveQuadratic(diff, steps, zadani)
  return solveLinear(diff, steps)
}

const solveLinear = (diff: Poly, steps: string[]): EquationResult => {
  // diff má tvar b·x + c = 0
  const a = diff.b
  const b = -diff.c

  if (a === 0) {
    if (b === 0) {
      steps.push('Neznámá se vyruší a obě strany se rovnají.')
      return { kind: 'equation', result: 'Platí pro každé x', steps }
    }
    steps.push('Neznámá se vyruší, ale strany se nerovnají.')
    return { kind: 'equation', result: 'Rovnice nemá řešení', steps }
  }

  const x = b / a

  // U koeficientu 1 by řádek "x = 7" a závěr "x = 7" byly dvakrát totéž
  if (a !== 1) {
    steps.push(
      `Členy s x dáme doleva, čísla doprava: ${formatPoly({ a: 0, b: a, c: 0 })} = ${formatNumber(b)}`
    )
    steps.push(
      `Vydělíme obě strany číslem ${formatNumber(a)}: x = ${formatNumber(b)} / ${formatNumber(a)}`
    )
  } else {
    steps.push('Členy s x dáme doleva, čísla doprava.')
  }

  steps.push(`x = ${formatNumber(x)}`)
  return { kind: 'equation', result: `x = ${formatNumber(x)}`, steps }
}

const solveQuadratic = (diff: Poly, steps: string[], zadani: string): EquationResult => {
  const { a, b, c } = diff

  // Když už rovnice ve tvaru "= 0" je, nemá smysl psát tentýž řádek znovu
  const prevedeno = `${formatPoly(diff)} = 0`
  if (prevedeno !== zadani) steps.push(`Vše převedeme na jednu stranu: ${prevedeno}`)
  steps.push(`a = ${formatNumber(a)}, b = ${formatNumber(b)}, c = ${formatNumber(c)}`)

  const d = tidy(b * b - 4 * a * c)
  steps.push(
    `Diskriminant: D = b² − 4ac = ${zavorka(b)}² − 4·${zavorka(a)}·${zavorka(c)} = ${formatNumber(d)}`
  )

  if (d < 0) {
    steps.push('D je záporný, takže reálné řešení neexistuje.')
    return { kind: 'equation', result: 'Rovnice nemá reálné řešení', steps }
  }

  if (d === 0) {
    const x = tidy(-b / (2 * a))
    steps.push(`D = 0, rovnice má jeden dvojnásobný kořen: x = −b / 2a = ${formatNumber(x)}`)
    return { kind: 'equation', result: `x = ${formatNumber(x)}`, steps }
  }

  const sqrtD = Math.sqrt(d)
  const x1 = tidy((-b + sqrtD) / (2 * a))
  const x2 = tidy((-b - sqrtD) / (2 * a))

  steps.push(`√D = ${formatNumber(sqrtD)}`)
  steps.push(`x₁ = (−b + √D) / 2a = ${formatNumber(x1)}`)
  steps.push(`x₂ = (−b − √D) / 2a = ${formatNumber(x2)}`)

  return {
    kind: 'equation',
    result: `x₁ = ${formatNumber(x1)}, x₂ = ${formatNumber(x2)}`,
    steps,
  }
}
