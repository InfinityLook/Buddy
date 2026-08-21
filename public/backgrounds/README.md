# Pozadí Hubu

Sem patří fotka nočního parku, kterou Hub používá jako pozadí:

```
public/backgrounds/hub-bg.png
```

Na tento přesný název a cestu odkazuje `src/pages/hub/HubModule.css`
(pravidlo `.hub-bg`). Stačí soubor nahrát sem — v kódu není potřeba nic měnit.

Dokud soubor chybí, vykreslí se pod ním záložní gradient v barvách nočního
parku, takže se aplikace nerozbije, jen nevypadá úplně podle návrhu.

## Mapa světa (herní hub)

```
public/backgrounds/mapa-sveta.jpg
```

Ilustrovaná mapa "Buddy Realm" pod piny míst v `/hra` (odkazuje na ni
`src/game/components/MapaSveta.tsx`, přesně na tuhle cestu a název).
Souřadnice pinů v `src/game/lokace.ts` jsou procenta odečtená z téhle
konkrétní bitmapy (1536×1024 px) — výměna za jiný obrázek znamená
přepočítat je znovu, ne jen nahradit soubor. Mimo instalační precache
(viz `globPatterns` ve `vite.config.ts`, `.jpg` tam není) — stáhne se
lazy při prvním otevření mapy a pak zůstává v cache offline.
