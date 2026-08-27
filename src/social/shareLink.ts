// ==========================================
// Sdílitelný odkaz na vlastní profil — /social?kod=<přátelský kód>.
// Zvolený tvar odpovídá už existujícímu vzoru appky (/apps?kategorie=X,
// viz AppModule.tsx), ne nová trasa v App.tsx jen kvůli přesměrování.
// SocialModule.tsx na tenhle parametr reaguje jednorázově při načtení
// (stejně jako AppModule reaguje na kategorii) — otevře profil, kterému
// kód patří, a parametr z URL zase odstraní.
// ==========================================

export const profilOdkaz = (kod: string): string =>
  `${window.location.origin}/social?kod=${encodeURIComponent(kod)}`
