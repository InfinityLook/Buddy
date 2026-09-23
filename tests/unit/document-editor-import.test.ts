import { describe, it, expect } from 'vitest'
import {
  escapeTextToHtml,
  prepareImportedContent,
  sanitizeHtml,
  sanitizeLinkUrl,
} from '@/miniapps/document-editor/importContent'

// ==========================================
// importContent.ts je bezpečnostně kritický — sanitizuje cokoli, co se
// z importovaného souboru nebo z ručně vloženého odkazu dostane přes
// innerHTML do contentEditable editoru (viz vlastní hlavičkový komentář
// souboru o <img onerror="..."> jako reálné cestě ke spuštění kódu nad
// daty appky). Neměl doteď žádné permanentní testy.
// ==========================================

describe('escapeTextToHtml', () => {
  it('escapuje HTML speciální znaky', () => {
    expect(escapeTextToHtml('<b>&"</b>')).toBe('&lt;b&gt;&amp;"&lt;/b&gt;')
  })

  it('převede konce řádků na <br>, ať se prostý text nesloučí do jednoho odstavce', () => {
    expect(escapeTextToHtml('řádek 1\nřádek 2')).toBe('řádek 1<br>řádek 2')
    expect(escapeTextToHtml('a\r\nb\rc')).toBe('a<br>b<br>c')
  })
})

describe('sanitizeHtml', () => {
  it('odstraní <script> úplně', () => {
    const vysledek = sanitizeHtml('<p>text</p><script>alert(1)</script>')
    expect(vysledek).not.toContain('<script')
    expect(vysledek).toContain('<p>text</p>')
  })

  it('odstraní obsluhy událostí jako onerror/onclick', () => {
    const vysledek = sanitizeHtml('<img src="a.png" onerror="alert(1)">')
    expect(vysledek).not.toContain('onerror')
  })

  it('odstraní javascript: schéma z href', () => {
    const vysledek = sanitizeHtml('<a href="javascript:alert(1)">klikni</a>')
    expect(vysledek).not.toContain('javascript:')
  })

  it('odstraní data:text/html schéma ze src', () => {
    const vysledek = sanitizeHtml('<iframe src="data:text/html,<script>alert(1)</script>"></iframe>')
    expect(vysledek).not.toContain('<iframe')
  })

  it('odstraní nebezpečné prvky iframe/object/embed/form', () => {
    const vysledek = sanitizeHtml('<iframe></iframe><object></object><embed><form></form>')
    expect(vysledek).toBe('')
  })

  it('nechá bezpečný obsah a bezpečné atributy beze změny — narozdíl od sanitizeLinkUrl adresu nenormalizuje', () => {
    const vysledek = sanitizeHtml('<p><b>tučně</b> a <a href="https://example.com">odkaz</a></p>')
    expect(vysledek).toContain('<b>tučně</b>')
    expect(vysledek).toContain('href="https://example.com"')
  })

  it('odstraní expression() ve stylu (starý IE trik)', () => {
    const vysledek = sanitizeHtml('<div style="width: expression(alert(1))">x</div>')
    expect(vysledek).not.toContain('expression')
  })
})

describe('prepareImportedContent', () => {
  it('.html soubor projde přes sanitizaci, ne escapování', () => {
    const vysledek = prepareImportedContent('poznamky.html', '<p>text</p><script>x</script>')
    expect(vysledek).toBe('<p>text</p>')
  })

  it('.htm soubor taky projde přes sanitizaci', () => {
    const vysledek = prepareImportedContent('stranka.htm', '<b>tučně</b>')
    expect(vysledek).toBe('<b>tučně</b>')
  })

  it('.txt soubor se escapuje, ne sanitizuje — <b> zůstane jako viditelný text', () => {
    const vysledek = prepareImportedContent('poznamky.txt', '<b>ne tučně</b>')
    expect(vysledek).toBe('&lt;b&gt;ne tučně&lt;/b&gt;')
  })

  it('soubor bez přípony se taky escapuje', () => {
    const vysledek = prepareImportedContent('bezpripony', '<i>x</i>')
    expect(vysledek).toContain('&lt;i&gt;')
  })
})

describe('sanitizeLinkUrl', () => {
  it('odmítne javascript: schéma', () => {
    expect(sanitizeLinkUrl('javascript:alert(1)')).toBeNull()
  })

  it('odmítne vbscript: schéma', () => {
    expect(sanitizeLinkUrl('vbscript:msgbox(1)')).toBeNull()
  })

  it('odmítne data:text/html schéma', () => {
    expect(sanitizeLinkUrl('data:text/html,<script>alert(1)</script>')).toBeNull()
  })

  it('prázdný vstup vrátí null', () => {
    expect(sanitizeLinkUrl('   ')).toBeNull()
  })

  it('kotva v dokumentu projde beze změny', () => {
    expect(sanitizeLinkUrl('#kapitola-2')).toBe('#kapitola-2')
  })

  it('relativní cesta projde beze změny', () => {
    expect(sanitizeLinkUrl('/nejaka/cesta')).toBe('/nejaka/cesta')
  })

  it('doména bez schématu dostane https:// — uživatel běžně napíše jen "seznam.cz"', () => {
    expect(sanitizeLinkUrl('seznam.cz')).toBe('https://seznam.cz/')
  })

  it('mailto: schéma je povolené', () => {
    expect(sanitizeLinkUrl('mailto:test@example.com')).toBe('mailto:test@example.com')
  })

  it('http:// i https:// zůstanou beze změny (kromě normalizace)', () => {
    expect(sanitizeLinkUrl('https://example.com/stranka')).toBe('https://example.com/stranka')
  })

  it('nepovolené schéma (ftp:) se odmítne', () => {
    expect(sanitizeLinkUrl('ftp://example.com')).toBeNull()
  })

  it('zjevně neplatnou adresu odmítne', () => {
    expect(sanitizeLinkUrl('http://')).toBeNull()
  })
})
