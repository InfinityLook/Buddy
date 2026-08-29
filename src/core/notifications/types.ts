export interface Oznameni {
  id: string
  text: string
  createdAt: string
}

// Lajk/komentář na vlastním příspěvku — viz core/notifications/api.ts,
// funkce nacti_aktivitu_prispevku (bell čte přes ni, ne přímo z tabulky
// aktivita_prispevku, protože autor lajku/komentáře nemusí být přítel
// příjemce).
export interface AktivitaPrispevku {
  id: string
  typ: 'lajk' | 'komentar'
  odId: string
  odJmeno: string
  postId: string | null
  createdAt: string
}
