import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { GpsBod } from './types'

// Leafletovy výchozí ikony značky se pod bundlery (Vite/webpack) rozbijí —
// CSS si relativní cesty přepíše samo, ale Leafletův JS si cesty počítá
// ručně a ty zůstanou ukazovat na neexistující soubor. Standardní obchvat:
// smazat rozbitý _getIconUrl a doplnit tři obrázky jako skutečné,
// Vitem sestavené URL.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const STRED_PRED_PRVNIM_BODEM: L.LatLngExpression = [50.0755, 14.4378] // Praha — jen než dorazí první skutečná poloha

interface Props {
  trasa: GpsBod[]
  vyska?: number
}

// ==========================================
// Mapa v pozadí Běhání/Kardio — OpenStreetMap přes Leaflet, zdarma a bez
// klíče. Mapa i vrstva žijí mimo React, stejná "renderer/scéna mimo
// React, komponenta jen předává data" zásada jako useAmbientScene.ts/
// usePlayerWorld.ts/useSoubojScene.ts jinde v appce, jen s Leafletem
// místo Three.js — Leaflet se sem naimportuje jen tehdy, když appka
// tenhle soubor doopravdy načte (Behani.tsx je sama lazy-loadovaná přes
// MINI_APP_REGISTRY), takže hlavní balíček appky Leaflet nikdy nezatíží.
// ==========================================
export const TrasaMapa: React.FC<Props> = ({ trasa, vyska = 220 }) => {
  const kontejnerRef = useRef<HTMLDivElement>(null)
  const mapaRef = useRef<L.Map | null>(null)
  const carRef = useRef<L.Polyline | null>(null)
  const znackaRef = useRef<L.Marker | null>(null)

  useEffect(() => {
    if (!kontejnerRef.current || mapaRef.current) return

    const stred: L.LatLngExpression = trasa.length > 0 ? [trasa[0].lat, trasa[0].lng] : STRED_PRED_PRVNIM_BODEM
    const mapa = L.map(kontejnerRef.current, { zoomControl: true, attributionControl: true }).setView(stred, 16)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap přispěvatelé',
    }).addTo(mapa)

    mapaRef.current = mapa

    return () => {
      mapa.remove()
      mapaRef.current = null
      carRef.current = null
      znackaRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Trasa/značka se překreslí při každé změně bodů — mapa samotná se
  // znovu nezakládá, jen se jí mění data.
  useEffect(() => {
    const mapa = mapaRef.current
    if (!mapa) return

    const body: L.LatLngExpression[] = trasa.map((b) => [b.lat, b.lng])
    if (body.length === 0) return

    if (carRef.current) {
      carRef.current.setLatLngs(body)
    } else {
      carRef.current = L.polyline(body, { color: '#22d3ee', weight: 4, opacity: 0.9 }).addTo(mapa)
    }

    const posledni = body[body.length - 1]
    if (znackaRef.current) {
      znackaRef.current.setLatLng(posledni)
    } else {
      znackaRef.current = L.marker(posledni).addTo(mapa)
    }

    mapa.panTo(posledni, { animate: true, duration: 0.4 })
  }, [trasa])

  return <div ref={kontejnerRef} className="behani-mapa" style={{ height: vyska }} />
}
