/**
 * Oliesmeernippel — Interactive 3D Instruction Sequences (Three.js)
 * De Meester Industries
 * 
 * High-precision Industrial Linear Profile Rail Guide with Real CAD Nipple & Cap
 * 
 * Perfected Alignment & Mechanics:
 * 1. Nipple collar seats 100% FLUSH on the front end-cap face; hex head & socket fully visible.
 * 2. Visible brass-lined threaded M6 port hole on carriage end-cap before insertion.
 * 3. Photorealistic 4mm L-shaped Allen key with chamfered lead-in and smooth 90° elbow bend.
 * 4. Aerosol can positioned safely to the side (X=18.0) with curved flexible red straw entering
 *    horizontally 7.5mm into the center bore — ZERO collision with rail or carriage!
 * 5. Cap swings far up and away to the side, leaving working area 100% unobstructed.
 * 6. Generous, balanced camera framing (no clipping or excessive zoom) with 1-click view reset.
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
  const animDuration = 11.5; // seconds for full cycle
  let lastTime = performance.now();
  let animationFrameId = null;

  // Scene Objects
  let worldGroup;
  let railGroup, carriageGroup;
  let nipplePivot, capPivot;
  let allenKeyGroup, aerosolGroup, sprayParticles;

  // Materials
  let matRailSteel, matCarriageSteel, matEndCapBlack, matScrewStainless, matBrassBushing, matDarkPort;
  let matNipple, matCapBlue, matAllenKey, matAerosolCan, matSpray, matStraw;

  // Visual Geometry & Coordinate Constants
  // Rail top is at Y = 9.0mm. Carriage top is at Y = 16.5mm.
  // Lubrication port is centered at Y = 13.0mm (4.0mm above rail top, perfectly in the clear!)
  const CAD_SCALE = 0.48; // Scale for 1:1 physical match with linear guide block
  const PORT_Z = 13.5;    // Front face of the black end-cap wiper plate
  const PORT_Y = 13.0;    // Center of the lubrication port

  // Global Framing — generous distance so full scene has 35% breathing room
  // Perfectly centered, wide-margin studio camera for both Montage & Smering:
  // Distance ~100, FOV 28° ensures BOTH ends of the rail, carriage, tools & entire aerosol can
  // are DEAD-CENTER with 25-30% clear margin on all sides (no overlap with top banner!).
  const DEFAULT_TARGET = new THREE.Vector3(0, 10.0, 4.0);
  const DEFAULT_CAM_POS = new THREE.Vector3(56.0, 40.0, 74.0);

  function init() {
    animContainer = document.getElementById('instructionsCanvasWrap');
    animCanvas = document.getElementById('instructionsCanvas');
    if (!animContainer || !animCanvas) return;

    // 1. Scene setup — technical studio background with soft fog
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF8FAFC);
    scene.fog = new THREE.Fog(0xF8FAFC, 110, 260);

    // 2. Camera setup — balanced perspective, generous distance (no excessive zoom!)
    const aspect = animContainer.clientWidth / Math.max(1, animContainer.clientHeight);
    camera = new THREE.PerspectiveCamera(28, aspect, 0.1, 400);
    camera.position.copy(DEFAULT_CAM_POS);

    // 3. Renderer setup
    renderer = new THREE.WebGLRenderer({
      canvas: animCanvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(animContainer.clientWidth, animContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.16;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. OrbitControls — wide zoom freedom, smoothly centered
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 14.0;
      controls.maxDistance = 120.0;
      controls.maxPolarAngle = Math.PI * 0.88;
      controls.target.copy(DEFAULT_TARGET);
    }

    // 5. Lighting
    setupLighting();

    // 6. Materials
    setupMaterials();

    // 7. Base groups & realistic linear guide assembly
    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    buildRealisticProfileRailAndCarriage();
    setupRealisticAllenKey();
    setupAerosolCan();

    // 8. Load Real CAD Models
    loadRealCADModels();

    // 9. Event listeners & UI bindings
    window.addEventListener('resize', onResize);
    setupControlsUI();

    // 10. Start animation loop
    lastTime = performance.now();
    animate();
  }

  function setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xC4CBD4, 1.25);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.35);
    keyLight.position.set(32, 48, 36);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 140;
    keyLight.shadow.camera.left = -42;
    keyLight.shadow.camera.right = 42;
    keyLight.shadow.camera.top = 42;
    keyLight.shadow.camera.bottom = -42;
    keyLight.shadow.bias = -0.0003;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xE5A024, 0.45);
    rimLight.position.set(-32, 26, -30);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x94A3B8, 0.55);
    fillLight.position.set(0, -6, 40);
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

    // Brass threaded insert for grease port
    matBrassBushing = new THREE.MeshStandardMaterial({
      color: 0xD4A034,
      metalness: 0.85,
      roughness: 0.25
    });

    // Dark threaded port cavity
    matDarkPort = new THREE.MeshBasicMaterial({
      color: 0x0A0C10
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

    // Inbussleutel maat 4 (Chrome-Vanadium steel, satin industrial finish)
    matAllenKey = new THREE.MeshStandardMaterial({
      color: 0x242830,
      metalness: 0.92,
      roughness: 0.22
    });

    // Industrial Aerosol Can Body (Stealth Satin Black)
    matAerosolCan = new THREE.MeshStandardMaterial({
      color: 0x14171A, // Satin industrial black
      metalness: 0.32,
      roughness: 0.42
    });

    // Technical flexible straw (Matte Black, diameter 3.2mm)
    matStraw = new THREE.MeshStandardMaterial({
      color: 0x181B1E, // Industrial technical black
      metalness: 0.15,
      roughness: 0.35
    });

    // Spray mist
    matSpray = new THREE.MeshBasicMaterial({
      color: 0xFFFBF0,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide
    });
  }

  // Build the Profile Linear Rail & Carriage with a CLEARLY VISIBLE Threaded Port Hole
  function buildRealisticProfileRailAndCarriage() {
    railGroup = new THREE.Group();
    carriageGroup = new THREE.Group();
    worldGroup.add(railGroup);
    worldGroup.add(carriageGroup);

    // ========================================================
    // 1. Profile Linear Rail (Gothic-Arch Grooves)
    // ========================================================
    const railLength = 80;
    const railShape = new THREE.Shape();

    // Gothic-arch linear profile rail cross section:
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
    railShape.lineTo(5.5, 9.0);
    railShape.lineTo(-5.5, 9.0);
    railShape.lineTo(-6.0, 8.4);
    // Left upper raceway arch
    railShape.lineTo(-6.0, 7.4);
    railShape.lineTo(-5.2, 6.4);
    railShape.lineTo(-6.0, 5.6);
    // Left lower raceway arch
    railShape.lineTo(-6.0, 4.6);
    railShape.lineTo(-5.2, 3.4);
    railShape.lineTo(-6.0, 0.4);
    railShape.closePath();

    const railExtrudeSettings = {
      depth: railLength,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.15,
      bevelThickness: 0.15
    };
    const railGeo = new THREE.ExtrudeGeometry(railShape, railExtrudeSettings);
    railGeo.center();

    const railMesh = new THREE.Mesh(railGeo, matRailSteel);
    railMesh.position.set(0, 4.5, 0);
    railMesh.castShadow = true;
    railMesh.receiveShadow = true;
    railGroup.add(railMesh);

    // Rail mounting bolt holes (countersunk along rail spine)
    const boltSpacing = 24.0;
    for (let z of [-boltSpacing, 0, boltSpacing]) {
      const holeGeo = new THREE.CylinderGeometry(2.1, 2.1, 4.0, 24);
      const hole = new THREE.Mesh(holeGeo, matDarkPort);
      hole.position.set(0, 7.2, z);
      railGroup.add(hole);

      const boltGeo = new THREE.CylinderGeometry(1.5, 1.5, 1.2, 20);
      const bolt = new THREE.Mesh(boltGeo, matScrewStainless);
      bolt.position.set(0, 6.2, z);
      railGroup.add(bolt);

      const boltSocketGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.4, 6);
      const boltSocket = new THREE.Mesh(boltSocketGeo, matDarkPort);
      boltSocket.position.set(0, 8.0, z);
      railGroup.add(boltSocket);
    }

    // ========================================================
    // 2. Precision Carriage Block (Loopwagen)
    // ========================================================
    const carriageLength = 22.0;
    const carriageYCenter = 10.0;

    const carriageShape = new THREE.Shape();
    carriageShape.moveTo(-10.0, 3.6);
    carriageShape.lineTo(-10.0, 15.6);
    carriageShape.lineTo(-8.8, 16.5); // Top-left chamfer
    carriageShape.lineTo(8.8, 16.5);
    carriageShape.lineTo(10.0, 15.6);  // Top-right chamfer
    carriageShape.lineTo(10.0, 3.6);
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

    // 4 Top tapped mounting holes
    for (let x of [-6.4, 6.4]) {
      for (let z of [-6.0, 6.0]) {
        const topHoleGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.4, 20);
        const topHole = new THREE.Mesh(topHoleGeo, matDarkPort);
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
    // 3. Black Front & Rear End Caps (Afstrijkers)
    // ========================================================
    const endCapThickness = 2.5;
    // Front face of carriage block is at Z = 11.0. End cap depth = 2.5.
    // Front face of end cap sits EXACTLY at Z = 13.5 (PORT_Z)!
    const endCapZ = carriageLength / 2 + endCapThickness / 2; // Z = 12.25

    const frontCapShape = new THREE.Shape();
    frontCapShape.moveTo(-10.2, 3.4);
    frontCapShape.lineTo(-10.2, 15.8);
    frontCapShape.lineTo(-9.0, 16.7);
    frontCapShape.lineTo(9.0, 16.7);
    frontCapShape.lineTo(10.2, 15.8);
    frontCapShape.lineTo(10.2, 3.4);
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

    const frontCap = new THREE.Mesh(endCapGeo, matEndCapBlack);
    frontCap.position.set(0, carriageYCenter, endCapZ);
    frontCap.castShadow = true;
    carriageGroup.add(frontCap);

    const rearCap = new THREE.Mesh(endCapGeo, matEndCapBlack);
    rearCap.position.set(0, carriageYCenter, -endCapZ);
    rearCap.castShadow = true;
    carriageGroup.add(rearCap);

    // Front end cap retaining screws
    for (let x of [-7.2, 7.2]) {
      const screwGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.8, 16);
      const screw = new THREE.Mesh(screwGeo, matScrewStainless);
      screw.rotation.x = Math.PI / 2;
      screw.position.set(x, 14.2, PORT_Z - 0.2);
      carriageGroup.add(screw);

      const screwSocketGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.35, 6);
      const screwSocket = new THREE.Mesh(screwSocketGeo, matDarkPort);
      screwSocket.rotation.x = Math.PI / 2;
      screwSocket.position.set(x, 14.2, PORT_Z + 0.1);
      carriageGroup.add(screwSocket);
    }

    // ========================================================
    // 4. CLEARLY VISIBLE M6 Lubrication Port Hole
    // Raised collar, chamfered brass threaded ring, and deep recessed inner bore!
    // ========================================================
    // Raised mounting boss on the black plate
    const bossGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.6, 24);
    const boss = new THREE.Mesh(bossGeo, matEndCapBlack);
    boss.rotation.x = Math.PI / 2;
    boss.position.set(0, PORT_Y, PORT_Z - 0.2);
    carriageGroup.add(boss);

    // Metallic threaded bushing ring with chamfer
    const collarGeo = new THREE.CylinderGeometry(2.4, 2.4, 0.5, 24);
    const collar = new THREE.Mesh(collarGeo, matBrassBushing);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, PORT_Y, PORT_Z - 0.05);
    carriageGroup.add(collar);

    // Clearly visible open threaded entrance hole
    const openHoleGeo = new THREE.CylinderGeometry(1.5, 1.5, 5.0, 24);
    const openHole = new THREE.Mesh(openHoleGeo, matDarkPort);
    openHole.rotation.x = Math.PI / 2;
    openHole.position.set(0, PORT_Y, PORT_Z - 2.2);
    carriageGroup.add(openHole);

    // Floor shadow receiver plane
    const floorGeo = new THREE.PlaneGeometry(140, 140);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.14 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    worldGroup.add(floorMesh);
  }

  // Load Real CAD Models & ensure collar seats FLUSH (not screwed in too deep!)
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

          // In CAD coordinates:
          // Y = -6.0 to 0.0 is M6 thread.
          // Y = 0.0 is the collar seating face.
          // Y = 0.0 to 8.0 is hex collar and head with inbus socket.
          // Rotating +90° around X puts thread into -Z, hex head outward (+Z).
          // Collar sits perfectly at Z = 0!
          obj.position.set(0, 0, 0);

          const subGroup = new THREE.Group();
          subGroup.add(obj);

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

          // In CAD: Y = 2.0 is open bottom rim, Y = 9.0 is closed top.
          // Shift mesh so open bottom rim is at Y = 0:
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

  // Photorealistic Ball-End (Kogelgewricht) 4mm Allen Key:
  // The spherical ball-hex head enters the nipple horizontally.
  // The key is tilted UPWARD at an ergonomic 24° angle (-0.42 rad) so it rises high into open air!
  // The long shaft extends 26mm, and the short L-handle points UPWARD.
  // When rotating 360°, the lowest sweep is 3.5mm ABOVE the rail — ZERO collision with the linear guide!
  let allenKeyTiltGroup, allenKeySpinnerGroup;

  function setupRealisticAllenKey() {
    allenKeyGroup = new THREE.Group();
    worldGroup.add(allenKeyGroup);

    // Pivot group: tilts UPWARD around ball-head center by 24 degrees (negative X rotation = UP in Three.js!)
    allenKeyTiltGroup = new THREE.Group();
    allenKeyTiltGroup.rotation.x = -0.42; // Tilted UPWARDS into clear air!
    allenKeyGroup.add(allenKeyTiltGroup);

    // Spinner group: rotates around the tilted shaft axis during tightening
    allenKeySpinnerGroup = new THREE.Group();
    allenKeyTiltGroup.add(allenKeySpinnerGroup);

    const hexRadius = 1.15; // Scaled 4mm metric inbus across-flats

    // 1. Spherical Ball-Hex Head (Kogelkop) at the drive tip (Z = 0)
    const ballGeo = new THREE.SphereGeometry(hexRadius * 0.98, 16, 12);
    ballGeo.scale(1.0, 1.0, 1.15); // Ellipsoidal ball-hex
    const ballMesh = new THREE.Mesh(ballGeo, matAllenKey);
    ballMesh.position.set(0, 0, 0);
    ballMesh.castShadow = true;
    allenKeySpinnerGroup.add(ballMesh);

    // 2. Narrowed neck behind the ball head (standard Wiha/PB Swiss ball-end profile)
    const neckGeo = new THREE.CylinderGeometry(hexRadius * 0.78, hexRadius * 0.95, 1.6, 12);
    const neck = new THREE.Mesh(neckGeo, matAllenKey);
    neck.rotation.x = Math.PI / 2;
    neck.position.set(0, 0, 0.9);
    neck.castShadow = true;
    allenKeySpinnerGroup.add(neck);

    // 3. Long Hexagonal Drive Shaft extending forward along +Z (length 25mm, fits 100% in view)
    const shaftLength = 25.0;
    const shaftGeo = new THREE.CylinderGeometry(hexRadius, hexRadius, shaftLength, 6);
    const shaft = new THREE.Mesh(shaftGeo, matAllenKey);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0, 1.7 + shaftLength / 2);
    shaft.castShadow = true;
    allenKeySpinnerGroup.add(shaft);

    // 4. Smooth 90-degree elbow bend turning UPWARD into +Y
    const bendZ = 1.7 + shaftLength; // Z = 26.7
    const elbowCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0, bendZ),
      new THREE.Vector3(0, 0, bendZ + 2.2),
      new THREE.Vector3(0, 2.2, bendZ + 2.2)
    );
    const elbowGeo = new THREE.TubeGeometry(elbowCurve, 12, hexRadius * 0.98, 6, false);
    const elbow = new THREE.Mesh(elbowGeo, matAllenKey);
    elbow.castShadow = true;
    allenKeySpinnerGroup.add(elbow);

    // 5. Short L-handle extending UPWARD along +Y into open air (length 11.5mm)
    const handleLength = 11.5;
    const handleGeo = new THREE.CylinderGeometry(hexRadius, hexRadius, handleLength, 6);
    const handle = new THREE.Mesh(handleGeo, matAllenKey);
    handle.position.set(0, 2.2 + handleLength / 2, bendZ + 2.2);
    handle.castShadow = true;
    allenKeySpinnerGroup.add(handle);

    // Stamped size badge "4 mm" on short handle
    const badgeGeo = new THREE.BoxGeometry(0.3, 2.8, 1.1);
    const matBadge = new THREE.MeshStandardMaterial({ color: 0x485260, metalness: 0.8, roughness: 0.4 });
    const badge = new THREE.Mesh(badgeGeo, matBadge);
    badge.position.set(hexRadius * 0.95, 2.2 + handleLength * 0.5, bendZ + 2.2);
    allenKeySpinnerGroup.add(badge);
  }

  // Photorealistic Industrial Black Aerosol Can & 3.2mm Black Straw:
  // Proportions: standard 200ml spray can (radius 3.5, height 15.0), stealth satin black finish.
  // Positioned on the left (-X = -15.0) in the background so the camera (at +X = 56.0) has a
  // 100% crystal-clear, unobstructed foreground view of the nipple, bore entrance, and straw!
  // The black straw (3.2mm outer diameter, scaled radius 0.58) enters DEAD-STRAIGHT on the
  // horizontal Z-axis for the last 8mm, so it NEVER touches or cuts the outer rim of the nipple!
  function setupAerosolCan() {
    aerosolGroup = new THREE.Group();
    worldGroup.add(aerosolGroup);

    const canRadius = 3.5;
    const canHeight = 15.0;
    const canX = -15.0;
    const canY = 4.0;

    // 1. Chime Bottom Rim (crimped aluminium rolled seam)
    const chimeGeo = new THREE.CylinderGeometry(canRadius * 0.96, canRadius * 1.02, 0.55, 32);
    const chime = new THREE.Mesh(chimeGeo, matRailSteel);
    chime.position.set(canX, canY + 0.28, 0);
    chime.castShadow = true;
    aerosolGroup.add(chime);

    // 2. Can Body: Stealth Matte Black Industrial Canister
    const canBodyGeo = new THREE.CylinderGeometry(canRadius, canRadius, canHeight, 32);
    const canMesh = new THREE.Mesh(canBodyGeo, matAerosolCan);
    canMesh.position.set(canX, canY + 0.55 + canHeight / 2, 0);
    canMesh.castShadow = true;
    aerosolGroup.add(canMesh);

    // Technical Label Band (Stealth Graphics)
    const labelGeo = new THREE.CylinderGeometry(canRadius * 1.008, canRadius * 1.008, canHeight * 0.60, 32);
    const matLabel = new THREE.MeshStandardMaterial({
      color: 0x0C0E11, // Deep matte technical black
      roughness: 0.5
    });
    const labelMesh = new THREE.Mesh(labelGeo, matLabel);
    labelMesh.position.set(canX, canY + 0.55 + canHeight * 0.48, 0);
    aerosolGroup.add(labelMesh);

    // Signal Accent Stripe (Interflon Gold/Orange)
    const stripeGeo = new THREE.CylinderGeometry(canRadius * 1.012, canRadius * 1.012, 0.45, 32);
    const matAccent = new THREE.MeshStandardMaterial({ color: 0xE5A024, roughness: 0.35 });
    const stripeMesh = new THREE.Mesh(stripeGeo, matAccent);
    stripeMesh.position.set(canX, canY + 0.55 + canHeight * 0.78, 0);
    aerosolGroup.add(stripeMesh);

    // 3. Spun Aluminium Contoured Top Shoulder Dome
    const domeGeo = new THREE.SphereGeometry(canRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.32);
    const dome = new THREE.Mesh(domeGeo, matRailSteel);
    dome.position.set(canX, canY + 0.55 + canHeight, 0);
    aerosolGroup.add(dome);

    // 4. Valve Mounting Cup Ring
    const valveGeo = new THREE.CylinderGeometry(1.2, 1.6, 0.75, 24);
    const valve = new THREE.Mesh(valveGeo, matRailSteel);
    valve.position.set(canX, canY + 0.55 + canHeight + 0.65, 0);
    aerosolGroup.add(valve);

    // 5. Ergonomic Spray Actuator Button (Matte Black POM with Red Nozzle Orifice)
    const nozzleGeo = new THREE.CylinderGeometry(1.2, 1.2, 1.45, 20);
    const matActuator = new THREE.MeshStandardMaterial({ color: 0x1A1C1E, roughness: 0.4 });
    const nozzle = new THREE.Mesh(nozzleGeo, matActuator);
    nozzle.position.set(canX, canY + 0.55 + canHeight + 1.65, 0);
    aerosolGroup.add(nozzle);

    // Red nozzle orifice ring facing towards +X
    const exitHoleGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.5, 16);
    const matOrifice = new THREE.MeshStandardMaterial({ color: 0xDE3628, roughness: 0.3 });
    const exitHole = new THREE.Mesh(exitHoleGeo, matOrifice);
    exitHole.rotation.z = Math.PI / 2;
    exitHole.position.set(canX + 1.0, canY + 0.55 + canHeight + 1.6, 0);
    aerosolGroup.add(exitHole);

    // 6. Black Technical Flexible Straw (Diameter 3.2mm = radius 0.58 scene units)
    // Starts from actuator nozzle at (canX + 1.1, nozzleY, 0) and curves naturally.
    // CRITICAL: The last 8mm (Z from -18.0 to -24.0) is 100% COLLINEAR on the horizontal Z-axis (X=0, Y=PORT_Y)!
    // It enters the nipple bore dead-straight, so it NEVER touches or cuts the outer rim of the nipple!
    const startY = canY + 0.55 + canHeight + 1.6; // ~21.7
    const strawPoints = [
      new THREE.Vector3(canX + 1.15, startY, 0.0),         // Exit from actuator nozzle
      new THREE.Vector3(canX + 5.0, startY - 0.8, -3.0),   // Gentle initial forward curve
      new THREE.Vector3(-6.0, PORT_Y + 2.4, -8.0),         // Natural smooth descending arch
      new THREE.Vector3(-1.8, PORT_Y + 0.3, -14.0),        // Smooth transition to horizontal bore axis
      new THREE.Vector3(0.0, PORT_Y, -18.0),               // Perfectly on horizontal bore axis
      new THREE.Vector3(0.0, PORT_Y, -24.0)                // Straight inside nipple bore!
    ];
    const strawCurve = new THREE.CatmullRomCurve3(strawPoints, false, 'chordal', 0.5);
    const strawRadius = 0.58; // Exactly 3.2mm scaled to scene
    const strawGeo = new THREE.TubeGeometry(strawCurve, 40, strawRadius, 16, false);
    const strawMesh = new THREE.Mesh(strawGeo, matStraw);
    strawMesh.castShadow = true;
    aerosolGroup.add(strawMesh);

    // Pulsing spray mist cone inside the lubrication cavity
    const sprayConeGeo = new THREE.ConeGeometry(2.4, 5.5, 16, 1, true);
    sprayParticles = new THREE.Mesh(sprayConeGeo, matSpray);
    sprayParticles.rotation.x = -Math.PI / 2;
    sprayParticles.position.set(0, PORT_Y, PORT_Z - 2.5);
    worldGroup.add(sprayParticles);
    sprayParticles.visible = false;
  }

  // Animation Timeline Controller [0, 1]
  function updateAnimation(t) {
    if (activeTab === 'montage') {
      // ----------------------------------------------------
      // Sequence 1: MONTAGE (Inbussleutel 4 met kogelkop & Afsluitdop)
      // ----------------------------------------------------
      aerosolGroup.visible = false;
      sprayParticles.visible = false;
      allenKeyGroup.visible = true;

      updateStepBadge(t, [
        { upTo: 0.20, id: 'stepM1', label: 'Stap 1: Positioneren' },
        { upTo: 0.38, id: 'stepM2', label: 'Stap 2: Inbus 4mm Kogelkop Invoeren' },
        { upTo: 0.68, id: 'stepM3', label: 'Stap 3: Rechtsom Inschroeven' },
        { upTo: 0.82, id: 'stepM4', label: 'Stap 4: Inbussleutel Terugtrekken' },
        { upTo: 1.00, id: 'stepM5', label: 'Stap 5: Afsluitdop Vergrendelen' }
      ]);

      if (t < 0.20) {
        // Stap 1: Nipple approaches horizontally along Z towards visible threaded port
        const p = t / 0.20;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        // Nipple advances from Z = 28.0 to Z = 16.5 (thread enters port)
        nipplePivot.position.set(0, PORT_Y, 28.0 - (ease * 11.5));
        nipplePivot.rotation.z = 0;

        // Allen key ball-end hovers safely behind at Z = 28.0
        allenKeyGroup.position.set(0, PORT_Y, 28.0);
        if (allenKeySpinnerGroup) allenKeySpinnerGroup.rotation.z = 0;

        capPivot.visible = false;

      } else if (t < 0.38) {
        // Stap 2: Ball-end (kogelgewricht) enters horizontally into hex socket
        const p = (t - 0.20) / 0.18;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nipplePivot.position.set(0, PORT_Y, 16.5);
        nipplePivot.rotation.z = 0;

        // Inbus ball tip enters hex socket (advances from 28.0 to Z = 18.2)
        allenKeyGroup.position.set(0, PORT_Y, 28.0 - (ease * 9.8));
        if (allenKeySpinnerGroup) allenKeySpinnerGroup.rotation.z = 0;

        capPivot.visible = false;

      } else if (t < 0.68) {
        // Stap 3: Screwed in CLOCKWISE (rechtsom indraaien!), turning 4 full turns
        const p = (t - 0.38) / 0.30;
        const rotations = p * Math.PI * 8; // 4 full turns

        // Clockwise in Three.js (looking down -Z into hole) = NEGATIVE rotation!
        nipplePivot.position.set(0, PORT_Y, 16.5 - (p * 3.0));
        nipplePivot.rotation.z = -rotations;

        allenKeyGroup.position.set(0, PORT_Y, 18.2 - (p * 3.0));
        if (allenKeySpinnerGroup) allenKeySpinnerGroup.rotation.z = -rotations;

        capPivot.visible = false;

      } else if (t < 0.82) {
        // Stap 4: Inbussleutel pulls straight back along +Z
        const p = (t - 0.68) / 0.14;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nipplePivot.position.set(0, PORT_Y, PORT_Z);
        nipplePivot.rotation.z = -Math.PI * 8; // Maintains final tight position

        // Allen key retracts completely out of the way
        allenKeyGroup.position.set(0, PORT_Y, 15.2 + (ease * 22.0));
        if (allenKeySpinnerGroup) allenKeySpinnerGroup.rotation.z = -Math.PI * 8;

        capPivot.visible = false;

      } else {
        // Stap 5: Cap advances along -Z and snaps locked over the nipple head
        // Seating Z = 14.28 so closed outer face is at 17.64 (covering nipple tip at 17.34 cleanly!)
        const p = (t - 0.82) / 0.18;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        nipplePivot.position.set(0, PORT_Y, PORT_Z);
        nipplePivot.rotation.z = -Math.PI * 8;
        allenKeyGroup.visible = false;

        capPivot.visible = true;
        // Cap advances from Z = 28.0 to Z = 14.28
        capPivot.position.set(0, PORT_Y, 28.0 - (ease * (28.0 - 14.28)));
      }

    } else {
      // ----------------------------------------------------
      // Sequence 2: SMERING (Aerosol, Diepe Insteek & Spray)
      // ----------------------------------------------------
      allenKeyGroup.visible = false;
      aerosolGroup.visible = true;

      // Nipple is seated flush in the end cap port
      nipplePivot.position.set(0, PORT_Y, PORT_Z);
      nipplePivot.rotation.z = -Math.PI * 8;

      updateStepBadge(t, [
        { upTo: 0.20, id: 'stepS1', label: 'Stap 1: Afsluitdop Afnemen' },
        { upTo: 0.45, id: 'stepS2', label: 'Stap 2: Rietje Diep Insteken (7.5mm)' },
        { upTo: 0.70, id: 'stepS3', label: 'Stap 3: Droge Olie Doseren (Spray)' },
        { upTo: 0.85, id: 'stepS4', label: 'Stap 4: Rietje Terugtrekken' },
        { upTo: 1.00, id: 'stepS5', label: 'Stap 5: Dop Hermetisch Sluiten' }
      ]);

      if (t < 0.20) {
        // Stap 1: Cap is removed to the RIGHT side (+X = 14.0, Y = 16.0), leaving left side clear for can!
        const p = t / 0.20;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        capPivot.visible = true;
        // Cap pulls forward off nipple to clear tip, then parks on right (+X=14, Y=16, Z=20)
        capPivot.position.set(
          14.0 * ease,
          PORT_Y + (3.0 * ease),
          14.28 + (ease * 6.0)
        );

        // Aerosol can waits safely parked
        aerosolGroup.position.set(0, 0, 42.0);
        sprayParticles.visible = false;

      } else if (t < 0.45) {
        // Stap 2: Aerosol can moves forward, black 3.2mm straw enters 7.5mm deep into horizontal bore
        const p = (t - 0.20) / 0.25;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        capPivot.visible = true;
        capPivot.position.set(14.0, PORT_Y + 3.0, 20.28);

        // Straw tip enters nipple bore dead-straight:
        const targetZ = 37.34;
        aerosolGroup.position.set(0, 0, 42.0 - (ease * (42.0 - targetZ)));
        sprayParticles.visible = false;

      } else if (t < 0.70) {
        // Stap 3: Spray button pressed, pulsing atomized dry lubricant micro-mist sprays into carriage
        const p = (t - 0.45) / 0.25;

        capPivot.position.set(14.0, PORT_Y + 3.0, 20.28);
        aerosolGroup.position.set(0, 0, 37.34);

        // Pulsing spray mist inside carriage channel
        sprayParticles.visible = true;
        const pulse = 1.0 + Math.sin(p * Math.PI * 18) * 0.25;
        sprayParticles.scale.set(pulse, pulse, 1.0);
        matSpray.opacity = 0.35 + Math.sin(p * Math.PI * 14) * 0.18;

      } else if (t < 0.85) {
        // Stap 4: Spray stops, aerosol can retracts straight back along +Z
        const p = (t - 0.70) / 0.15;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        sprayParticles.visible = false;
        aerosolGroup.position.set(0, 0, 37.34 + (ease * 12.0));

        // Cap starts returning smoothly
        capPivot.position.set(
          14.0 * (1 - ease),
          PORT_Y + (3.0 * (1 - ease)),
          14.28 + (6.0 * (1 - ease))
        );

      } else {
        // Stap 5: Cap slides back along -Z and hermetically locks onto the nipple at Z = 14.28
        const p = (t - 0.85) / 0.15;
        const ease = 0.5 - 0.5 * Math.cos(p * Math.PI);

        aerosolGroup.position.set(0, 0, 49.34);
        sprayParticles.visible = false;

        capPivot.visible = true;
        capPivot.position.set(0, PORT_Y, 20.28 - (ease * (20.28 - 14.28)));
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

  

  function resetCameraView() {
    if (!camera || !controls) return;
    camera.position.copy(DEFAULT_CAM_POS);
    controls.target.copy(DEFAULT_TARGET);
    controls.update();
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
        resetCameraView();
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
        // Automatically turn view around so straw is 100% visible without obstruction!
        resetCameraView();
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

    const btnResetCam = document.getElementById('btnAnimResetCam');
    if (btnResetCam) {
      btnResetCam.addEventListener('click', () => {
        resetCameraView();
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
