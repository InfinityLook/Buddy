          <div className="bz-obsah">
            <button className="bz-hra-karta" onClick={() => navigate('/hra/survival-night')}>
              <span className="bz-hra-karta-znak" aria-hidden="true">
                🌙
              </span>
              <span className="bz-hra-karta-text">
                <span className="bz-hra-karta-nazev">Survival Night</span>
                <span className="bz-hra-karta-popis">Temná noční aréna. Vlny monster. Přežij co nejdéle.</span>
              </span>
              <span className="bz-hra-karta-hrat">HRÁT ▶</span>
            </button>
            <button className="bz-hra-karta bz-hra-karta--deskova" onClick={() => navigate('/hra/deskova-hra')}>
              <span className="bz-hra-karta-znak" aria-hidden="true">🎲</span>
              <span className="bz-hra-karta-text">
                <span className="bz-hra-karta-nazev">Čtyři království</span>
                <span className="bz-hra-karta-popis">Desková hra pro 4 hráče. Hoď kostkou a dojdi do cíle.</span>
              </span>
              <span className="bz-hra-karta-hrat">HRÁT ▶</span>
            </button>
          </div>