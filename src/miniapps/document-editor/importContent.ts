// ==========================================
// Příprava obsahu importovaného souboru pro editor.
//
// EditorPaper vkládá obsah dokumentu do contentEditable divu přes
// innerHTML. Cokoli, co sem přijde ze souboru, se tedy vykreslí jako
// HTML — a to znamená, že se z něj i spustí skripty. Otevření cizího
// .txt s <img onerror="..."> stačilo ke spuštění kódu nad daty aplikace
// (v localStorage leží úkoly, poznámky i profil).
//
// Prostý text proto escapujeme, HTML soubory pouštíme dál, ale zbavené
// všeho, co umí spustit kód nebo natáhnout cizí obsah.
// ==========================================

// Prvky, které buď rovnou spouštějí kód, nebo tahají něco zvenčí
const DANGEROUS_ELEMENTS = 'script, iframe, object, embed, link, meta, base, form, noscript'

// Schémata, která v odkazu nebo zdroji obrázku spustí kód
const DANGEROUS_SCHEME = /^\s*(javascript|vbscript|data:text\/html)/i

// Atributy, přes které se dá podstrčit URL
const URL_ATTRIBUTES = ['href', 'src', 'action', 'formaction', 'xlink:href', 'srcdoc', 'data']

// Prostý text nesmí do innerHTML vstoupit nezměněný — jednak by se
// z něj staly značky, jednak by se řádky slily do jednoho odstavce,
// protože editor obsah vykresluje s white-space: normal.
export const escapeTextToHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n|\r|\n/g, '<br>')

// Projde HTML a odstraní vše spustitelné. Parsuje se přes DOMParser do
// odděleného dokumentu, takže se během kontroly nic nevykoná — na rozdíl
// od vložení do živého DOMu, kde by se <img onerror> spustil okamžitě.
export const sanitizeHtml = (html: string): string => {
  const parsed = new DOMParser().parseFromString(html, 'text/html')

  parsed.body.querySelectorAll(DANGEROUS_ELEMENTS).forEach((el) => el.remove())

  parsed.body.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const value = attr.value

      // Obsluhy událostí: onerror, onclick, onload…
      if (name.startsWith('on')) {
        el.removeAttribute(attr.name)
        continue
      }

      if (URL_ATTRIBUTES.includes(name) && DANGEROUS_SCHEME.test(value)) {
        el.removeAttribute(attr.name)
        continue
      }

      // Starší IE trik, ale za odstranění nic nestojí
      if (name === 'style' && /expression\s*\(|javascript:/i.test(value)) {
        el.removeAttribute(attr.name)
      }
    }
  })

  // Bereme jen tělo — případné <script> nebo <style> z <head> tím padají
  return parsed.body.innerHTML
}

// Rozhodne podle přípony, jestli se má obsah escapovat, nebo sanitizovat
export const prepareImportedContent = (fileName: string, raw: string): string =>
  /\.html?$/i.test(fileName) ? sanitizeHtml(raw) : escapeTextToHtml(raw)

// Vloží-li uživatel odkaz přes panel nástrojů, projde execCommand('createLink')
// úplně mimo sanitizaci nahoře — ta hlídá jen obsah načtený ze souboru.
// Adresa "javascript:..." tak vytvořila klikací odkaz, který se uložil do
// dokumentu a při dalším otevření (EditorPaper vkládá obsah přes innerHTML)
// se dal spustit. Proto stejná kontrola i tady.
//
// Vrací upravenou adresu, nebo null, když je nebezpečná.
export const sanitizeLinkUrl = (input: string): string | null => {
  const url = input.trim()
  if (!url) return null
  if (DANGEROUS_SCHEME.test(url)) return null

  // Kotva v dokumentu a relativní cesta jsou v pořádku
  if (url.startsWith('#') || url.startsWith('/')) return url

  // Bez schématu předpokládáme https — uživatel běžně napíše "seznam.cz"
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`

  try {
    const parsed = new URL(withScheme)
    // Povolujeme jen to, co dává v dokumentu smysl
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) return null
    return parsed.href
  } catch {
    return null
  }
}
