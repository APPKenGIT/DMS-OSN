# Oliesmeernippel — De Meester Industries
### High-Precision Droge-oliesmering voor Lineaire Geleidingen

Een moderne, performante en aantrekkelijke product- en leadgeneratiewebsite voor de **Oliesmeernippel**, geoptimaliseerd voor hosting via **GitHub Pages**, voorzien van een **interactieve 3D WebGL-viewer (met heldere witte technische achtergrond)** en een **frictieloos offerteformulier via FormSubmit**.

---

## 📁 Projectstructuur

```text
├── index.html                   # Hoofdpagina (geoptimaliseerd voor SEO, PWA & GitHub Pages)
├── site.webmanifest             # Web App Manifest voor mobiele en desktop snelkoppelingen
├── css/
│   └── style.css                # Technisch industrieel design system (responsive)
├── js/
│   ├── viewer3d.js              # Three.js interactieve 3D viewer (witte achtergrond, materialen, dop, rietje)
│   ├── form.js                  # Offerte-configurator & FormSubmit AJAX-afhandeling (incl. doppen-maatkeuze)
│   └── main.js                  # Navigatie, scroll spy en micro-interacties
└── assets/
    ├── images/
    │   ├── favicon.svg          # Schaalbaar vectoricoon
    │   ├── favicon.png          # Browser favicon
    │   ├── icon-192.png         # Snelkoppeling icoon (192x192)
    │   ├── icon-512.png         # High-res snelkoppeling icoon (512x512)
    │   ├── apple-touch-icon.png # iOS home screen icoon (180x180)
    │   ├── render-fallback.png  # Geëxtraheerde originele 2D render (fallback)
    │   ├── view-side.png        # Zijaanzicht 2D render
    │   ├── view-front.png       # Bovenaanzicht 2D render
    │   └── view-cap.png         # Render met afsluitdop
    └── models/                  # Optionele map voor externe CAD/GLTF modellen
```

---

## 🚀 1. Hoe werkt de website op GitHub Pages?

GitHub Pages is een uitstekende en gratis hostingomgeving voor deze website:
- De website draait volledig **client-side** (HTML5, CSS3, ES6 JavaScript en WebGL).
- Er is geen server of database vereist.
- Wereldwijde caching via Fastly CDN zorgt voor laadtijden onder 1 seconde.

### Stappenplan om online te zetten op GitHub Pages:
1. Ga in je repository naar **Settings** -> **Pages** (in het linkermenu).
2. Onder **Build and deployment**:
   - **Source**: Kies `Deploy from a branch`.
   - **Branch**: Kies `main` en `/ (root)`.
   - Klik op **Save**.
3. Binnen 1-2 minuten staat je website live op:  
   `https://appkengit.github.io/DMS-OSN/`

---

## ✉️ 2. Hoe werkt het aanvraagformulier via FormSubmit?

Het aanvraagformulier is geoptimaliseerd voor statische hosting zoals GitHub Pages:
- **AJAX JSON Submission (`fetch`)**: Bezoekers worden **niet** doorgestuurd naar een externe pagina. Ze blijven op de website en zien direct een in-page bevestiging.
- **Doppen nabestellen met maatkeuze**: Bij het nabestellen van losse afsluitdoppen kiest de klant voor welke maat nippel de doppen bedoeld zijn (M5, M6, M8, M10 of "Anders" met invoerveld).
- **Honeypot Spambeveiliging (`_honey`)**: Onzichtbaar veld voor bots, zodat spam wordt tegengehouden zonder bezoekers lastig te vallen met captchas (`_captcha=false`).
- **Live Configuratieoverzicht**: Terwijl de bezoeker draadmaat, aantal of materiaal kiest, toont de pagina direct een samenvatting van de selectie.

### Belangrijk: Eerste activatie van FormSubmit
Wanneer het eerste formulier wordt verzonden:
1. FormSubmit stuurt automatisch **éénmalig een activatiemail** naar `demeestersolutions@gmail.com`.
2. Klik in die mail op de knop **"Activate Form"**.
3. Vanaf dat moment komen alle offerteaanvragen direct netjes binnen in je inbox met alle velden in een overzichtelijke tabel.

---

## 🎮 3. De Interactieve 3D Viewer (Three.js)

In plaats van een statische render beschikt de website over een echte WebGL 3D viewer met een **heldere witte achtergrond**:
- **Witte technische achtergrond**: Het RVS model met subtiele schaduw komt haarscherp en contrastrijk naar voren.
- **Vrij roteren & zoomen**: 360° orbit control met touch-ondersteuning voor mobiel en desktop.
- **Camerastanden**: Snelknoppen voor *3D Vrij*, *Zijaanzicht*, *Bovenaanzicht (Inbus)* en *Rietje-Insteek*.
- **Materiaal wisselen**: Real-time schakelen tussen **RVS304** en **RVS316**.
- **Afsluitdop demonstratie**: Toont de blauwe metaaldetecteerbare polyamide veiligheidsdop op de nippel.
- **Rietje-insteek visualisatie**: Demonstreert hoe het rietje van een olie-aerosol in de conische opening afdicht.
- **2D Render Fallback**: Bezoekers kunnen met één klik terugvallen op de 2D gerenderde afbeeldingen.

---

## 📱 4. Snelkoppeling & PWA Icoon
De website bevat speciale pictogrammen (`apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `favicon.svg`) en een `site.webmanifest`. Wanneer een gebruiker op mobiel of desktop kiest voor *"Zet op beginscherm"* of *"Installeren als app"*, verschijnt er een herkenbaar industrieel gouden/staal Oliesmeernippel-icoon.
