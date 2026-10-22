/**
 * Oliesmeernippel — Interactive 3D Instruction Sequences (Three.js)
 * De Meester Industries
 * 
 * Uses the EXACT SAME Real CAD Models (osn_nippel.obj & osn_cap_mounted.obj)
 * Mounted horizontally on the end-cap / side lubrication port of an industrial
 * profile linear guide carriage (THK / Hiwin style) as requested by user.
 * 
 * Sequence 1: Montage (Inbussleutel metrisch 4 & Afsluitdop)
 * Sequence 2: Smeerinstructie (Dop afnemen, aerosol-rietje diep insteken, doseren, dop terug)
 */

(function () {
  'use strict';

  // Scene & animation state
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
  let railGroup, carriageGroup;
  let nipplePivot, capPivot;
  let allenKeyGroup, aerosolGroup, sprayParticles;

  // Materials
  let matRailSteel, matCarriageSteel, matEndCapBlack, matScrewStainless;
  let matNipple, matCapBlue, matAllenKey, matAerosolCan, matSpray, matStraw;

  // Constants
  const CAD_SCALE = 0.50; // Scale to match linear rail visual proportions
  const PORT_Z = 11.0;    // Z-coordinate of the front lubrication port surface
  const PORT_Y = 5.2;     // Y-coordinate of the lubrication port center

  function init() {
    animContainer = document.getElementById('instructionsCanvasWrap');
    animCanvas = document.getElementById('instructionsCanvas');
    if (!animContainer || !animCanvas) return;

    // 1. Scene setup — clean technical studio background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF8FAFC);
    scene.fog = new THREE.Fog(0xF8FAFC, 65, 190);

    // 2. Camera setup — matches 3/4 isometric angle of industrial linear guide photo
    const aspect = animContainer.clientWidth / Math.max(1, animContainer.clientHeight);
    camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 250);
    camera.position.set(24, 18, 28);

    // 3. Renderer setup
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
      controls.minDistance = 10.0;
      controls.maxDistance = 80.0;
      controls.maxPolarAngle = Math.PI * 0.88;
      controls.target.set(0, PORT_Y, 6.0);
    }

    // 5. Lighting
    setupLighting();

    // 6. Materials
    setupMaterials();

    // 7. Base groups & industrial linear guide assembly
    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    buildLinearRailAndCarriage();
    setupToolingAndAerosol();

    // 8. Load Real CAD Models (exact same as 3D hero viewer)
    loadRealCADModels();

    // 9. Event listeners & UI bindings
    window.addEventListener('resize', onResize);
    setupControlsUI();

    // 10. Start loop
    lastTime = performance.now();
    animate();
  }

  function setupLighting() {
    // Hemispheric ambient light for metallic chrome contrast
    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xC4CBD4, 1.15);
    hemiLight.position.set(0, 45, 0);
    scene.add(hemiLight);

    // Directional Key Light with soft shadows
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.35);
    keyLight.position.set(22, 38, 26);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 110;
    keyLight.shadow.camera.left = -30;
    keyLight.shadow.camera.right = 30;
    keyLight.shadow.camera.top = 30;
    keyLight.shadow.camera.bottom = -30;
    keyLight.shadow.bias = -0.0003;
    scene.add(keyLight);

    // Rim highlight light (industrial warm edge)
    const rimLight = new THREE.DirectionalLight(0xE5A024, 0.45);
    rimLight.position.set(-24, 18, -24);
    scene.add(rimLight);

    // Front soft fill
    const fillLight = new THREE.DirectionalLight(0x94A3B8, 0.55);
    fillLight.position.set(0, -6, 28);
    scene.add(fillLight);
  }

  function setupMaterials() {
    // Ground linear profile rail (mirror-ground bearing steel)
    matRailSteel = new THREE.MeshStandardMaterial({
      color: 0xD0D8E0,
      metalness: 0.94,
      roughness: 0.16,
      envMapIntensity: 1.3
    });

    // Precision ground carriage block (tool steel)
    matCarriageSteel = new THREE.MeshStandardMaterial({
      color: 0xDCE2E8,
      metalness: 0.88,
      roughness: 0.22,
      envMapIntensity: 1.1
    });

    // Composite end caps (matte black POM / reinforced polyamide wipers)
    matEndCapBlack = new THREE.MeshStandardMaterial({
      color: 0x1A1E24,
      metalness: 0.18,
      roughness: 0.60
    });

    // Stainless cap screws (M3 socket heads)
    matScrewStainless = new THREE.MeshStandardMaterial({
      color: 0xC8D0D8,
      metalness: 0.90,
      roughness: 0.20
    });

    // Oliesmeernippel RVS304 (identical to hero 3D viewer)
    matNipple = new THREE.MeshStandardMaterial({
      color: 0xDCE0E5,
      metalness: 0.88,
      roughness: 0.28,
      envMapIntensity: 1.0
    });

    // Polyamide Metal-Detectable Cap (Signal Safety Blue)
    matCapBlue = new THREE.MeshStandardMaterial({
      color: 0x1A6BC4,
      metalness: 0.08,
      roughness: 0.38,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25
    });

    // Inbussleutel maat 4 (Chrome-Vanadium steel, blackened industrial finish)
    matAllenKey = new THREE.MeshStandardMaterial({
      color: 0x22262C,
      metalness: 0.92,
      roughness: 0.24
    });

    // Aerosol can
    matAerosolCan = new THREE.MeshStandardMaterial({
      color: 0xE2E8F0,
      metalness: 0.72,
      roughness: 0.22
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
      opacity: 0.42,
      side: THREE.DoubleSide
    });
  }

  // Build the Profile Linear Rail & Carriage Guide (matches uploaded image)
  function buildLinearRailAndCarriage() {
    railGroup = new THREE.Group();
    carriageGroup = new THREE.Group();
    worldGroup.add(railGroup);
    worldGroup.add(carriageGroup);

    // A. Profile Linear Rail (Profielrail met kogelbanen)
    const railLength = 68;
    const railWidth = 9.0;
    const railHeight = 7.0;

    // Main rail body
    const railBodyGeo = new THREE.BoxGeometry(railWidth, railHeight, railLength);
    const railBody = new THREE.Mesh(railBodyGeo, matRailSteel);
    railBody.position.set(0, railHeight / 2, 0);
    railBody.castShadow = true;
    railBody.receiveShadow = true;
    railGroup.add(railBody);

    // Longitudinal circular raceway grooves on left and right sides
    const grooveRadius = 1.1;
    const grooveGeo = new THREE.CylinderGeometry(grooveRadius, grooveRadius, railLength, 16);
    const matGroove = new THREE.MeshStandardMaterial({ color: 0x9AA5B2, metalness: 0.95, roughness: 0.12 });
    
    // Left groove
    const grooveLeft = new THREE.Mesh(grooveGeo, matGroove);
    grooveLeft.rotation.x = Math.PI / 2;
    grooveLeft.position.set(-railWidth / 2 + 0.3, railHeight * 0.55, 0);
    railGroup.add(grooveLeft);

    // Right groove
    const grooveRight = new THREE.Mesh(grooveGeo, matGroove);
    grooveRight.rotation.x = Math.PI / 2;
    grooveRight.position.set(railWidth / 2 - 0.3, railHeight * 0.55, 0);
    railGroup.add(grooveRight);

    // Rail top mounting counterbored bolt holes
    for (let z = -24; z <= 24; z += 16) {
      // Counterbore
      const holeGeo = new THREE.CylinderGeometry(2.0, 2.0, 1.8, 20);
      const matHole = new THREE.MeshBasicMaterial({ color: 0x1E242B });
      const hole = new THREE.Mesh(holeGeo, matHole);
      hole.position.set(0, railHeight + 0.05, z);
      railGroup.add(hole);

      // Inner bolt hole
      const innerGeo = new THREE.CylinderGeometry(1.2, 1.2, 4.0, 16);
      const inner = new THREE.Mesh(innerGeo, matHole);
      inner.position.set(0, railHeight - 2.0, z);
      railGroup.add(inner);
    }

    // B. Linear Carriage Block (Loopwagen)
    // 1. Silver Ground Steel Main Body
    const blockWidth = 17.0;
    const blockHeight = 9.8;
    const blockLength = 18.0;

    const blockGeo = new THREE.BoxGeometry(blockWidth, blockHeight, blockLength);
    const blockMesh = new THREE.Mesh(blockGeo, matCarriageSteel);
    blockMesh.position.set(0, railHeight + blockHeight / 2 - 1.2, 0);
    blockMesh.castShadow = true;
    blockMesh.receiveShadow = true;
    carriageGroup.add(blockMesh);

    // 4 Top tapped mounting holes (machine montagegaten)
    for (let x of [-5.5, 5.5]) {
      for (let z of [-5.5, 5.5]) {
        const topHoleGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.2, 16);
        const matTopHole = new THREE.MeshBasicMaterial({ color: 0x22262E });
        const topHole = new THREE.Mesh(topHoleGeo, matTopHole);
        topHole.position.set(x, railHeight + blockHeight - 1.15, z);
        carriageGroup.add(topHole);
      }
    }

    // Longitudinal chamfer stripes on top (as visible in the photo)
    const stripeGeo = new THREE.BoxGeometry(1.8, 0.2, blockLength);
    const matStripe = new THREE.MeshStandardMaterial({ color: 0xA8B4C0, roughness: 0.5 });
    const stripe1 = new THREE.Mesh(stripeGeo, matStripe);
    stripe1.position.set(-2.0, railHeight + blockHeight - 1.1, 0);
    const stripe2 = new THREE.Mesh(stripeGeo, matStripe);
    stripe2.position.set(2.0, railHeight + blockHeight - 1.1, 0);
    carriageGroup.add(stripe1);
    carriageGroup.add(stripe2);

    // 2. Black Front & Rear End Caps (Afstrijkers / Eindkappen met smeerpoort)
    const endCapThickness = 2.0;
    const endCapWidth = 17.4;
    const endCapHeight = 10.2;

    // Build front end cap (Z = +10.0)
    const frontCapGeo = new THREE.BoxGeometry(endCapWidth, endCapHeight, endCapThickness);
    const frontCap = new THREE.Mesh(frontCapGeo, matEndCapBlack);
    frontCap.position.set(0, railHeight + blockHeight / 2 - 1.2, blockLength / 2 + endCapThickness / 2);
    frontCap.castShadow = true;
    carriageGroup.add(frontCap);

    // Build rear end cap (Z = -10.0)
    const rearCap = new THREE.Mesh(frontCapGeo, matEndCapBlack);
    rearCap.position.set(0, railHeight + blockHeight / 2 - 1.2, -blockLength / 2 - endCapThickness / 2);
    rearCap.castShadow = true;
    carriageGroup.add(rearCap);

    // End cap retaining screws (2 screws on front plate as in photo)
    for (let x of [-6.2, 6.2]) {
      const screwGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.8, 16);
      const screw = new THREE.Mesh(screwGeo, matScrewStainless);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(x, railHeight + 4.5, blockLength / 2 + endCapThickness + 0.3);
      carriageGroup.add(screw);

      // Inbus socket in screw head
      const screwSocketGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.3, 6);
      const matDarkSocket = new THREE.MeshBasicMaterial({ color: 0x0F1115 });
      const screwSocket = new THREE.Mesh(screwSocketGeo, matDarkSocket);
      screwSocket.rotation.x = Math.PI / 2;
      screwSocket.position.set(x, railHeight + 4.5, blockLength / 2 + endCapThickness + 0.6);
      carriageGroup.add(screwSocket);
    }

    // 3. Central Lubrication Port (Getapte smeerpoort M6 aan de voorzijde)
    // Positioned horizontally right between the wipers in the black end cap
    const portCollarGeo = new THREE.CylinderGeometry(2.3, 2.3, 0.8, 24);
    const portCollar = new THREE.Mesh(portCollarGeo, matScrewStainless);
    portCollar.rotation.x = Math.PI / 2;
    portCollar.position.set(0, PORT_Y, PORT_Z - 0.2);
    carriageGroup.add(portCollar);

    const portHoleGeo = new THREE.CylinderGeometry(1.6, 1.6, 1.2, 24);
    const matPortDark = new THREE.MeshBasicMaterial({ color: 0x0A0C0E });
    const portHole = new THREE.Mesh(portHoleGeo, matPortDark);
    portHole.rotation.x = Math.PI / 2;
    portHole.position.set(0, PORT_Y, PORT_Z + 0.1);
    carriageGroup.add(portHole);

    // Ground Contact Shadow Floor
    const floorGeo = new THREE.PlaneGeometry(90, 90);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.14 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    worldGroup.add(floorMesh);
  }

  // Load the exact same Real CAD Models from assets/models/
  function loadRealCADModels() {
    nipplePivot = new THREE.Group();
    capPivot = new THREE.Group();

    worldGroup.add(nipplePivot);
    worldGroup.add(capPivot);

    if (typeof THREE.OBJLoader !== 'undefined') {
      const loader = new THREE.OBJLoader();

      // 1. Real CAD Oliesmeernippel Model
      loader.load(
        'assets/models/osn_nippel.obj',
        (obj) => {
          obj.traverse((child) => {
            if (child.isMesh) {
              child.geometry.computeVertexNormals();
              child.material = matNipple;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // In CAD coordinates: Y=-6 is thread tip, Y=2.0 is collar, Y=8.0 is inbus head.
          // Shift mesh so collar (seating face) is at Y=0:
          obj.position.set(0, -2.0, 0);

          const subGroup = new THREE.Group();
          subGroup.add(obj);

          // Rotate 90 deg around X:
          // Thread (Y < 0) points into carriage (-Z), Hex head (Y > 0) points forward (+Z)!
          subGroup.rotation.x = Math.PI / 2;
          subGroup.scale.setScalar(CAD_SCALE);

          nipplePivot.add(subGroup);
        },
        undefined,
        (err) => console.warn('Instructions CAD Nipple could not be loaded:', err)
      );

      // 2. Real CAD Afsluitdop Model (Correct orientation)
      loader.load(
        'assets/models/osn_cap_mounted.obj',
        (obj) => {
          obj.traverse((child) => {
            if (child.isMesh) {
              child.geometry.computeVertexNormals();
              child.material = matCapBlue;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // In CAD: Y=2.0 is open bottom rim, Y=9.0 is closed top.
          // Shift mesh so open bottom rim is at Y=0:
          obj.position.set(0, -2.0, 0);

          const subGroup = new THREE.Group();
          subGroup.add(obj);

          // Rotate 90 deg around X: open rim faces -Z, closed top faces +Z
          subGroup.rotation.x = Math.PI / 2;
          subGroup.scale.setScalar(CAD_SCALE);

          capPivot.add(subGroup);
        },
        undefined,
        (err) => console.warn('Instructions CAD Cap could not be loaded:', err)
      );
    }
  }

  // Inbussleutel maat 4 & Aerosol spuitbus setup
  function setupToolingAndAerosol() {
    // A. Inbussleutel Maat Metrisch 4 (L-vormig)
    allenKeyGroup = new THREE.Group();
    worldGroup.add(allenKeyGroup);

    // Hexagonal drive tip (short leg points along -Z into the horizontal inbus socket)
    const keyTipGeo = new THREE.CylinderGeometry(1.15, 1.15, 8.0, 6);
    const keyTip = new THREE.Mesh(keyTipGeo, matAllenKey);
    keyTip.rotation.x = Math.PI / 2;
    keyTip.position.set(0, 0, -4.0);
    keyTip.castShadow = true;
    allenKeyGroup.add(keyTip);

    // Long handle extending upward (+Y) for manual torque
    const keyHandleGeo = new THREE.CylinderGeometry(1.15, 1.15, 18.0, 6);
    const keyHandle = new THREE.Mesh(keyHandleGeo, matAllenKey);
    keyHandle.position.set(0, 9.0, 0);
    keyHandle.castShadow = true;
    allenKeyGroup.add(keyHandle);

    // B. Aerosol Spuitbus met horizontaal gericht doseerrietje
    aerosolGroup = new THREE.Group();
    worldGroup.add(aerosolGroup);

    // Can body
    const canGeo = new THREE.CylinderGeometry(3.6, 3.6, 16.0, 32);
    const canMesh = new THREE.Mesh(canGeo, matAerosolCan);
    canMesh.position.set(0, 10.0, 0);
    canMesh.castShadow = true;
    aerosolGroup.add(canMesh);

    // Can valve cup & nozzle
    const valveGeo = new THREE.CylinderGeometry(1.2, 1.8, 1.4, 24);
    const valve = new THREE.Mesh(valveGeo, matRailSteel);
    valve.position.set(0, 18.5, 0);
    aerosolGroup.add(valve);

    // Spray actuator button
    const nozzleGeo = new THREE.CylinderGeometry(1.4, 1.4, 1.8, 16);
    const nozzle = new THREE.Mesh(nozzleGeo, matEndCapBlack);
    nozzle.position.set(0, 19.8, 0);
    aerosolGroup.add(nozzle);

    // Technical red flexible straw extending forward horizontally along -Z
    const strawGeo = new THREE.CylinderGeometry(0.4, 0.4, 14.0, 16);
    const strawMesh = new THREE.Mesh(strawGeo, matStraw);
    strawMesh.rotation.x = Math.PI / 2;
    strawMesh.position.set(0, 19.4, -7.0);
    strawMesh.castShadow = true;
    aerosolGroup.add(strawMesh);

    // Atomized spray mist cone
    const sprayConeGeo = new THREE.ConeGeometry(3.0, 6.0, 16, 1, true);
    sprayParticles = new THREE.Mesh(sprayConeGeo, matSpray);
    sprayParticles.rotation.x = -Math.PI / 2; // Spray emerges forward along -Z into carriage
    sprayParticles.position.set(0, PORT_Y, PORT_Z - 2.5);
    worldGroup.add(sprayParticles);
    sprayParticles.visible = false;
  }

  // Animation Timeline Controller [0, 1]
  function updateAnimation(t) {
    if (activeTab === 'montage') {
      // ----------------------------------------------------
      // Sequence 1: MONTAGE (Horizontaal inschroeven met inbus 4)
      // ----------------------------------------------------
      aerosolGroup.visible = false;
      sprayParticles.visible = false;
      allenKeyGroup.visible = true;

      updateStepBadge(t, [
        { upTo: 0.20, id: 'stepM1', label: 'Stap 1: Positioneren' },
        { upTo: 0.38, id: 'stepM2', label: 'Stap 2: Inbus 4mm Invoeren' },
        { upTo: 0.68, id: 'stepM3', label: 'Stap 3: Trillingsvast Inschroeven' },
        { upTo: 0.82, id: 'stepM4', label: 'Stap 4: Inbussleutel Terugtrekken' },
        { upTo: 1.00, id: 'stepM5', label: 'Stap 5: Afsluitdop Vergrendelen' }
      ]);

      if (t < 0.20) {
        // Stap 1: Nipple approaches horizontally along Z
        const p = t / 0.20;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        // Nipple advances from Z = 20.0 to Z = 13.5 (thread tip enters port)
        nipplePivot.position.set(0, PORT_Y, 20.0 - (ease * 6.5));
        nipplePivot.rotation.z = 0;

        // Inbussleutel hovers at Z = 27.0
        allenKeyGroup.position.set(0, PORT_Y, 27.0);
        allenKeyGroup.rotation.z = 0;

        capPivot.visible = false;

      } else if (t < 0.38) {
        // Stap 2: Inbus 4mm enters horizontally into hex socket
        const p = (t - 0.20) / 0.18;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nipplePivot.position.set(0, PORT_Y, 13.5);
        nipplePivot.rotation.z = 0;

        // Inbus moves along -Z into socket
        allenKeyGroup.position.set(0, PORT_Y, 27.0 - (ease * 10.5));
        allenKeyGroup.rotation.z = 0;

        capPivot.visible = false;

      } else if (t < 0.68) {
        // Stap 3: Inbus 4mm turns 4 full revolutions, driving nipple into threaded port
        const p = (t - 0.38) / 0.30;
        const rotations = p * Math.PI * 8; // 4 turns

        // Nipple advances final 2.5mm until collar seats flush against end cap at PORT_Z
        nipplePivot.position.set(0, PORT_Y, 13.5 - (p * 2.5));
        nipplePivot.rotation.z = rotations;

        allenKeyGroup.position.set(0, PORT_Y, 16.5 - (p * 2.5));
        allenKeyGroup.rotation.z = rotations;

        capPivot.visible = false;

      } else if (t < 0.82) {
        // Stap 4: Inbussleutel pulls straight back along +Z
        const p = (t - 0.68) / 0.14;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nipplePivot.position.set(0, PORT_Y, PORT_Z);
        nipplePivot.rotation.z = Math.PI * 8;

        allenKeyGroup.position.set(0, PORT_Y, 14.0 + (ease * 18.0));
        allenKeyGroup.rotation.z = 0;

        capPivot.visible = false;

      } else {
        // Stap 5: Cap advances horizontally along -Z and snaps locked over the nipple head
        const p = (t - 0.82) / 0.18;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nipplePivot.position.set(0, PORT_Y, PORT_Z);
        allenKeyGroup.visible = false;

        capPivot.visible = true;
        // Cap advances from Z = 22.0 to PORT_Z (flush over collar and hex head)
        capPivot.position.set(0, PORT_Y, 22.0 - (ease * 11.0));
      }

    } else {
      // ----------------------------------------------------
      // Sequence 2: SMERING (Aerosol, Diepe Insteek & Spray)
      // ----------------------------------------------------
      allenKeyGroup.visible = false;
      aerosolGroup.visible = true;

      // Nipple is already fully threaded into the end cap port
      nipplePivot.position.set(0, PORT_Y, PORT_Z);
      nipplePivot.rotation.z = 0;

      updateStepBadge(t, [
        { upTo: 0.20, id: 'stepS1', label: 'Stap 1: Afsluitdop Afnemen' },
        { upTo: 0.45, id: 'stepS2', label: 'Stap 2: Rietje Diep Insteken (7.5mm)' },
        { upTo: 0.70, id: 'stepS3', label: 'Stap 3: Droge Olie Doseren (Spray)' },
        { upTo: 0.85, id: 'stepS4', label: 'Stap 4: Rietje Terugtrekken' },
        { upTo: 1.00, id: 'stepS5', label: 'Stap 5: Dop Hermetisch Sluiten' }
      ]);

      if (t < 0.20) {
        // Stap 1: Cap slides horizontally forward off the nipple
        const p = t / 0.20;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        capPivot.visible = true;
        capPivot.position.set(0, PORT_Y, PORT_Z + (ease * 11.0));

        // Aerosol waits high in front
        aerosolGroup.position.set(0, PORT_Y - 19.4 + 16.0, 32.0);
        sprayParticles.visible = false;

      } else if (t < 0.45) {
        // Stap 2: Cap moves aside, aerosol aligns and straw inserts 7.5mm deep into bore
        const p = (t - 0.20) / 0.25;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        // Cap moves aside out of the way
        capPivot.visible = true;
        capPivot.position.set(8.0 * ease, PORT_Y + 4.0 * ease, PORT_Z + 11.0);

        // Straw tip enters nipple head at PORT_Z + 3.0 and penetrates 7.5mm deep (to PORT_Z - 0.75)
        // Straw tip in aerosolGroup is at Z = -14.0, Y = 19.4.
        // So when aerosolGroup is at Y = PORT_Y - 19.4 and Z = PORT_Z + 14.0 - 0.75 = PORT_Z + 13.25,
        // the straw is 7.5mm deep inside the nipple!
        const targetZ = PORT_Z + 13.25;
        aerosolGroup.position.set(0, PORT_Y - 19.4, 32.0 - (ease * (32.0 - targetZ)));
        sprayParticles.visible = false;

      } else if (t < 0.70) {
        // Stap 3: Spray button pressed, atomized dry lubricant micro-mist sprays into carriage
        const p = (t - 0.45) / 0.25;

        capPivot.position.set(8.0, PORT_Y + 4.0, PORT_Z + 11.0);
        aerosolGroup.position.set(0, PORT_Y - 19.4, PORT_Z + 13.25);

        // Pulsing spray mist inside carriage channel
        sprayParticles.visible = true;
        const pulse = 1.0 + Math.sin(p * Math.PI * 18) * 0.25;
        sprayParticles.scale.set(pulse, pulse, 1.0);
        matSpray.opacity = 0.35 + Math.sin(p * Math.PI * 14) * 0.18;

      } else if (t < 0.85) {
        // Stap 4: Spray stops, aerosol retracts back along +Z
        const p = (t - 0.70) / 0.15;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        sprayParticles.visible = false;
        aerosolGroup.position.set(0, PORT_Y - 19.4, PORT_Z + 13.25 + (ease * 18.0));
        capPivot.position.set(8.0 * (1 - ease), PORT_Y + 4.0 * (1 - ease), PORT_Z + 11.0);

      } else {
        // Stap 5: Cap slides back along -Z and hermetically locks onto the nipple
        const p = (t - 0.85) / 0.15;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        aerosolGroup.position.set(0, PORT_Y - 19.4 + 16.0, 32.0);
        sprayParticles.visible = false;

        capPivot.visible = true;
        capPivot.position.set(0, PORT_Y, PORT_Z + 11.0 - (ease * 11.0));
      }
    }
  }

  function updateStepBadge(progress, steps) {
    const activeStep = steps.find(s => progress <= s.upTo) || steps[steps.length - 1];
    
    steps.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) el.classList.toggle('active', s.id === activeStep.id);
    });

    const labelEl = document.getElementById('instructionStepLabel');
    if (labelEl) {
      labelEl.textContent = activeStep.label;
    }

    const scrubber = document.getElementById('instructionScrubber');
    if (scrubber && !scrubber.matches(':active')) {
      scrubber.value = Math.round(progress * 100);
    }
  }

  function setupControlsUI() {
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
        camera.position.set(24, 18, 28);
        controls.target.set(0, PORT_Y, 6.0);
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
        camera.position.set(22, 16, 26);
        controls.target.set(0, PORT_Y, 6.0);
      });
    }

    const btnPlayPause = document.getElementById('btnAnimPlayPause');
    if (btnPlayPause) {
      btnPlayPause.addEventListener('click', () => {
        isPlaying = !isPlaying;
        btnPlayPause.textContent = isPlaying ? 'Pauzeren ⏸' : 'Afspelen ▶';
      });
    }

    const btnRestart = document.getElementById('btnAnimRestart');
    if (btnRestart) {
      btnRestart.addEventListener('click', () => {
        animProgress = 0;
        isPlaying = true;
        if (btnPlayPause) btnPlayPause.textContent = 'Pauzeren ⏸';
      });
    }

    const speedSelect = document.getElementById('animSpeedSelect');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        animSpeed = parseFloat(e.target.value) || 1.0;
      });
    }

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
        animProgress = 0; // Seamless loop
      }
    }
    lastTime = now;

    updateAnimation(animProgress);

    if (controls) {
      controls.update();
    }

    renderer.render(scene, camera);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
