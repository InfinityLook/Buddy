import { useEffect, useRef, useState } from 'react'
import type * as THREE from 'three'
import { KOULE } from './constants'

// ==========================================
// Tiché 3D pozadí Socialu — pár svítících koulí, které se pomalu
// nadechují a scéna se jako celek nekonečně pomalu otáčí. Žádná
// interakce, žádný raycasting, žádné OrbitControls: tohle není obsah,
// jen atmosféra za obsahem.
//
// Životní cyklus je stejný princip jako u kamery ve Form Checku
// (usePoseEngine.ts) — scéna mimo React, úklid při odchodu, canvas jen
// jako referenční prvek.
//
// `three` (473 kB / 119 kB gzip) se sem dřív importoval staticky nahoře
// v souboru — Vite ho tím zařadil jako pevnou závislost celého Social
// chunku (SocialModule.tsx ho importuje jen nepřímo, přes tenhle hook,
// ale React.lazy() stejně musí dotáhnout celý graf statických importů,
// než smí vykreslit cokoli). Skutečný obsah — profil, přátelé, chaty —
// tak čekal na knihovnu, kterou používá jen dekorativní pozadí za nimi.
// `import('three')` tady místo toho stahuje knihovnu asynchronně, až po
// prvním vykreslení stránky: text a data jsou vidět hned, koule se
// dokreslí o zlomek sekundy později, ne naopak. `import type` nahoře
// zůstává jen kvůli typům (`THREE.Mesh`/`THREE.Material` v úklidu níž)
// — nulová běhová cena, ES moduly typové importy při buildu zahodí.
// ==========================================

interface UseAmbientSceneResult {
  containerRef: React.RefObject<HTMLDivElement>
  failed: boolean
}

export const useAmbientScene = (): UseAmbientSceneResult => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Efekt smí odejít (odmontování, StrictMode dvojí běh) ještě dřív,
    // než dynamický import doběhne — zruseno hlídá, aby se scéna po
    // pozdě doražené odpovědi nepostavila do už zavřeného kontejneru,
    // a uklid drží skutečnou úklidovou funkci, dostupnou jen od chvíle,
    // kdy je co uklízet.
    let zruseno = false
    let uklid: (() => void) | null = null

    void import('three').then((THREE) => {
      if (zruseno) return

      const klidnyRezim = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      let renderer: THREE.WebGLRenderer
      try {
        // alpha: true — plátno zůstává průhledné, prosvítá skrz něj barevný
        // gradient pozadí Social stránky. Koule jsou ozdoba nad ním, ne
        // náhrada za něj.
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
      } catch {
        setFailed(true)
        return
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      container.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 1, 100)
      camera.position.set(0, 0, 16)

      const skupina = new THREE.Group()
      scene.add(skupina)

      const koule = KOULE.map((def) => {
        const barva = new THREE.Color(def.barva)

        // Vnitřní jádro — menší a jasnější
        const jadro = new THREE.Mesh(
          new THREE.SphereGeometry(def.polomer * 0.55, 16, 16),
          new THREE.MeshBasicMaterial({ color: barva, transparent: true, opacity: 0.55 })
        )

        // Vnější svatozář — větší a průsvitná, dělá z tečky záři, ne kuličku.
        // Dvě průhledné vrstvy nad sebou místo jedné texturované záře:
        // žádný externí obrázek, žádné načítání navíc.
        const zar = new THREE.Mesh(
          new THREE.SphereGeometry(def.polomer, 16, 16),
          new THREE.MeshBasicMaterial({ color: barva, transparent: true, opacity: 0.16 })
        )

        const uzel = new THREE.Group()
        uzel.add(zar, jadro)
        uzel.position.set(...def.pozice)
        skupina.add(uzel)

        return { uzel, def }
      })

      // --- změna velikosti ---
      const prizpusob = () => {
        const sirka = container.clientWidth
        const vyska = container.clientHeight
        if (sirka === 0 || vyska === 0) return
        camera.aspect = sirka / vyska
        camera.updateProjectionMatrix()
        renderer.setSize(sirka, vyska)
      }

      const observer = new ResizeObserver(prizpusob)
      observer.observe(container)

      // --- jemný náklon za ukazatelem, zanedbatelný rozsah ---
      let cilX = 0
      let cilY = 0
      const onPointerMove = (event: PointerEvent) => {
        if (klidnyRezim) return
        cilX = (event.clientX / window.innerWidth - 0.5) * 2
        cilY = (event.clientY / window.innerHeight - 0.5) * 2
      }
      if (!klidnyRezim) window.addEventListener('pointermove', onPointerMove)

      // --- kreslicí smyčka ---
      let smycka = 0
      let bezi = true

      const vykresliJednouStaticky = () => {
        renderer.render(scene, camera)
      }

      const krok = () => {
        if (!bezi) return
        smycka = requestAnimationFrame(krok)

        const cas = performance.now() / 1000

        for (const { uzel, def } of koule) {
          uzel.position.y = def.pozice[1] + Math.sin(cas * def.rychlost + def.faze) * 0.5
        }

        // Celá skupina se otáčí nekonečně pomalu — jedna otočka za několik
        // minut, sotva postřehnutelná, akorát aby pozadí nepůsobilo mrtvě.
        skupina.rotation.y = cas * 0.015

        // Náklon skupiny za ukazatelem — malý rozsah, ať to nepůsobí jako
        // ovládací prvek, jen jako by scéna měla hloubku.
        skupina.rotation.x += (cilY * 0.06 - skupina.rotation.x) * 0.02
        skupina.rotation.z += (-cilX * 0.04 - skupina.rotation.z) * 0.02

        renderer.render(scene, camera)
      }

      if (klidnyRezim) {
        // Bez pohybu se nekreslí smyčka vůbec — jeden nehybný snímek stačí
        // a nic neběží na pozadí navíc.
        vykresliJednouStaticky()
      } else {
        krok()
      }

      uklid = () => {
        bezi = false
        cancelAnimationFrame(smycka)
        observer.disconnect()
        window.removeEventListener('pointermove', onPointerMove)

        for (const { uzel } of koule) {
          uzel.traverse((obj) => {
            const mesh = obj as THREE.Mesh
            if (mesh.geometry) mesh.geometry.dispose()
            const material = mesh.material as THREE.Material | THREE.Material[] | undefined
            if (Array.isArray(material)) material.forEach((m) => m.dispose())
            else material?.dispose()
          })
        }

        renderer.dispose()
        renderer.domElement.remove()
      }
    })

    return () => {
      zruseno = true
      uklid?.()
    }
  }, [])

  return { containerRef, failed }
}
