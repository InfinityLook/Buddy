const ALLOWED = new Set([
  'p', 'div', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'span', 'font',
  'sub', 'sup', 'mark', 'blockquote', 'pre', 'code', 'hr',
  'ul', 'ol', 'li', 'a', 'img', 'input', 'table', 'caption',
  'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
])

const DISCARD = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'link', 'meta',
  'base', 'form', 'noscript', 'template', 'title', 'textarea',
])

const COLOR = /^(?:#[0-9a-f]{3,8}|[a-z]{1,24}|rgba?\([\d.,% /]+\))$/i
const RASTER = /^data:image\/(?:png|jpeg|webp|gif);base64,[a-z\d+/]+=*$/i

export const escapeTextToHtml = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n|\r|\n/g, '<br>')

function allowedHref(value: string): boolean {
  if (/[\x00-\x1f\x7f\\]/.test(value)) return false
  if (value.startsWith('#') || /^\/(?!\/)/.test(value)) return true

  try {
    return ['http:', 'https:', 'mailto:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

export function sanitizeLinkUrl(input: string): string | null {
  const url = input.trim()
  if (!url || /[\x00-\x1f\x7f\\]/.test(url)) return null
  if (url.startsWith('#') || /^\/(?!\/)/.test(url)) return url

  const value = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`
  if (!allowedHref(value)) return null
  return new URL(value).href
}

function copyFormatting(source: HTMLElement, target: HTMLElement) {
  const alignment = source.style.textAlign || source.getAttribute('align') || ''

  if (/^(left|right|center|justify|start|end)$/.test(alignment)) {
    target.style.textAlign = alignment
  }

  for (const property of ['color', 'background-color']) {
    const value = source.style.getPropertyValue(property)
    if (COLOR.test(value)) target.style.setProperty(property, value)
  }

  const font = source.style

  if (/^(bold|normal|[1-9]00)$/.test(font.fontWeight)) {
    target.style.fontWeight = font.fontWeight
  }
  if (/^(normal|italic|oblique)$/.test(font.fontStyle)) {
    target.style.fontStyle = font.fontStyle
  }
  if (/^(none|underline|line-through)$/.test(font.textDecoration)) {
    target.style.textDecoration = font.textDecoration
  }

  if (source.localName === 'font') {
    const color = source.getAttribute('color') ?? ''
    const size = source.getAttribute('size') ?? ''
    const face = source.getAttribute('face') ?? ''

    if (COLOR.test(color)) target.setAttribute('color', color)
    if (/^[1-7]$/.test(size)) target.setAttribute('size', size)
    if (/^[\w ,'-]{1,80}$/.test(face)) target.setAttribute('face', face)
  }
}

// Parsování i tvorba výsledku probíhají mimo živý dokument.
export function sanitizeHtml(html: string): string {
  const input = document.createElement('template')
  const output = document.createElement('template')
  input.innerHTML = html

  const pending: { source: Node; parent: Node }[] = []

  function queueChildren(source: Node, parent: Node) {
    for (let child = source.lastChild; child; child = child.previousSibling) {
      pending.push({ source: child, parent })
    }
  }

  queueChildren(input.content, output.content)

  while (pending.length) {
    const { source, parent } = pending.pop()!

    if (source.nodeType === Node.TEXT_NODE) {
      parent.appendChild(document.createTextNode(source.nodeValue ?? ''))
      continue
    }

    if (!(source instanceof HTMLElement)) continue

    const tag = source.localName
    if (DISCARD.has(tag)) continue

    if (!ALLOWED.has(tag)) {
      queueChildren(source, parent)
      continue
    }

    // Vytváříme nové prvky bez cizích atributů, tříd a obsluh událostí.
    const target = output.content.ownerDocument.createElement(tag)

    if (tag === 'a') {
      const href = (source.getAttribute('href') ?? '').trim()
      if (allowedHref(href)) target.setAttribute('href', href)
    }

    if (tag === 'img') {
      const src = source.getAttribute('src') ?? ''
      const alt = source.getAttribute('alt') ?? ''

      if (!RASTER.test(src)) {
        if (alt) parent.appendChild(document.createTextNode(alt))
        continue
      }

      target.setAttribute('src', src)
      target.setAttribute('alt', alt)
    }

    if (tag === 'input') {
      if (source.getAttribute('type') !== 'checkbox') continue

      target.setAttribute('type', 'checkbox')
      target.setAttribute('disabled', '')
      if (source.hasAttribute('checked')) target.setAttribute('checked', '')
    }

    if (tag === 'td' || tag === 'th') {
      for (const name of ['colspan', 'rowspan']) {
        const value = source.getAttribute(name) ?? ''
        if (/^[1-9]\d?$/.test(value)) target.setAttribute(name, value)
      }
    }

    copyFormatting(source, target)
    parent.appendChild(target)
    queueChildren(source, target)
  }

  return output.innerHTML
}

export const prepareImportedContent = (fileName: string, raw: string): string =>
  /\.html?$/i.test(fileName) ? sanitizeHtml(raw) : escapeTextToHtml(raw)
