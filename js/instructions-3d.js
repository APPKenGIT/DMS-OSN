/**
 * Oliesmeernippel — Interactive 3D Instruction Sequences (Three.js)
 * De Meester Industries
 * 
 * Animation 1: Montagehandleiding (Inschroeven op zwaluwstaart met inbus 4 & dop)
 * Animation 2: Smeerinstructie (Dop afnemen, aerosol-rietje diep insteken, doseren, dop terug)
 */

(function () {
  'use strict';

  let scene, camera, renderer, controls;
  let animContainer, animCanvas;
  let activeTab = 'montage'; // 'montage' | 'smering'
  let isPlaying = true;
  let animProgress = 0; // 0 to 1
  let animSpeed = 1.0;
  let animDuration = 11.0; // seconds for full cycle
  let lastTime = performance.now();
  let animationFrameId = null;

  // Scene Objects
  let worldGroup;
  let railMesh, carriageMesh;
  let nippleAssembly, nippelMesh, capMesh;
  let allenKeyGroup, aerosolGroup, sprayParticles;

  // Materials
  let matSteelBrushed, matCarriage, matRail, matNipple, matCapBlue, matAllenKey, matAerosolCan, matSpray, matStraw;

  function init() {
    animContainer = document.getElementById('instructionsCanvasWrap');
    animCanvas = document.getElementById('instructionsCanvas');
    if (!animContainer || !animCanvas) return;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF9FAFB);
    scene.fog = new THREE.Fog(0xF9FAFB, 60, 180);

    // 2. Camera
    const aspect = animContainer.clientWidth / Math.max(1, animContainer.clientHeight);
    camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 250);
    camera.position.set(28, 22, 34);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: animCanvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(animContainer.clientWidth, animContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 12.0;
      controls.maxDistance = 75.0;
      controls.maxPolarAngle = Math.PI * 0.88;
      controls.target.set(0, 7.5, 0);
    }

    // 5. Lighting
    setupLighting();

    // 6. Materials
    setupMaterials();

    // 7. Build Assembly & Equipment
    buildMechanicalScene();

    // 8. Event listeners
    window.addEventListener('resize', onResize);
    setupControlsUI();

    // 9. Start loop
    lastTime = performance.now();
    animate();
  }

  function setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xC4CBD4, 1.1);
    hemiLight.position.set(0, 40, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.3);
    keyLight.position.set(20, 35, 25);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 100;
    keyLight.shadow.camera.left = -25;
    keyLight.shadow.camera.right = 25;
    keyLight.shadow.camera.top = 25;
    keyLight.shadow.camera.bottom = -25;
    keyLight.shadow.bias = -0.0003;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xE5A024, 0.4);
    rimLight.position.set(-20, 18, -20);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x94A3B8, 0.5);
    fillLight.position.set(0, -5, 25);
    scene.add(fillLight);
  }

  function setupMaterials() {
    // Ground rail steel (dovetail guide)
    matRail = new THREE.MeshStandardMaterial({
      color: 0xBAC2CB,
      metalness: 0.85,
      roughness: 0.32
    });

    // Precision carriage block (lineaire wagen)
    matCarriage = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.75,
      roughness: 0.28
    });

    // Oliesmeernippel RVS304
    matNipple = new THREE.MeshStandardMaterial({
      color: 0xDCE0E5,
      metalness: 0.90,
      roughness: 0.22
    });

    // Polyamide Metal-Detectable Cap (Signal Safety Blue)
    matCapBlue = new THREE.MeshStandardMaterial({
      color: 0x1A6BC4,
      metalness: 0.08,
      roughness: 0.38,
      clearcoat: 0.4
    });

    // Inbussleutel maat 4 (Chrome-Vanadium steel)
    matAllenKey = new THREE.MeshStandardMaterial({
      color: 0x2A313A,
      metalness: 0.92,
      roughness: 0.25
    });

    // Aerosol can
    matAerosolCan = new THREE.MeshStandardMaterial({
      color: 0xE2E8F0,
      metalness: 0.70,
      roughness: 0.25
    });

    // Straw (Technical Red)
    matStraw = new THREE.MeshStandardMaterial({
      color: 0xDE3628,
      metalness: 0.05,
      roughness: 0.32
    });

    // Spray mist
    matSpray = new THREE.MeshBasicMaterial({
      color: 0xFFFBF0,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
  }

  function buildMechanicalScene() {
    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    // A. Dovetail Rail (Lineaire zwaluwstaartgeleiding)
    const railLength = 54;
    const railShape = new THREE.Shape();
    // Dovetail profile: wider base, angled undercuts
    railShape.moveTo(-11, 0);
    railShape.lineTo(11, 0);
    railShape.lineTo(8.5, 6.5);
    railShape.lineTo(-8.5, 6.5);
    railShape.closePath();

    const railGeo = new THREE.ExtrudeGeometry(railShape, {
      depth: railLength,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.3,
      bevelThickness: 0.3
    });
    railGeo.center();
    railMesh = new THREE.Mesh(railGeo, matRail);
    railMesh.rotation.y = Math.PI / 2;
    railMesh.position.set(0, 3.4, 0);
    railMesh.castShadow = true;
    railMesh.receiveShadow = true;
    worldGroup.add(railMesh);

    // Rail mounting holes
    for (let z = -20; z <= 20; z += 13.3) {
      const holeGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.2, 16);
      const holeMat = new THREE.MeshBasicMaterial({ color: 0x1E293B });
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(0, 6.6, z);
      worldGroup.add(hole);
    }

    // B. Linear Carriage Block (Zwaluwstaart loopwagen)
    const carriageWidth = 22;
    const carriageHeight = 8;
    const carriageDepth = 24;
    const carriageGeo = new THREE.BoxGeometry(carriageWidth, carriageHeight, carriageDepth);
    carriageMesh = new THREE.Mesh(carriageGeo, matCarriage);
    carriageMesh.position.set(0, 8.5, 0);
    carriageMesh.castShadow = true;
    carriageMesh.receiveShadow = true;
    worldGroup.add(carriageMesh);

    // Carriage threaded port hole (M6 smeerpoort)
    const portGeo = new THREE.CylinderGeometry(2.2, 2.2, 2.2, 24);
    const portMat = new THREE.MeshBasicMaterial({ color: 0x0F172A });
    const port = new THREE.Mesh(portGeo, portMat);
    port.position.set(0, 12.5, 0);
    worldGroup.add(port);

    // Carriage front wiper plate
    const wiperGeo = new THREE.BoxGeometry(carriageWidth + 0.4, carriageHeight + 0.4, 1.2);
    const matWiper = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.8 });
    const wiper1 = new THREE.Mesh(wiperGeo, matWiper);
    wiper1.position.set(0, 8.5, carriageDepth / 2 + 0.6);
    const wiper2 = new THREE.Mesh(wiperGeo, matWiper);
    wiper2.position.set(0, 8.5, -carriageDepth / 2 - 0.6);
    worldGroup.add(wiper1);
    worldGroup.add(wiper2);

    // C. Oliesmeernippel Group
    nippleAssembly = new THREE.Group();
    worldGroup.add(nippleAssembly);

    // 1. Nipple body (hex head, threaded shank, bore)
    nippelMesh = new THREE.Group();
    // Head with inbus socket
    const headGeo = new THREE.CylinderGeometry(2.7, 2.7, 3.2, 6);
    const head = new THREE.Mesh(headGeo, matNipple);
    head.position.y = 1.6;
    head.castShadow = true;
    nippelMesh.add(head);

    // Threaded shank
    const shankGeo = new THREE.CylinderGeometry(2.1, 2.1, 4.6, 24);
    const shank = new THREE.Mesh(shankGeo, matNipple);
    shank.position.y = -2.3;
    shank.castShadow = true;
    nippelMesh.add(shank);

    // Internal Inbus cavity (hex socket maat 4)
    const inbusHoleGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.0, 6);
    const matDarkCavity = new THREE.MeshBasicMaterial({ color: 0x181B1F });
    const inbusHole = new THREE.Mesh(inbusHoleGeo, matDarkCavity);
    inbusHole.position.y = 2.4;
    nippelMesh.add(inbusHole);

    // Central bore for straw
    const boreHoleGeo = new THREE.CylinderGeometry(0.75, 0.75, 5.0, 16);
    const boreHole = new THREE.Mesh(boreHoleGeo, matDarkCavity);
    boreHole.position.y = 0.5;
    nippelMesh.add(boreHole);

    nippleAssembly.add(nippelMesh);

    // 2. Afsluitdop (polyamide blue cap)
    capMesh = new THREE.Group();
    const capSleeveGeo = new THREE.CylinderGeometry(3.6, 3.6, 4.0, 32);
    const capSleeve = new THREE.Mesh(capSleeveGeo, matCapBlue);
    capSleeve.position.y = 2.0;
    capSleeve.castShadow = true;
    capMesh.add(capSleeve);

    const capTopGeo = new THREE.CylinderGeometry(4.4, 4.4, 0.8, 32);
    const capTop = new THREE.Mesh(capTopGeo, matCapBlue);
    capTop.position.y = 4.4;
    capTop.castShadow = true;
    capMesh.add(capTop);

    nippleAssembly.add(capMesh);

    // D. Inbussleutel Maat Metrisch 4 (Allen Key 4mm)
    allenKeyGroup = new THREE.Group();
    // Hexagonal L-key (short leg down into socket, long handle out for turning)
    const keyLegGeo = new THREE.CylinderGeometry(1.5, 1.5, 12, 6);
    const keyLeg = new THREE.Mesh(keyLegGeo, matAllenKey);
    keyLeg.position.y = 6;
    keyLeg.castShadow = true;
    allenKeyGroup.add(keyLeg);

    const keyHandleGeo = new THREE.CylinderGeometry(1.5, 1.5, 20, 6);
    const keyHandle = new THREE.Mesh(keyHandleGeo, matAllenKey);
    keyHandle.rotation.z = Math.PI / 2;
    keyHandle.position.set(10, 12, 0);
    keyHandle.castShadow = true;
    allenKeyGroup.add(keyHandle);

    // Text badge on key handle: "4 mm"
    worldGroup.add(allenKeyGroup);

    // E. Aerosol Spuitbus + Rietje
    aerosolGroup = new THREE.Group();
    
    // Can body
    const canGeo = new THREE.CylinderGeometry(4.2, 4.2, 18, 32);
    const canMesh = new THREE.Mesh(canGeo, matAerosolCan);
    canMesh.position.y = 9.0;
    canMesh.castShadow = true;
    aerosolGroup.add(canMesh);

    // Can dome & valve
    const valveGeo = new THREE.CylinderGeometry(1.4, 2.2, 1.8, 24);
    const valveMesh = new THREE.Mesh(valveGeo, matNipple);
    valveMesh.position.y = 18.9;
    aerosolGroup.add(valveMesh);

    // Spray actuator nozzle button
    const nozzleGeo = new THREE.CylinderGeometry(1.5, 1.5, 2.2, 16);
    const nozzleMesh = new THREE.Mesh(nozzleGeo, matCarriage);
    nozzleMesh.position.y = 20.4;
    aerosolGroup.add(nozzleMesh);

    // Technical red straw extending down from actuator
    const strawGeo = new THREE.CylinderGeometry(0.5, 0.5, 16, 16);
    const strawMesh = new THREE.Mesh(strawGeo, matStraw);
    strawMesh.position.set(0, 11.5, 0);
    strawMesh.castShadow = true;
    aerosolGroup.add(strawMesh);

    // Spray cone mist (underneath)
    const sprayConeGeo = new THREE.ConeGeometry(3.5, 7.0, 16, 1, true);
    sprayParticles = new THREE.Mesh(sprayConeGeo, matSpray);
    sprayParticles.rotation.x = Math.PI;
    sprayParticles.position.set(0, -3.5, 0);
    aerosolGroup.add(sprayParticles);
    sprayParticles.visible = false;

    worldGroup.add(aerosolGroup);

    // Ground contact plane shadow
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    worldGroup.add(floorMesh);
  }

  // Animation Update function based on progress [0, 1]
  function updateAnimation(t) {
    // Shared base positions:
    // Carriage top surface is at Y = 12.5.
    // Threaded port hole is at (0, 12.5, 0).
    const portSurfaceY = 12.5;

    if (activeTab === 'montage') {
      // ----------------------------------------------------
      // Sequence 1: MONTAGE (Inbussleutel 4 & Afsluitdop)
      // ----------------------------------------------------
      aerosolGroup.visible = false;
      allenKeyGroup.visible = true;

      // Update step highlight
      updateStepBadge(t, [
        { upTo: 0.20, id: 'stepM1', label: 'Stap 1: Positioneren' },
        { upTo: 0.38, id: 'stepM2', label: 'Stap 2: Inbus 4mm Invoeren' },
        { upTo: 0.68, id: 'stepM3', label: 'Stap 3: Trillingsvast Inschroeven' },
        { upTo: 0.82, id: 'stepM4', label: 'Stap 4: Inbussleutel Terugtrekken' },
        { upTo: 1.00, id: 'stepM5', label: 'Stap 5: Afsluitdop Vergrendelen' }
      ]);

      if (t < 0.20) {
        // Stap 1 (0 to 0.20): Nipple descends from Y = 24 down to port Y = 14.8
        const p = t / 0.20;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);
        nippelMesh.position.set(0, portSurfaceY + 9.5 - (ease * 7.2), 0);
        nippelMesh.rotation.y = 0;

        // Inbussleutel hovers above
        allenKeyGroup.position.set(0, portSurfaceY + 20.0, 0);
        allenKeyGroup.rotation.y = 0;

        // Cap is parked high above waiting
        capMesh.visible = false;

      } else if (t < 0.38) {
        // Stap 2 (0.20 to 0.38): Inbus 4mm engages into the internal hex socket
        const p = (t - 0.20) / 0.18;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nippelMesh.position.set(0, portSurfaceY + 2.3, 0);
        nippelMesh.rotation.y = 0;

        // Inbus drops straight into nipple hex socket
        allenKeyGroup.position.set(0, portSurfaceY + 20.0 - (ease * 16.5), 0);
        allenKeyGroup.rotation.y = 0;

        capMesh.visible = false;

      } else if (t < 0.68) {
        // Stap 3 (0.38 to 0.68): Inbus turns 4 full rotations, driving nipple down into threads
        const p = (t - 0.38) / 0.30;
        const rotations = p * Math.PI * 8; // 4 full turns

        // Nipple screws down final 2.3mm flush to carriage collar
        nippelMesh.position.set(0, portSurfaceY + 2.3 - (p * 2.3), 0);
        nippelMesh.rotation.y = rotations;

        allenKeyGroup.position.set(0, portSurfaceY + 3.5 - (p * 2.3), 0);
        allenKeyGroup.rotation.y = rotations;

        capMesh.visible = false;

      } else if (t < 0.82) {
        // Stap 4 (0.68 to 0.82): Allen key lifts straight up and retracts
        const p = (t - 0.68) / 0.14;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nippelMesh.position.set(0, portSurfaceY, 0);
        nippelMesh.rotation.y = Math.PI * 8;

        allenKeyGroup.position.set(0, portSurfaceY + 1.2 + (ease * 22.0), 0);
        allenKeyGroup.rotation.y = 0;

        capMesh.visible = false;

      } else {
        // Stap 5 (0.82 to 1.00): Cap descends and snaps onto nipple
        const p = (t - 0.82) / 0.18;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nippelMesh.position.set(0, portSurfaceY, 0);
        allenKeyGroup.visible = false;

        capMesh.visible = true;
        // Cap descends from +14 down to seated position on nipple collar
        capMesh.position.set(0, portSurfaceY + 14.0 - (ease * 14.0), 0);
      }

    } else {
      // ----------------------------------------------------
      // Sequence 2: SMERING (Aerosol, Diepe Insteek & Spray)
      // ----------------------------------------------------
      allenKeyGroup.visible = false;
      aerosolGroup.visible = true;

      // Nipple is already fully threaded into carriage
      nippelMesh.position.set(0, portSurfaceY, 0);
      nippelMesh.rotation.y = 0;

      updateStepBadge(t, [
        { upTo: 0.20, id: 'stepS1', label: 'Stap 1: Afsluitdop Afnemen' },
        { upTo: 0.45, id: 'stepS2', label: 'Stap 2: Rietje Diep Insteken (7.5mm)' },
        { upTo: 0.70, id: 'stepS3', label: 'Stap 3: Droge Olie Doseren (Spray)' },
        { upTo: 0.85, id: 'stepS4', label: 'Stap 4: Rietje Terugtrekken' },
        { upTo: 1.00, id: 'stepS5', label: 'Stap 5: Dop Hermetisch Sluiten' }
      ]);

      if (t < 0.20) {
        // Stap 1 (0 to 0.20): Cap lifts off nipple
        const p = t / 0.20;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        capMesh.visible = true;
        capMesh.position.set(0, portSurfaceY + (ease * 16.0), 0);

        aerosolGroup.position.set(0, portSurfaceY + 28.0, 0);
        sprayParticles.visible = false;

      } else if (t < 0.45) {
        // Stap 2 (0.20 to 0.45): Aerosol lowers, red straw enters deep (7.5mm) into bore
        const p = (t - 0.20) / 0.25;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        // Cap moves aside out of the way
        capMesh.visible = true;
        capMesh.position.set(12.0 * ease, portSurfaceY + 16.0, 0);

        // Straw tip enters top of nipple (portSurfaceY + 3.2) and penetrates down to portSurfaceY - 4.3 (7.5mm inside)
        // Straw relative tip in aerosolGroup is at Y = 3.5.
        // So aerosolGroup Y descends to:
        aerosolGroup.position.set(0, portSurfaceY + 28.0 - (ease * 26.5), 0);
        sprayParticles.visible = false;

      } else if (t < 0.70) {
        // Stap 3 (0.45 to 0.70): Spray button pressed, atomized micro-mist sprays into bore
        const p = (t - 0.45) / 0.25;

        capMesh.position.set(12.0, portSurfaceY + 16.0, 0);
        aerosolGroup.position.set(0, portSurfaceY + 1.5, 0);

        // Spray cone pulsing animation
        sprayParticles.visible = true;
        const pulse = 1.0 + Math.sin(p * Math.PI * 16) * 0.25;
        sprayParticles.scale.set(pulse, 1.0, pulse);
        matSpray.opacity = 0.35 + Math.sin(p * Math.PI * 12) * 0.15;

      } else if (t < 0.85) {
        // Stap 4 (0.70 to 0.85): Aerosol retracts straight up
        const p = (t - 0.70) / 0.15;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        sprayParticles.visible = false;
        aerosolGroup.position.set(0, portSurfaceY + 1.5 + (ease * 26.5), 0);
        capMesh.position.set(12.0 * (1 - ease), portSurfaceY + 16.0, 0);

      } else {
        // Stap 5 (0.85 to 1.00): Cap snaps back down hermetically
        const p = (t - 0.85) / 0.15;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        aerosolGroup.position.set(0, portSurfaceY + 28.0, 0);
        sprayParticles.visible = false;

        capMesh.visible = true;
        capMesh.position.set(0, portSurfaceY + 16.0 - (ease * 16.0), 0);
      }
    }
  }

  function updateStepBadge(progress, steps) {
    const activeStep = steps.find(s => progress <= s.upTo) || steps[steps.length - 1];
    
    // Update active class on badge elements
    steps.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) el.classList.toggle('active', s.id === activeStep.id);
    });

    // Update status text
    const labelEl = document.getElementById('instructionStepLabel');
    if (labelEl) {
      labelEl.textContent = activeStep.label;
    }

    // Update scrubber UI
    const scrubber = document.getElementById('instructionScrubber');
    if (scrubber && !scrubber.matches(':active')) {
      scrubber.value = Math.round(progress * 100);
    }
  }

  function setupControlsUI() {
    // Tab switching: Montage vs Smering
    const tabMontage = document.getElementById('tabAnimMontage');
    const tabSmering = document.getElementById('tabAnimSmering');
    const badgesMontage = document.getElementById('badgesMontage');
    const badgesSmering = document.getElementById('badgesSmering');

    if (tabMontage) {
      tabMontage.addEventListener('click', () => {
        activeTab = 'montage';
        animProgress = 0;
        tabMontage.classList.add('active');
        if (tabSmering) tabSmering.classList.remove('active');
        if (badgesMontage) badgesMontage.style.display = 'flex';
        if (badgesSmering) badgesSmering.style.display = 'none';
        camera.position.set(28, 22, 34);
        controls.target.set(0, 7.5, 0);
      });
    }

    if (tabSmering) {
      tabSmering.addEventListener('click', () => {
        activeTab = 'smering';
        animProgress = 0;
        tabSmering.classList.add('active');
        if (tabMontage) tabMontage.classList.remove('active');
        if (badgesMontage) badgesMontage.style.display = 'none';
        if (badgesSmering) badgesSmering.style.display = 'flex';
        camera.position.set(26, 20, 32);
        controls.target.set(0, 7.5, 0);
      });
    }

    // Play/Pause button
    const btnPlayPause = document.getElementById('btnAnimPlayPause');
    if (btnPlayPause) {
      btnPlayPause.addEventListener('click', () => {
        isPlaying = !isPlaying;
        btnPlayPause.textContent = isPlaying ? 'Pauzeren ⏸' : 'Afspelen ▶';
      });
    }

    // Restart button
    const btnRestart = document.getElementById('btnAnimRestart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        animProgress = 0;
        isPlaying = true;
        if (btnPlayPause) btnPlayPause.textContent = 'Pauzeren ⏸';
      });
    }

    // Speed selector
    const speedSelect = document.getElementById('animSpeedSelect');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        animSpeed = parseFloat(e.target.value) || 1.0;
      });
    }

    // Timeline Scrubber
    const scrubber = document.getElementById('instructionScrubber');
    if (scrubber) {
      scrubber.addEventListener('input', (e) => {
        isPlaying = false;
        animProgress = parseFloat(e.target.value) / 100;
        updateAnimation(animProgress);
        if (btnPlayPause) btnPlayPause.textContent = 'Afspelen ▶';
      });
    }
  }

  function onResize() {
    if (!animContainer || !camera || !renderer) return;
    const width = animContainer.clientWidth;
    const height = animContainer.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate(now) {
    animationFrameId = requestAnimationFrame(animate);

    if (isPlaying) {
      const delta = (now - lastTime) / 1000;
      animProgress += (delta / animDuration) * animSpeed;
      if (animProgress > 1.0) {
        animProgress = 0; // loop seamlessly
      }
    }
    lastTime = now;

    updateAnimation(animProgress);

    if (controls) {
      controls.update();
    }

    renderer.render(scene, camera);
  }

  // Init once ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
