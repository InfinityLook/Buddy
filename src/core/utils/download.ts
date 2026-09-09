// ==========================================
// Stažení prostého textu jako souboru — stejný Blob + <a download>
// vzorec, jaký `backup.ts`/`fileBackup.ts` už používají pro zálohy,
// jen bez JSON/ZIP obalu. Sdílené místo, protože Writer's Roomova
// trojice appek (Kniha/Scénář/Komiks) potřebuje přesně tohle najednou
// ve třech samostatných souborech — přesně ta chvíle, kdy se má malý
// kus logiky přesunout do core/utils, ne kopírovat potřetí.
// ==========================================

// Sejme diakritiku (á→a, í→i, ř→r, ě→e, ů→u…) a znaky nepřípustné ve
// jméně souboru na Windows. Ověřeno reálně, ne jen teoreticky: `download`
// atribut se znakem s diakritikou spolehlivě spadl na generické jméno
// "download" bez přípony — appka je celá česká, názvy knih/scénářů/
// komiksů diakritiku běžně mají, takže tohle by potkalo skutečné
// uživatele, ne jen tenhle test.
export const bezpecnyNazevSouboru = (nazev: string): string =>
  nazev
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .trim() || 'soubor'

export const stahnoutTextovySoubor = (nazevSouboru: string, obsah: string): void => {
  const blob = new Blob([obsah], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = bezpecnyNazevSouboru(nazevSouboru)
  // Odkaz musí být skutečně v dokumentu, jinak některé prohlížeče
  // (ověřeno reálně v Playwrightu) atribut `download` nespolehlivě
  // respektují a stažení skončí s generickým jménem "download" místo
  // skutečného názvu souboru — stejný vzorec, jaký `backup.ts` už
  // používá o pár řádků výš v týhle složce.
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
