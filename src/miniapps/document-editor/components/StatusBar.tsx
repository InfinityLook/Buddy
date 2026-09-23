import React, { useMemo } from 'react'
import { toPlainText } from '../useDocumentStore'

interface StatusBarProps {
  content: string
}

// Skloňování počtu podle českých pravidel (1 slovo / 2–4 slova / 5+ slov)
const sklonuj = (pocet: number, jeden: string, malo: string, hodne: string) => {
  if (pocet === 1) return jeden
  if (pocet >= 2 && pocet <= 4) return malo
  return hodne
}

export const StatusBar: React.FC<StatusBarProps> = ({ content }) => {
  const { words, chars } = useMemo(() => {
    // Sdílená funkce se storem (ne vlastní kopie) — ta dřív odkódovala
    // jen &nbsp;, takže dokument s escapovaným &, < nebo > (typicky
    // "R&D" uložené contentEditable jako "R&amp;D") ukázal nafouknutý
    // počet znaků/slov o délku neodkódovaných entit.
    const plainText = toPlainText(content).trim()
    const wordCount = plainText.length === 0 ? 0 : plainText.split(/\s+/).length
    return { words: wordCount, chars: plainText.length }
  }, [content])

  return (
    <div className="doc-statusbar">
      <span>
        {words} {sklonuj(words, 'slovo', 'slova', 'slov')}
      </span>
      <span>
        {chars} {sklonuj(chars, 'znak', 'znaky', 'znaků')}
      </span>
    </div>
  )
}
