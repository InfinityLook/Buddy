import { MAX_NOTE_HTML } from './types'

const tags = new Set([
  'P', 'DIV', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S',
  'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'BLOCKQUOTE',
  'PRE', 'CODE', 'A', 'INPUT',
])

export const escapeNote = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n|\r|\n/g, '<br>')

export const safeNoteUrl = (value: string): string | null => {
  try {
    const url = new URL(
      /^[a-z][a-z0-9+.-]*:/i.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`
    )
    return ['https:', 'http:', 'mailto:'].includes(url.protocol)
      ? url.href
      : null
  } catch {
    return null
  }
}

// Šablona zůstává inertní. Z obsahu ponecháme pouze vlastní bezpečnou sadu prvků.
export const cleanNoteHtml = (value: string): string => {
  if (value.length > MAX_NOTE_HTML) {
    throw new Error('Poznámka je příliš velká. Rozděl ji na menší části.')
  }

  const template = document.createElement('template')
  template.innerHTML = value

  template.content
    .querySelectorAll('script,style,iframe,object,embed,svg,math,form,template')
    .forEach(element => element.remove())

  for (const element of Array.from(template.content.querySelectorAll('*'))) {
    if (!tags.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes))
      continue
    }

    const href = element.tagName === 'A'
      ? safeNoteUrl(element.getAttribute('href') ?? '')
      : null

    const checked =
      element.tagName === 'INPUT' &&
      element.getAttribute('type') === 'checkbox' &&
      element.hasAttribute('checked')

    if (
      element.tagName === 'INPUT' &&
      element.getAttribute('type') !== 'checkbox'
    ) {
      element.remove()
      continue
    }

    for (const attribute of Array.from(element.attributes)) {
      element.removeAttribute(attribute.name)
    }

    if (href) {
      element.setAttribute('href', href)
      element.setAttribute('rel', 'noopener noreferrer')
    }

    if (element.tagName === 'INPUT') {
      element.setAttribute('type', 'checkbox')
      element.setAttribute('contenteditable', 'false')
      if (checked) element.setAttribute('checked', '')
    }
  }

  if (template.innerHTML.length > MAX_NOTE_HTML) {
    throw new Error('Poznámka je příliš velká. Rozděl ji na menší části.')
  }

  return template.innerHTML
}

export const notePlainText = (html: string): string => {
  const template = document.createElement('template')
  template.innerHTML = cleanNoteHtml(html)
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h[1-3]|li|blockquote|pre)>/gi, '\n')

  return (template.content.textContent ?? '').replace(/\u00a0/g, ' ')
}

export const noteMarkdown = (html: string): string => {
  const template = document.createElement('template')
  template.innerHTML = cleanNoteHtml(html)

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''

    if (!(node instanceof Element)) {
      return Array.from(node.childNodes).map(walk).join('')
    }

    const body = Array.from(node.childNodes).map(walk).join('')

    switch (node.tagName) {
      case 'BR':
        return '\n'
      case 'B':
      case 'STRONG':
        return `**${body}**`
      case 'I':
      case 'EM':
        return `*${body}*`
      case 'H1':
      case 'H2':
      case 'H3':
        return `\n${'#'.repeat(Number(node.tagName[1]))} ${body}\n\n`
      case 'LI':
        return `- ${body}\n`
      case 'INPUT':
        return node.hasAttribute('checked') ? '[x] ' : '[ ] '
      case 'A':
        return node.getAttribute('href')
          ? `[${body}](${node.getAttribute('href')})`
          : body
      case 'PRE':
        return `\n\x60\x60\x60\n${node.textContent ?? ''}\n\x60\x60\x60\n`
      case 'CODE':
        return `\x60${body}\x60`
      case 'BLOCKQUOTE':
        return `\n> ${body.trim()}\n`
      case 'P':
      case 'DIV':
        return `${body}\n\n`
      default:
        return body
    }
  }

  return walk(template.content).trim()
}
