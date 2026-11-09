/**
 * Oliesmeernippel — De Meester Industries
 * Opbrengstmodel & ROI-Calculator (js/calculator.js)
 * 
 * Gebaseerd op het geverifieerde industriële rekenmodel (OM - Oliesmeernippel v1.xlsx).
 * Berekent de besparing op productverbruik, smeertijd, productiestilstand en spare parts.
 * Inclusief geavanceerde visuals: machine geleiding visualisator, radial payback gauge,
 * gestapelde kostenverdeling, 5-jaars TCO staafdiagram en directie-export.
 */

(function () {
  'use strict';

  // Benchmark standaardwaarden (rechtstreeks uit het gecontroleerde Excel-model)
  const BENCHMARKS = {
    // Smeerpunten / wagens
    smeerpunten: 1,

    // Huidige situatie (Smeervet patroon)
    vetPrijs: 36.0,          // € per patroon
    vetInhoud: 400.0,        // gram
    vetFrequentie: 14,       // dagen tussen smeerbeurten
    vetVolume: 6.0,          // gram per smeerbeurt
    vetTijd: 3.0,            // minuten per smeerbeurt

    // Toepassing met Oliesmeernippel (Droge olie aerosol)
    oliePrijs: 36.0,         // € per aerosol spuitbus
    olieInhoud: 500.0,       // milliliter
    olieFrequentie: 90,      // dagen tussen smeerbeurten
    olieVolume: 5.0,         // ml per smeerbeurt
    olieTijd: 2.0,           // minuten per smeerbeurt
    nippelPrijs: 35.0,       // € eenmalige investering per nippel

    // Arbeidstarieven
    tariefSmeerder: 52.0,    // € / uur voor smeertechnicus
    tariefMonteur: 65.0,     // € / uur voor mechanisch onderhoudstechnicus

    // Stilstand & Lagerschade
    stilstandKostUur: 10000.0, // € stilstandskost productielijn per uur
    hersteltijdUur: 3.0,       // hersteltijd per voorval in uren
    risicoVoorvallen: 2,       // aantal lagerschades / voorvallen per jaar
    sparePartsKost: 150.0,     // gemiddelde kostprijs vervangwagen / as per defect

    // Horizon
    jarenHorizon: 5
  };

  // Hulpfunctie voor nette Euro-formattering
  function formatEuro(amount, decimals = 0) {
    if (isNaN(amount) || !isFinite(amount)) return '€ 0';
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(amount);
  }

  function formatNumber(num, decimals = 1) {
    if (isNaN(num) || !isFinite(num)) return '0';
    return new Intl.NumberFormat('nl-NL', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  }

  function formatShortK(amount) {
    if (amount >= 1000000) return `€ ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `€ ${Math.round(amount / 1000)}k`;
    return `€ ${Math.round(amount)}`;
  }

  /**
   * Kerncalculatie volgens geverifieerd Excel-model
   */
  function calculateROI(params) {
    const p = Object.assign({}, BENCHMARKS, params);
    const n = Math.max(1, parseInt(p.smeerpunten, 10) || 1);

    // 1. Smeermiddel
    const beurtenVetPerJaar = 365.0 / p.vetFrequentie;
    const productKostVetJaar = ((p.vetPrijs / p.vetInhoud) * p.vetVolume * beurtenVetPerJaar) * n;

    const beurtenOliePerJaar = 365.0 / p.olieFrequentie;
    const productKostOlieJaar = ((p.oliePrijs / p.olieInhoud) * p.olieVolume * beurtenOliePerJaar) * n;
    const besparingProductJaar = productKostVetJaar - productKostOlieJaar;

    // 2. Tijdsbesteding / Arbeid
    const arbeidKostVetJaar = (beurtenVetPerJaar * (p.vetTijd / 60.0) * p.tariefSmeerder) * n;
    const arbeidKostOlieJaar = (beurtenOliePerJaar * (p.olieTijd / 60.0) * p.tariefSmeerder) * n;
    const besparingArbeidJaar = arbeidKostVetJaar - arbeidKostOlieJaar;

    // 3. Downtime & Herstel (per machine / productielijn)
    const stilstandEnHerstelKostVoorval = (p.stilstandKostUur * p.hersteltijdUur) + (p.hersteltijdUur * p.tariefMonteur);
    const downtimeKostVetJaar = stilstandEnHerstelKostVoorval * p.risicoVoorvallen;
    const downtimeKostOlieJaar = 0.0;
    const besparingDowntimeJaar = downtimeKostVetJaar - downtimeKostOlieJaar;

    // 4. Materiaal & Spare Parts (lineaire wagens / assen)
    const sparePartsKostVetJaar = p.sparePartsKost * p.risicoVoorvallen;
    const sparePartsKostOlieJaar = 0.0;
    const besparingSparePartsJaar = sparePartsKostVetJaar - sparePartsKostOlieJaar;

    // 5. Jaarlijkse totalen (OPEX)
    const totaleKostenVetJaar = productKostVetJaar + arbeidKostVetJaar + downtimeKostVetJaar + sparePartsKostVetJaar;
    const totaleKostenOlieJaar = productKostOlieJaar + arbeidKostOlieJaar + downtimeKostOlieJaar + sparePartsKostOlieJaar;
    const jaarlijkseBesparing = totaleKostenVetJaar - totaleKostenOlieJaar;

    // 6. Eenmalige investering (CAPEX)
    const eenmaligeInvestering = p.nippelPrijs * n;

    // 7. Terugverdientijd
    let terugverdientijdDagen = 0;
    let terugverdientijdUren = 0;
    if (jaarlijkseBesparing > 0) {
      terugverdientijdDagen = eenmaligeInvestering / (jaarlijkseBesparing / 365.0);
      terugverdientijdUren = terugverdientijdDagen * 24.0;
    }

    // 8. Meerjaren TCO (standaard 5 jaar)
    const horizon = Math.max(1, parseInt(p.jarenHorizon, 10) || 5);
    const tcoVetHorizon = totaleKostenVetJaar * horizon;
    const tcoOlieHorizon = (totaleKostenOlieJaar * horizon) + eenmaligeInvestering;
    const nettoWinstHorizon = tcoVetHorizon - tcoOlieHorizon;

    const roiPercentage = eenmaligeInvestering > 0 ? (nettoWinstHorizon / eenmaligeInvestering) * 100 : 0;

    return {
      smeerpunten: n,
      beurtenVetPerJaar,
      beurtenOliePerJaar,
      productKostVetJaar,
      productKostOlieJaar,
      besparingProductJaar,
      arbeidKostVetJaar,
      arbeidKostOlieJaar,
      besparingArbeidJaar,
      downtimeKostVetJaar,
      downtimeKostOlieJaar,
      besparingDowntimeJaar,
      sparePartsKostVetJaar,
      sparePartsKostOlieJaar,
      besparingSparePartsJaar,
      totaleKostenVetJaar,
      totaleKostenOlieJaar,
      jaarlijkseBesparing,
      eenmaligeInvestering,
      terugverdientijdDagen,
      terugverdientijdUren,
      horizon,
      tcoVetHorizon,
      tcoOlieHorizon,
      nettoWinstHorizon,
      roiPercentage
    };
  }

  // Initialisatie van de volledige calculator op test.html
  function initFullCalculator() {
    const calcEl = document.getElementById('roiCalculatorApp');
    if (!calcEl) return;

    // Invoerelementen
    const inputs = {
      smeerpunten: document.getElementById('calcSmeerpunten'),
      smeerpuntenSlider: document.getElementById('calcSmeerpuntenSlider'),
      stilstandKost: document.getElementById('calcStilstandKost'),
      voorvallen: document.getElementById('calcVoorvallen'),
      vetFrequentie: document.getElementById('calcVetFrequentie'),
      olieFrequentie: document.getElementById('calcOlieFrequentie'),
      hersteltijd: document.getElementById('calcHersteltijd'),
      sparePartsKost: document.getElementById('calcSparePartsKost'),
      tariefSmeerder: document.getElementById('calcTariefSmeerder'),
      tariefMonteur: document.getElementById('calcTariefMonteur'),
      nippelPrijs: document.getElementById('calcNippelPrijs')
    };

    // Weergave elementen
    const displays = {
      kpiJaarBesparing: document.getElementById('kpiJaarBesparing'),
      kpiTerugverdientijd: document.getElementById('kpiTerugverdientijd'),
      kpiTerugverdientijdSub: document.getElementById('kpiTerugverdientijdSub'),
      kpiNettoWinst5j: document.getElementById('kpiNettoWinst5j'),
      kpiInvestering: document.getElementById('kpiInvestering'),
      kpiRoiPercentage: document.getElementById('kpiRoiPercentage'),

      // Tabel cellen
      rowProductVet: document.getElementById('rowProductVet'),
      rowProductOlie: document.getElementById('rowProductOlie'),
      rowProductDiff: document.getElementById('rowProductDiff'),

      rowArbeidVet: document.getElementById('rowArbeidVet'),
      rowArbeidOlie: document.getElementById('rowArbeidOlie'),
      rowArbeidDiff: document.getElementById('rowArbeidDiff'),

      rowDowntimeVet: document.getElementById('rowDowntimeVet'),
      rowDowntimeOlie: document.getElementById('rowDowntimeOlie'),
      rowDowntimeDiff: document.getElementById('rowDowntimeDiff'),

      rowSpareVet: document.getElementById('rowSpareVet'),
      rowSpareOlie: document.getElementById('rowSpareOlie'),
      rowSpareDiff: document.getElementById('rowSpareDiff'),

      rowTotaalVet: document.getElementById('rowTotaalVet'),
      rowTotaalOlie: document.getElementById('rowTotaalOlie'),
      rowTotaalDiff: document.getElementById('rowTotaalDiff'),

      // 5-jaars balken
      barVetTco: document.getElementById('barVetTco'),
      barVetVal: document.getElementById('barVetVal'),
      barOlieTco: document.getElementById('barOlieTco'),
      barOlieVal: document.getElementById('barOlieVal'),

      // Nieuwe visuele elementen
      carriagesContainer: document.getElementById('carriagesContainer'),
      railStatusPill: document.getElementById('railStatusPill'),
      gaugeCircleVal: document.getElementById('gaugeCircleVal'),
      gaugeCenterNum: document.getElementById('gaugeCenterNum'),

      // Gestapelde balken
      stackedVetTotal: document.getElementById('stackedVetTotal'),
      stackedOlieTotal: document.getElementById('stackedOlieTotal'),
      segVetDowntime: document.getElementById('segVetDowntime'),
      segVetSpare: document.getElementById('segVetSpare'),
      segVetArbeid: document.getElementById('segVetArbeid'),
      segVetProduct: document.getElementById('segVetProduct'),

      // CTA offerte button
      btnToOfferte: document.getElementById('btnCalcToOfferte')
    };

    let latestRes = null;

    // Render visuele wagentjes op de rail
    function renderCarriages(n) {
      if (!displays.carriagesContainer) return;
      displays.carriagesContainer.innerHTML = '';

      if (displays.railStatusPill) {
        displays.railStatusPill.textContent = `${n} ${n === 1 ? 'smeerpunt' : 'smeerpunten'} beschermd`;
      }

      const maxIcons = 14;
      const count = Math.min(n, maxIcons);

      for (let i = 1; i <= count; i++) {
        const item = document.createElement('div');
        item.className = 'calc-carriage-icon';
        item.title = `Geleidewagen #${i} voorzien van Oliesmeernippel`;
        item.textContent = i;
        displays.carriagesContainer.appendChild(item);
      }

      if (n > maxIcons) {
        const more = document.createElement('span');
        more.className = 'calc-carriage-overflow';
        more.textContent = `+ nog ${n - maxIcons} wagens`;
        displays.carriagesContainer.appendChild(more);
      }
    }

    // Update Radial Payback Gauge
    function updateGauge(res) {
      if (!displays.gaugeCircleVal || !displays.gaugeCenterNum) return;

      const totalCirc = 251.2; // 2 * pi * 40

      if (res.terugverdientijdDagen < 1) {
        const uren = Math.round(res.terugverdientijdUren * 10) / 10;
        displays.gaugeCenterNum.textContent = `${uren}h`;
        // Zeer snelle ROI: ring bijna vol
        displays.gaugeCircleVal.style.strokeDashoffset = '20';
      } else {
        const dagen = Math.round(res.terugverdientijdDagen);
        displays.gaugeCenterNum.textContent = `${dagen}d`;
        const offset = Math.min(220, Math.max(30, dagen * 10));
        displays.gaugeCircleVal.style.strokeDashoffset = `${offset}`;
      }
    }

    // Update Gestapelde Kostenbalken
    function updateStackedBars(res) {
      if (displays.stackedVetTotal) displays.stackedVetTotal.textContent = `${formatEuro(res.totaleKostenVetJaar, 2)} / jr`;
      if (displays.stackedOlieTotal) displays.stackedOlieTotal.textContent = `${formatEuro(res.totaleKostenOlieJaar, 2)} / jr`;

      const tot = Math.max(res.totaleKostenVetJaar, 1);
      const pctDown = Math.max(0, (res.downtimeKostVetJaar / tot) * 100);
      const pctSpare = Math.max(0, (res.sparePartsKostVetJaar / tot) * 100);
      const pctArb = Math.max(0, (res.arbeidKostVetJaar / tot) * 100);
      const pctProd = Math.max(0, (res.productKostVetJaar / tot) * 100);

      if (displays.segVetDowntime) displays.segVetDowntime.style.width = `${pctDown}%`;
      if (displays.segVetSpare) displays.segVetSpare.style.width = `${pctSpare}%`;
      if (displays.segVetArbeid) displays.segVetArbeid.style.width = `${pctArb}%`;
      if (displays.segVetProduct) displays.segVetProduct.style.width = `${pctProd}%`;
    }

    // Update 5-Jaars Kolomgrafiek
    function update5yChart(res) {
      const max5yVet = res.totaleKostenVetJaar * 5;
      const maxTco = Math.max(max5yVet, 1);

      for (let y = 1; y <= 5; y++) {
        const vetCol = document.getElementById(`barVetY${y}`);
        const olieCol = document.getElementById(`barOlieY${y}`);
        const saveLbl = document.getElementById(`saveY${y}`);

        const cumVet = res.totaleKostenVetJaar * y;
        const cumOlie = (res.totaleKostenOlieJaar * y) + res.eenmaligeInvestering;
        const cumBesparing = cumVet - cumOlie;

        if (vetCol) {
          const pct = Math.min(100, Math.max(8, (cumVet / maxTco) * 100));
          vetCol.style.height = `${pct}%`;
          vetCol.title = `Vet Jaar ${y}: ${formatEuro(cumVet)}`;
        }

        if (olieCol) {
          const pctOlie = Math.min(100, Math.max(2, (cumOlie / maxTco) * 100));
          olieCol.style.height = `${pctOlie}%`;
          olieCol.title = `Oliesmeernippel Jaar ${y}: ${formatEuro(cumOlie)}`;
        }

        if (saveLbl) {
          saveLbl.textContent = `+ ${formatShortK(cumBesparing)}`;
        }
      }
    }

    function updateView() {
      const currentParams = {
        smeerpunten: inputs.smeerpunten ? parseInt(inputs.smeerpunten.value, 10) : BENCHMARKS.smeerpunten,
        stilstandKost: inputs.stilstandKost ? parseFloat(inputs.stilstandKost.value) : BENCHMARKS.stilstandKostUur,
        risicoVoorvallen: inputs.voorvallen ? parseFloat(inputs.voorvallen.value) : BENCHMARKS.risicoVoorvallen,
        vetFrequentie: inputs.vetFrequentie ? parseFloat(inputs.vetFrequentie.value) : BENCHMARKS.vetFrequentie,
        olieFrequentie: inputs.olieFrequentie ? parseFloat(inputs.olieFrequentie.value) : BENCHMARKS.olieFrequentie,
        hersteltijdUur: inputs.hersteltijd ? parseFloat(inputs.hersteltijd.value) : BENCHMARKS.hersteltijdUur,
        sparePartsKost: inputs.sparePartsKost ? parseFloat(inputs.sparePartsKost.value) : BENCHMARKS.sparePartsKost,
        tariefSmeerder: inputs.tariefSmeerder ? parseFloat(inputs.tariefSmeerder.value) : BENCHMARKS.tariefSmeerder,
        tariefMonteur: inputs.tariefMonteur ? parseFloat(inputs.tariefMonteur.value) : BENCHMARKS.tariefMonteur,
        nippelPrijs: inputs.nippelPrijs ? parseFloat(inputs.nippelPrijs.value) : BENCHMARKS.nippelPrijs
      };

      const res = calculateROI(currentParams);
      latestRes = res;

      // Render visuals
      renderCarriages(res.smeerpunten);
      updateGauge(res);
      updateStackedBars(res);
      update5yChart(res);

      // KPI updates
      if (displays.kpiJaarBesparing) {
        displays.kpiJaarBesparing.textContent = formatEuro(res.jaarlijkseBesparing);
      }

      if (displays.kpiTerugverdientijd) {
        if (res.terugverdientijdDagen < 1) {
          const uren = Math.round(res.terugverdientijdUren * 10) / 10;
          displays.kpiTerugverdientijd.textContent = `${uren} uur`;
          if (displays.kpiTerugverdientijdSub) {
            displays.kpiTerugverdientijdSub.textContent = `ca. ${formatNumber(res.terugverdientijdDagen, 2)} kalenderdag`;
          }
        } else {
          const dagen = Math.round(res.terugverdientijdDagen);
          displays.kpiTerugverdientijd.textContent = `${dagen} ${dagen === 1 ? 'dag' : 'dagen'}`;
          if (displays.kpiTerugverdientijdSub) {
            displays.kpiTerugverdientijdSub.textContent = `op basis van ${res.smeerpunten} smeerpunt(en)`;
          }
        }
      }

      if (displays.kpiNettoWinst5j) {
        displays.kpiNettoWinst5j.textContent = formatEuro(res.nettoWinstHorizon);
      }

      if (displays.kpiInvestering) {
        displays.kpiInvestering.textContent = formatEuro(res.eenmaligeInvestering);
      }

      if (displays.kpiRoiPercentage) {
        displays.kpiRoiPercentage.textContent = `${formatNumber(res.roiPercentage, 0)}%`;
      }

      // Tabel rijen
      if (displays.rowProductVet) displays.rowProductVet.textContent = formatEuro(res.productKostVetJaar, 2);
      if (displays.rowProductOlie) displays.rowProductOlie.textContent = formatEuro(res.productKostOlieJaar, 2);
      if (displays.rowProductDiff) displays.rowProductDiff.textContent = `- ${formatEuro(res.besparingProductJaar, 2)}`;

      if (displays.rowArbeidVet) displays.rowArbeidVet.textContent = formatEuro(res.arbeidKostVetJaar, 2);
      if (displays.rowArbeidOlie) displays.rowArbeidOlie.textContent = formatEuro(res.arbeidKostOlieJaar, 2);
      if (displays.rowArbeidDiff) displays.rowArbeidDiff.textContent = `- ${formatEuro(res.besparingArbeidJaar, 2)}`;

      if (displays.rowDowntimeVet) displays.rowDowntimeVet.textContent = formatEuro(res.downtimeKostVetJaar, 0);
      if (displays.rowDowntimeOlie) displays.rowDowntimeOlie.textContent = formatEuro(res.downtimeKostOlieJaar, 0);
      if (displays.rowDowntimeDiff) displays.rowDowntimeDiff.textContent = `- ${formatEuro(res.besparingDowntimeJaar, 0)}`;

      if (displays.rowSpareVet) displays.rowSpareVet.textContent = formatEuro(res.sparePartsKostVetJaar, 0);
      if (displays.rowSpareOlie) displays.rowSpareOlie.textContent = formatEuro(res.sparePartsKostOlieJaar, 0);
      if (displays.rowSpareDiff) displays.rowSpareDiff.textContent = `- ${formatEuro(res.besparingSparePartsJaar, 0)}`;

      if (displays.rowTotaalVet) displays.rowTotaalVet.textContent = formatEuro(res.totaleKostenVetJaar, 2);
      if (displays.rowTotaalOlie) displays.rowTotaalOlie.textContent = formatEuro(res.totaleKostenOlieJaar, 2);
      if (displays.rowTotaalDiff) displays.rowTotaalDiff.textContent = `- ${formatEuro(res.jaarlijkseBesparing, 2)}`;

      // Visuele TCO balken vergelijking
      if (displays.barVetTco && displays.barOlieTco) {
        const maxTco = Math.max(res.tcoVetHorizon, res.tcoOlieHorizon, 1);
        const pctVet = Math.min(100, Math.max(10, (res.tcoVetHorizon / maxTco) * 100));
        const pctOlie = Math.min(100, Math.max(4, (res.tcoOlieHorizon / maxTco) * 100));

        displays.barVetTco.style.width = `${pctVet}%`;
        displays.barOlieTco.style.width = `${pctOlie}%`;

        if (displays.barVetVal) displays.barVetVal.textContent = formatEuro(res.tcoVetHorizon);
        if (displays.barOlieVal) displays.barOlieVal.textContent = formatEuro(res.tcoOlieHorizon);
      }

      // Link naar offerte met berekend aantal
      if (displays.btnToOfferte) {
        displays.btnToOfferte.href = `offerte.html?aantal=${res.smeerpunten}`;
      }
    }

    // Koppel slider en numeriek veld voor smeerpunten
    if (inputs.smeerpunten && inputs.smeerpuntenSlider) {
      inputs.smeerpuntenSlider.addEventListener('input', function () {
        inputs.smeerpunten.value = this.value;
        updateView();
      });
      inputs.smeerpunten.addEventListener('input', function () {
        inputs.smeerpuntenSlider.value = this.value;
        updateView();
      });
    }

    // Luister naar alle invoervelden
    Object.keys(inputs).forEach(key => {
      const el = inputs[key];
      if (el && key !== 'smeerpunten' && key !== 'smeerpuntenSlider') {
        el.addEventListener('input', updateView);
      }
    });

    // Reset knop
    const btnReset = document.getElementById('btnResetCalc');
    if (btnReset) {
      btnReset.addEventListener('click', function () {
        if (inputs.smeerpunten) inputs.smeerpunten.value = BENCHMARKS.smeerpunten;
        if (inputs.smeerpuntenSlider) inputs.smeerpuntenSlider.value = BENCHMARKS.smeerpunten;
        if (inputs.stilstandKost) inputs.stilstandKost.value = BENCHMARKS.stilstandKostUur;
        if (inputs.voorvallen) inputs.voorvallen.value = BENCHMARKS.risicoVoorvallen;
        if (inputs.vetFrequentie) inputs.vetFrequentie.value = BENCHMARKS.vetFrequentie;
        if (inputs.olieFrequentie) inputs.olieFrequentie.value = BENCHMARKS.olieFrequentie;
        if (inputs.hersteltijd) inputs.hersteltijd.value = BENCHMARKS.hersteltijdUur;
        if (inputs.sparePartsKost) inputs.sparePartsKost.value = BENCHMARKS.sparePartsKost;
        if (inputs.tariefSmeerder) inputs.tariefSmeerder.value = BENCHMARKS.tariefSmeerder;
        if (inputs.tariefMonteur) inputs.tariefMonteur.value = BENCHMARKS.tariefMonteur;
        if (inputs.nippelPrijs) inputs.nippelPrijs.value = BENCHMARKS.nippelPrijs;
        updateView();
      });
    }

    // Preset knoppen (bijv. 1 wagen, 4 wagens, 12 wagens, 30 wagens)
    const presetButtons = document.querySelectorAll('[data-calc-preset]');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const val = parseInt(this.getAttribute('data-calc-preset'), 10);
        if (!isNaN(val) && inputs.smeerpunten) {
          inputs.smeerpunten.value = val;
          if (inputs.smeerpuntenSlider) inputs.smeerpuntenSlider.value = val;
          presetButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          updateView();
        }
      });
    });

    // Tabbladen navigatie
    const tabButtons = document.querySelectorAll('[data-calc-tab]');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const targetId = this.getAttribute('data-calc-tab');
        tabButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.calc-tab-pane').forEach(p => p.classList.remove('active'));
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Klembord samenvatting kopiëren voor directie / management
    const btnCopy = document.getElementById('btnCopySummary');
    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        if (!latestRes) return;
        const text = `BUSINESS CASE OVERSTAP NAAR DROGE OLIE (OLIESMEERNIPPEL)
Organisatie / Machine: ${latestRes.smeerpunten} smeerpunt(en)
-----------------------------------------------------------
• Jaarlijkse kostenbesparing (OPEX): ${formatEuro(latestRes.jaarlijkseBesparing)}
• Terugverdientijd investering: ${latestRes.terugverdientijdDagen < 1 ? Math.round(latestRes.terugverdientijdUren * 10) / 10 + ' uur' : Math.round(latestRes.terugverdientijdDagen) + ' dagen'}
• Netto 5-jaars voordeel (TCO): ${formatEuro(latestRes.nettoWinstHorizon)}
• Eenmalige investering: ${formatEuro(latestRes.eenmaligeInvestering)}

KOSTENVERGELIJKING PER JAAR:
- Smeermiddel: ${formatEuro(latestRes.productKostVetJaar)} (Vet) vs ${formatEuro(latestRes.productKostOlieJaar)} (Droge olie)
- Smeertijd/Arbeid: ${formatEuro(latestRes.arbeidKostVetJaar)} vs ${formatEuro(latestRes.arbeidKostOlieJaar)}
- Vermeden Lijnstilstand: ${formatEuro(latestRes.downtimeKostVetJaar)} per jaar
- Vermeden Lagerschades: ${formatEuro(latestRes.sparePartsKostVetJaar)} per jaar

Gegenereerd via https://appkengit.github.io/DMS-OSN/test.html`;

        navigator.clipboard.writeText(text).then(() => {
          const lbl = document.getElementById('btnCopyText');
          if (lbl) {
            const old = lbl.textContent;
            lbl.textContent = 'Gekopieerd naar klembord! ✓';
            btnCopy.classList.add('copied');
            setTimeout(() => {
              lbl.textContent = old;
              btnCopy.classList.remove('copied');
            }, 3000);
          }
        }).catch(err => {
          alert('Kopiëren niet toegestaan door browser. Selecteer handmatig.');
        });
      });
    }

    // Initiële weergave
    updateView();
  }

  // Initialisatie van de compacte teaser calculator op index.html
  function initTeaserCalculator() {
    const teaserEl = document.getElementById('teaserRoiWidget');
    if (!teaserEl) return;

    const slider = document.getElementById('teaserPointsSlider');
    const pointsVal = document.getElementById('teaserPointsVal');
    const savingVal = document.getElementById('teaserSavingVal');
    const roiDaysVal = document.getElementById('teaserRoiDaysVal');
    const btnCta = document.getElementById('teaserBtnCta');

    function updateTeaser() {
      const points = parseInt(slider ? slider.value : 1, 10) || 1;
      if (pointsVal) pointsVal.textContent = points;

      const res = calculateROI({ smeerpunten: points });

      if (savingVal) savingVal.textContent = formatEuro(res.jaarlijkseBesparing);
      if (roiDaysVal) {
        if (res.terugverdientijdDagen < 1) {
          const uren = Math.round(res.terugverdientijdUren * 10) / 10;
          roiDaysVal.textContent = `< 1 dag (${uren}u)`;
        } else {
          roiDaysVal.textContent = `${Math.round(res.terugverdientijdDagen)} dagen`;
        }
      }

      if (btnCta) {
        btnCta.href = `test.html?smeerpunten=${points}#opbrengstmodel`;
      }
    }

    if (slider) {
      slider.addEventListener('input', updateTeaser);
      updateTeaser();
    }
  }

  // DOM ready dispatcher
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initFullCalculator();
      initTeaserCalculator();
    });
  } else {
    initFullCalculator();
    initTeaserCalculator();
  }

  // Exposeer globally voor inspectie
  window.OSN_ROI = {
    BENCHMARKS,
    calculateROI,
    formatEuro,
    formatNumber
  };
})();
