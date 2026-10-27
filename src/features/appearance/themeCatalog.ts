export const THEME_IDS = ['zlaty-soumrak','neonova-noc','polarni-zare','lesni-klid','cisty-den'] as const
export type BuddyThemeId = typeof THEME_IDS[number]
export const DEFAULT_BUDDY_THEME: BuddyThemeId = 'zlaty-soumrak'
export const isBuddyThemeId = (value: unknown): value is BuddyThemeId => typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value)
export const THEME_FAMILIES = {
  "zlaty-soumrak": {
    "id": "zlaty-soumrak",
    "name": "Zlatý soumrak",
    "description": "Fantasy krajina, jantarové světlo a tmavě modré panely.",
    "mode": "dark",
    "accent": "#E8BD70",
    "accent2": "#FFC966",
    "bg": "#090F1E",
    "panel": "#0D1729",
    "raised": "#172438",
    "text": "#F4F3EF",
    "muted": "#B5C2D4",
    "onAccent": "#1B1409",
    "border": "#8F794E",
    "glow": "rgba(232,189,112,.24)",
    "controlBorder": "#8F794E",
    "success": "#7EE6B2",
    "danger": "#FFB2BE",
    "warning": "#FFD27B",
    "info": "#A9D9FF",
    "sceneOverlay": "rgba(9,15,30,0.72)",
    "panelGlass": "rgba(13,23,41,0.96)",
    "assets": {
      "sceneMobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
      "sceneTablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp",
      "preview": "/buddy-themes/shared/zlaty-soumrak/theme-preview.webp",
      "buttonFrame": "/buddy-themes/shared/zlaty-soumrak/button-frame.svg",
      "panelFrame": "/buddy-themes/shared/zlaty-soumrak/panel-frame.svg"
    }
  },
  "neonova-noc": {
    "id": "neonova-noc",
    "name": "Neonová noc",
    "description": "Noční město, azurová záře a drobné purpurové akcenty.",
    "mode": "dark",
    "accent": "#64E8F7",
    "accent2": "#EC8DF8",
    "bg": "#070C19",
    "panel": "#0B1528",
    "raised": "#15253B",
    "text": "#F0F6FF",
    "muted": "#B0C7DE",
    "onAccent": "#061721",
    "border": "#448A9C",
    "glow": "rgba(70,230,250,.28)",
    "controlBorder": "#448A9C",
    "success": "#7EE6B2",
    "danger": "#FFB2BE",
    "warning": "#FFD27B",
    "info": "#A9D9FF",
    "sceneOverlay": "rgba(7,12,25,0.72)",
    "panelGlass": "rgba(11,21,40,0.96)",
    "assets": {
      "sceneMobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
      "sceneTablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp",
      "preview": "/buddy-themes/shared/neonova-noc/theme-preview.webp",
      "buttonFrame": "/buddy-themes/shared/neonova-noc/button-frame.svg",
      "panelFrame": "/buddy-themes/shared/neonova-noc/panel-frame.svg"
    }
  },
  "polarni-zare": {
    "id": "polarni-zare",
    "name": "Polární záře",
    "description": "Zasněžené hory, stříbrné detaily a mátová polární záře.",
    "mode": "dark",
    "accent": "#B4F6DF",
    "accent2": "#D7EDFF",
    "bg": "#0A1427",
    "panel": "#101F36",
    "raised": "#203449",
    "text": "#F2F8FD",
    "muted": "#B7D1E4",
    "onAccent": "#0D2730",
    "border": "#7FAAB7",
    "glow": "rgba(168,245,221,.23)",
    "controlBorder": "#7FAAB7",
    "success": "#7EE6B2",
    "danger": "#FFB2BE",
    "warning": "#FFD27B",
    "info": "#A9D9FF",
    "sceneOverlay": "rgba(10,20,39,0.72)",
    "panelGlass": "rgba(16,31,54,0.96)",
    "assets": {
      "sceneMobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
      "sceneTablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp",
      "preview": "/buddy-themes/shared/polarni-zare/theme-preview.webp",
      "buttonFrame": "/buddy-themes/shared/polarni-zare/button-frame.svg",
      "panelFrame": "/buddy-themes/shared/polarni-zare/panel-frame.svg"
    }
  },
  "lesni-klid": {
    "id": "lesni-klid",
    "name": "Lesní klid",
    "description": "Lesní útočiště, zelené plochy a teplé měděné detaily.",
    "mode": "dark",
    "accent": "#DFB37A",
    "accent2": "#D0DFA4",
    "bg": "#091710",
    "panel": "#10231A",
    "raised": "#1D3528",
    "text": "#F1F5EB",
    "muted": "#BDCEBA",
    "onAccent": "#1B1B0D",
    "border": "#8C7952",
    "glow": "rgba(219,177,119,.20)",
    "controlBorder": "#8C7952",
    "success": "#7EE6B2",
    "danger": "#FFB2BE",
    "warning": "#FFD27B",
    "info": "#A9D9FF",
    "sceneOverlay": "rgba(9,23,16,0.72)",
    "panelGlass": "rgba(16,35,26,0.96)",
    "assets": {
      "sceneMobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
      "sceneTablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp",
      "preview": "/buddy-themes/shared/lesni-klid/theme-preview.webp",
      "buttonFrame": "/buddy-themes/shared/lesni-klid/button-frame.svg",
      "panelFrame": "/buddy-themes/shared/lesni-klid/panel-frame.svg"
    }
  },
  "cisty-den": {
    "id": "cisty-den",
    "name": "Čistý den",
    "description": "Světlý podklad, jemná levandulová krajina a jednoduché ikony.",
    "mode": "light",
    "accent": "#6046C2",
    "accent2": "#7C64D1",
    "bg": "#F8F7FD",
    "panel": "#FFFFFF",
    "raised": "#EFECFA",
    "text": "#201C3D",
    "muted": "#625D79",
    "onAccent": "#FFFFFF",
    "border": "#B6AAD5",
    "glow": "rgba(96,70,194,.12)",
    "controlBorder": "#827599",
    "success": "#18764A",
    "danger": "#B91C38",
    "warning": "#805500",
    "info": "#175BA5",
    "sceneOverlay": "rgba(248,247,253,0.8)",
    "panelGlass": "rgba(255,255,255,0.96)",
    "assets": {
      "sceneMobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
      "sceneTablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp",
      "preview": "/buddy-themes/shared/cisty-den/theme-preview.webp",
      "buttonFrame": "/buddy-themes/shared/cisty-den/button-frame.svg",
      "panelFrame": "/buddy-themes/shared/cisty-den/panel-frame.svg"
    }
  }
} as const
export const SURFACES = {
  "school-room": {
    "id": "school-room",
    "name": "School Room",
    "kind": "room",
    "shortName": "School Room",
    "subtitle": "Přehled, cíle a nástroje",
    "route": "/skola",
    "parentRoom": null,
    "defaultScenery": true,
    "variants": {
      "zlaty-soumrak": {
        "id": "school-room--zlaty-soumrak",
        "surfaceId": "school-room",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-room/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/school-room/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/school-room/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-room/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-room/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/school-room/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-room/zlaty-soumrak/tile.png"
        },
        "preview": "previews/school-room/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "school-room--neonova-noc",
        "surfaceId": "school-room",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-room/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/school-room/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/school-room/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-room/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-room/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/school-room/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-room/neonova-noc/tile.png"
        },
        "preview": "previews/school-room/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "school-room--polarni-zare",
        "surfaceId": "school-room",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-room/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/school-room/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/school-room/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-room/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-room/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/school-room/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-room/polarni-zare/tile.png"
        },
        "preview": "previews/school-room/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "school-room--lesni-klid",
        "surfaceId": "school-room",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-room/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/school-room/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/school-room/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-room/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-room/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/school-room/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-room/lesni-klid/tile.png"
        },
        "preview": "previews/school-room/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "school-room--cisty-den",
        "surfaceId": "school-room",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-room/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/school-room/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/school-room/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-room/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-room/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/school-room/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-room/cisty-den/tile.png"
        },
        "preview": "previews/school-room/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "fitness-room": {
    "id": "fitness-room",
    "name": "Fitness Room",
    "kind": "room",
    "shortName": "Fitness Room",
    "subtitle": "Dnešní pohyb a návyky",
    "route": "/fitness",
    "parentRoom": null,
    "defaultScenery": true,
    "variants": {
      "zlaty-soumrak": {
        "id": "fitness-room--zlaty-soumrak",
        "surfaceId": "fitness-room",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/fitness-room/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/fitness-room/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/fitness-room/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/fitness-room/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/fitness-room/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/fitness-room/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/fitness-room/zlaty-soumrak/tile.png"
        },
        "preview": "previews/fitness-room/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "fitness-room--neonova-noc",
        "surfaceId": "fitness-room",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/fitness-room/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/fitness-room/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/fitness-room/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/fitness-room/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/fitness-room/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/fitness-room/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/fitness-room/neonova-noc/tile.png"
        },
        "preview": "previews/fitness-room/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "fitness-room--polarni-zare",
        "surfaceId": "fitness-room",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/fitness-room/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/fitness-room/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/fitness-room/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/fitness-room/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/fitness-room/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/fitness-room/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/fitness-room/polarni-zare/tile.png"
        },
        "preview": "previews/fitness-room/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "fitness-room--lesni-klid",
        "surfaceId": "fitness-room",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/fitness-room/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/fitness-room/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/fitness-room/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/fitness-room/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/fitness-room/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/fitness-room/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/fitness-room/lesni-klid/tile.png"
        },
        "preview": "previews/fitness-room/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "fitness-room--cisty-den",
        "surfaceId": "fitness-room",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/fitness-room/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/fitness-room/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/fitness-room/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/fitness-room/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/fitness-room/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/fitness-room/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/fitness-room/cisty-den/tile.png"
        },
        "preview": "previews/fitness-room/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Pohyb"
  },
  "economy-room": {
    "id": "economy-room",
    "name": "Economy Room",
    "kind": "room",
    "shortName": "Economy Room",
    "subtitle": "Přehled financí a plánování",
    "route": "/economy",
    "parentRoom": null,
    "defaultScenery": true,
    "variants": {
      "zlaty-soumrak": {
        "id": "economy-room--zlaty-soumrak",
        "surfaceId": "economy-room",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/economy-room/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/economy-room/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/economy-room/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/economy-room/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/economy-room/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/economy-room/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/economy-room/zlaty-soumrak/tile.png"
        },
        "preview": "previews/economy-room/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "economy-room--neonova-noc",
        "surfaceId": "economy-room",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/economy-room/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/economy-room/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/economy-room/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/economy-room/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/economy-room/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/economy-room/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/economy-room/neonova-noc/tile.png"
        },
        "preview": "previews/economy-room/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "economy-room--polarni-zare",
        "surfaceId": "economy-room",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/economy-room/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/economy-room/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/economy-room/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/economy-room/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/economy-room/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/economy-room/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/economy-room/polarni-zare/tile.png"
        },
        "preview": "previews/economy-room/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "economy-room--lesni-klid",
        "surfaceId": "economy-room",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/economy-room/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/economy-room/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/economy-room/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/economy-room/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/economy-room/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/economy-room/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/economy-room/lesni-klid/tile.png"
        },
        "preview": "previews/economy-room/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "economy-room--cisty-den",
        "surfaceId": "economy-room",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/economy-room/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/economy-room/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/economy-room/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/economy-room/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/economy-room/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/economy-room/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/economy-room/cisty-den/tile.png"
        },
        "preview": "previews/economy-room/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Finance"
  },
  "growth-room": {
    "id": "growth-room",
    "name": "Growth Room",
    "kind": "room",
    "shortName": "Growth Room",
    "subtitle": "Cíle, návyky a soustředění",
    "route": "/growth",
    "parentRoom": null,
    "defaultScenery": true,
    "variants": {
      "zlaty-soumrak": {
        "id": "growth-room--zlaty-soumrak",
        "surfaceId": "growth-room",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/growth-room/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/growth-room/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/growth-room/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/growth-room/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/growth-room/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/growth-room/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/growth-room/zlaty-soumrak/tile.png"
        },
        "preview": "previews/growth-room/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "growth-room--neonova-noc",
        "surfaceId": "growth-room",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/growth-room/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/growth-room/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/growth-room/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/growth-room/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/growth-room/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/growth-room/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/growth-room/neonova-noc/tile.png"
        },
        "preview": "previews/growth-room/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "growth-room--polarni-zare",
        "surfaceId": "growth-room",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/growth-room/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/growth-room/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/growth-room/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/growth-room/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/growth-room/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/growth-room/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/growth-room/polarni-zare/tile.png"
        },
        "preview": "previews/growth-room/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "growth-room--lesni-klid",
        "surfaceId": "growth-room",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/growth-room/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/growth-room/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/growth-room/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/growth-room/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/growth-room/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/growth-room/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/growth-room/lesni-klid/tile.png"
        },
        "preview": "previews/growth-room/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "growth-room--cisty-den",
        "surfaceId": "growth-room",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/growth-room/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/growth-room/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/growth-room/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/growth-room/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/growth-room/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/growth-room/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/growth-room/cisty-den/tile.png"
        },
        "preview": "previews/growth-room/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Rozvoj"
  },
  "music-room": {
    "id": "music-room",
    "name": "Music Room",
    "kind": "room",
    "shortName": "Music Room",
    "subtitle": "Beaty, nahrávky a skladby",
    "route": "/music",
    "parentRoom": null,
    "defaultScenery": true,
    "variants": {
      "zlaty-soumrak": {
        "id": "music-room--zlaty-soumrak",
        "surfaceId": "music-room",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/music-room/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/music-room/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/music-room/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/music-room/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/music-room/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/music-room/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/music-room/zlaty-soumrak/tile.png"
        },
        "preview": "previews/music-room/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "music-room--neonova-noc",
        "surfaceId": "music-room",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/music-room/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/music-room/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/music-room/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/music-room/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/music-room/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/music-room/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/music-room/neonova-noc/tile.png"
        },
        "preview": "previews/music-room/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "music-room--polarni-zare",
        "surfaceId": "music-room",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/music-room/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/music-room/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/music-room/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/music-room/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/music-room/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/music-room/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/music-room/polarni-zare/tile.png"
        },
        "preview": "previews/music-room/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "music-room--lesni-klid",
        "surfaceId": "music-room",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/music-room/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/music-room/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/music-room/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/music-room/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/music-room/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/music-room/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/music-room/lesni-klid/tile.png"
        },
        "preview": "previews/music-room/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "music-room--cisty-den",
        "surfaceId": "music-room",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/music-room/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/music-room/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/music-room/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/music-room/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/music-room/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/music-room/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/music-room/cisty-den/tile.png"
        },
        "preview": "previews/music-room/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Hudba"
  },
  "writer-room": {
    "id": "writer-room",
    "name": "Writer’s Room",
    "kind": "room",
    "shortName": "Writer’s Room",
    "subtitle": "Knihy, scénáře a komiksy",
    "route": "/spisovatel",
    "parentRoom": null,
    "defaultScenery": true,
    "variants": {
      "zlaty-soumrak": {
        "id": "writer-room--zlaty-soumrak",
        "surfaceId": "writer-room",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/writer-room/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/writer-room/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/writer-room/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/writer-room/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/writer-room/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/writer-room/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/writer-room/zlaty-soumrak/tile.png"
        },
        "preview": "previews/writer-room/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "writer-room--neonova-noc",
        "surfaceId": "writer-room",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/writer-room/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/writer-room/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/writer-room/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/writer-room/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/writer-room/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/writer-room/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/writer-room/neonova-noc/tile.png"
        },
        "preview": "previews/writer-room/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "writer-room--polarni-zare",
        "surfaceId": "writer-room",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/writer-room/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/writer-room/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/writer-room/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/writer-room/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/writer-room/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/writer-room/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/writer-room/polarni-zare/tile.png"
        },
        "preview": "previews/writer-room/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "writer-room--lesni-klid",
        "surfaceId": "writer-room",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/writer-room/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/writer-room/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/writer-room/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/writer-room/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/writer-room/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/writer-room/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/writer-room/lesni-klid/tile.png"
        },
        "preview": "previews/writer-room/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "writer-room--cisty-den",
        "surfaceId": "writer-room",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/writer-room/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/writer-room/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/writer-room/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/writer-room/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/writer-room/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/writer-room/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/writer-room/cisty-den/tile.png"
        },
        "preview": "previews/writer-room/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Psaní"
  },
  "study-planner": {
    "id": "study-planner",
    "name": "Planer / Úkoly",
    "kind": "app",
    "shortName": "Planer / Úkoly",
    "subtitle": "Uspořádej si další krok",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "study-planner--zlaty-soumrak",
        "surfaceId": "study-planner",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/study-planner/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/study-planner/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/study-planner/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/study-planner/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/study-planner/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/study-planner/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/study-planner/zlaty-soumrak/tile.png"
        },
        "preview": "previews/study-planner/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "study-planner--neonova-noc",
        "surfaceId": "study-planner",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/study-planner/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/study-planner/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/study-planner/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/study-planner/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/study-planner/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/study-planner/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/study-planner/neonova-noc/tile.png"
        },
        "preview": "previews/study-planner/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "study-planner--polarni-zare",
        "surfaceId": "study-planner",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/study-planner/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/study-planner/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/study-planner/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/study-planner/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/study-planner/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/study-planner/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/study-planner/polarni-zare/tile.png"
        },
        "preview": "previews/study-planner/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "study-planner--lesni-klid",
        "surfaceId": "study-planner",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/study-planner/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/study-planner/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/study-planner/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/study-planner/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/study-planner/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/study-planner/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/study-planner/lesni-klid/tile.png"
        },
        "preview": "previews/study-planner/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "study-planner--cisty-den",
        "surfaceId": "study-planner",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/study-planner/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/study-planner/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/study-planner/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/study-planner/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/study-planner/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/study-planner/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/study-planner/cisty-den/tile.png"
        },
        "preview": "previews/study-planner/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "quick-notes": {
    "id": "quick-notes",
    "name": "Quick Notes / Poznámky",
    "kind": "app",
    "shortName": "Poznámky",
    "subtitle": "Zachyť nápad, dokud je čerstvý",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "quick-notes--zlaty-soumrak",
        "surfaceId": "quick-notes",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/quick-notes/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/quick-notes/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/quick-notes/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/quick-notes/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/quick-notes/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/quick-notes/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/quick-notes/zlaty-soumrak/tile.png"
        },
        "preview": "previews/quick-notes/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "quick-notes--neonova-noc",
        "surfaceId": "quick-notes",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/quick-notes/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/quick-notes/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/quick-notes/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/quick-notes/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/quick-notes/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/quick-notes/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/quick-notes/neonova-noc/tile.png"
        },
        "preview": "previews/quick-notes/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "quick-notes--polarni-zare",
        "surfaceId": "quick-notes",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/quick-notes/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/quick-notes/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/quick-notes/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/quick-notes/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/quick-notes/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/quick-notes/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/quick-notes/polarni-zare/tile.png"
        },
        "preview": "previews/quick-notes/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "quick-notes--lesni-klid",
        "surfaceId": "quick-notes",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/quick-notes/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/quick-notes/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/quick-notes/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/quick-notes/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/quick-notes/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/quick-notes/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/quick-notes/lesni-klid/tile.png"
        },
        "preview": "previews/quick-notes/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "quick-notes--cisty-den",
        "surfaceId": "quick-notes",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/quick-notes/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/quick-notes/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/quick-notes/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/quick-notes/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/quick-notes/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/quick-notes/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/quick-notes/cisty-den/tile.png"
        },
        "preview": "previews/quick-notes/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "pomodoro": {
    "id": "pomodoro",
    "name": "Pomodoro",
    "kind": "app",
    "shortName": "Pomodoro",
    "subtitle": "Čas jen pro jednu věc",
    "route": "/apps",
    "parentRoom": "growth-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "pomodoro--zlaty-soumrak",
        "surfaceId": "pomodoro",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/pomodoro/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/pomodoro/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/pomodoro/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/pomodoro/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/pomodoro/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/pomodoro/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/pomodoro/zlaty-soumrak/tile.png"
        },
        "preview": "previews/pomodoro/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "pomodoro--neonova-noc",
        "surfaceId": "pomodoro",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/pomodoro/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/pomodoro/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/pomodoro/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/pomodoro/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/pomodoro/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/pomodoro/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/pomodoro/neonova-noc/tile.png"
        },
        "preview": "previews/pomodoro/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "pomodoro--polarni-zare",
        "surfaceId": "pomodoro",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/pomodoro/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/pomodoro/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/pomodoro/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/pomodoro/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/pomodoro/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/pomodoro/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/pomodoro/polarni-zare/tile.png"
        },
        "preview": "previews/pomodoro/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "pomodoro--lesni-klid",
        "surfaceId": "pomodoro",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/pomodoro/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/pomodoro/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/pomodoro/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/pomodoro/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/pomodoro/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/pomodoro/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/pomodoro/lesni-klid/tile.png"
        },
        "preview": "previews/pomodoro/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "pomodoro--cisty-den",
        "surfaceId": "pomodoro",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/pomodoro/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/pomodoro/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/pomodoro/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/pomodoro/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/pomodoro/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/pomodoro/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/pomodoro/cisty-den/tile.png"
        },
        "preview": "previews/pomodoro/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "flashcards": {
    "id": "flashcards",
    "name": "Flashcards",
    "kind": "app",
    "shortName": "Kartičky",
    "subtitle": "Uč se po malých dávkách",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "flashcards--zlaty-soumrak",
        "surfaceId": "flashcards",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/flashcards/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/flashcards/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/flashcards/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/flashcards/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/flashcards/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/flashcards/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/flashcards/zlaty-soumrak/tile.png"
        },
        "preview": "previews/flashcards/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "flashcards--neonova-noc",
        "surfaceId": "flashcards",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/flashcards/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/flashcards/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/flashcards/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/flashcards/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/flashcards/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/flashcards/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/flashcards/neonova-noc/tile.png"
        },
        "preview": "previews/flashcards/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "flashcards--polarni-zare",
        "surfaceId": "flashcards",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/flashcards/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/flashcards/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/flashcards/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/flashcards/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/flashcards/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/flashcards/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/flashcards/polarni-zare/tile.png"
        },
        "preview": "previews/flashcards/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "flashcards--lesni-klid",
        "surfaceId": "flashcards",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/flashcards/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/flashcards/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/flashcards/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/flashcards/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/flashcards/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/flashcards/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/flashcards/lesni-klid/tile.png"
        },
        "preview": "previews/flashcards/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "flashcards--cisty-den",
        "surfaceId": "flashcards",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/flashcards/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/flashcards/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/flashcards/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/flashcards/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/flashcards/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/flashcards/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/flashcards/cisty-den/tile.png"
        },
        "preview": "previews/flashcards/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "kalendar": {
    "id": "kalendar",
    "name": "Kalendář",
    "kind": "app",
    "shortName": "Kalendář",
    "subtitle": "Měj přehled o svém čase",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "kalendar--zlaty-soumrak",
        "surfaceId": "kalendar",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/kalendar/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/kalendar/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/kalendar/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/kalendar/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/kalendar/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/kalendar/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/kalendar/zlaty-soumrak/tile.png"
        },
        "preview": "previews/kalendar/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "kalendar--neonova-noc",
        "surfaceId": "kalendar",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/kalendar/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/kalendar/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/kalendar/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/kalendar/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/kalendar/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/kalendar/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/kalendar/neonova-noc/tile.png"
        },
        "preview": "previews/kalendar/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "kalendar--polarni-zare",
        "surfaceId": "kalendar",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/kalendar/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/kalendar/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/kalendar/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/kalendar/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/kalendar/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/kalendar/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/kalendar/polarni-zare/tile.png"
        },
        "preview": "previews/kalendar/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "kalendar--lesni-klid",
        "surfaceId": "kalendar",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/kalendar/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/kalendar/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/kalendar/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/kalendar/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/kalendar/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/kalendar/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/kalendar/lesni-klid/tile.png"
        },
        "preview": "previews/kalendar/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "kalendar--cisty-den",
        "surfaceId": "kalendar",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/kalendar/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/kalendar/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/kalendar/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/kalendar/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/kalendar/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/kalendar/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/kalendar/cisty-den/tile.png"
        },
        "preview": "previews/kalendar/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "rozvrh": {
    "id": "rozvrh",
    "name": "Rozvrh",
    "kind": "app",
    "shortName": "Rozvrh",
    "subtitle": "Předměty a hodiny přehledně",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "rozvrh--zlaty-soumrak",
        "surfaceId": "rozvrh",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/rozvrh/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/rozvrh/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/rozvrh/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/rozvrh/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/rozvrh/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/rozvrh/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/rozvrh/zlaty-soumrak/tile.png"
        },
        "preview": "previews/rozvrh/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "rozvrh--neonova-noc",
        "surfaceId": "rozvrh",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/rozvrh/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/rozvrh/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/rozvrh/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/rozvrh/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/rozvrh/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/rozvrh/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/rozvrh/neonova-noc/tile.png"
        },
        "preview": "previews/rozvrh/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "rozvrh--polarni-zare",
        "surfaceId": "rozvrh",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/rozvrh/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/rozvrh/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/rozvrh/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/rozvrh/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/rozvrh/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/rozvrh/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/rozvrh/polarni-zare/tile.png"
        },
        "preview": "previews/rozvrh/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "rozvrh--lesni-klid",
        "surfaceId": "rozvrh",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/rozvrh/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/rozvrh/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/rozvrh/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/rozvrh/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/rozvrh/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/rozvrh/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/rozvrh/lesni-klid/tile.png"
        },
        "preview": "previews/rozvrh/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "rozvrh--cisty-den",
        "surfaceId": "rozvrh",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/rozvrh/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/rozvrh/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/rozvrh/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/rozvrh/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/rozvrh/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/rozvrh/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/rozvrh/cisty-den/tile.png"
        },
        "preview": "previews/rozvrh/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "znamky": {
    "id": "znamky",
    "name": "Známky",
    "kind": "app",
    "shortName": "Známky",
    "subtitle": "Výsledky v souvislostech",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "znamky--zlaty-soumrak",
        "surfaceId": "znamky",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/znamky/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/znamky/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/znamky/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/znamky/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/znamky/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/znamky/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/znamky/zlaty-soumrak/tile.png"
        },
        "preview": "previews/znamky/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "znamky--neonova-noc",
        "surfaceId": "znamky",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/znamky/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/znamky/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/znamky/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/znamky/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/znamky/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/znamky/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/znamky/neonova-noc/tile.png"
        },
        "preview": "previews/znamky/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "znamky--polarni-zare",
        "surfaceId": "znamky",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/znamky/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/znamky/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/znamky/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/znamky/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/znamky/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/znamky/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/znamky/polarni-zare/tile.png"
        },
        "preview": "previews/znamky/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "znamky--lesni-klid",
        "surfaceId": "znamky",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/znamky/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/znamky/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/znamky/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/znamky/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/znamky/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/znamky/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/znamky/lesni-klid/tile.png"
        },
        "preview": "previews/znamky/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "znamky--cisty-den",
        "surfaceId": "znamky",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/znamky/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/znamky/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/znamky/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/znamky/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/znamky/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/znamky/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/znamky/cisty-den/tile.png"
        },
        "preview": "previews/znamky/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "citace": {
    "id": "citace",
    "name": "Citace",
    "kind": "app",
    "shortName": "Citace",
    "subtitle": "Zdroje na jednom místě",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "citace--zlaty-soumrak",
        "surfaceId": "citace",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/citace/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/citace/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/citace/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/citace/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/citace/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/citace/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/citace/zlaty-soumrak/tile.png"
        },
        "preview": "previews/citace/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "citace--neonova-noc",
        "surfaceId": "citace",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/citace/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/citace/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/citace/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/citace/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/citace/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/citace/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/citace/neonova-noc/tile.png"
        },
        "preview": "previews/citace/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "citace--polarni-zare",
        "surfaceId": "citace",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/citace/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/citace/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/citace/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/citace/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/citace/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/citace/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/citace/polarni-zare/tile.png"
        },
        "preview": "previews/citace/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "citace--lesni-klid",
        "surfaceId": "citace",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/citace/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/citace/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/citace/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/citace/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/citace/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/citace/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/citace/lesni-klid/tile.png"
        },
        "preview": "previews/citace/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "citace--cisty-den",
        "surfaceId": "citace",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/citace/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/citace/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/citace/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/citace/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/citace/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/citace/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/citace/cisty-den/tile.png"
        },
        "preview": "previews/citace/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "math-solver": {
    "id": "math-solver",
    "name": "Math Solver",
    "kind": "app",
    "shortName": "Math Solver",
    "subtitle": "Prostor pro výpočty",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "math-solver--zlaty-soumrak",
        "surfaceId": "math-solver",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/math-solver/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/math-solver/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/math-solver/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/math-solver/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/math-solver/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/math-solver/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/math-solver/zlaty-soumrak/tile.png"
        },
        "preview": "previews/math-solver/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "math-solver--neonova-noc",
        "surfaceId": "math-solver",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/math-solver/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/math-solver/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/math-solver/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/math-solver/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/math-solver/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/math-solver/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/math-solver/neonova-noc/tile.png"
        },
        "preview": "previews/math-solver/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "math-solver--polarni-zare",
        "surfaceId": "math-solver",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/math-solver/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/math-solver/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/math-solver/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/math-solver/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/math-solver/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/math-solver/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/math-solver/polarni-zare/tile.png"
        },
        "preview": "previews/math-solver/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "math-solver--lesni-klid",
        "surfaceId": "math-solver",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/math-solver/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/math-solver/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/math-solver/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/math-solver/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/math-solver/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/math-solver/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/math-solver/lesni-klid/tile.png"
        },
        "preview": "previews/math-solver/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "math-solver--cisty-den",
        "surfaceId": "math-solver",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/math-solver/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/math-solver/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/math-solver/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/math-solver/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/math-solver/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/math-solver/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/math-solver/cisty-den/tile.png"
        },
        "preview": "previews/math-solver/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "mind-map": {
    "id": "mind-map",
    "name": "Mind Map",
    "kind": "app",
    "shortName": "Myšlenková mapa",
    "subtitle": "Propoj svoje myšlenky",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "mind-map--zlaty-soumrak",
        "surfaceId": "mind-map",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/mind-map/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/mind-map/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/mind-map/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/mind-map/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/mind-map/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/mind-map/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/mind-map/zlaty-soumrak/tile.png"
        },
        "preview": "previews/mind-map/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "mind-map--neonova-noc",
        "surfaceId": "mind-map",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/mind-map/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/mind-map/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/mind-map/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/mind-map/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/mind-map/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/mind-map/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/mind-map/neonova-noc/tile.png"
        },
        "preview": "previews/mind-map/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "mind-map--polarni-zare",
        "surfaceId": "mind-map",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/mind-map/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/mind-map/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/mind-map/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/mind-map/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/mind-map/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/mind-map/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/mind-map/polarni-zare/tile.png"
        },
        "preview": "previews/mind-map/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "mind-map--lesni-klid",
        "surfaceId": "mind-map",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/mind-map/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/mind-map/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/mind-map/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/mind-map/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/mind-map/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/mind-map/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/mind-map/lesni-klid/tile.png"
        },
        "preview": "previews/mind-map/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "mind-map--cisty-den",
        "surfaceId": "mind-map",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/mind-map/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/mind-map/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/mind-map/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/mind-map/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/mind-map/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/mind-map/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/mind-map/cisty-den/tile.png"
        },
        "preview": "previews/mind-map/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "exam-prep": {
    "id": "exam-prep",
    "name": "Maturitní centrum",
    "kind": "app",
    "shortName": "Maturitní centrum",
    "subtitle": "Příprava krok za krokem",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "exam-prep--zlaty-soumrak",
        "surfaceId": "exam-prep",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/exam-prep/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/exam-prep/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/exam-prep/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/exam-prep/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/exam-prep/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/exam-prep/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/exam-prep/zlaty-soumrak/tile.png"
        },
        "preview": "previews/exam-prep/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "exam-prep--neonova-noc",
        "surfaceId": "exam-prep",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/exam-prep/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/exam-prep/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/exam-prep/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/exam-prep/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/exam-prep/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/exam-prep/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/exam-prep/neonova-noc/tile.png"
        },
        "preview": "previews/exam-prep/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "exam-prep--polarni-zare",
        "surfaceId": "exam-prep",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/exam-prep/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/exam-prep/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/exam-prep/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/exam-prep/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/exam-prep/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/exam-prep/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/exam-prep/polarni-zare/tile.png"
        },
        "preview": "previews/exam-prep/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "exam-prep--lesni-klid",
        "surfaceId": "exam-prep",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/exam-prep/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/exam-prep/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/exam-prep/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/exam-prep/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/exam-prep/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/exam-prep/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/exam-prep/lesni-klid/tile.png"
        },
        "preview": "previews/exam-prep/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "exam-prep--cisty-den",
        "surfaceId": "exam-prep",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/exam-prep/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/exam-prep/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/exam-prep/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/exam-prep/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/exam-prep/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/exam-prep/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/exam-prep/cisty-den/tile.png"
        },
        "preview": "previews/exam-prep/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "document-editor": {
    "id": "document-editor",
    "name": "Textový editor",
    "kind": "app",
    "shortName": "Textový editor",
    "subtitle": "Piš bez rozptylování",
    "route": "/apps",
    "parentRoom": "school-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "document-editor--zlaty-soumrak",
        "surfaceId": "document-editor",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/document-editor/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/document-editor/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/document-editor/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/document-editor/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/document-editor/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/document-editor/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/document-editor/zlaty-soumrak/tile.png"
        },
        "preview": "previews/document-editor/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "document-editor--neonova-noc",
        "surfaceId": "document-editor",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/document-editor/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/document-editor/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/document-editor/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/document-editor/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/document-editor/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/document-editor/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/document-editor/neonova-noc/tile.png"
        },
        "preview": "previews/document-editor/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "document-editor--polarni-zare",
        "surfaceId": "document-editor",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/document-editor/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/document-editor/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/document-editor/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/document-editor/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/document-editor/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/document-editor/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/document-editor/polarni-zare/tile.png"
        },
        "preview": "previews/document-editor/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "document-editor--lesni-klid",
        "surfaceId": "document-editor",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/document-editor/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/document-editor/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/document-editor/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/document-editor/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/document-editor/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/document-editor/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/document-editor/lesni-klid/tile.png"
        },
        "preview": "previews/document-editor/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "document-editor--cisty-den",
        "surfaceId": "document-editor",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/document-editor/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/document-editor/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/document-editor/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/document-editor/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/document-editor/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/document-editor/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/document-editor/cisty-den/tile.png"
        },
        "preview": "previews/document-editor/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Studium"
  },
  "file-manager": {
    "id": "file-manager",
    "name": "File Manager / Soubory",
    "kind": "app",
    "shortName": "Soubory",
    "subtitle": "Vše důležité po ruce",
    "route": "/apps",
    "parentRoom": "music-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "file-manager--zlaty-soumrak",
        "surfaceId": "file-manager",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/file-manager/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/file-manager/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/file-manager/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/file-manager/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/file-manager/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/file-manager/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/file-manager/zlaty-soumrak/tile.png"
        },
        "preview": "previews/file-manager/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "file-manager--neonova-noc",
        "surfaceId": "file-manager",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/file-manager/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/file-manager/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/file-manager/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/file-manager/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/file-manager/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/file-manager/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/file-manager/neonova-noc/tile.png"
        },
        "preview": "previews/file-manager/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "file-manager--polarni-zare",
        "surfaceId": "file-manager",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/file-manager/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/file-manager/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/file-manager/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/file-manager/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/file-manager/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/file-manager/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/file-manager/polarni-zare/tile.png"
        },
        "preview": "previews/file-manager/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "file-manager--lesni-klid",
        "surfaceId": "file-manager",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/file-manager/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/file-manager/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/file-manager/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/file-manager/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/file-manager/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/file-manager/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/file-manager/lesni-klid/tile.png"
        },
        "preview": "previews/file-manager/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "file-manager--cisty-den",
        "surfaceId": "file-manager",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/file-manager/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/file-manager/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/file-manager/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/file-manager/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/file-manager/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/file-manager/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/file-manager/cisty-den/tile.png"
        },
        "preview": "previews/file-manager/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Sdílené"
  },
  "form-check": {
    "id": "form-check",
    "name": "Form Check",
    "kind": "app",
    "shortName": "Form Check",
    "subtitle": "Trénink se zpětnou vazbou",
    "route": "/apps",
    "parentRoom": "fitness-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "form-check--zlaty-soumrak",
        "surfaceId": "form-check",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/form-check/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/form-check/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/form-check/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/form-check/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/form-check/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/form-check/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/form-check/zlaty-soumrak/tile.png"
        },
        "preview": "previews/form-check/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "form-check--neonova-noc",
        "surfaceId": "form-check",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/form-check/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/form-check/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/form-check/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/form-check/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/form-check/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/form-check/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/form-check/neonova-noc/tile.png"
        },
        "preview": "previews/form-check/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "form-check--polarni-zare",
        "surfaceId": "form-check",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/form-check/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/form-check/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/form-check/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/form-check/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/form-check/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/form-check/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/form-check/polarni-zare/tile.png"
        },
        "preview": "previews/form-check/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "form-check--lesni-klid",
        "surfaceId": "form-check",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/form-check/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/form-check/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/form-check/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/form-check/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/form-check/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/form-check/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/form-check/lesni-klid/tile.png"
        },
        "preview": "previews/form-check/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "form-check--cisty-den",
        "surfaceId": "form-check",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/form-check/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/form-check/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/form-check/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/form-check/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/form-check/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/form-check/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/form-check/cisty-den/tile.png"
        },
        "preview": "previews/form-check/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Pohyb"
  },
  "behani": {
    "id": "behani",
    "name": "Běhání a kardio",
    "kind": "app",
    "shortName": "Běhání a kardio",
    "subtitle": "Vyraz svým tempem",
    "route": "/apps",
    "parentRoom": "fitness-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "behani--zlaty-soumrak",
        "surfaceId": "behani",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/behani/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/behani/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/behani/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/behani/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/behani/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/behani/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/behani/zlaty-soumrak/tile.png"
        },
        "preview": "previews/behani/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "behani--neonova-noc",
        "surfaceId": "behani",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/behani/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/behani/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/behani/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/behani/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/behani/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/behani/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/behani/neonova-noc/tile.png"
        },
        "preview": "previews/behani/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "behani--polarni-zare",
        "surfaceId": "behani",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/behani/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/behani/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/behani/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/behani/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/behani/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/behani/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/behani/polarni-zare/tile.png"
        },
        "preview": "previews/behani/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "behani--lesni-klid",
        "surfaceId": "behani",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/behani/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/behani/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/behani/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/behani/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/behani/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/behani/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/behani/lesni-klid/tile.png"
        },
        "preview": "previews/behani/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "behani--cisty-den",
        "surfaceId": "behani",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/behani/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/behani/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/behani/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/behani/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/behani/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/behani/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/behani/cisty-den/tile.png"
        },
        "preview": "previews/behani/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Pohyb"
  },
  "posilovna": {
    "id": "posilovna",
    "name": "Posilovna",
    "kind": "app",
    "shortName": "Posilovna",
    "subtitle": "Každá série se počítá",
    "route": "/apps",
    "parentRoom": "fitness-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "posilovna--zlaty-soumrak",
        "surfaceId": "posilovna",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/posilovna/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/posilovna/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/posilovna/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/posilovna/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/posilovna/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/posilovna/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/posilovna/zlaty-soumrak/tile.png"
        },
        "preview": "previews/posilovna/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "posilovna--neonova-noc",
        "surfaceId": "posilovna",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/posilovna/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/posilovna/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/posilovna/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/posilovna/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/posilovna/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/posilovna/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/posilovna/neonova-noc/tile.png"
        },
        "preview": "previews/posilovna/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "posilovna--polarni-zare",
        "surfaceId": "posilovna",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/posilovna/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/posilovna/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/posilovna/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/posilovna/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/posilovna/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/posilovna/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/posilovna/polarni-zare/tile.png"
        },
        "preview": "previews/posilovna/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "posilovna--lesni-klid",
        "surfaceId": "posilovna",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/posilovna/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/posilovna/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/posilovna/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/posilovna/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/posilovna/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/posilovna/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/posilovna/lesni-klid/tile.png"
        },
        "preview": "previews/posilovna/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "posilovna--cisty-den",
        "surfaceId": "posilovna",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/posilovna/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/posilovna/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/posilovna/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/posilovna/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/posilovna/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/posilovna/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/posilovna/cisty-den/tile.png"
        },
        "preview": "previews/posilovna/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Pohyb"
  },
  "finance": {
    "id": "finance",
    "name": "Finance",
    "kind": "app",
    "shortName": "Finance",
    "subtitle": "Příjmy, výdaje a rozpočty",
    "route": "/apps",
    "parentRoom": "economy-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "finance--zlaty-soumrak",
        "surfaceId": "finance",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/finance/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/finance/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/finance/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/finance/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/finance/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/finance/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/finance/zlaty-soumrak/tile.png"
        },
        "preview": "previews/finance/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "finance--neonova-noc",
        "surfaceId": "finance",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/finance/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/finance/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/finance/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/finance/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/finance/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/finance/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/finance/neonova-noc/tile.png"
        },
        "preview": "previews/finance/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "finance--polarni-zare",
        "surfaceId": "finance",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/finance/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/finance/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/finance/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/finance/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/finance/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/finance/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/finance/polarni-zare/tile.png"
        },
        "preview": "previews/finance/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "finance--lesni-klid",
        "surfaceId": "finance",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/finance/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/finance/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/finance/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/finance/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/finance/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/finance/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/finance/lesni-klid/tile.png"
        },
        "preview": "previews/finance/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "finance--cisty-den",
        "surfaceId": "finance",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/finance/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/finance/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/finance/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/finance/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/finance/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/finance/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/finance/cisty-den/tile.png"
        },
        "preview": "previews/finance/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Finance"
  },
  "sporici-simulator": {
    "id": "sporici-simulator",
    "name": "Spořicí simulátor",
    "kind": "app",
    "shortName": "Spořicí simulátor",
    "subtitle": "Plán pro tvoje budoucí cíle",
    "route": "/apps",
    "parentRoom": "economy-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "sporici-simulator--zlaty-soumrak",
        "surfaceId": "sporici-simulator",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/sporici-simulator/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/sporici-simulator/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/sporici-simulator/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/sporici-simulator/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/sporici-simulator/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/sporici-simulator/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/sporici-simulator/zlaty-soumrak/tile.png"
        },
        "preview": "previews/sporici-simulator/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "sporici-simulator--neonova-noc",
        "surfaceId": "sporici-simulator",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/sporici-simulator/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/sporici-simulator/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/sporici-simulator/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/sporici-simulator/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/sporici-simulator/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/sporici-simulator/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/sporici-simulator/neonova-noc/tile.png"
        },
        "preview": "previews/sporici-simulator/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "sporici-simulator--polarni-zare",
        "surfaceId": "sporici-simulator",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/sporici-simulator/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/sporici-simulator/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/sporici-simulator/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/sporici-simulator/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/sporici-simulator/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/sporici-simulator/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/sporici-simulator/polarni-zare/tile.png"
        },
        "preview": "previews/sporici-simulator/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "sporici-simulator--lesni-klid",
        "surfaceId": "sporici-simulator",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/sporici-simulator/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/sporici-simulator/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/sporici-simulator/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/sporici-simulator/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/sporici-simulator/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/sporici-simulator/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/sporici-simulator/lesni-klid/tile.png"
        },
        "preview": "previews/sporici-simulator/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "sporici-simulator--cisty-den",
        "surfaceId": "sporici-simulator",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/sporici-simulator/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/sporici-simulator/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/sporici-simulator/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/sporici-simulator/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/sporici-simulator/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/sporici-simulator/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/sporici-simulator/cisty-den/tile.png"
        },
        "preview": "previews/sporici-simulator/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Finance"
  },
  "uver-kalkulacka": {
    "id": "uver-kalkulacka",
    "name": "Splátkový kalkulátor",
    "kind": "app",
    "shortName": "Splátkový kalkulátor",
    "subtitle": "Porovnej si průběh splácení",
    "route": "/apps",
    "parentRoom": "economy-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "uver-kalkulacka--zlaty-soumrak",
        "surfaceId": "uver-kalkulacka",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/uver-kalkulacka/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/uver-kalkulacka/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/uver-kalkulacka/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/uver-kalkulacka/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/uver-kalkulacka/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/uver-kalkulacka/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/uver-kalkulacka/zlaty-soumrak/tile.png"
        },
        "preview": "previews/uver-kalkulacka/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "uver-kalkulacka--neonova-noc",
        "surfaceId": "uver-kalkulacka",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/uver-kalkulacka/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/uver-kalkulacka/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/uver-kalkulacka/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/uver-kalkulacka/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/uver-kalkulacka/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/uver-kalkulacka/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/uver-kalkulacka/neonova-noc/tile.png"
        },
        "preview": "previews/uver-kalkulacka/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "uver-kalkulacka--polarni-zare",
        "surfaceId": "uver-kalkulacka",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/uver-kalkulacka/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/uver-kalkulacka/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/uver-kalkulacka/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/uver-kalkulacka/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/uver-kalkulacka/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/uver-kalkulacka/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/uver-kalkulacka/polarni-zare/tile.png"
        },
        "preview": "previews/uver-kalkulacka/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "uver-kalkulacka--lesni-klid",
        "surfaceId": "uver-kalkulacka",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/uver-kalkulacka/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/uver-kalkulacka/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/uver-kalkulacka/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/uver-kalkulacka/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/uver-kalkulacka/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/uver-kalkulacka/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/uver-kalkulacka/lesni-klid/tile.png"
        },
        "preview": "previews/uver-kalkulacka/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "uver-kalkulacka--cisty-den",
        "surfaceId": "uver-kalkulacka",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/uver-kalkulacka/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/uver-kalkulacka/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/uver-kalkulacka/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/uver-kalkulacka/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/uver-kalkulacka/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/uver-kalkulacka/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/uver-kalkulacka/cisty-den/tile.png"
        },
        "preview": "previews/uver-kalkulacka/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Finance"
  },
  "goal-tracker": {
    "id": "goal-tracker",
    "name": "Goal Tracker",
    "kind": "app",
    "shortName": "Moje cíle",
    "subtitle": "Důležité je pokračovat",
    "route": "/apps",
    "parentRoom": "growth-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "goal-tracker--zlaty-soumrak",
        "surfaceId": "goal-tracker",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/goal-tracker/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/goal-tracker/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/goal-tracker/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/goal-tracker/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/goal-tracker/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/goal-tracker/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/goal-tracker/zlaty-soumrak/tile.png"
        },
        "preview": "previews/goal-tracker/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "goal-tracker--neonova-noc",
        "surfaceId": "goal-tracker",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/goal-tracker/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/goal-tracker/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/goal-tracker/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/goal-tracker/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/goal-tracker/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/goal-tracker/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/goal-tracker/neonova-noc/tile.png"
        },
        "preview": "previews/goal-tracker/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "goal-tracker--polarni-zare",
        "surfaceId": "goal-tracker",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/goal-tracker/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/goal-tracker/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/goal-tracker/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/goal-tracker/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/goal-tracker/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/goal-tracker/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/goal-tracker/polarni-zare/tile.png"
        },
        "preview": "previews/goal-tracker/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "goal-tracker--lesni-klid",
        "surfaceId": "goal-tracker",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/goal-tracker/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/goal-tracker/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/goal-tracker/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/goal-tracker/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/goal-tracker/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/goal-tracker/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/goal-tracker/lesni-klid/tile.png"
        },
        "preview": "previews/goal-tracker/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "goal-tracker--cisty-den",
        "surfaceId": "goal-tracker",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/goal-tracker/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/goal-tracker/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/goal-tracker/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/goal-tracker/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/goal-tracker/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/goal-tracker/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/goal-tracker/cisty-den/tile.png"
        },
        "preview": "previews/goal-tracker/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Rozvoj"
  },
  "music-studio": {
    "id": "music-studio",
    "name": "Music Studio",
    "kind": "app",
    "shortName": "Music Studio",
    "subtitle": "Od rytmu ke skladbě",
    "route": "/apps",
    "parentRoom": "music-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "music-studio--zlaty-soumrak",
        "surfaceId": "music-studio",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/music-studio/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/music-studio/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/music-studio/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/music-studio/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/music-studio/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/music-studio/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/music-studio/zlaty-soumrak/tile.png"
        },
        "preview": "previews/music-studio/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "music-studio--neonova-noc",
        "surfaceId": "music-studio",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/music-studio/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/music-studio/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/music-studio/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/music-studio/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/music-studio/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/music-studio/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/music-studio/neonova-noc/tile.png"
        },
        "preview": "previews/music-studio/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "music-studio--polarni-zare",
        "surfaceId": "music-studio",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/music-studio/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/music-studio/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/music-studio/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/music-studio/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/music-studio/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/music-studio/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/music-studio/polarni-zare/tile.png"
        },
        "preview": "previews/music-studio/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "music-studio--lesni-klid",
        "surfaceId": "music-studio",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/music-studio/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/music-studio/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/music-studio/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/music-studio/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/music-studio/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/music-studio/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/music-studio/lesni-klid/tile.png"
        },
        "preview": "previews/music-studio/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "music-studio--cisty-den",
        "surfaceId": "music-studio",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/music-studio/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/music-studio/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/music-studio/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/music-studio/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/music-studio/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/music-studio/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/music-studio/cisty-den/tile.png"
        },
        "preview": "previews/music-studio/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Hudba"
  },
  "book-writer": {
    "id": "book-writer",
    "name": "Kniha",
    "kind": "app",
    "shortName": "Kniha",
    "subtitle": "Kapitola po kapitole",
    "route": "/apps",
    "parentRoom": "writer-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "book-writer--zlaty-soumrak",
        "surfaceId": "book-writer",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/book-writer/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/book-writer/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/book-writer/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/book-writer/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/book-writer/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/book-writer/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/book-writer/zlaty-soumrak/tile.png"
        },
        "preview": "previews/book-writer/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "book-writer--neonova-noc",
        "surfaceId": "book-writer",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/book-writer/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/book-writer/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/book-writer/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/book-writer/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/book-writer/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/book-writer/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/book-writer/neonova-noc/tile.png"
        },
        "preview": "previews/book-writer/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "book-writer--polarni-zare",
        "surfaceId": "book-writer",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/book-writer/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/book-writer/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/book-writer/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/book-writer/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/book-writer/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/book-writer/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/book-writer/polarni-zare/tile.png"
        },
        "preview": "previews/book-writer/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "book-writer--lesni-klid",
        "surfaceId": "book-writer",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/book-writer/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/book-writer/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/book-writer/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/book-writer/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/book-writer/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/book-writer/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/book-writer/lesni-klid/tile.png"
        },
        "preview": "previews/book-writer/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "book-writer--cisty-den",
        "surfaceId": "book-writer",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/book-writer/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/book-writer/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/book-writer/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/book-writer/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/book-writer/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/book-writer/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/book-writer/cisty-den/tile.png"
        },
        "preview": "previews/book-writer/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Psaní"
  },
  "screenplay-writer": {
    "id": "screenplay-writer",
    "name": "Scénář",
    "kind": "app",
    "shortName": "Scénář",
    "subtitle": "Dej příběhu scénu",
    "route": "/apps",
    "parentRoom": "writer-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "screenplay-writer--zlaty-soumrak",
        "surfaceId": "screenplay-writer",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/screenplay-writer/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/screenplay-writer/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/screenplay-writer/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/screenplay-writer/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/screenplay-writer/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/screenplay-writer/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/screenplay-writer/zlaty-soumrak/tile.png"
        },
        "preview": "previews/screenplay-writer/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "screenplay-writer--neonova-noc",
        "surfaceId": "screenplay-writer",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/screenplay-writer/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/screenplay-writer/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/screenplay-writer/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/screenplay-writer/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/screenplay-writer/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/screenplay-writer/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/screenplay-writer/neonova-noc/tile.png"
        },
        "preview": "previews/screenplay-writer/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "screenplay-writer--polarni-zare",
        "surfaceId": "screenplay-writer",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/screenplay-writer/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/screenplay-writer/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/screenplay-writer/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/screenplay-writer/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/screenplay-writer/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/screenplay-writer/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/screenplay-writer/polarni-zare/tile.png"
        },
        "preview": "previews/screenplay-writer/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "screenplay-writer--lesni-klid",
        "surfaceId": "screenplay-writer",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/screenplay-writer/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/screenplay-writer/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/screenplay-writer/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/screenplay-writer/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/screenplay-writer/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/screenplay-writer/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/screenplay-writer/lesni-klid/tile.png"
        },
        "preview": "previews/screenplay-writer/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "screenplay-writer--cisty-den",
        "surfaceId": "screenplay-writer",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/screenplay-writer/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/screenplay-writer/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/screenplay-writer/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/screenplay-writer/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/screenplay-writer/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/screenplay-writer/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/screenplay-writer/cisty-den/tile.png"
        },
        "preview": "previews/screenplay-writer/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Psaní"
  },
  "comic-writer": {
    "id": "comic-writer",
    "name": "Komiks",
    "kind": "app",
    "shortName": "Komiks",
    "subtitle": "Textový scénář po panelech",
    "route": "/apps",
    "parentRoom": "writer-room",
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "comic-writer--zlaty-soumrak",
        "surfaceId": "comic-writer",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/comic-writer/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/comic-writer/zlaty-soumrak/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/comic-writer/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/comic-writer/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/comic-writer/zlaty-soumrak/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/comic-writer/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/comic-writer/zlaty-soumrak/tile.png"
        },
        "preview": "previews/comic-writer/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "comic-writer--neonova-noc",
        "surfaceId": "comic-writer",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/comic-writer/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/comic-writer/neonova-noc/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/comic-writer/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/comic-writer/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/comic-writer/neonova-noc/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/comic-writer/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/comic-writer/neonova-noc/tile.png"
        },
        "preview": "previews/comic-writer/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "comic-writer--polarni-zare",
        "surfaceId": "comic-writer",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/comic-writer/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/comic-writer/polarni-zare/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/comic-writer/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/comic-writer/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/comic-writer/polarni-zare/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/comic-writer/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/comic-writer/polarni-zare/tile.png"
        },
        "preview": "previews/comic-writer/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "comic-writer--lesni-klid",
        "surfaceId": "comic-writer",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/comic-writer/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/comic-writer/lesni-klid/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/comic-writer/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/comic-writer/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/comic-writer/lesni-klid/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/comic-writer/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/comic-writer/lesni-klid/tile.png"
        },
        "preview": "previews/comic-writer/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "comic-writer--cisty-den",
        "surfaceId": "comic-writer",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/comic-writer/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/comic-writer/cisty-den/tile.svg",
          "backgroundMobile": "/buddy-themes/surfaces/comic-writer/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/comic-writer/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/comic-writer/cisty-den/ornament.svg",
          "iconPng": "/buddy-themes/surfaces/comic-writer/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/comic-writer/cisty-den/tile.png"
        },
        "preview": "previews/comic-writer/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Psaní"
  },
  "apps-launcher": {
    "id": "apps-launcher",
    "name": "Aplikace a Rooms",
    "kind": "module",
    "shortName": "Aplikace a Rooms",
    "subtitle": "Tvoje nástroje, přehledně",
    "route": "/apps",
    "parentRoom": null,
    "defaultScenery": true,
    "variants": {
      "zlaty-soumrak": {
        "id": "apps-launcher--zlaty-soumrak",
        "surfaceId": "apps-launcher",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/apps-launcher/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/apps-launcher/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/apps-launcher/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/apps-launcher/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/apps-launcher/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/apps-launcher/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/apps-launcher/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/apps-launcher/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "apps-launcher--neonova-noc",
        "surfaceId": "apps-launcher",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/apps-launcher/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/apps-launcher/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/apps-launcher/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/apps-launcher/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/apps-launcher/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/apps-launcher/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/apps-launcher/neonova-noc/ornament.svg"
        },
        "preview": "previews/apps-launcher/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "apps-launcher--polarni-zare",
        "surfaceId": "apps-launcher",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/apps-launcher/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/apps-launcher/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/apps-launcher/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/apps-launcher/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/apps-launcher/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/apps-launcher/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/apps-launcher/polarni-zare/ornament.svg"
        },
        "preview": "previews/apps-launcher/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "apps-launcher--lesni-klid",
        "surfaceId": "apps-launcher",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/apps-launcher/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/apps-launcher/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/apps-launcher/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/apps-launcher/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/apps-launcher/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/apps-launcher/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/apps-launcher/lesni-klid/ornament.svg"
        },
        "preview": "previews/apps-launcher/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "apps-launcher--cisty-den",
        "surfaceId": "apps-launcher",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/apps-launcher/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/apps-launcher/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/apps-launcher/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/apps-launcher/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/apps-launcher/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/apps-launcher/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/apps-launcher/cisty-den/ornament.svg"
        },
        "preview": "previews/apps-launcher/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Hlavní moduly"
  },
  "hub": {
    "id": "hub",
    "name": "Hub",
    "kind": "module",
    "shortName": "Hub",
    "subtitle": "Hlavní obrazovka po přihlášení",
    "route": "/hub",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "hub--zlaty-soumrak",
        "surfaceId": "hub",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/hub-themes/zlaty-soumrak/core.svg",
          "tile": "/hub-themes/zlaty-soumrak/core.svg",
          "iconPng": "/hub-themes/zlaty-soumrak/core.png",
          "tilePng": "/hub-themes/zlaty-soumrak/core.png",
          "backgroundMobile": "/hub-themes/zlaty-soumrak/background-mobile.webp",
          "backgroundTablet": "/hub-themes/zlaty-soumrak/background-landscape.webp",
          "ornament": "/hub-themes/zlaty-soumrak/orbit.svg",
          "coreButton": "/hub-themes/zlaty-soumrak/core.png",
          "coreButtonSvg": "/hub-themes/zlaty-soumrak/core.svg",
          "aiButton": "/hub-themes/zlaty-soumrak/ai-button.png",
          "appsButton": "/hub-themes/zlaty-soumrak/apps-button.png",
          "roomsButton": "/hub-themes/zlaty-soumrak/rooms-button.png",
          "feedButton": "/hub-themes/zlaty-soumrak/feed-button.png",
          "shopIcon": "/hub-themes/zlaty-soumrak/icons/shop.png",
          "trophyIcon": "/hub-themes/zlaty-soumrak/icons/trophy.png",
          "orbitPng": "/hub-themes/zlaty-soumrak/orbit.png",
          "buttonFrame": "/hub-themes/zlaty-soumrak/button-frame.png",
          "levelFrame": "/hub-themes/zlaty-soumrak/level-frame.png",
          "avatarFrame": "/hub-themes/zlaty-soumrak/avatar-frame.png",
          "worldArt": "/hub-themes/zlaty-soumrak/world-art.webp"
        },
        "preview": "/hub-themes/zlaty-soumrak/theme-preview.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "hub--neonova-noc",
        "surfaceId": "hub",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/hub-themes/neonova-noc/core.svg",
          "tile": "/hub-themes/neonova-noc/core.svg",
          "iconPng": "/hub-themes/neonova-noc/core.png",
          "tilePng": "/hub-themes/neonova-noc/core.png",
          "backgroundMobile": "/hub-themes/neonova-noc/background-mobile.webp",
          "backgroundTablet": "/hub-themes/neonova-noc/background-landscape.webp",
          "ornament": "/hub-themes/neonova-noc/orbit.svg",
          "coreButton": "/hub-themes/neonova-noc/core.png",
          "coreButtonSvg": "/hub-themes/neonova-noc/core.svg",
          "aiButton": "/hub-themes/neonova-noc/ai-button.png",
          "appsButton": "/hub-themes/neonova-noc/apps-button.png",
          "roomsButton": "/hub-themes/neonova-noc/rooms-button.png",
          "feedButton": "/hub-themes/neonova-noc/feed-button.png",
          "shopIcon": "/hub-themes/neonova-noc/icons/shop.png",
          "trophyIcon": "/hub-themes/neonova-noc/icons/trophy.png",
          "orbitPng": "/hub-themes/neonova-noc/orbit.png",
          "buttonFrame": "/hub-themes/neonova-noc/button-frame.png",
          "levelFrame": "/hub-themes/neonova-noc/level-frame.png",
          "avatarFrame": "/hub-themes/neonova-noc/avatar-frame.png",
          "worldArt": "/hub-themes/neonova-noc/world-art.webp"
        },
        "preview": "/hub-themes/neonova-noc/theme-preview.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "hub--polarni-zare",
        "surfaceId": "hub",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/hub-themes/polarni-zare/core.svg",
          "tile": "/hub-themes/polarni-zare/core.svg",
          "iconPng": "/hub-themes/polarni-zare/core.png",
          "tilePng": "/hub-themes/polarni-zare/core.png",
          "backgroundMobile": "/hub-themes/polarni-zare/background-mobile.webp",
          "backgroundTablet": "/hub-themes/polarni-zare/background-landscape.webp",
          "ornament": "/hub-themes/polarni-zare/orbit.svg",
          "coreButton": "/hub-themes/polarni-zare/core.png",
          "coreButtonSvg": "/hub-themes/polarni-zare/core.svg",
          "aiButton": "/hub-themes/polarni-zare/ai-button.png",
          "appsButton": "/hub-themes/polarni-zare/apps-button.png",
          "roomsButton": "/hub-themes/polarni-zare/rooms-button.png",
          "feedButton": "/hub-themes/polarni-zare/feed-button.png",
          "shopIcon": "/hub-themes/polarni-zare/icons/shop.png",
          "trophyIcon": "/hub-themes/polarni-zare/icons/trophy.png",
          "orbitPng": "/hub-themes/polarni-zare/orbit.png",
          "buttonFrame": "/hub-themes/polarni-zare/button-frame.png",
          "levelFrame": "/hub-themes/polarni-zare/level-frame.png",
          "avatarFrame": "/hub-themes/polarni-zare/avatar-frame.png",
          "worldArt": "/hub-themes/polarni-zare/world-art.webp"
        },
        "preview": "/hub-themes/polarni-zare/theme-preview.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "hub--lesni-klid",
        "surfaceId": "hub",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/hub-themes/lesni-klid/core.svg",
          "tile": "/hub-themes/lesni-klid/core.svg",
          "iconPng": "/hub-themes/lesni-klid/core.png",
          "tilePng": "/hub-themes/lesni-klid/core.png",
          "backgroundMobile": "/hub-themes/lesni-klid/background-mobile.webp",
          "backgroundTablet": "/hub-themes/lesni-klid/background-landscape.webp",
          "ornament": "/hub-themes/lesni-klid/orbit.svg",
          "coreButton": "/hub-themes/lesni-klid/core.png",
          "coreButtonSvg": "/hub-themes/lesni-klid/core.svg",
          "aiButton": "/hub-themes/lesni-klid/ai-button.png",
          "appsButton": "/hub-themes/lesni-klid/apps-button.png",
          "roomsButton": "/hub-themes/lesni-klid/rooms-button.png",
          "feedButton": "/hub-themes/lesni-klid/feed-button.png",
          "shopIcon": "/hub-themes/lesni-klid/icons/shop.png",
          "trophyIcon": "/hub-themes/lesni-klid/icons/trophy.png",
          "orbitPng": "/hub-themes/lesni-klid/orbit.png",
          "buttonFrame": "/hub-themes/lesni-klid/button-frame.png",
          "levelFrame": "/hub-themes/lesni-klid/level-frame.png",
          "avatarFrame": "/hub-themes/lesni-klid/avatar-frame.png",
          "worldArt": "/hub-themes/lesni-klid/world-art.webp"
        },
        "preview": "/hub-themes/lesni-klid/theme-preview.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "hub--cisty-den",
        "surfaceId": "hub",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/hub-themes/cisty-den/core.svg",
          "tile": "/hub-themes/cisty-den/core.svg",
          "iconPng": "/hub-themes/cisty-den/core.png",
          "tilePng": "/hub-themes/cisty-den/core.png",
          "backgroundMobile": "/hub-themes/cisty-den/background-mobile.webp",
          "backgroundTablet": "/hub-themes/cisty-den/background-landscape.webp",
          "ornament": "/hub-themes/cisty-den/orbit.svg",
          "coreButton": "/hub-themes/cisty-den/core.png",
          "coreButtonSvg": "/hub-themes/cisty-den/core.svg",
          "aiButton": "/hub-themes/cisty-den/ai-button.png",
          "appsButton": "/hub-themes/cisty-den/apps-button.png",
          "roomsButton": "/hub-themes/cisty-den/rooms-button.png",
          "feedButton": "/hub-themes/cisty-den/feed-button.png",
          "shopIcon": "/hub-themes/cisty-den/icons/shop.png",
          "trophyIcon": "/hub-themes/cisty-den/icons/trophy.png",
          "orbitPng": "/hub-themes/cisty-den/orbit.png",
          "buttonFrame": "/hub-themes/cisty-den/button-frame.png",
          "levelFrame": "/hub-themes/cisty-den/level-frame.png",
          "avatarFrame": "/hub-themes/cisty-den/avatar-frame.png",
          "worldArt": "/hub-themes/cisty-den/world-art.webp"
        },
        "preview": "/hub-themes/cisty-den/theme-preview.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "none",
    "permission": null,
    "customizable": true,
    "group": "Hlavní moduly"
  },
  "profile": {
    "id": "profile",
    "name": "Profil",
    "kind": "module",
    "shortName": "Profil",
    "subtitle": "Tvůj prostor v Buddym",
    "route": "/profil",
    "parentRoom": null,
    "defaultScenery": true,
    "variants": {
      "zlaty-soumrak": {
        "id": "profile--zlaty-soumrak",
        "surfaceId": "profile",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/profile/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/profile/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/profile/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/profile/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/profile/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/profile/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/profile/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/profile/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "profile--neonova-noc",
        "surfaceId": "profile",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/profile/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/profile/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/profile/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/profile/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/profile/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/profile/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/profile/neonova-noc/ornament.svg"
        },
        "preview": "previews/profile/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "profile--polarni-zare",
        "surfaceId": "profile",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/profile/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/profile/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/profile/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/profile/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/profile/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/profile/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/profile/polarni-zare/ornament.svg"
        },
        "preview": "previews/profile/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "profile--lesni-klid",
        "surfaceId": "profile",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/profile/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/profile/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/profile/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/profile/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/profile/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/profile/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/profile/lesni-klid/ornament.svg"
        },
        "preview": "previews/profile/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "profile--cisty-den",
        "surfaceId": "profile",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/profile/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/profile/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/profile/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/profile/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/profile/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/profile/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/profile/cisty-den/ornament.svg"
        },
        "preview": "previews/profile/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Hlavní moduly"
  },
  "achievements": {
    "id": "achievements",
    "name": "Achievementy",
    "kind": "module",
    "shortName": "Achievementy",
    "subtitle": "Každý krok se počítá",
    "route": "/odmeny",
    "parentRoom": null,
    "defaultScenery": true,
    "variants": {
      "zlaty-soumrak": {
        "id": "achievements--zlaty-soumrak",
        "surfaceId": "achievements",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/achievements/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/achievements/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/achievements/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/achievements/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/achievements/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/achievements/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/achievements/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/achievements/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "achievements--neonova-noc",
        "surfaceId": "achievements",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/achievements/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/achievements/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/achievements/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/achievements/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/achievements/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/achievements/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/achievements/neonova-noc/ornament.svg"
        },
        "preview": "previews/achievements/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "achievements--polarni-zare",
        "surfaceId": "achievements",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/achievements/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/achievements/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/achievements/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/achievements/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/achievements/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/achievements/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/achievements/polarni-zare/ornament.svg"
        },
        "preview": "previews/achievements/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "achievements--lesni-klid",
        "surfaceId": "achievements",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/achievements/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/achievements/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/achievements/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/achievements/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/achievements/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/achievements/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/achievements/lesni-klid/ornament.svg"
        },
        "preview": "previews/achievements/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "achievements--cisty-den",
        "surfaceId": "achievements",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/achievements/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/achievements/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/achievements/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/achievements/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/achievements/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/achievements/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/achievements/cisty-den/ornament.svg"
        },
        "preview": "previews/achievements/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Hlavní moduly"
  },
  "shop": {
    "id": "shop",
    "name": "Obchod",
    "kind": "module",
    "shortName": "Obchod",
    "subtitle": "Doplňky pro tvého Buddyho",
    "route": "/obchod",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "shop--zlaty-soumrak",
        "surfaceId": "shop",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/shop/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/shop/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/shop/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/shop/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/shop/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/shop/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/shop/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/shop/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "shop--neonova-noc",
        "surfaceId": "shop",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/shop/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/shop/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/shop/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/shop/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/shop/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/shop/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/shop/neonova-noc/ornament.svg"
        },
        "preview": "previews/shop/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "shop--polarni-zare",
        "surfaceId": "shop",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/shop/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/shop/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/shop/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/shop/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/shop/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/shop/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/shop/polarni-zare/ornament.svg"
        },
        "preview": "previews/shop/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "shop--lesni-klid",
        "surfaceId": "shop",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/shop/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/shop/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/shop/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/shop/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/shop/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/shop/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/shop/lesni-klid/ornament.svg"
        },
        "preview": "previews/shop/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "shop--cisty-den",
        "surfaceId": "shop",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/shop/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/shop/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/shop/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/shop/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/shop/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/shop/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/shop/cisty-den/ornament.svg"
        },
        "preview": "previews/shop/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Hlavní moduly"
  },
  "settings": {
    "id": "settings",
    "name": "Nastavení",
    "kind": "module",
    "shortName": "Nastavení",
    "subtitle": "Buddy podle tebe",
    "route": "/nastaveni",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "settings--zlaty-soumrak",
        "surfaceId": "settings",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/settings/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/settings/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "settings--neonova-noc",
        "surfaceId": "settings",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/settings/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings/neonova-noc/ornament.svg"
        },
        "preview": "previews/settings/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "settings--polarni-zare",
        "surfaceId": "settings",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/settings/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings/polarni-zare/ornament.svg"
        },
        "preview": "previews/settings/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "settings--lesni-klid",
        "surfaceId": "settings",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/settings/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings/lesni-klid/ornament.svg"
        },
        "preview": "previews/settings/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "settings--cisty-den",
        "surfaceId": "settings",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/settings/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings/cisty-den/ornament.svg"
        },
        "preview": "previews/settings/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Nastavení"
  },
  "settings-personal": {
    "id": "settings-personal",
    "name": "Osobní údaje",
    "kind": "view",
    "shortName": "Osobní údaje",
    "subtitle": "Nastavení",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "settings-personal--zlaty-soumrak",
        "surfaceId": "settings-personal",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-personal/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-personal/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-personal/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-personal/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-personal/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-personal/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-personal/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/settings-personal/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "settings-personal--neonova-noc",
        "surfaceId": "settings-personal",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-personal/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-personal/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-personal/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-personal/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-personal/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-personal/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-personal/neonova-noc/ornament.svg"
        },
        "preview": "previews/settings-personal/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "settings-personal--polarni-zare",
        "surfaceId": "settings-personal",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-personal/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-personal/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-personal/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-personal/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-personal/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-personal/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-personal/polarni-zare/ornament.svg"
        },
        "preview": "previews/settings-personal/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "settings-personal--lesni-klid",
        "surfaceId": "settings-personal",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-personal/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-personal/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-personal/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-personal/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-personal/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-personal/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-personal/lesni-klid/ornament.svg"
        },
        "preview": "previews/settings-personal/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "settings-personal--cisty-den",
        "surfaceId": "settings-personal",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-personal/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-personal/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-personal/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-personal/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-personal/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-personal/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-personal/cisty-den/ornament.svg"
        },
        "preview": "previews/settings-personal/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "settings",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Nastavení"
  },
  "settings-sound": {
    "id": "settings-sound",
    "name": "Zvuk",
    "kind": "view",
    "shortName": "Zvuk",
    "subtitle": "Nastavení",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "settings-sound--zlaty-soumrak",
        "surfaceId": "settings-sound",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-sound/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-sound/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-sound/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-sound/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-sound/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-sound/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-sound/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/settings-sound/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "settings-sound--neonova-noc",
        "surfaceId": "settings-sound",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-sound/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-sound/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-sound/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-sound/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-sound/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-sound/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-sound/neonova-noc/ornament.svg"
        },
        "preview": "previews/settings-sound/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "settings-sound--polarni-zare",
        "surfaceId": "settings-sound",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-sound/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-sound/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-sound/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-sound/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-sound/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-sound/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-sound/polarni-zare/ornament.svg"
        },
        "preview": "previews/settings-sound/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "settings-sound--lesni-klid",
        "surfaceId": "settings-sound",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-sound/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-sound/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-sound/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-sound/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-sound/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-sound/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-sound/lesni-klid/ornament.svg"
        },
        "preview": "previews/settings-sound/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "settings-sound--cisty-den",
        "surfaceId": "settings-sound",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-sound/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-sound/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-sound/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-sound/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-sound/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-sound/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-sound/cisty-den/ornament.svg"
        },
        "preview": "previews/settings-sound/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "settings",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Nastavení"
  },
  "settings-appearance": {
    "id": "settings-appearance",
    "name": "Vzhled a rámečky",
    "kind": "view",
    "shortName": "Vzhled a rámečky",
    "subtitle": "Nastavení",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "settings-appearance--zlaty-soumrak",
        "surfaceId": "settings-appearance",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-appearance/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-appearance/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-appearance/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-appearance/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-appearance/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-appearance/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-appearance/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/settings-appearance/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "settings-appearance--neonova-noc",
        "surfaceId": "settings-appearance",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-appearance/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-appearance/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-appearance/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-appearance/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-appearance/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-appearance/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-appearance/neonova-noc/ornament.svg"
        },
        "preview": "previews/settings-appearance/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "settings-appearance--polarni-zare",
        "surfaceId": "settings-appearance",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-appearance/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-appearance/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-appearance/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-appearance/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-appearance/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-appearance/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-appearance/polarni-zare/ornament.svg"
        },
        "preview": "previews/settings-appearance/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "settings-appearance--lesni-klid",
        "surfaceId": "settings-appearance",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-appearance/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-appearance/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-appearance/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-appearance/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-appearance/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-appearance/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-appearance/lesni-klid/ornament.svg"
        },
        "preview": "previews/settings-appearance/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "settings-appearance--cisty-den",
        "surfaceId": "settings-appearance",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-appearance/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-appearance/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-appearance/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-appearance/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-appearance/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-appearance/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-appearance/cisty-den/ornament.svg"
        },
        "preview": "previews/settings-appearance/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "settings",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Nastavení"
  },
  "settings-security": {
    "id": "settings-security",
    "name": "Zabezpečení",
    "kind": "view",
    "shortName": "Zabezpečení",
    "subtitle": "Nastavení",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "settings-security--zlaty-soumrak",
        "surfaceId": "settings-security",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-security/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-security/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-security/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-security/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-security/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-security/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-security/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/settings-security/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "settings-security--neonova-noc",
        "surfaceId": "settings-security",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-security/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-security/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-security/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-security/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-security/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-security/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-security/neonova-noc/ornament.svg"
        },
        "preview": "previews/settings-security/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "settings-security--polarni-zare",
        "surfaceId": "settings-security",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-security/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-security/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-security/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-security/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-security/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-security/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-security/polarni-zare/ornament.svg"
        },
        "preview": "previews/settings-security/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "settings-security--lesni-klid",
        "surfaceId": "settings-security",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-security/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-security/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-security/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-security/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-security/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-security/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-security/lesni-klid/ornament.svg"
        },
        "preview": "previews/settings-security/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "settings-security--cisty-den",
        "surfaceId": "settings-security",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-security/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-security/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-security/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-security/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-security/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-security/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-security/cisty-den/ornament.svg"
        },
        "preview": "previews/settings-security/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "settings",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Nastavení"
  },
  "settings-privacy": {
    "id": "settings-privacy",
    "name": "Soukromí a Social",
    "kind": "view",
    "shortName": "Soukromí a Social",
    "subtitle": "Nastavení",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "settings-privacy--zlaty-soumrak",
        "surfaceId": "settings-privacy",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-privacy/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-privacy/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-privacy/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-privacy/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-privacy/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-privacy/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-privacy/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/settings-privacy/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "settings-privacy--neonova-noc",
        "surfaceId": "settings-privacy",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-privacy/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-privacy/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-privacy/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-privacy/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-privacy/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-privacy/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-privacy/neonova-noc/ornament.svg"
        },
        "preview": "previews/settings-privacy/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "settings-privacy--polarni-zare",
        "surfaceId": "settings-privacy",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-privacy/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-privacy/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-privacy/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-privacy/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-privacy/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-privacy/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-privacy/polarni-zare/ornament.svg"
        },
        "preview": "previews/settings-privacy/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "settings-privacy--lesni-klid",
        "surfaceId": "settings-privacy",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-privacy/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-privacy/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-privacy/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-privacy/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-privacy/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-privacy/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-privacy/lesni-klid/ornament.svg"
        },
        "preview": "previews/settings-privacy/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "settings-privacy--cisty-den",
        "surfaceId": "settings-privacy",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-privacy/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-privacy/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-privacy/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-privacy/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-privacy/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-privacy/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-privacy/cisty-den/ornament.svg"
        },
        "preview": "previews/settings-privacy/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "settings",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Nastavení"
  },
  "settings-language": {
    "id": "settings-language",
    "name": "Jazyk",
    "kind": "view",
    "shortName": "Jazyk",
    "subtitle": "Nastavení",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "settings-language--zlaty-soumrak",
        "surfaceId": "settings-language",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-language/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-language/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-language/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-language/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-language/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-language/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-language/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/settings-language/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "settings-language--neonova-noc",
        "surfaceId": "settings-language",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-language/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-language/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-language/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-language/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-language/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-language/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-language/neonova-noc/ornament.svg"
        },
        "preview": "previews/settings-language/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "settings-language--polarni-zare",
        "surfaceId": "settings-language",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-language/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-language/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-language/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-language/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-language/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-language/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-language/polarni-zare/ornament.svg"
        },
        "preview": "previews/settings-language/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "settings-language--lesni-klid",
        "surfaceId": "settings-language",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-language/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-language/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-language/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-language/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-language/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-language/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-language/lesni-klid/ornament.svg"
        },
        "preview": "previews/settings-language/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "settings-language--cisty-den",
        "surfaceId": "settings-language",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-language/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-language/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-language/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-language/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-language/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-language/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-language/cisty-den/ornament.svg"
        },
        "preview": "previews/settings-language/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "settings",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Nastavení"
  },
  "settings-backup": {
    "id": "settings-backup",
    "name": "Zálohování a synchronizace",
    "kind": "view",
    "shortName": "Zálohování a synchronizace",
    "subtitle": "Nastavení",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "settings-backup--zlaty-soumrak",
        "surfaceId": "settings-backup",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-backup/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-backup/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-backup/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-backup/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-backup/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-backup/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-backup/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/settings-backup/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "settings-backup--neonova-noc",
        "surfaceId": "settings-backup",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-backup/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-backup/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-backup/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-backup/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-backup/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-backup/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-backup/neonova-noc/ornament.svg"
        },
        "preview": "previews/settings-backup/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "settings-backup--polarni-zare",
        "surfaceId": "settings-backup",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-backup/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-backup/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-backup/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-backup/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-backup/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-backup/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-backup/polarni-zare/ornament.svg"
        },
        "preview": "previews/settings-backup/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "settings-backup--lesni-klid",
        "surfaceId": "settings-backup",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-backup/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-backup/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-backup/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-backup/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-backup/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-backup/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-backup/lesni-klid/ornament.svg"
        },
        "preview": "previews/settings-backup/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "settings-backup--cisty-den",
        "surfaceId": "settings-backup",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-backup/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-backup/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-backup/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-backup/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-backup/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-backup/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-backup/cisty-den/ornament.svg"
        },
        "preview": "previews/settings-backup/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "settings",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Nastavení"
  },
  "settings-tutorial": {
    "id": "settings-tutorial",
    "name": "Úvodní tutorial",
    "kind": "view",
    "shortName": "Úvodní tutorial",
    "subtitle": "Nastavení",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "settings-tutorial--zlaty-soumrak",
        "surfaceId": "settings-tutorial",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-tutorial/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-tutorial/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-tutorial/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-tutorial/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-tutorial/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-tutorial/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-tutorial/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/settings-tutorial/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "settings-tutorial--neonova-noc",
        "surfaceId": "settings-tutorial",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-tutorial/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-tutorial/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-tutorial/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-tutorial/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-tutorial/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-tutorial/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-tutorial/neonova-noc/ornament.svg"
        },
        "preview": "previews/settings-tutorial/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "settings-tutorial--polarni-zare",
        "surfaceId": "settings-tutorial",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-tutorial/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-tutorial/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-tutorial/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-tutorial/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-tutorial/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-tutorial/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-tutorial/polarni-zare/ornament.svg"
        },
        "preview": "previews/settings-tutorial/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "settings-tutorial--lesni-klid",
        "surfaceId": "settings-tutorial",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-tutorial/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-tutorial/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-tutorial/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-tutorial/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-tutorial/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-tutorial/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-tutorial/lesni-klid/ornament.svg"
        },
        "preview": "previews/settings-tutorial/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "settings-tutorial--cisty-den",
        "surfaceId": "settings-tutorial",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/settings-tutorial/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/settings-tutorial/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/settings-tutorial/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/settings-tutorial/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/settings-tutorial/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/settings-tutorial/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/settings-tutorial/cisty-den/ornament.svg"
        },
        "preview": "previews/settings-tutorial/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "settings",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Nastavení"
  },
  "social-home": {
    "id": "social-home",
    "name": "Social",
    "kind": "module",
    "shortName": "Social",
    "subtitle": "Lidé, nápady a společný prostor",
    "route": "/social",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "social-home--zlaty-soumrak",
        "surfaceId": "social-home",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/social-home/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/social-home/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/social-home/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/social-home/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/social-home/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/social-home/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/social-home/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/social-home/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "social-home--neonova-noc",
        "surfaceId": "social-home",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/social-home/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/social-home/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/social-home/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/social-home/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/social-home/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/social-home/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/social-home/neonova-noc/ornament.svg"
        },
        "preview": "previews/social-home/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "social-home--polarni-zare",
        "surfaceId": "social-home",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/social-home/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/social-home/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/social-home/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/social-home/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/social-home/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/social-home/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/social-home/polarni-zare/ornament.svg"
        },
        "preview": "previews/social-home/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "social-home--lesni-klid",
        "surfaceId": "social-home",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/social-home/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/social-home/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/social-home/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/social-home/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/social-home/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/social-home/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/social-home/lesni-klid/ornament.svg"
        },
        "preview": "previews/social-home/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "social-home--cisty-den",
        "surfaceId": "social-home",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/social-home/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/social-home/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/social-home/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/social-home/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/social-home/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/social-home/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/social-home/cisty-den/ornament.svg"
        },
        "preview": "previews/social-home/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Komunita"
  },
  "chat-list": {
    "id": "chat-list",
    "name": "Chaty",
    "kind": "view",
    "shortName": "Chaty",
    "subtitle": "Komunita",
    "route": "/social?zalozka=chaty",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "chat-list--zlaty-soumrak",
        "surfaceId": "chat-list",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/chat-list/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/chat-list/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/chat-list/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/chat-list/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/chat-list/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/chat-list/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/chat-list/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/chat-list/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "chat-list--neonova-noc",
        "surfaceId": "chat-list",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/chat-list/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/chat-list/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/chat-list/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/chat-list/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/chat-list/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/chat-list/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/chat-list/neonova-noc/ornament.svg"
        },
        "preview": "previews/chat-list/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "chat-list--polarni-zare",
        "surfaceId": "chat-list",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/chat-list/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/chat-list/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/chat-list/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/chat-list/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/chat-list/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/chat-list/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/chat-list/polarni-zare/ornament.svg"
        },
        "preview": "previews/chat-list/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "chat-list--lesni-klid",
        "surfaceId": "chat-list",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/chat-list/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/chat-list/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/chat-list/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/chat-list/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/chat-list/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/chat-list/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/chat-list/lesni-klid/ornament.svg"
        },
        "preview": "previews/chat-list/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "chat-list--cisty-den",
        "surfaceId": "chat-list",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/chat-list/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/chat-list/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/chat-list/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/chat-list/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/chat-list/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/chat-list/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/chat-list/cisty-den/ornament.svg"
        },
        "preview": "previews/chat-list/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "social-home",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Komunita"
  },
  "chat-conversation": {
    "id": "chat-conversation",
    "name": "Konverzace",
    "kind": "view",
    "shortName": "Konverzace",
    "subtitle": "Komunita",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "chat-conversation--zlaty-soumrak",
        "surfaceId": "chat-conversation",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/chat-conversation/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/chat-conversation/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/chat-conversation/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/chat-conversation/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/chat-conversation/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/chat-conversation/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/chat-conversation/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/chat-conversation/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "chat-conversation--neonova-noc",
        "surfaceId": "chat-conversation",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/chat-conversation/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/chat-conversation/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/chat-conversation/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/chat-conversation/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/chat-conversation/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/chat-conversation/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/chat-conversation/neonova-noc/ornament.svg"
        },
        "preview": "previews/chat-conversation/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "chat-conversation--polarni-zare",
        "surfaceId": "chat-conversation",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/chat-conversation/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/chat-conversation/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/chat-conversation/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/chat-conversation/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/chat-conversation/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/chat-conversation/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/chat-conversation/polarni-zare/ornament.svg"
        },
        "preview": "previews/chat-conversation/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "chat-conversation--lesni-klid",
        "surfaceId": "chat-conversation",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/chat-conversation/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/chat-conversation/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/chat-conversation/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/chat-conversation/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/chat-conversation/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/chat-conversation/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/chat-conversation/lesni-klid/ornament.svg"
        },
        "preview": "previews/chat-conversation/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "chat-conversation--cisty-den",
        "surfaceId": "chat-conversation",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/chat-conversation/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/chat-conversation/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/chat-conversation/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/chat-conversation/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/chat-conversation/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/chat-conversation/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/chat-conversation/cisty-den/ornament.svg"
        },
        "preview": "previews/chat-conversation/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "chat-list",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Komunita"
  },
  "secret-chat": {
    "id": "secret-chat",
    "name": "Tajný chat",
    "kind": "view",
    "shortName": "Tajný chat",
    "subtitle": "Komunita",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "secret-chat--zlaty-soumrak",
        "surfaceId": "secret-chat",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/secret-chat/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/secret-chat/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/secret-chat/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/secret-chat/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/secret-chat/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/secret-chat/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/secret-chat/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/secret-chat/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "secret-chat--neonova-noc",
        "surfaceId": "secret-chat",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/secret-chat/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/secret-chat/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/secret-chat/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/secret-chat/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/secret-chat/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/secret-chat/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/secret-chat/neonova-noc/ornament.svg"
        },
        "preview": "previews/secret-chat/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "secret-chat--polarni-zare",
        "surfaceId": "secret-chat",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/secret-chat/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/secret-chat/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/secret-chat/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/secret-chat/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/secret-chat/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/secret-chat/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/secret-chat/polarni-zare/ornament.svg"
        },
        "preview": "previews/secret-chat/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "secret-chat--lesni-klid",
        "surfaceId": "secret-chat",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/secret-chat/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/secret-chat/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/secret-chat/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/secret-chat/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/secret-chat/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/secret-chat/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/secret-chat/lesni-klid/ornament.svg"
        },
        "preview": "previews/secret-chat/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "secret-chat--cisty-den",
        "surfaceId": "secret-chat",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/secret-chat/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/secret-chat/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/secret-chat/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/secret-chat/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/secret-chat/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/secret-chat/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/secret-chat/cisty-den/ornament.svg"
        },
        "preview": "previews/secret-chat/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "chat-list",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Komunita"
  },
  "people-search": {
    "id": "people-search",
    "name": "Hledání lidí",
    "kind": "view",
    "shortName": "Hledání lidí",
    "subtitle": "Komunita",
    "route": "/social?zalozka=vyhledavac",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "people-search--zlaty-soumrak",
        "surfaceId": "people-search",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/people-search/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/people-search/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/people-search/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/people-search/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/people-search/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/people-search/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/people-search/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/people-search/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "people-search--neonova-noc",
        "surfaceId": "people-search",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/people-search/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/people-search/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/people-search/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/people-search/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/people-search/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/people-search/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/people-search/neonova-noc/ornament.svg"
        },
        "preview": "previews/people-search/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "people-search--polarni-zare",
        "surfaceId": "people-search",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/people-search/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/people-search/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/people-search/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/people-search/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/people-search/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/people-search/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/people-search/polarni-zare/ornament.svg"
        },
        "preview": "previews/people-search/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "people-search--lesni-klid",
        "surfaceId": "people-search",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/people-search/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/people-search/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/people-search/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/people-search/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/people-search/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/people-search/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/people-search/lesni-klid/ornament.svg"
        },
        "preview": "previews/people-search/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "people-search--cisty-den",
        "surfaceId": "people-search",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/people-search/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/people-search/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/people-search/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/people-search/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/people-search/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/people-search/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/people-search/cisty-den/ornament.svg"
        },
        "preview": "previews/people-search/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "social-home",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Komunita"
  },
  "public-profile": {
    "id": "public-profile",
    "name": "Veřejný profil",
    "kind": "view",
    "shortName": "Veřejný profil",
    "subtitle": "Komunita",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "public-profile--zlaty-soumrak",
        "surfaceId": "public-profile",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/public-profile/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/public-profile/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/public-profile/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/public-profile/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/public-profile/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/public-profile/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/public-profile/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/public-profile/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "public-profile--neonova-noc",
        "surfaceId": "public-profile",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/public-profile/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/public-profile/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/public-profile/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/public-profile/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/public-profile/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/public-profile/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/public-profile/neonova-noc/ornament.svg"
        },
        "preview": "previews/public-profile/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "public-profile--polarni-zare",
        "surfaceId": "public-profile",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/public-profile/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/public-profile/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/public-profile/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/public-profile/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/public-profile/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/public-profile/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/public-profile/polarni-zare/ornament.svg"
        },
        "preview": "previews/public-profile/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "public-profile--lesni-klid",
        "surfaceId": "public-profile",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/public-profile/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/public-profile/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/public-profile/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/public-profile/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/public-profile/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/public-profile/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/public-profile/lesni-klid/ornament.svg"
        },
        "preview": "previews/public-profile/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "public-profile--cisty-den",
        "surfaceId": "public-profile",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/public-profile/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/public-profile/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/public-profile/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/public-profile/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/public-profile/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/public-profile/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/public-profile/cisty-den/ornament.svg"
        },
        "preview": "previews/public-profile/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "social-home",
    "inheritFromCaller": true,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Komunita"
  },
  "friends": {
    "id": "friends",
    "name": "Přátelé a sdílení",
    "kind": "view",
    "shortName": "Přátelé a sdílení",
    "subtitle": "Komunita",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "friends--zlaty-soumrak",
        "surfaceId": "friends",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/friends/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/friends/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/friends/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/friends/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/friends/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/friends/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/friends/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/friends/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "friends--neonova-noc",
        "surfaceId": "friends",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/friends/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/friends/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/friends/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/friends/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/friends/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/friends/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/friends/neonova-noc/ornament.svg"
        },
        "preview": "previews/friends/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "friends--polarni-zare",
        "surfaceId": "friends",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/friends/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/friends/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/friends/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/friends/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/friends/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/friends/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/friends/polarni-zare/ornament.svg"
        },
        "preview": "previews/friends/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "friends--lesni-klid",
        "surfaceId": "friends",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/friends/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/friends/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/friends/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/friends/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/friends/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/friends/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/friends/lesni-klid/ornament.svg"
        },
        "preview": "previews/friends/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "friends--cisty-den",
        "surfaceId": "friends",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/friends/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/friends/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/friends/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/friends/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/friends/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/friends/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/friends/cisty-den/ornament.svg"
        },
        "preview": "previews/friends/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "profile",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Komunita"
  },
  "feed": {
    "id": "feed",
    "name": "Feed",
    "kind": "module",
    "shortName": "Feed",
    "subtitle": "Co se děje kolem tebe",
    "route": "/feed",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "feed--zlaty-soumrak",
        "surfaceId": "feed",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/feed/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/feed/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/feed/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/feed/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/feed/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/feed/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/feed/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/feed/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "feed--neonova-noc",
        "surfaceId": "feed",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/feed/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/feed/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/feed/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/feed/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/feed/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/feed/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/feed/neonova-noc/ornament.svg"
        },
        "preview": "previews/feed/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "feed--polarni-zare",
        "surfaceId": "feed",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/feed/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/feed/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/feed/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/feed/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/feed/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/feed/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/feed/polarni-zare/ornament.svg"
        },
        "preview": "previews/feed/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "feed--lesni-klid",
        "surfaceId": "feed",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/feed/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/feed/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/feed/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/feed/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/feed/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/feed/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/feed/lesni-klid/ornament.svg"
        },
        "preview": "previews/feed/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "feed--cisty-den",
        "surfaceId": "feed",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/feed/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/feed/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/feed/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/feed/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/feed/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/feed/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/feed/cisty-den/ornament.svg"
        },
        "preview": "previews/feed/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Komunita"
  },
  "notifications": {
    "id": "notifications",
    "name": "Upozornění",
    "kind": "view",
    "shortName": "Upozornění",
    "subtitle": "Společné panely",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "notifications--zlaty-soumrak",
        "surfaceId": "notifications",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/notifications/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/notifications/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/notifications/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/notifications/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/notifications/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/notifications/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/notifications/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/notifications/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "notifications--neonova-noc",
        "surfaceId": "notifications",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/notifications/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/notifications/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/notifications/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/notifications/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/notifications/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/notifications/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/notifications/neonova-noc/ornament.svg"
        },
        "preview": "previews/notifications/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "notifications--polarni-zare",
        "surfaceId": "notifications",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/notifications/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/notifications/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/notifications/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/notifications/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/notifications/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/notifications/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/notifications/polarni-zare/ornament.svg"
        },
        "preview": "previews/notifications/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "notifications--lesni-klid",
        "surfaceId": "notifications",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/notifications/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/notifications/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/notifications/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/notifications/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/notifications/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/notifications/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/notifications/lesni-klid/ornament.svg"
        },
        "preview": "previews/notifications/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "notifications--cisty-den",
        "surfaceId": "notifications",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/notifications/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/notifications/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/notifications/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/notifications/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/notifications/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/notifications/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/notifications/cisty-den/ornament.svg"
        },
        "preview": "previews/notifications/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "profile",
    "inheritFromCaller": true,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Společné panely"
  },
  "buddy-assistant": {
    "id": "buddy-assistant",
    "name": "Buddy asistent",
    "kind": "module",
    "shortName": "Buddy asistent",
    "subtitle": "Společné panely",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "buddy-assistant--zlaty-soumrak",
        "surfaceId": "buddy-assistant",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddy-assistant/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/buddy-assistant/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddy-assistant/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddy-assistant/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddy-assistant/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddy-assistant/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddy-assistant/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/buddy-assistant/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "buddy-assistant--neonova-noc",
        "surfaceId": "buddy-assistant",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddy-assistant/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/buddy-assistant/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddy-assistant/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddy-assistant/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddy-assistant/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddy-assistant/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddy-assistant/neonova-noc/ornament.svg"
        },
        "preview": "previews/buddy-assistant/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "buddy-assistant--polarni-zare",
        "surfaceId": "buddy-assistant",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddy-assistant/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/buddy-assistant/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddy-assistant/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddy-assistant/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddy-assistant/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddy-assistant/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddy-assistant/polarni-zare/ornament.svg"
        },
        "preview": "previews/buddy-assistant/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "buddy-assistant--lesni-klid",
        "surfaceId": "buddy-assistant",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddy-assistant/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/buddy-assistant/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddy-assistant/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddy-assistant/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddy-assistant/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddy-assistant/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddy-assistant/lesni-klid/ornament.svg"
        },
        "preview": "previews/buddy-assistant/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "buddy-assistant--cisty-den",
        "surfaceId": "buddy-assistant",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddy-assistant/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/buddy-assistant/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddy-assistant/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddy-assistant/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddy-assistant/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddy-assistant/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddy-assistant/cisty-den/ornament.svg"
        },
        "preview": "previews/buddy-assistant/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Společné panely"
  },
  "help": {
    "id": "help",
    "name": "Nápověda",
    "kind": "module",
    "shortName": "Nápověda",
    "subtitle": "Pomoc",
    "route": "/navod",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "help--zlaty-soumrak",
        "surfaceId": "help",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/help/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/help/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/help/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/help/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/help/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/help/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/help/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/help/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "help--neonova-noc",
        "surfaceId": "help",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/help/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/help/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/help/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/help/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/help/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/help/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/help/neonova-noc/ornament.svg"
        },
        "preview": "previews/help/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "help--polarni-zare",
        "surfaceId": "help",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/help/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/help/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/help/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/help/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/help/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/help/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/help/polarni-zare/ornament.svg"
        },
        "preview": "previews/help/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "help--lesni-klid",
        "surfaceId": "help",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/help/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/help/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/help/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/help/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/help/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/help/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/help/lesni-klid/ornament.svg"
        },
        "preview": "previews/help/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "help--cisty-den",
        "surfaceId": "help",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/help/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/help/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/help/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/help/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/help/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/help/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/help/cisty-den/ornament.svg"
        },
        "preview": "previews/help/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Pomoc"
  },
  "support": {
    "id": "support",
    "name": "Podpora",
    "kind": "module",
    "shortName": "Podpora",
    "subtitle": "Pomoc",
    "route": "/podpora",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "support--zlaty-soumrak",
        "surfaceId": "support",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/support/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/support/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/support/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/support/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/support/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/support/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/support/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/support/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "support--neonova-noc",
        "surfaceId": "support",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/support/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/support/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/support/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/support/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/support/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/support/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/support/neonova-noc/ornament.svg"
        },
        "preview": "previews/support/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "support--polarni-zare",
        "surfaceId": "support",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/support/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/support/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/support/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/support/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/support/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/support/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/support/polarni-zare/ornament.svg"
        },
        "preview": "previews/support/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "support--lesni-klid",
        "surfaceId": "support",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/support/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/support/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/support/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/support/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/support/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/support/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/support/lesni-klid/ornament.svg"
        },
        "preview": "previews/support/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "support--cisty-den",
        "surfaceId": "support",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/support/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/support/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/support/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/support/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/support/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/support/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/support/cisty-den/ornament.svg"
        },
        "preview": "previews/support/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Pomoc"
  },
  "support-conversation": {
    "id": "support-conversation",
    "name": "Detail požadavku",
    "kind": "view",
    "shortName": "Detail požadavku",
    "subtitle": "Pomoc",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "support-conversation--zlaty-soumrak",
        "surfaceId": "support-conversation",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/support-conversation/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/support-conversation/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/support-conversation/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/support-conversation/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/support-conversation/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/support-conversation/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/support-conversation/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/support-conversation/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "support-conversation--neonova-noc",
        "surfaceId": "support-conversation",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/support-conversation/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/support-conversation/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/support-conversation/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/support-conversation/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/support-conversation/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/support-conversation/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/support-conversation/neonova-noc/ornament.svg"
        },
        "preview": "previews/support-conversation/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "support-conversation--polarni-zare",
        "surfaceId": "support-conversation",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/support-conversation/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/support-conversation/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/support-conversation/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/support-conversation/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/support-conversation/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/support-conversation/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/support-conversation/polarni-zare/ornament.svg"
        },
        "preview": "previews/support-conversation/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "support-conversation--lesni-klid",
        "surfaceId": "support-conversation",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/support-conversation/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/support-conversation/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/support-conversation/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/support-conversation/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/support-conversation/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/support-conversation/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/support-conversation/lesni-klid/ornament.svg"
        },
        "preview": "previews/support-conversation/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "support-conversation--cisty-den",
        "surfaceId": "support-conversation",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/support-conversation/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/support-conversation/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/support-conversation/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/support-conversation/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/support-conversation/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/support-conversation/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/support-conversation/cisty-den/ornament.svg"
        },
        "preview": "previews/support-conversation/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "support",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Pomoc"
  },
  "admin": {
    "id": "admin",
    "name": "Administrace",
    "kind": "module",
    "shortName": "Administrace",
    "subtitle": "Administrace",
    "route": "/admin",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "admin--zlaty-soumrak",
        "surfaceId": "admin",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/admin/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/admin/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "admin--neonova-noc",
        "surfaceId": "admin",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/admin/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin/neonova-noc/ornament.svg"
        },
        "preview": "previews/admin/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "admin--polarni-zare",
        "surfaceId": "admin",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/admin/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin/polarni-zare/ornament.svg"
        },
        "preview": "previews/admin/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "admin--lesni-klid",
        "surfaceId": "admin",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/admin/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin/lesni-klid/ornament.svg"
        },
        "preview": "previews/admin/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "admin--cisty-den",
        "surfaceId": "admin",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/admin/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin/cisty-den/ornament.svg"
        },
        "preview": "previews/admin/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": "moderation.content",
    "customizable": true,
    "group": "Administrace"
  },
  "admin-overview": {
    "id": "admin-overview",
    "name": "Admin · Přehled",
    "kind": "view",
    "shortName": "Admin · Přehled",
    "subtitle": "Administrace",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "admin-overview--zlaty-soumrak",
        "surfaceId": "admin-overview",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-overview/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-overview/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-overview/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-overview/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-overview/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-overview/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-overview/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/admin-overview/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "admin-overview--neonova-noc",
        "surfaceId": "admin-overview",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-overview/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-overview/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-overview/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-overview/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-overview/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-overview/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-overview/neonova-noc/ornament.svg"
        },
        "preview": "previews/admin-overview/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "admin-overview--polarni-zare",
        "surfaceId": "admin-overview",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-overview/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-overview/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-overview/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-overview/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-overview/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-overview/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-overview/polarni-zare/ornament.svg"
        },
        "preview": "previews/admin-overview/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "admin-overview--lesni-klid",
        "surfaceId": "admin-overview",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-overview/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-overview/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-overview/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-overview/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-overview/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-overview/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-overview/lesni-klid/ornament.svg"
        },
        "preview": "previews/admin-overview/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "admin-overview--cisty-den",
        "surfaceId": "admin-overview",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-overview/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-overview/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-overview/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-overview/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-overview/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-overview/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-overview/cisty-den/ornament.svg"
        },
        "preview": "previews/admin-overview/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "admin",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": "admin.panel",
    "customizable": false,
    "group": "Administrace"
  },
  "admin-users": {
    "id": "admin-users",
    "name": "Admin · Uživatelé",
    "kind": "view",
    "shortName": "Admin · Uživatelé",
    "subtitle": "Administrace",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "admin-users--zlaty-soumrak",
        "surfaceId": "admin-users",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-users/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-users/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-users/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-users/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-users/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-users/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-users/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/admin-users/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "admin-users--neonova-noc",
        "surfaceId": "admin-users",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-users/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-users/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-users/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-users/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-users/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-users/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-users/neonova-noc/ornament.svg"
        },
        "preview": "previews/admin-users/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "admin-users--polarni-zare",
        "surfaceId": "admin-users",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-users/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-users/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-users/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-users/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-users/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-users/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-users/polarni-zare/ornament.svg"
        },
        "preview": "previews/admin-users/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "admin-users--lesni-klid",
        "surfaceId": "admin-users",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-users/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-users/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-users/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-users/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-users/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-users/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-users/lesni-klid/ornament.svg"
        },
        "preview": "previews/admin-users/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "admin-users--cisty-den",
        "surfaceId": "admin-users",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-users/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-users/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-users/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-users/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-users/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-users/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-users/cisty-den/ornament.svg"
        },
        "preview": "previews/admin-users/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "admin",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": "admin.panel",
    "customizable": false,
    "group": "Administrace"
  },
  "admin-reports": {
    "id": "admin-reports",
    "name": "Moderace · Hlášení",
    "kind": "view",
    "shortName": "Moderace · Hlášení",
    "subtitle": "Administrace",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "admin-reports--zlaty-soumrak",
        "surfaceId": "admin-reports",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-reports/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-reports/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-reports/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-reports/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-reports/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-reports/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-reports/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/admin-reports/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "admin-reports--neonova-noc",
        "surfaceId": "admin-reports",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-reports/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-reports/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-reports/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-reports/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-reports/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-reports/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-reports/neonova-noc/ornament.svg"
        },
        "preview": "previews/admin-reports/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "admin-reports--polarni-zare",
        "surfaceId": "admin-reports",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-reports/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-reports/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-reports/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-reports/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-reports/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-reports/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-reports/polarni-zare/ornament.svg"
        },
        "preview": "previews/admin-reports/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "admin-reports--lesni-klid",
        "surfaceId": "admin-reports",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-reports/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-reports/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-reports/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-reports/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-reports/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-reports/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-reports/lesni-klid/ornament.svg"
        },
        "preview": "previews/admin-reports/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "admin-reports--cisty-den",
        "surfaceId": "admin-reports",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-reports/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-reports/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-reports/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-reports/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-reports/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-reports/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-reports/cisty-den/ornament.svg"
        },
        "preview": "previews/admin-reports/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "admin",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": "moderation.content",
    "customizable": false,
    "group": "Administrace"
  },
  "admin-notifications": {
    "id": "admin-notifications",
    "name": "Admin · Oznámení",
    "kind": "view",
    "shortName": "Admin · Oznámení",
    "subtitle": "Administrace",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "admin-notifications--zlaty-soumrak",
        "surfaceId": "admin-notifications",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-notifications/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-notifications/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-notifications/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-notifications/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-notifications/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-notifications/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-notifications/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/admin-notifications/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "admin-notifications--neonova-noc",
        "surfaceId": "admin-notifications",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-notifications/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-notifications/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-notifications/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-notifications/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-notifications/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-notifications/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-notifications/neonova-noc/ornament.svg"
        },
        "preview": "previews/admin-notifications/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "admin-notifications--polarni-zare",
        "surfaceId": "admin-notifications",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-notifications/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-notifications/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-notifications/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-notifications/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-notifications/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-notifications/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-notifications/polarni-zare/ornament.svg"
        },
        "preview": "previews/admin-notifications/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "admin-notifications--lesni-klid",
        "surfaceId": "admin-notifications",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-notifications/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-notifications/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-notifications/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-notifications/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-notifications/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-notifications/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-notifications/lesni-klid/ornament.svg"
        },
        "preview": "previews/admin-notifications/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "admin-notifications--cisty-den",
        "surfaceId": "admin-notifications",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-notifications/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-notifications/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-notifications/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-notifications/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-notifications/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-notifications/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-notifications/cisty-den/ornament.svg"
        },
        "preview": "previews/admin-notifications/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "admin",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": "admin.panel",
    "customizable": false,
    "group": "Administrace"
  },
  "admin-audit": {
    "id": "admin-audit",
    "name": "Admin · Audit log",
    "kind": "view",
    "shortName": "Admin · Audit log",
    "subtitle": "Administrace",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "admin-audit--zlaty-soumrak",
        "surfaceId": "admin-audit",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-audit/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-audit/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-audit/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-audit/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-audit/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-audit/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-audit/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/admin-audit/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "admin-audit--neonova-noc",
        "surfaceId": "admin-audit",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-audit/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-audit/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-audit/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-audit/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-audit/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-audit/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-audit/neonova-noc/ornament.svg"
        },
        "preview": "previews/admin-audit/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "admin-audit--polarni-zare",
        "surfaceId": "admin-audit",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-audit/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-audit/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-audit/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-audit/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-audit/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-audit/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-audit/polarni-zare/ornament.svg"
        },
        "preview": "previews/admin-audit/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "admin-audit--lesni-klid",
        "surfaceId": "admin-audit",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-audit/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-audit/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-audit/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-audit/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-audit/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-audit/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-audit/lesni-klid/ornament.svg"
        },
        "preview": "previews/admin-audit/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "admin-audit--cisty-den",
        "surfaceId": "admin-audit",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-audit/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-audit/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-audit/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-audit/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-audit/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-audit/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-audit/cisty-den/ornament.svg"
        },
        "preview": "previews/admin-audit/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "admin",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": "admin.panel",
    "customizable": false,
    "group": "Administrace"
  },
  "admin-system": {
    "id": "admin-system",
    "name": "Admin · Systém",
    "kind": "view",
    "shortName": "Admin · Systém",
    "subtitle": "Administrace",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "admin-system--zlaty-soumrak",
        "surfaceId": "admin-system",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-system/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-system/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-system/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-system/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-system/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-system/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-system/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/admin-system/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "admin-system--neonova-noc",
        "surfaceId": "admin-system",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-system/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-system/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-system/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-system/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-system/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-system/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-system/neonova-noc/ornament.svg"
        },
        "preview": "previews/admin-system/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "admin-system--polarni-zare",
        "surfaceId": "admin-system",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-system/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-system/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-system/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-system/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-system/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-system/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-system/polarni-zare/ornament.svg"
        },
        "preview": "previews/admin-system/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "admin-system--lesni-klid",
        "surfaceId": "admin-system",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-system/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-system/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-system/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-system/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-system/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-system/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-system/lesni-klid/ornament.svg"
        },
        "preview": "previews/admin-system/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "admin-system--cisty-den",
        "surfaceId": "admin-system",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-system/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-system/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-system/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-system/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-system/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-system/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-system/cisty-den/ornament.svg"
        },
        "preview": "previews/admin-system/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "admin",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": "admin.panel",
    "customizable": false,
    "group": "Administrace"
  },
  "admin-console": {
    "id": "admin-console",
    "name": "Admin · Konzole",
    "kind": "view",
    "shortName": "Admin · Konzole",
    "subtitle": "Administrace",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "admin-console--zlaty-soumrak",
        "surfaceId": "admin-console",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-console/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-console/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-console/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-console/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-console/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-console/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-console/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/admin-console/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "admin-console--neonova-noc",
        "surfaceId": "admin-console",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-console/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-console/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-console/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-console/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-console/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-console/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-console/neonova-noc/ornament.svg"
        },
        "preview": "previews/admin-console/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "admin-console--polarni-zare",
        "surfaceId": "admin-console",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-console/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-console/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-console/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-console/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-console/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-console/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-console/polarni-zare/ornament.svg"
        },
        "preview": "previews/admin-console/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "admin-console--lesni-klid",
        "surfaceId": "admin-console",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-console/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-console/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-console/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-console/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-console/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-console/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-console/lesni-klid/ornament.svg"
        },
        "preview": "previews/admin-console/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "admin-console--cisty-den",
        "surfaceId": "admin-console",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/admin-console/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/admin-console/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/admin-console/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/admin-console/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/admin-console/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/admin-console/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/admin-console/cisty-den/ornament.svg"
        },
        "preview": "previews/admin-console/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "admin",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": "admin.panel",
    "customizable": false,
    "group": "Administrace"
  },
  "login": {
    "id": "login",
    "name": "Přihlášení a registrace",
    "kind": "module",
    "shortName": "Přihlášení a registrace",
    "subtitle": "Systém",
    "route": "/",
    "parentRoom": null,
    "defaultScenery": true,
    "variants": {
      "zlaty-soumrak": {
        "id": "login--zlaty-soumrak",
        "surfaceId": "login",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/login/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/login/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/login/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/login/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/login/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/login/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/login/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/login/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "login--neonova-noc",
        "surfaceId": "login",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/login/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/login/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/login/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/login/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/login/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/login/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/login/neonova-noc/ornament.svg"
        },
        "preview": "previews/login/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "login--polarni-zare",
        "surfaceId": "login",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/login/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/login/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/login/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/login/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/login/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/login/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/login/polarni-zare/ornament.svg"
        },
        "preview": "previews/login/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "login--lesni-klid",
        "surfaceId": "login",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/login/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/login/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/login/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/login/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/login/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/login/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/login/lesni-klid/ornament.svg"
        },
        "preview": "previews/login/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "login--cisty-den",
        "surfaceId": "login",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/login/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/login/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/login/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/login/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/login/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/login/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/login/cisty-den/ornament.svg"
        },
        "preview": "previews/login/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": true,
    "group": "Systém"
  },
  "boot": {
    "id": "boot",
    "name": "Spuštění a aktualizace",
    "kind": "system",
    "shortName": "Spuštění a aktualizace",
    "subtitle": "Systém",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "boot--zlaty-soumrak",
        "surfaceId": "boot",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/boot/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/boot/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/boot/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/boot/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/boot/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/boot/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/boot/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/boot/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "boot--neonova-noc",
        "surfaceId": "boot",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/boot/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/boot/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/boot/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/boot/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/boot/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/boot/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/boot/neonova-noc/ornament.svg"
        },
        "preview": "previews/boot/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "boot--polarni-zare",
        "surfaceId": "boot",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/boot/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/boot/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/boot/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/boot/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/boot/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/boot/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/boot/polarni-zare/ornament.svg"
        },
        "preview": "previews/boot/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "boot--lesni-klid",
        "surfaceId": "boot",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/boot/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/boot/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/boot/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/boot/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/boot/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/boot/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/boot/lesni-klid/ornament.svg"
        },
        "preview": "previews/boot/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "boot--cisty-den",
        "surfaceId": "boot",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/boot/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/boot/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/boot/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/boot/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/boot/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/boot/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/boot/cisty-den/ornament.svg"
        },
        "preview": "previews/boot/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Systém"
  },
  "biometric-lock": {
    "id": "biometric-lock",
    "name": "Uzamčená aplikace",
    "kind": "system",
    "shortName": "Uzamčená aplikace",
    "subtitle": "Systém",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "biometric-lock--zlaty-soumrak",
        "surfaceId": "biometric-lock",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/biometric-lock/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/biometric-lock/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/biometric-lock/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/biometric-lock/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/biometric-lock/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/biometric-lock/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/biometric-lock/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/biometric-lock/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "biometric-lock--neonova-noc",
        "surfaceId": "biometric-lock",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/biometric-lock/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/biometric-lock/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/biometric-lock/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/biometric-lock/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/biometric-lock/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/biometric-lock/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/biometric-lock/neonova-noc/ornament.svg"
        },
        "preview": "previews/biometric-lock/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "biometric-lock--polarni-zare",
        "surfaceId": "biometric-lock",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/biometric-lock/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/biometric-lock/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/biometric-lock/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/biometric-lock/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/biometric-lock/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/biometric-lock/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/biometric-lock/polarni-zare/ornament.svg"
        },
        "preview": "previews/biometric-lock/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "biometric-lock--lesni-klid",
        "surfaceId": "biometric-lock",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/biometric-lock/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/biometric-lock/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/biometric-lock/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/biometric-lock/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/biometric-lock/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/biometric-lock/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/biometric-lock/lesni-klid/ornament.svg"
        },
        "preview": "previews/biometric-lock/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "biometric-lock--cisty-den",
        "surfaceId": "biometric-lock",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/biometric-lock/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/biometric-lock/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/biometric-lock/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/biometric-lock/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/biometric-lock/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/biometric-lock/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/biometric-lock/cisty-den/ornament.svg"
        },
        "preview": "previews/biometric-lock/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "Systém"
  },
  "school-stats": {
    "id": "school-stats",
    "name": "Škola · Statistiky",
    "kind": "view",
    "shortName": "Škola · Statistiky",
    "subtitle": "School Room",
    "route": "/skola/statistiky",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "school-stats--zlaty-soumrak",
        "surfaceId": "school-stats",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-stats/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/school-stats/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/school-stats/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-stats/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/school-stats/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-stats/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-stats/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/school-stats/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "school-stats--neonova-noc",
        "surfaceId": "school-stats",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-stats/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/school-stats/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/school-stats/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-stats/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/school-stats/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-stats/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-stats/neonova-noc/ornament.svg"
        },
        "preview": "previews/school-stats/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "school-stats--polarni-zare",
        "surfaceId": "school-stats",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-stats/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/school-stats/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/school-stats/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-stats/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/school-stats/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-stats/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-stats/polarni-zare/ornament.svg"
        },
        "preview": "previews/school-stats/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "school-stats--lesni-klid",
        "surfaceId": "school-stats",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-stats/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/school-stats/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/school-stats/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-stats/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/school-stats/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-stats/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-stats/lesni-klid/ornament.svg"
        },
        "preview": "previews/school-stats/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "school-stats--cisty-den",
        "surfaceId": "school-stats",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-stats/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/school-stats/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/school-stats/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-stats/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/school-stats/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-stats/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-stats/cisty-den/ornament.svg"
        },
        "preview": "previews/school-stats/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "school-room",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "School Room"
  },
  "school-alerts": {
    "id": "school-alerts",
    "name": "Škola · Upozornění",
    "kind": "view",
    "shortName": "Škola · Upozornění",
    "subtitle": "School Room",
    "route": "/skola/upozorneni",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "school-alerts--zlaty-soumrak",
        "surfaceId": "school-alerts",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-alerts/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/school-alerts/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/school-alerts/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-alerts/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/school-alerts/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-alerts/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-alerts/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/school-alerts/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "school-alerts--neonova-noc",
        "surfaceId": "school-alerts",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-alerts/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/school-alerts/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/school-alerts/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-alerts/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/school-alerts/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-alerts/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-alerts/neonova-noc/ornament.svg"
        },
        "preview": "previews/school-alerts/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "school-alerts--polarni-zare",
        "surfaceId": "school-alerts",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-alerts/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/school-alerts/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/school-alerts/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-alerts/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/school-alerts/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-alerts/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-alerts/polarni-zare/ornament.svg"
        },
        "preview": "previews/school-alerts/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "school-alerts--lesni-klid",
        "surfaceId": "school-alerts",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-alerts/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/school-alerts/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/school-alerts/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-alerts/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/school-alerts/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-alerts/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-alerts/lesni-klid/ornament.svg"
        },
        "preview": "previews/school-alerts/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "school-alerts--cisty-den",
        "surfaceId": "school-alerts",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/school-alerts/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/school-alerts/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/school-alerts/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/school-alerts/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/school-alerts/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/school-alerts/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/school-alerts/cisty-den/ornament.svg"
        },
        "preview": "previews/school-alerts/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "school-room",
    "inheritFromCaller": false,
    "backgroundMode": "quiet",
    "permission": null,
    "customizable": false,
    "group": "School Room"
  },
  "buddyworld-entry": {
    "id": "buddyworld-entry",
    "name": "Buddy World · Vstup",
    "kind": "game-ui",
    "shortName": "Buddy World · Vstup",
    "subtitle": "Buddy World UI",
    "route": "/buddy-world",
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "buddyworld-entry--zlaty-soumrak",
        "surfaceId": "buddyworld-entry",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-entry/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-entry/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-entry/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-entry/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-entry/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-entry/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-entry/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/buddyworld-entry/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "buddyworld-entry--neonova-noc",
        "surfaceId": "buddyworld-entry",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-entry/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-entry/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-entry/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-entry/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-entry/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-entry/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-entry/neonova-noc/ornament.svg"
        },
        "preview": "previews/buddyworld-entry/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "buddyworld-entry--polarni-zare",
        "surfaceId": "buddyworld-entry",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-entry/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-entry/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-entry/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-entry/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-entry/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-entry/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-entry/polarni-zare/ornament.svg"
        },
        "preview": "previews/buddyworld-entry/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "buddyworld-entry--lesni-klid",
        "surfaceId": "buddyworld-entry",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-entry/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-entry/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-entry/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-entry/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-entry/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-entry/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-entry/lesni-klid/ornament.svg"
        },
        "preview": "previews/buddyworld-entry/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "buddyworld-entry--cisty-den",
        "surfaceId": "buddyworld-entry",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-entry/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-entry/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-entry/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-entry/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-entry/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-entry/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-entry/cisty-den/ornament.svg"
        },
        "preview": "previews/buddyworld-entry/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": null,
    "inheritFromCaller": false,
    "backgroundMode": "none",
    "permission": null,
    "customizable": true,
    "group": "Buddy World UI"
  },
  "buddyworld-hud": {
    "id": "buddyworld-hud",
    "name": "Buddy World · HUD",
    "kind": "game-ui",
    "shortName": "Buddy World · HUD",
    "subtitle": "Buddy World UI",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "buddyworld-hud--zlaty-soumrak",
        "surfaceId": "buddyworld-hud",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-hud/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-hud/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-hud/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-hud/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-hud/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-hud/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-hud/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/buddyworld-hud/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "buddyworld-hud--neonova-noc",
        "surfaceId": "buddyworld-hud",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-hud/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-hud/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-hud/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-hud/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-hud/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-hud/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-hud/neonova-noc/ornament.svg"
        },
        "preview": "previews/buddyworld-hud/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "buddyworld-hud--polarni-zare",
        "surfaceId": "buddyworld-hud",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-hud/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-hud/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-hud/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-hud/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-hud/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-hud/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-hud/polarni-zare/ornament.svg"
        },
        "preview": "previews/buddyworld-hud/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "buddyworld-hud--lesni-klid",
        "surfaceId": "buddyworld-hud",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-hud/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-hud/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-hud/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-hud/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-hud/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-hud/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-hud/lesni-klid/ornament.svg"
        },
        "preview": "previews/buddyworld-hud/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "buddyworld-hud--cisty-den",
        "surfaceId": "buddyworld-hud",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-hud/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-hud/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-hud/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-hud/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-hud/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-hud/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-hud/cisty-den/ornament.svg"
        },
        "preview": "previews/buddyworld-hud/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "buddyworld-entry",
    "inheritFromCaller": false,
    "backgroundMode": "none",
    "permission": null,
    "customizable": false,
    "group": "Buddy World UI"
  },
  "buddyworld-panel": {
    "id": "buddyworld-panel",
    "name": "Buddy World · Menu a deník",
    "kind": "game-ui",
    "shortName": "Buddy World · Menu a deník",
    "subtitle": "Buddy World UI",
    "route": null,
    "parentRoom": null,
    "defaultScenery": false,
    "variants": {
      "zlaty-soumrak": {
        "id": "buddyworld-panel--zlaty-soumrak",
        "surfaceId": "buddyworld-panel",
        "themeId": "zlaty-soumrak",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-panel/zlaty-soumrak/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-panel/zlaty-soumrak/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-panel/zlaty-soumrak/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-panel/zlaty-soumrak/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-panel/zlaty-soumrak/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-panel/zlaty-soumrak/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-panel/zlaty-soumrak/ornament.svg"
        },
        "preview": "previews/buddyworld-panel/zlaty-soumrak.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/zlaty-soumrak/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/zlaty-soumrak/scene-tablet.webp"
        }
      },
      "neonova-noc": {
        "id": "buddyworld-panel--neonova-noc",
        "surfaceId": "buddyworld-panel",
        "themeId": "neonova-noc",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-panel/neonova-noc/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-panel/neonova-noc/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-panel/neonova-noc/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-panel/neonova-noc/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-panel/neonova-noc/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-panel/neonova-noc/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-panel/neonova-noc/ornament.svg"
        },
        "preview": "previews/buddyworld-panel/neonova-noc.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/neonova-noc/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/neonova-noc/scene-tablet.webp"
        }
      },
      "polarni-zare": {
        "id": "buddyworld-panel--polarni-zare",
        "surfaceId": "buddyworld-panel",
        "themeId": "polarni-zare",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-panel/polarni-zare/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-panel/polarni-zare/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-panel/polarni-zare/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-panel/polarni-zare/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-panel/polarni-zare/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-panel/polarni-zare/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-panel/polarni-zare/ornament.svg"
        },
        "preview": "previews/buddyworld-panel/polarni-zare.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/polarni-zare/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/polarni-zare/scene-tablet.webp"
        }
      },
      "lesni-klid": {
        "id": "buddyworld-panel--lesni-klid",
        "surfaceId": "buddyworld-panel",
        "themeId": "lesni-klid",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-panel/lesni-klid/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-panel/lesni-klid/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-panel/lesni-klid/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-panel/lesni-klid/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-panel/lesni-klid/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-panel/lesni-klid/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-panel/lesni-klid/ornament.svg"
        },
        "preview": "previews/buddyworld-panel/lesni-klid.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/lesni-klid/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/lesni-klid/scene-tablet.webp"
        }
      },
      "cisty-den": {
        "id": "buddyworld-panel--cisty-den",
        "surfaceId": "buddyworld-panel",
        "themeId": "cisty-den",
        "assets": {
          "icon": "/buddy-themes/surfaces/buddyworld-panel/cisty-den/icon.svg",
          "tile": "/buddy-themes/surfaces/buddyworld-panel/cisty-den/tile.svg",
          "iconPng": "/buddy-themes/surfaces/buddyworld-panel/cisty-den/icon.png",
          "tilePng": "/buddy-themes/surfaces/buddyworld-panel/cisty-den/tile.png",
          "backgroundMobile": "/buddy-themes/surfaces/buddyworld-panel/cisty-den/background-mobile.svg",
          "backgroundTablet": "/buddy-themes/surfaces/buddyworld-panel/cisty-den/background-tablet.svg",
          "ornament": "/buddy-themes/surfaces/buddyworld-panel/cisty-den/ornament.svg"
        },
        "preview": "previews/buddyworld-panel/cisty-den.webp",
        "scenery": {
          "mobile": "/buddy-themes/shared/cisty-den/scene-mobile.webp",
          "tablet": "/buddy-themes/shared/cisty-den/scene-tablet.webp"
        }
      }
    },
    "themeParent": "buddyworld-entry",
    "inheritFromCaller": false,
    "backgroundMode": "none",
    "permission": null,
    "customizable": false,
    "group": "Buddy World UI"
  }
} as const
export type SurfaceId = keyof typeof SURFACES
export const SURFACE_IDS = Object.keys(SURFACES) as SurfaceId[]
export const isSurfaceId = (value: unknown): value is SurfaceId => typeof value === 'string' && Object.prototype.hasOwnProperty.call(SURFACES,value)
export const ROOM_BY_ROUTE: Record<string, SurfaceId> = {'/skola':'school-room','/fitness':'fitness-room','/economy':'economy-room','/growth':'growth-room','/music':'music-room','/spisovatel':'writer-room'}
