# Pozadí Hubu

Sem patří fotka nočního parku, kterou Hub používá jako pozadí:

```
public/backgrounds/hub-bg.png
```

Na tento přesný název a cestu odkazuje `src/pages/hub/HubModule.css`
(pravidlo `.hub-bg`). Stačí soubor nahrát sem — v kódu není potřeba nic měnit.

Dokud soubor chybí, vykreslí se pod ním záložní gradient v barvách nočního
parku, takže se aplikace nerozbije, jen nevypadá úplně podle návrhu.
