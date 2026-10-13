# Oliesmeernippel — De Meester Industries
### High-Precision Droge-oliesmering voor Lineaire Geleidingen

Een moderne, performante en aantrekkelijke product- en leadgeneratiewebsite voor de **Oliesmeernippel**, geoptimaliseerd voor hosting via **GitHub Pages**, voorzien van een **interactieve 3D WebGL-viewer** en een **frictieloos offerteformulier via FormSubmit**.

---

## 📁 Projectstructuur

```text
├── index.html                   # Hoofdpagina (geoptimaliseerd voor SEO & GitHub Pages)
├── css/
│   └── style.css                # Technisch industrieel design system (responsive)
├── js/
│   ├── viewer3d.js              # Three.js interactieve 3D viewer (orbit, materialen, dop, rietje)
│   ├── form.js                  # Offerte-configurator & FormSubmit AJAX-afhandeling
│   └── main.js                  # Navigatie, scroll spy en micro-interacties
└── assets/
    ├── images/
    │   ├── render-fallback.png  # Geëxtraheerde originele 2D render (fallback)
    │   ├── view-side.png        # Zijaanzicht 2D render
    │   ├── view-front.png       # Bovenaanzicht 2D render
    │   └── view-cap.png         # Render met afsluitdop
    └── models/                  # Optionele map voor externe CAD/GLTF modellen
```

---

## 🚀 1. Hoe werkt de website op GitHub Pages?

GitHub Pages is een uitstekende en gratis hostingomgeving voor deze website omdat:
- De website volledig **client-side** draait (HTML5, CSS3, ES6 JavaScript en WebGL).
- Er is geen backend of database nodig.
- Wereldwijde caching via Fastly CDN zorgt voor laadtijden onder 1 seconde.

### Stappenplan om online te zetten op GitHub Pages:
1. Maak een repository aan op GitHub (bijvoorbeeld: `oliesmeernippel` of `dms-osn`).
2. Upload of push alle bestanden van deze map naar de `main` branch.
3. Ga in je repository naar **Settings** -> **Pages** (in het linkermenu).
4. Onder **Build and deployment**:
   - **Source**: Kies `Deploy from a branch`.
   - **Branch**: Kies `main` en `/ (root)`.
   - Klik op **Save**.
5. Binnen 1-2 minuten staat je website live op:  
   `https://<jouw-gebruikersnaam>.github.io/<repository-naam>/`

*(Optioneel kun je onder "Custom domain" ook je eigen domeinnaam zoals `oliesmeernippel.be` koppelen).*

---

## ✉️ 2. Hoe werkt het aanvraagformulier via FormSubmit?

Het aanvraagformulier is geoptimaliseerd voor statische hosting zoals GitHub Pages:
- **AJAX JSON Submission (`fetch`)**: Bezoekers worden **niet** doorgestuurd naar de externe pagina van FormSubmit. Ze blijven op je website en zien direct een professionele bevestiging met hun e-mailadres.
- **Honeypot Spambeveiliging (`_honey`)**: Onzichtbaar veld voor bots, zodat spam wordt tegengehouden zonder bezoekers lastig te vallen met captchas (`_captcha=false`).
- **Live Configuratieoverzicht**: Terwijl de bezoeker draadmaat, aantal of materiaal kiest, toont de pagina direct een samenvatting van de selectie.

### Belangrijk: Eerste activatie van FormSubmit
Wanneer het eerste formulier wordt verzonden:
1. FormSubmit stuurt automatisch **éénmalig een activatiemail** naar `demeestersolutions@gmail.com`.
2. Klik in die mail op de knop **"Activate Form"**.
3. Vanaf dat moment komen alle offerteaanvragen direct netjes binnen in je inbox met alle velden in een overzichtelijke tabel.

---

## 🎮 3. De Interactieve 3D Viewer (Three.js)

In plaats van een statische afbeelding beschikt de website over een echte WebGL 3D viewer:
- **Vrij roteren & zoomen**: 360° orbit control met touch-ondersteuning voor mobiel en desktop.
- **Camerastanden**: Snelknoppen voor *3D Vrij*, *Zijaanzicht*, *Bovenaanzicht (Inbus)* en *Rietje-Insteek*.
- **Materiaal wisselen**: Real-time schakelen tussen **RVS304** en **RVS316** (met aangepaste reflecties en ruwheid).
- **Afsluitdop demonstratie**: Toont de blauwe metaaldetecteerbare polyamide veiligheidsdop op de nippel.
- **Rietje-insteek visualisatie**: Demonstreert hoe het rietje van een olie-aerosol in de conische insteekhoek grijpt en afdicht.
- **2D Render Fallback**: Bezoekers of browsers zonder WebGL kunnen met één klik terugvallen op de 2D gerenderde afbeeldingen.

---

## 💡 4. Advies over wat écht werkt voor B2B conversie

1. **Focus op de pijn van de klant (Vet = Slijtage)**:  
   Onderhoudsmonteurs en constructeurs weten vaak niet *waarom* hun lineaire wagens slijten. De nieuwe vergelijkingssectie (**"Waarom lineaire geleidingen kapot gaan op vet"**) overtuigt hen technisch dat droge olie superieur is.
2. **Staffelprijzen & duidelijke MOQ**:  
   B2B-klanten bestellen per verpakking (10, 50, 100 stuks). Door de verpakking en draadmaat al in het formulier te laten kiezen, krijg je direct gekwalificeerde leads.
3. **Food/Pharma Unique Selling Proposition**:  
   De blauwe metaaldetecteerbare dop is een enorme troef voor de voedingsmiddelen- en farmaceutische industrie. Dit staat nu prominent in de header, hero en specificaties vermeld.
