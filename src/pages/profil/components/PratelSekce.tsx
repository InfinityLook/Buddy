import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { useNavigate } from 'react-router-dom'
import { useSocial } from '@/social/useSocial'
import { PratelePanel } from '@/social/components/PratelePanel'
import { SkenovatKodDialog } from '@/social/components/SkenovatKodDialog'
import { VerejnyProfilDialog } from '@/social/components/VerejnyProfilDialog'
import { SocialIcon } from '@/social/components/SocialIcon'
import * as socialApi from '@/social/api'
import { profilOdkaz } from '@/social/shareLink'
import '@/social/SocialModule.css'

// ==========================================
// Přátelé a sdílení vlastního kódu — dřív žily jako Social's vlastní
// "Profil" záložka (MujProfilPanel.tsx, teď smazaná), teď tady, na
// appčině skutečném profilu. Dvě různé "moje" obrazovky se jménem,
// avatarem a úrovní vedle sebe (appčin profil a Social's kopie) byly
// matoucí — tenhle přesun je sloučí do jedné, a Social's spodní
// navigace uvolní místo nové záložce Domů (DomuPanel.tsx).
//
// React.lazy z ProfilModule.tsx, ne obyčejný import — ProfilModule
// sám o sobě není za React.lazy (na rozdíl od SocialModule), takže by
// tenhle soubor natáhl celé Social API (useSocial, api.ts, chat/blok
// volání) do appčina hlavního balíčku pro úplně každého, i pro toho,
// kdo Social nikdy neotevře. Stejná "zaplať jen ten, kdo to skutečně
// vidí" disciplína jako u Explorace3D.tsx v herním hubu.
// ==========================================

export const PratelSekce: React.FC = () => {
  const navigate = useNavigate()
  const stav = useSocial()
  const [qr, setQr] = useState<string | null>(null)
  const [sken, setSken] = useState(false)
  const [zkopirovano, setZkopirovano] = useState(false)
  const [otevrenyProfil, setOtevrenyProfil] = useState<string | null>(null)

  // QR se generuje z vlastního kódu, jakmile ho appka zná — čistě
  // klientská knihovna (qrcode), žádný síťový dotaz.
  useEffect(() => {
    const kod = stav.profil?.friendCode
    if (!kod) return
    let platne = true
    void QRCode.toDataURL(profilOdkaz(kod), { margin: 1, width: 168 }).then(
      (url) => platne && setQr(url)
    )
    return () => {
      platne = false
    }
  }, [stav.profil?.friendCode])

  // "Napsat"/otevřít chat tady nemá kam appku zavést dovnitř Social na
  // konkrétní rozhovor (to je čistě lokální stav SocialModule.tsx) —
  // appka proto jen otevře Social, kde si uživatel chat najde v Chatech.
  // Přijatelné zjednodušení, ne bug: chat už v tu chvíli existuje
  // (api.otevritChatSPritelem ho založí/najde dřív, než tenhle callback
  // vůbec dostane jeho id).
  const otevritSocial = () => navigate('/social')

  return (
    <div className="social-panel">
      <section className="social-card">
        <span className="social-card-label">MŮJ KÓD</span>
        <div className="social-muj-profil-radek">
          {qr && <img src={qr} alt="QR kód profilu" className="social-qr" />}
          <div className="social-muj-profil-akce">
            <span className="social-muj-kod">
              {stav.profil ? socialApi.formatujKod(stav.profil.friendCode) : ''}
            </span>
            <button
              className="social-btn social-btn--small"
              onClick={async () => {
                if (!stav.profil) return
                await navigator.clipboard.writeText(profilOdkaz(stav.profil.friendCode))
                setZkopirovano(true)
                window.setTimeout(() => setZkopirovano(false), 2000)
              }}
            >
              <SocialIcon name={zkopirovano ? 'check' : 'copy'} size={13} />
              {zkopirovano ? 'Zkopírováno' : 'Kopírovat odkaz'}
            </button>
            <button className="social-btn social-btn--small social-btn--tlumene" onClick={() => setSken(true)}>
              📷 Naskenovat kód
            </button>
          </div>
        </div>
      </section>

      <PratelePanel stav={stav} onOtevritChat={otevritSocial} onOtevritProfil={setOtevrenyProfil} />

      {sken && (
        <SkenovatKodDialog stav={stav} onOtevritProfil={setOtevrenyProfil} onZavrit={() => setSken(false)} />
      )}

      {otevrenyProfil && (
        <VerejnyProfilDialog
          userId={otevrenyProfil}
          stav={stav}
          onOtevritChat={otevritSocial}
          onZavrit={() => setOtevrenyProfil(null)}
        />
      )}
    </div>
  )
}

export default PratelSekce
