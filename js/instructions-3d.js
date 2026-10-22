/**
 * Oliesmeernippel — Interactive 3D Instruction Sequences (Three.js)
 * De Meester Industries
 * 
 * Hyper-realistic Industrial Linear Profile Rail Guide (Hiwin / THK style)
 * with the Real CAD Oliesmeernippel & Cap mounted on the end-cap lubrication port.
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
  let matRailSteel, matCarriageSteel, matEndCapBlack, matScrewStainless, matBrassBushing;
  let matNipple, matCapBlue, matAllenKey, matAerosolCan, matSpray, matStraw;

  // Visual Geometry & Coordinate Constants
  // Rail top is at Y = 9.0mm. Carriage top is at Y = 16.5mm.
  // Port is positioned at Y = 12.4mm (3.4mm above the rail top, in the clear!)
  const CAD_SCALE = 0.48; // Scale for 1:1 match with linear guide block
  const PORT_Z = 11.5;    // Front face of the black end-cap wiper plate
  const PORT_Y = 12.4;    // Center of the lubrication port (in upper half of end-cap, above rail)

  function init() {
    animContainer = document.getElementById('instructionsCanvasWrap');
    animCanvas = document.getElementById('instructionsCanvas');
    if (!animContainer || !animCanvas) return;

    // 1. Scene setup — technical studio background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF8FAFC);
    scene.fog = new THREE.Fog(0xF8FAFC, 70, 200);

    // 2. Camera setup — matches 3/4 isometric perspective of linear guide photo
    const aspect = animContainer.clientWidth / Math.max(1, animContainer.clientHeight);
    camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 260);
    camera.position.set(24, 21, 28);

    // 3. Renderer setup
    renderer = new THREE.WebGLRenderer({
      canvas: animCanvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(animContainer.clientWidth, animContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 10.0;
      controls.maxDistance = 85.0;
      controls.maxPolarAngle = Math.PI * 0.88;
      controls.target.set(0, PORT_Y - 1.2, 5.0);
    }

    // 5. Lighting
    setupLighting();

    // 6. Materials
    setupMaterials();

    // 7. Base groups & hyper-realistic linear guide assembly
    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    buildRealisticProfileRailAndCarriage();
    setupToolingAndAerosol();

    // 8. Load Real CAD Models (exact same as 3D hero viewer)
    loadRealCADModels();

    // 9. Event listeners & UI bindings
    window.addEventListener('resize', onResize);
    setupControlsUI();

    // 10. Start animation loop
    lastTime = performance.now();
    animate();
  }

  function setupLighting() {
    // Hemispheric ambient light for metallic chrome contrast
    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xC4CBD4, 1.2);
    hemiLight.position.set(0, 45, 0);
    scene.add(hemiLight);

    // Directional Key Light with soft shadows
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.35);
    keyLight.position.set(22, 40, 26);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 110;
    keyLight.shadow.camera.left = -32;
    keyLight.shadow.camera.right = 32;
    keyLight.shadow.camera.top = 32;
    keyLight.shadow.camera.bottom = -32;
    keyLight.shadow.bias = -0.0003;
    scene.add(keyLight);

    // Rim highlight light (industrial warm metallic edge)
    const rimLight = new THREE.DirectionalLight(0xE5A024, 0.45);
    rimLight.position.set(-24, 20, -24);
    scene.add(rimLight);

    // Front soft fill
    const fillLight = new THREE.DirectionalLight(0x94A3B8, 0.55);
    fillLight.position.set(0, -4, 28);
    scene.add(fillLight);
  }

  function setupMaterials() {
    // Mirror-ground bearing steel for linear rail
    matRailSteel = new THREE.MeshStandardMaterial({
      color: 0xCCD4DC,
      metalness: 0.95,
      roughness: 0.14,
      envMapIntensity: 1.4
    });

    // Satin ground tool steel for carriage body
    matCarriageSteel = new THREE.MeshStandardMaterial({
      color: 0xD8DFE7,
      metalness: 0.90,
      roughness: 0.20,
      envMapIntensity: 1.2
    });

    // Technical matte black injection molded POM for wipers / end plates
    matEndCapBlack = new THREE.MeshStandardMaterial({
      color: 0x16191D,
      metalness: 0.15,
      roughness: 0.55
    });

    // Stainless cap screws (M3 socket heads)
    matScrewStainless = new THREE.MeshStandardMaterial({
      color: 0xD0D6DE,
      metalness: 0.92,
      roughness: 0.18
    });

    // Brass / bronze threaded insert for grease port
    matBrassBushing = new THREE.MeshStandardMaterial({
      color: 0xD4A034,
      metalness: 0.85,
      roughness: 0.25
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

  // Build the Hyper-Realistic Profile Linear Rail & Carriage Guide
  function buildRealisticProfileRailAndCarriage() {
    railGroup = new THREE.Group();
    carriageGroup = new THREE.Group();
    worldGroup.add(railGroup);
    worldGroup.add(carriageGroup);

    // ========================================================
    // 1. Profile Linear Rail (Extruded Cross-Section with Grooves)
    // ========================================================
    const railLength = 76;
    const railShape = new THREE.Shape();

    // Real Gothic-arch linear profile rail cross section:
    // Base width 12mm, Height 9mm
    railShape.moveTo(-5.8, 0);
    railShape.lineTo(5.8, 0);
    railShape.lineTo(6.0, 0.4);
    railShape.lineTo(6.0, 3.4);
    // Lower raceway arch
    railShape.lineTo(5.2, 4.6);
    railShape.lineTo(6.0, 5.6);
    railShape.lineTo(6.0, 6.4);
    // Upper raceway arch
    railShape.lineTo(5.2, 7.4);
    railShape.lineTo(6.0, 8.4);
    // Top chamfer
    railShape.lineTo(5.3, 9.0);
    railShape.lineTo(-5.3, 9.0);
    railShape.lineTo(-6.0, 8.4);
    // Left upper raceway arch
    railShape.lineTo(-5.2, 7.4);
    railShape.lineTo(-6.0, 6.4);
    railShape.lineTo(-6.0, 5.6);
    // Left lower raceway arch
    railShape.lineTo(-5.2, 4.6);
    railShape.lineTo(-6.0, 3.4);
    railShape.lineTo(-6.0, 0.4);
    railShape.closePath();

    const railGeo = new THREE.ExtrudeGeometry(railShape, {
      depth: railLength,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.15,
      bevelThickness: 0.15
    });
    railGeo.center();

    const railMesh = new THREE.Mesh(railGeo, matRailSteel);
    // Rail extends along Z-axis, centered at origin
    railMesh.position.set(0, 4.5, 0);
    railMesh.castShadow = true;
    railMesh.receiveShadow = true;
    railGroup.add(railMesh);

    // Counterbored top bolt holes with socket head cap screws inside
    for (let z = -26; z <= 26; z += 17) {
      // Counterbore cavity
      const holeGeo = new THREE.CylinderGeometry(2.1, 2.1, 2.4, 24);
      const matHole = new THREE.MeshBasicMaterial({ color: 0x1A1E24 });
      const hole = new THREE.Mesh(holeGeo, matHole);
      hole.position.set(0, 9.05, z);
      railGroup.add(hole);

      // Screw head inside hole
      const boltGeo = new THREE.CylinderGeometry(1.9, 1.9, 0.6, 20);
      const bolt = new THREE.Mesh(boltGeo, matScrewStainless);
      bolt.position.set(0, 7.8, z);
      railGroup.add(bolt);

      // Inbus socket inside bolt
      const boltSocketGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.4, 6);
      const boltSocket = new THREE.Mesh(boltSocketGeo, matHole);
      boltSocket.position.set(0, 8.0, z);
      railGroup.add(boltSocket);
    }

    // ========================================================
    // 2. Precision Carriage Block (Loopwagen)
    // ========================================================
    const carriageLength = 20.0;
    const carriageWidth = 20.0;
    const carriageHeight = 13.0; // From Y=3.5 to Y=16.5
    const carriageYCenter = 10.0;

    // Extruded U-channel cross section for the steel carriage body:
    const carriageShape = new THREE.Shape();
    // Outer boundary
    carriageShape.moveTo(-10.0, 3.6);
    carriageShape.lineTo(-10.0, 15.6);
    carriageShape.lineTo(-8.8, 16.5); // Top-left chamfer
    carriageShape.lineTo(8.8, 16.5);
    carriageShape.lineTo(10.0, 15.6);  // Top-right chamfer
    carriageShape.lineTo(10.0, 3.6);
    // Inner cutout wrapping over the rail with clearance
    carriageShape.lineTo(6.4, 3.6);
    carriageShape.lineTo(6.4, 9.8);   // Above rail top (rail top = 9.0)
    carriageShape.lineTo(-6.4, 9.8);
    carriageShape.lineTo(-6.4, 3.6);
    carriageShape.closePath();

    const carriageGeo = new THREE.ExtrudeGeometry(carriageShape, {
      depth: carriageLength,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.15,
      bevelThickness: 0.15
    });
    carriageGeo.center();

    const carriageMesh = new THREE.Mesh(carriageGeo, matCarriageSteel);
    carriageMesh.position.set(0, carriageYCenter, 0);
    carriageMesh.castShadow = true;
    carriageMesh.receiveShadow = true;
    carriageGroup.add(carriageMesh);

    // 4 Top tapped mounting holes (machine montagegaten)
    for (let x of [-6.4, 6.4]) {
      for (let z of [-5.8, 5.8]) {
        const topHoleGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.4, 20);
        const matDarkHole = new THREE.MeshBasicMaterial({ color: 0x1E242B });
        const topHole = new THREE.Mesh(topHoleGeo, matDarkHole);
        topHole.position.set(x, 16.55, z);
        carriageGroup.add(topHole);
      }
    }

    // Top precision datum grooves / ground stripes
    const stripeGeo = new THREE.BoxGeometry(2.0, 0.25, carriageLength + 0.2);
    const matStripe = new THREE.MeshStandardMaterial({ color: 0xB0BCC8, roughness: 0.45 });
    const stripe1 = new THREE.Mesh(stripeGeo, matStripe);
    stripe1.position.set(-2.5, 16.5, 0);
    const stripe2 = new THREE.Mesh(stripeGeo, matStripe);
    stripe2.position.set(2.5, 16.5, 0);
    carriageGroup.add(stripe1);
    carriageGroup.add(stripe2);

    // ========================================================
    // 3. Black Front & Rear End Caps (Afstrijkers / Eindkappen)
    // ========================================================
    const endCapThickness = 2.4;
    const endCapZ = carriageLength / 2 + endCapThickness / 2; // Z = 10.0 + 1.2 = 11.2

    // Build front end cap (Z = +11.2)
    const frontCapShape = new THREE.Shape();
    frontCapShape.moveTo(-10.2, 3.4);
    frontCapShape.lineTo(-10.2, 15.8);
    frontCapShape.lineTo(-9.0, 16.7);
    frontCapShape.lineTo(9.0, 16.7);
    frontCapShape.lineTo(10.2, 15.8);
    frontCapShape.lineTo(10.2, 3.4);
    // Inner wiper lip conforming tightly to rail
    frontCapShape.lineTo(6.1, 3.4);
    frontCapShape.lineTo(6.1, 9.2);
    frontCapShape.lineTo(-6.1, 9.2);
    frontCapShape.lineTo(-6.1, 3.4);
    frontCapShape.closePath();

    const endCapGeo = new THREE.ExtrudeGeometry(frontCapShape, {
      depth: endCapThickness,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.12
    });
    endCapGeo.center();

    // Front end cap
    const frontCap = new THREE.Mesh(endCapGeo, matEndCapBlack);
    frontCap.position.set(0, carriageYCenter, endCapZ);
    frontCap.castShadow = true;
    carriageGroup.add(frontCap);

    // Rear end cap
    const rearCap = new THREE.Mesh(endCapGeo, matEndCapBlack);
    rearCap.position.set(0, carriageYCenter, -endCapZ);
    rearCap.castShadow = true;
    carriageGroup.add(rearCap);

    // Front end cap retaining screws (left and right)
    for (let x of [-7.2, 7.2]) {
      const screwGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.8, 16);
      const screw = new THREE.Mesh(screwGeo, matScrewStainless);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(x, 14.2, PORT_Z + 0.3);
      carriageGroup.add(screw);

      const screwSocketGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.35, 6);
      const matDarkSocket = new THREE.MeshBasicMaterial({ color: 0x0A0D11 });
      const screwSocket = new THREE.Mesh(screwSocketGeo, matDarkSocket);
      screwSocket.rotation.x = Math.PI / 2;
      screwSocket.position.set(x, 14.2, PORT_Z + 0.6);
      carriageGroup.add(screwSocket);
    }

    // ========================================================
    // 4. Central Lubrication Port (Getapte smeerpoort M6)
    // Centered at PORT_Y = 12.4, PORT_Z = 11.5 (above rail top, in the clear!)
    // ========================================================
    // Raised circular mounting boss on black end plate
    const bossGeo = new THREE.CylinderGeometry(3.2, 3.4, 0.8, 24);
    const boss = new THREE.Mesh(bossGeo, matEndCapBlack);
    boss.rotation.x = Math.PI / 2;
    boss.position.set(0, PORT_Y, PORT_Z - 0.2);
    carriageGroup.add(boss);

    // Brass/steel threaded bushing collar
    const collarGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.6, 24);
    const collar = new THREE.Mesh(collarGeo, matBrassBushing);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, PORT_Y, PORT_Z);
    carriageGroup.add(collar);

    // Threaded port cavity (M6)
    const portCavityGeo = new THREE.CylinderGeometry(1.6, 1.6, 2.0, 24);
    const matDarkCavity = new THREE.MeshBasicMaterial({ color: 0x08090C });
    const portCavity = new THREE.Mesh(portCavityGeo, matDarkCavity);
    portCavity.rotation.x = Math.PI / 2;
    portCavity.position.set(0, PORT_Y, PORT_Z - 0.5);
    carriageGroup.add(portCavity);

    // Ground Contact Shadow Floor
    const floorGeo = new THREE.PlaneGeometry(100, 100);
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

      // 1. Real CAD Oliesmeernippel Model (osn_nippel.obj)
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

          // In CAD: Y=-6 is thread tip, Y=2.0 is collar, Y=8.0 is inbus head.
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

      // 2. Real CAD Afsluitdop Model (osn_cap_mounted.obj)
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
        // Stap 1: Nipple approaches horizontally along Z towards the end cap port
        const p = t / 0.20;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        // Nipple advances from Z = 22.0 to Z = 14.5 (thread tip enters port)
        nipplePivot.position.set(0, PORT_Y, 22.0 - (ease * 7.5));
        nipplePivot.rotation.z = 0;

        // Inbussleutel hovers behind at Z = 29.0
        allenKeyGroup.position.set(0, PORT_Y, 29.0);
        allenKeyGroup.rotation.z = 0;

        capPivot.visible = false;

      } else if (t < 0.38) {
        // Stap 2: Inbus 4mm enters horizontally into hex socket
        const p = (t - 0.20) / 0.18;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nipplePivot.position.set(0, PORT_Y, 14.5);
        nipplePivot.rotation.z = 0;

        // Inbus moves along -Z into socket
        allenKeyGroup.position.set(0, PORT_Y, 29.0 - (ease * 11.5));
        allenKeyGroup.rotation.z = 0;

        capPivot.visible = false;

      } else if (t < 0.68) {
        // Stap 3: Inbus 4mm turns 4 full revolutions, driving nipple into threaded port
        const p = (t - 0.38) / 0.30;
        const rotations = p * Math.PI * 8; // 4 turns

        // Nipple advances final 3.0mm until collar seats flush against end cap at PORT_Z
        nipplePivot.position.set(0, PORT_Y, 14.5 - (p * 3.0));
        nipplePivot.rotation.z = rotations;

        allenKeyGroup.position.set(0, PORT_Y, 17.5 - (p * 3.0));
        allenKeyGroup.rotation.z = rotations;

        capPivot.visible = false;

      } else if (t < 0.82) {
        // Stap 4: Inbussleutel pulls straight back along +Z
        const p = (t - 0.68) / 0.14;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nipplePivot.position.set(0, PORT_Y, PORT_Z);
        nipplePivot.rotation.z = Math.PI * 8;

        allenKeyGroup.position.set(0, PORT_Y, 14.5 + (ease * 18.0));
        allenKeyGroup.rotation.z = 0;

        capPivot.visible = false;

      } else {
        // Stap 5: Cap advances horizontally along -Z and snaps locked over the nipple head
        const p = (t - 0.82) / 0.18;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nipplePivot.position.set(0, PORT_Y, PORT_Z);
        allenKeyGroup.visible = false;

        capPivot.visible = true;
        // Cap advances from Z = 24.0 to PORT_Z (flush over collar and hex head)
        capPivot.position.set(0, PORT_Y, 24.0 - (ease * 12.5));
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
        capPivot.position.set(0, PORT_Y, PORT_Z + (ease * 12.5));

        // Aerosol waits high in front
        aerosolGroup.position.set(0, PORT_Y - 19.4 + 16.0, 32.0);
        sprayParticles.visible = false;

      } else if (t < 0.45) {
        // Stap 2: Cap moves aside, aerosol aligns and straw inserts 7.5mm deep into bore
        const p = (t - 0.20) / 0.25;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        // Cap moves aside out of the way
        capPivot.visible = true;
        capPivot.position.set(8.5 * ease, PORT_Y + 4.5 * ease, PORT_Z + 12.5);

        // Straw tip enters nipple head and penetrates 7.5mm deep
        const targetZ = PORT_Z + 13.25;
        aerosolGroup.position.set(0, PORT_Y - 19.4, 32.0 - (ease * (32.0 - targetZ)));
        sprayParticles.visible = false;

      } else if (t < 0.70) {
        // Stap 3: Spray button pressed, atomized dry lubricant micro-mist sprays into carriage
        const p = (t - 0.45) / 0.25;

        capPivot.position.set(8.5, PORT_Y + 4.5, PORT_Z + 12.5);
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
        capPivot.position.set(8.5 * (1 - ease), PORT_Y + 4.5 * (1 - ease), PORT_Z + 12.5);

      } else {
        // Stap 5: Cap slides back along -Z and hermetically locks onto the nipple
        const p = (t - 0.85) / 0.15;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        aerosolGroup.position.set(0, PORT_Y - 19.4 + 16.0, 32.0);
        sprayParticles.visible = false;

        capPivot.visible = true;
        capPivot.position.set(0, PORT_Y, PORT_Z + 12.5 - (ease * 12.5));
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
        camera.position.set(24, 21, 28);
        controls.target.set(0, PORT_Y - 1.2, 5.0);
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
        camera.position.set(22, 19, 26);
        controls.target.set(0, PORT_Y - 1.2, 5.0);
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
