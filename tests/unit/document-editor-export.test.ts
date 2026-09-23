import { describe, it, expect } from 'vitest'
import { approximateBytes, buildHtmlDocument, safeFileName } from '@/miniapps/document-editor/exportDocument'

// ==========================================
// exportDocument.ts (stahování .TXT/.HTML a tisk/PDF přes @media print
// v CSS) neměl žádné permanentní testy pro svoje čisté funkce —
// safeFileName rozhoduje o jménu staženého souboru, buildHtmlDocument
// o tom, jestli je stažené HTML vůbec platný, otevíratelný dokument.
// ==========================================

describe('safeFileName', () => {
  it('normální název nechá beze změny', () => {
    expect(safeFileName('Domácí úkol', 'txt')).toBe('Domácí úkol.txt')
  })

  it('nahradí znaky nepovolené v názvu souboru pomlčkou', () => {
    expect(safeFileName('a/b:c*d?e"f<g>h|i', 'txt')).toBe('a-b-c-d-e-f-g-h-i.txt')
  })

  it('sloučí opakované mezery na jednu', () => {
    expect(safeFileName('moc    mezer', 'html')).toBe('moc mezer.html')
  })

  it('ořízne úvodní a koncové pomlčky/tečky/mezery vzniklé náhradou', () => {
    expect(safeFileName('///název///', 'txt')).toBe('název.txt')
  })

  it('název jen ze zakázaných znaků spadne na výchozí "dokument"', () => {
    expect(safeFileName('///', 'txt')).toBe('dokument.txt')
  })

  it('prázdný název spadne na výchozí "dokument"', () => {
    expect(safeFileName('', 'html')).toBe('dokument.html')
  })

  it('ořízne název na 80 znaků', () => {
    const dlouhy = 'a'.repeat(200)
    const vysledek = safeFileName(dlouhy, 'txt')
    expect(vysledek).toBe(`${'a'.repeat(80)}.txt`)
  })
})

describe('buildHtmlDocument', () => {
  it('vloží obsah do těla dokumentu', () => {
    const html = buildHtmlDocument('Test', '<p>Ahoj</p>')
    expect(html).toContain('<p>Ahoj</p>')
  })

  it('deklaruje UTF-8, ať se česká diakritika po otevření ze souboru nerozsype', () => {
    const html = buildHtmlDocument('Test', '')
    expect(html).toContain('<meta charset="utf-8">')
  })

  it('escapuje název dokumentu v <title> — jinak by šlo vložit skript přes title', () => {
    const html = buildHtmlDocument('<script>alert(1)</script>', '')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapuje uvozovky a "&" v titulku', () => {
    const html = buildHtmlDocument('A & B "quoted"', '')
    expect(html).toContain('A &amp; B &quot;quoted&quot;')
  })

  it('je platný samostatně otevíratelný dokument s doctype', () => {
    const html = buildHtmlDocument('Test', '<p>x</p>')
    expect(html.trim().startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<html lang="cs">')
    expect(html).toContain('</html>')
  })
})

describe('approximateBytes', () => {
  it('odhadne velikost data URL zhruba podle base64 poměru 3:4', () => {
    // 100 znaků base64 zhruba odpovídá 75 bajtům
    const priblizneUrl = `data:image/png;base64,${'A'.repeat(100)}`
    expect(approximateBytes(priblizneUrl)).toBe(Math.round((priblizneUrl.length * 3) / 4))
  })

  it('prázdný řetězec dá nulu', () => {
    expect(approximateBytes('')).toBe(0)
  })
})
