/**
 * Oliesmeernippel — De Meester Industries
 * Opbrengstmodel & ROI-Calculator (js/calculator.js)
 * 
 * Berekent de besparing op productverbruik, smeertijd, productiestilstand en spare parts.
 * Stukprijs Oliesmeernippel: € 25,50 excl. BTW per stuk.
 * Inclusief aanpasbaar vermijdingspercentage defecten (0 - 100%)
 * en dynamische terugverdienhorizon slider (1 - 10 jaar).
 */

(function () {
  'use strict';

  // Benchmark standaardwaarden (excl. BTW)
  const BENCHMARKS = {
    // Smeerpunten / wagens
    smeerpunten: 1,

    // Huidige situatie (Smeervet patroon)
    vetPrijs: 36.0,          // € per patroon (excl. BTW)
    vetInhoud: 400.0,        // gram
    vetFrequentie: 14,       // dagen tussen smeerbeurten
    vetVolume: 6.0,          // gram per smeerbeurt
    vetTijd: 3.0,            // minuten per smeerbeurt

    // Toepassing met Oliesmeernippel (Droge olie aerosol)
    oliePrijs: 36.0,         // € per aerosol spuitbus (excl. BTW)
    olieInhoud: 500.0,       // milliliter
    olieFrequentie: 90,      // dagen tussen smeerbeurten
    olieVolume: 5.0,         // ml per smeerbeurt
    olieTijd: 2.0,           // minuten per smeerbeurt
    nippelPrijs: 25.5,       // € eenmalige investering per nippel incl. dop (excl. BTW)

    // Arbeidstarieven
    tariefSmeerder: 52.0,    // € / uur voor smeertechnicus (excl. BTW)
    tariefMonteur: 65.0,     // € / uur voor mechanisch technicus (excl. BTW)

    // Stilstand & Lagerschade
    stilstandKostUur: 10000.0, // € stilstandskost productielijn per uur (excl. BTW)
    hersteltijdUur: 3.0,       // hersteltijd per voorval in uren
    risicoVoorvallen: 2,       // aantal lagerschades / voorvallen per jaar op vet
    sparePartsKost: 150.0,     // gemiddelde kostprijs vervangwagen / as per defect (excl. BTW)

    // Percentage vermeden defecten met droge olie (0 - 100%)
    reductiePercentage: 100,

    // Horizon in jaren (1 - 10 jaar)
    jarenHorizon: 5
  };

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
   * Kerncalculatie volgens gecorrigeerd model
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
    const reductiePct = Math.min(100, Math.max(0, parseFloat(p.reductiePercentage) || 0));
    const vermedenVoorvallen = p.risicoVoorvallen * (reductiePct / 100.0);
    const resterendeVoorvallen = p.risicoVoorvallen - vermedenVoorvallen;

    const stilstandEnHerstelKostVoorval = (p.stilstandKostUur * p.hersteltijdUur) + (p.hersteltijdUur * p.tariefMonteur);
    const downtimeKostVetJaar = stilstandEnHerstelKostVoorval * p.risicoVoorvallen;
    const downtimeKostOlieJaar = stilstandEnHerstelKostVoorval * resterendeVoorvallen;
    const besparingDowntimeJaar = downtimeKostVetJaar - downtimeKostOlieJaar;

    // 4. Materiaal & Spare Parts (lineaire wagens / assen)
    const sparePartsKostVetJaar = p.sparePartsKost * p.risicoVoorvallen;
    const sparePartsKostOlieJaar = p.sparePartsKost * resterendeVoorvallen;
    const besparingSparePartsJaar = sparePartsKostVetJaar - sparePartsKostOlieJaar;

    // 5. Jaarlijkse totalen (OPEX)
    const totaleKostenVetJaar = productKostVetJaar + arbeidKostVetJaar + downtimeKostVetJaar + sparePartsKostVetJaar;
    const totaleKostenOlieJaar = productKostOlieJaar + arbeidKostOlieJaar + downtimeKostOlieJaar + sparePartsKostOlieJaar;
    const jaarlijkseBesparing = totaleKostenVetJaar - totaleKostenOlieJaar;

    // 6. Eenmalige investering (CAPEX: € 25,50 per nippel incl. dop excl. BTW)
    const eenmaligeInvestering = (parseFloat(p.nippelPrijs) || 25.5) * n;

    // 7. Terugverdientijd
    let terugverdientijdDagen = 0;
    let terugverdientijdUren = 0;
    if (jaarlijkseBesparing > 0) {
      terugverdientijdDagen = eenmaligeInvestering / (jaarlijkseBesparing / 365.0);
      terugverdientijdUren = terugverdientijdDagen * 24.0;
    }

    // 8. Meerjaren TCO op basis van gekozen horizon
    const horizon = Math.min(10, Math.max(1, parseInt(p.jarenHorizon, 10) || 5));
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
      reductiePct,
      vermedenVoorvallen,
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

  // Initialisatie van de volledige calculator
  function initFullCalculator() {
    const calcEl = document.getElementById('roiCalculatorApp');
    if (!calcEl) return;

    // Invoerelementen
    const inputs = {
      smeerpunten: document.getElementById('calcSmeerpunten'),
      smeerpuntenSlider: document.getElementById('calcSmeerpuntenSlider'),
      stilstandKost: document.getElementById('calcStilstandKost'),
      voorvallen: document.getElementById('calcVoorvallen'),
      reductiePct: document.getElementById('calcReductiePct'),
      reductiePctSlider: document.getElementById('calcReductiePctSlider'),
      reductiePctDisplay: document.getElementById('reductiePctDisplay'),
      jarenHorizon: document.getElementById('calcJarenHorizon'),
      jarenHorizonSlider: document.getElementById('calcJarenHorizonSlider'),
      jarenHorizonDisplay: document.getElementById('jarenHorizonDisplay'),
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
      kpiNettoWinstLabel: document.getElementById('kpiNettoWinstLabel'),
      kpiInvestering: document.getElementById('kpiInvestering'),

      // Tabel cellen
      rowSubtotalVet: document.getElementById('rowSubtotalVet'),
      rowSubtotalOlie: document.getElementById('rowSubtotalOlie'),
      rowSubtotalDiff: document.getElementById('rowSubtotalDiff'),
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

      // Nieuwe nippel-aanschaf in tabel
      rowNippelVet: document.getElementById('rowNippelVet'),
      rowNippelOlie: document.getElementById('rowNippelOlie'),
      rowNippelDiff: document.getElementById('rowNippelDiff'),

      rowTotalLabel: document.getElementById('rowTotalLabel'),
      rowTotaalVet: document.getElementById('rowTotaalVet'),
      rowTotaalOlie: document.getElementById('rowTotaalOlie'),
      rowTotaalDiff: document.getElementById('rowTotaalDiff'),

      // 5-jaars / horizon balken en titels
      tcoChartTitle: document.getElementById('tcoChartTitle'),
      tco5yColumns: document.getElementById('tco5yColumns'),
      tcoVisualTitle: document.getElementById('tcoVisualTitle'),
      barVetLabel: document.getElementById('barVetLabel'),
      barOlieLabel: document.getElementById('barOlieLabel'),
      barVetTco: document.getElementById('barVetTco'),
      barVetVal: document.getElementById('barVetVal'),
      barOlieTco: document.getElementById('barOlieTco'),
      barOlieVal: document.getElementById('barOlieVal'),

      // Gauge

      // Gestapelde balken
      stackedVetTotal: document.getElementById('stackedVetTotal'),
      stackedOlieTotal: document.getElementById('stackedOlieTotal'),
      segVetDowntime: document.getElementById('segVetDowntime'),
      segVetSpare: document.getElementById('segVetSpare'),
      segVetArbeid: document.getElementById('segVetArbeid'),
      segVetProduct: document.getElementById('segVetProduct'),
      segOlieClean: document.getElementById('segOlieClean'),
      segOlieNippel: document.getElementById('segOlieNippel'),
      legendNippelText: document.getElementById('legendNippelText'),

      // CTA offerte button
      btnToOfferte: document.getElementById('btnCalcToOfferte')
    };

    let latestRes = null;


    // Update Gestapelde Kostenbalken
    function updateStackedBars(res) {
      if (displays.stackedVetTotal) displays.stackedVetTotal.textContent = `${formatEuro(res.totaleKostenVetJaar, 2)} / jr`;
      if (displays.stackedOlieTotal) {
        displays.stackedOlieTotal.textContent = `${formatEuro(res.totaleKostenOlieJaar, 2)} / jr (+ ${formatEuro(res.eenmaligeInvestering, 2)} aanschaf)`;
      }

      const tot = Math.max(res.totaleKostenVetJaar, 1);
      const pctDown = Math.max(0, (res.downtimeKostVetJaar / tot) * 100);
      const pctSpare = Math.max(0, (res.sparePartsKostVetJaar / tot) * 100);
      const pctArb = Math.max(0, (res.arbeidKostVetJaar / tot) * 100);
      const pctProd = Math.max(0, (res.productKostVetJaar / tot) * 100);

      if (displays.segVetDowntime) displays.segVetDowntime.style.width = `${pctDown}%`;
      if (displays.segVetSpare) displays.segVetSpare.style.width = `${pctSpare}%`;
      if (displays.segVetArbeid) displays.segVetArbeid.style.width = `${pctArb}%`;
      if (displays.segVetProduct) displays.segVetProduct.style.width = `${pctProd}%`;

      if (displays.segOlieClean) {
        const olieTotPct = Math.min(100, Math.max(1, (res.totaleKostenOlieJaar / tot) * 100));
        displays.segOlieClean.style.width = `${olieTotPct}%`;
      }
      if (displays.segOlieNippel) {
        const nippelPct = Math.min(100, Math.max(1.5, (res.eenmaligeInvestering / tot) * 100));
        displays.segOlieNippel.style.width = `${nippelPct}%`;
      }
      if (displays.legendNippelText) {
        displays.legendNippelText.textContent = `Aanschaf ${res.smeerpunten} nippel(s) (${formatEuro(res.eenmaligeInvestering, 2)})`;
      }
    }

    // Dynamisch renderen van de TCO Kolomgrafiek gebaseerd op de gekozen horizon (1 - 10 jaar)
    function updateDynamicTcoChart(res) {
      if (displays.tcoChartTitle) {
        displays.tcoChartTitle.textContent = `Cumulatieve Kostenopbouw excl. BTW (Jaar 1 t/m Jaar ${res.horizon})`;
      }

      if (!displays.tco5yColumns) return;
      displays.tco5yColumns.innerHTML = '';
      displays.tco5yColumns.style.gridTemplateColumns = `repeat(${res.horizon}, 1fr)`;

      const maxCumVet = res.totaleKostenVetJaar * res.horizon;
      const maxTco = Math.max(maxCumVet, 1);

      for (let y = 1; y <= res.horizon; y++) {
        const cumVet = res.totaleKostenVetJaar * y;
        const cumOlie = (res.totaleKostenOlieJaar * y) + res.eenmaligeInvestering;
        const cumBesparing = cumVet - cumOlie;

        const pctVet = Math.min(100, Math.max(8, (cumVet / maxTco) * 100));
        const pctOlie = Math.min(100, Math.max(2, (cumOlie / maxTco) * 100));

        const col = document.createElement('div');
        col.className = 'tco-year-col';
        col.innerHTML = `
          <span class="tco-col-saving">+ ${formatShortK(cumBesparing)}</span>
          <div class="tco-bars-pair">
            <div class="bar-5y vet" style="height: ${pctVet}%;" title="Vet Jaar ${y}: ${formatEuro(cumVet)}"></div>
            <div class="bar-5y olie" style="height: ${pctOlie}%;" title="Oliesmeernippel Jaar ${y}: ${formatEuro(cumOlie)}"></div>
          </div>
          <span class="tco-year-label">J${y}</span>
        `;
        displays.tco5yColumns.appendChild(col);
      }
    }

    function updateView() {
      const redVal = inputs.reductiePct ? parseFloat(inputs.reductiePct.value) : BENCHMARKS.reductiePercentage;
      if (inputs.reductiePctDisplay) {
        inputs.reductiePctDisplay.textContent = `${Math.round(redVal)}%`;
      }

      const horVal = inputs.jarenHorizon ? parseInt(inputs.jarenHorizon.value, 10) : BENCHMARKS.jarenHorizon;
      if (inputs.jarenHorizonDisplay) {
        inputs.jarenHorizonDisplay.textContent = `${horVal} ${horVal === 1 ? 'jaar' : 'jaar'}`;
      }

      const currentParams = {
        smeerpunten: inputs.smeerpunten ? parseInt(inputs.smeerpunten.value, 10) : BENCHMARKS.smeerpunten,
        stilstandKost: inputs.stilstandKost ? parseFloat(inputs.stilstandKost.value) : BENCHMARKS.stilstandKostUur,
        risicoVoorvallen: inputs.voorvallen ? parseFloat(inputs.voorvallen.value) : BENCHMARKS.risicoVoorvallen,
        reductiePercentage: redVal,
        jarenHorizon: horVal,
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
      updateStackedBars(res);
      updateDynamicTcoChart(res);

      // KPI updates
      if (displays.kpiJaarBesparing) {
        displays.kpiJaarBesparing.textContent = formatEuro(res.jaarlijkseBesparing);
      }

      if (displays.kpiTerugverdientijd) {
        if (res.terugverdientijdDagen < 1) {
          const uren = Math.round(res.terugverdientijdUren * 10) / 10;
          displays.kpiTerugverdientijd.textContent = `${uren} uur`;
          if (displays.kpiTerugverdientijdSub) {
            displays.kpiTerugverdientijdSub.textContent = `op basis van ${formatEuro(res.eenmaligeInvestering, 2)} aanschaf`;
          }
        } else {
          const dagen = Math.round(res.terugverdientijdDagen);
          displays.kpiTerugverdientijd.textContent = `${dagen} ${dagen === 1 ? 'dag' : 'dagen'}`;
          if (displays.kpiTerugverdientijdSub) {
            displays.kpiTerugverdientijdSub.textContent = `op basis van ${res.smeerpunten} smeerpunt(en)`;
          }
        }
      }

      if (displays.kpiNettoWinstLabel) {
        displays.kpiNettoWinstLabel.textContent = `Netto Voordeel (${res.horizon} Jaar TCO) · excl. BTW`;
      }

      if (displays.kpiNettoWinst5j) {
        displays.kpiNettoWinst5j.textContent = formatEuro(res.nettoWinstHorizon);
      }

      if (displays.kpiInvestering) {
        displays.kpiInvestering.textContent = formatEuro(res.eenmaligeInvestering, 2);
      }


      // Tabel rijen
      if (displays.rowSubtotalVet) displays.rowSubtotalVet.textContent = formatEuro(res.totaleKostenVetJaar, 2);
      if (displays.rowSubtotalOlie) displays.rowSubtotalOlie.textContent = formatEuro(res.totaleKostenOlieJaar, 2);
      if (displays.rowSubtotalDiff) displays.rowSubtotalDiff.textContent = `- ${formatEuro(res.jaarlijkseBesparing, 2)} / jr`;

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

      // Aanschaf oliesmeernippel in de tabel
      if (displays.rowNippelVet) displays.rowNippelVet.textContent = '€ 0,00';
      if (displays.rowNippelOlie) displays.rowNippelOlie.textContent = formatEuro(res.eenmaligeInvestering, 2);
      if (displays.rowNippelDiff) displays.rowNippelDiff.textContent = `+ ${formatEuro(res.eenmaligeInvestering, 2)} (eenmalig)`;

      if (displays.rowTotalLabel) {
        displays.rowTotalLabel.textContent = `C. Totale Kosten na ${res.horizon} jaar (TCO incl. aanschaf)`;
      }

      if (displays.rowTotaalVet) displays.rowTotaalVet.textContent = formatEuro(res.tcoVetHorizon, 2);
      if (displays.rowTotaalOlie) displays.rowTotaalOlie.textContent = formatEuro(res.tcoOlieHorizon, 2);
      if (displays.rowTotaalDiff) displays.rowTotaalDiff.textContent = `- ${formatEuro(res.nettoWinstHorizon, 2)}`;

      // Visuele TCO balken vergelijking
      if (displays.tcoVisualTitle) {
        displays.tcoVisualTitle.textContent = `${res.horizon}-Jaars TCO Eindstand (excl. BTW)`;
      }
      if (displays.barVetLabel) {
        displays.barVetLabel.textContent = `Traditioneel Smeervet (${res.horizon} jaar)`;
      }
      if (displays.barOlieLabel) {
        displays.barOlieLabel.textContent = `Oliesmeernippel + Droge Olie (${res.horizon} jaar)`;
      }

      if (displays.barVetTco && displays.barOlieTco) {
        const maxTco = Math.max(res.tcoVetHorizon, res.tcoOlieHorizon, 1);
        const pctVet = Math.min(100, Math.max(10, (res.tcoVetHorizon / maxTco) * 100));
        const pctOlie = Math.min(100, Math.max(2, (res.tcoOlieHorizon / maxTco) * 100));

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

    // Koppel slider en numeriek veld voor vermijdingspercentage
    if (inputs.reductiePct && inputs.reductiePctSlider) {
      inputs.reductiePctSlider.addEventListener('input', function () {
        inputs.reductiePct.value = this.value;
        updateView();
      });
      inputs.reductiePct.addEventListener('input', function () {
        inputs.reductiePctSlider.value = this.value;
        updateView();
      });
    }

    // Koppel slider en numeriek veld voor horizon jaren
    if (inputs.jarenHorizon && inputs.jarenHorizonSlider) {
      inputs.jarenHorizonSlider.addEventListener('input', function () {
        inputs.jarenHorizon.value = this.value;
        updateView();
      });
      inputs.jarenHorizon.addEventListener('input', function () {
        inputs.jarenHorizonSlider.value = this.value;
        updateView();
      });
    }

    // Luister naar alle invoervelden
    Object.keys(inputs).forEach(key => {
      const el = inputs[key];
      if (el && !['smeerpunten', 'smeerpuntenSlider', 'reductiePct', 'reductiePctSlider', 'jarenHorizon', 'jarenHorizonSlider'].includes(key)) {
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
        if (inputs.reductiePct) inputs.reductiePct.value = BENCHMARKS.reductiePercentage;
        if (inputs.reductiePctSlider) inputs.reductiePctSlider.value = BENCHMARKS.reductiePercentage;
        if (inputs.jarenHorizon) inputs.jarenHorizon.value = BENCHMARKS.jarenHorizon;
        if (inputs.jarenHorizonSlider) inputs.jarenHorizonSlider.value = BENCHMARKS.jarenHorizon;
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

    // Preset knoppen
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
Bedragen zijn exclusief BTW
Organisatie / Machine: ${latestRes.smeerpunten} smeerpunt(en)
Berekende tijdshorizon: ${latestRes.horizon} jaar
Vermijdingspercentage defecten: ${latestRes.reductiePct}%
-----------------------------------------------------------
• Jaarlijkse kostenbesparing (OPEX): ${formatEuro(latestRes.jaarlijkseBesparing)} excl. BTW / jaar
• Terugverdientijd investering: ${latestRes.terugverdientijdDagen < 1 ? Math.round(latestRes.terugverdientijdUren * 10) / 10 + ' uur' : Math.round(latestRes.terugverdientijdDagen) + ' dagen'}
• Netto ${latestRes.horizon}-jaars voordeel (TCO): ${formatEuro(latestRes.nettoWinstHorizon)} excl. BTW
• Eenmalige investering: ${formatEuro(latestRes.eenmaligeInvestering, 2)} excl. BTW (€ 25,50 / stuk)

KOSTENVERGELIJKING (excl. BTW):
- Smeermiddel: ${formatEuro(latestRes.productKostVetJaar)} (Vet) vs ${formatEuro(latestRes.productKostOlieJaar)} (Droge olie) per jaar
- Smeertijd/Arbeid: ${formatEuro(latestRes.arbeidKostVetJaar)} vs ${formatEuro(latestRes.arbeidKostOlieJaar)} per jaar
- Vermeden Lijnstilstand: ${formatEuro(latestRes.besparingDowntimeJaar)} per jaar
- Vermeden Lagerschades: ${formatEuro(latestRes.besparingSparePartsJaar)} per jaar
- Eenmalige aanschaf Oliesmeernippel(s): ${formatEuro(latestRes.eenmaligeInvestering, 2)}

Gegenereerd via https://appkengit.github.io/DMS-OSN/calculator.html`;

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
        btnCta.href = `calculator.html?smeerpunten=${points}`;
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
