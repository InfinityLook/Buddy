# Portréty hrdinů (herní hub)

```
public/postavy/kael.jpg
public/postavy/lyra.jpg
public/postavy/rayen.jpg
public/postavy/elara.jpg
public/postavy/drakon.jpg
```

Oříznuté karty (280×764 px) z referenčního obrázku "Buddy Realm — Heroes",
každá odpovídá jedné položce v `src/game/postavy.ts` (`Postava.portret`) a
zobrazuje ji `src/game/components/PostavaKarta.tsx`. Portrét už sám nese
jméno/titul/živel/roli jako součást ilustrace — v kódu se nezdvojuje jako
text, jen se doplňuje o skutečně dynamický obsah (odznak úrovně, herní
bonusy, případná nevýhoda).

Mimo instalační precache (viz `globPatterns` ve `vite.config.ts`, `.jpg`
tam není) — stáhnou se lazy až při prvním otevření `/hra`, stejným
důvodem a stejným vzorem jako mapa světa v `public/backgrounds/`.
