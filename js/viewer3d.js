/**
 * Oliesmeernippel — Interactive 3D WebGL Viewer (Three.js)
 * De Meester Industries
 * Real CAD 3D Model integration with Assembly, Isolation & Exploded View
 */

(function () {
  'use strict';

  // Constants & Scale
  const MODEL_SCALE = 0.35;          // CAD mm to Three.js units (14mm -> ~4.9 units)
  const MAX_EXPLODE_MM = 14.0;        // Max separation in CAD mm
  const NIPPLE_TOP_Y_MM = 8.0;        // CAD Y coord of nipple top face
  const CAP_BASE_MOUNTED_Y_MM = 2.0;  // CAD Y coord of cap open bottom rim when mounted
  const CAP_CENTER_MM = 5.5;          // CAD Y center of cap (range: 2.0 to 9.0 mm)

  // Scene state
  let scene, camera, renderer, controls;
  let modelRootGroup, nippelGroup, capGroup, strawGroup, shadowMesh, guideLine;
  let matRVS304, matRVS316, matCap, matDark, matStraw;
  
  let currentMaterialType = 'rvs304';
  let currentComponentMode = 'assembly'; // 'assembly' | 'nippel' | 'cap'
  let currentViewName = 'iso';           // 'iso' | 'side' | 'top' | 'straw'
  let currentExplodePercent = 0;          // 0 to 100
  let isStrawVisible = false;
  let isAutoRotating = true;
  let lastUserInteraction = Date.now();
  let animationFrameId = null;
  let explodeAnimFrame = null;
  let cameraTweenFrame = null;

  // DOM elements
  const container = document.getElementById('canvasWrapper');
  const canvas = document.getElementById('threeCanvas');
  const viewerLabel = document.getElementById('viewerLabel');
  const viewerExplodeBar = document.getElementById('viewerExplodeBar');
  const explodeSlider = document.getElementById('explodeSlider');
  const explodePercent = document.getElementById('explodePercent');
  const btnExplodeToggle = document.getElementById('btnExplodeToggle');
  const materialToggleWrap = document.getElementById('materialToggleWrap');

  if (!container || !canvas) return;

  function init() {
    // 1. Scene setup — pure white technical background with deep fog range
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF);
    scene.fog = new THREE.Fog(0xFFFFFF, 50, 160);

    // 2. Camera setup — balanced FOV with generous initial distance
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(36, aspect, 0.1, 200);

    // Initial default framing for mounted assembly
    const initialFrame = getFraming('assembly', 0, 'iso');
    camera.position.copy(initialFrame.position);

    // 3. Renderer setup
    renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 4. OrbitControls — allows wide zoom range but snaps back cleanly on presets
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 3.0;     // Closest allowed manual zoom-in
      controls.maxDistance = 85.0;    // Furthest allowed manual zoom-out
      controls.maxPolarAngle = Math.PI * 0.88;
      controls.target.copy(initialFrame.target);

      controls.addEventListener('start', () => {
        isAutoRotating = false;
        lastUserInteraction = Date.now();
      });
      controls.addEventListener('end', () => {
        lastUserInteraction = Date.now();
      });
    }

    // 5. Lighting
    setupLighting();

    // 6. Materials
    setupMaterials();

    // 7. Base groups & ground shadow
    modelRootGroup = new THREE.Group();
    scene.add(modelRootGroup);

    nippelGroup = new THREE.Group();
    capGroup = new THREE.Group();
    strawGroup = new THREE.Group();

    nippelGroup.scale.setScalar(MODEL_SCALE);
    capGroup.scale.setScalar(MODEL_SCALE);
    strawGroup.scale.setScalar(MODEL_SCALE);

    modelRootGroup.add(nippelGroup);
    modelRootGroup.add(capGroup);
    modelRootGroup.add(strawGroup);

    setupGroundShadow();
    setupGuideLine();
    setupStrawDemo();

    // 8. Load Real CAD OBJ Models (with procedural fallback)
    loadCADModels();

    // 9. Event listeners & UI bindings
    window.addEventListener('resize', onWindowResize);
    setupUIControls();

    // 10. Start Animation Loop
    animate();
  }

  function setupLighting() {
    // Hemispheric fill light
    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xC8D0DC, 1.05);
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    // Key directional light with wide shadow frustum to cover exploded model
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.35);
    keyLight.position.set(12, 22, 14);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 1.0;
    keyLight.shadow.camera.far = 70;
    keyLight.shadow.camera.left = -16;
    keyLight.shadow.camera.right = 16;
    keyLight.shadow.camera.top = 16;
    keyLight.shadow.camera.bottom = -16;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    // Rim highlight light (warm metallic edge)
    const rimLight = new THREE.DirectionalLight(0xE5A024, 0.45);
    rimLight.position.set(-12, 12, -12);
    scene.add(rimLight);

    // Front soft fill light
    const fillLight = new THREE.DirectionalLight(0x94A3B8, 0.55);
    fillLight.position.set(0, -4, 14);
    scene.add(fillLight);
  }

  function setupMaterials() {
    // RVS 304 - Brushed stainless steel
    matRVS304 = new THREE.MeshStandardMaterial({
      color: 0xDCE0E5,
      metalness: 0.88,
      roughness: 0.28,
      envMapIntensity: 1.0
    });

    // RVS 316 - Marine grade stainless steel (slightly deeper lustre)
    matRVS316 = new THREE.MeshStandardMaterial({
      color: 0xC6CCD4,
      metalness: 0.94,
      roughness: 0.18,
      envMapIntensity: 1.2
    });

    // Polyamide Metal-Detectable Cap (Signal Safety Blue)
    matCap = new THREE.MeshStandardMaterial({
      color: 0x1A6BC4,
      metalness: 0.08,
      roughness: 0.38,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25
    });

    // Internal dark bore cavity
    matDark = new THREE.MeshStandardMaterial({
      color: 0x1A1C1F,
      metalness: 0.6,
      roughness: 0.5
    });

    // Straw (Technical Red)
    matStraw = new THREE.MeshStandardMaterial({
      color: 0xDE3628,
      metalness: 0.05,
      roughness: 0.32
    });
  }

  function setupGroundShadow() {
    const shadowGeo = new THREE.PlaneGeometry(24, 24);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.14 });
    shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -6.0 * MODEL_SCALE - 0.05; // Base of nipple
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);
  }

  function setupGuideLine() {
    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array([
      0, NIPPLE_TOP_Y_MM * MODEL_SCALE, 0,
      0, CAP_BASE_MOUNTED_Y_MM * MODEL_SCALE, 0
    ]);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineDashedMaterial({
      color: 0x1A6BC4,
      dashSize: 0.18,
      gapSize: 0.12,
      linewidth: 2,
      transparent: true,
      opacity: 0.8
    });
    guideLine = new THREE.Line(lineGeo, lineMat);
    guideLine.computeLineDistances();
    guideLine.frustumCulled = false;
    guideLine.visible = false;
    scene.add(guideLine);
  }

  function updateGuideLine(explodeMm) {
    if (!guideLine) return;
    if (currentComponentMode !== 'assembly' || isStrawVisible || explodeMm < 0.3) {
      guideLine.visible = false;
      return;
    }
    guideLine.visible = true;
    const positions = guideLine.geometry.attributes.position.array;
    positions[0] = 0;
    positions[1] = NIPPLE_TOP_Y_MM * MODEL_SCALE;
    positions[2] = 0;
    positions[3] = 0;
    positions[4] = (CAP_BASE_MOUNTED_Y_MM + explodeMm) * MODEL_SCALE;
    positions[5] = 0;
    guideLine.geometry.attributes.position.needsUpdate = true;
    guideLine.computeLineDistances();
  }

  function setupStrawDemo() {
    // Straw entering deep into top bore:
    // Nipple top is Y=8.0, bore bottom is Y=-6.0.
    // Straw reaches down to Y=0.5 (penetrates 7.5mm into the nipple),
    // and extends up to Y=21.0mm (total length 20.5mm, center Y=10.75mm).
    const strawTubeGeo = new THREE.CylinderGeometry(0.75, 0.75, 20.5, 24);
    const strawTube = new THREE.Mesh(strawTubeGeo, matStraw);
    strawTube.position.y = 10.75;
    strawTube.castShadow = true;
    strawGroup.add(strawTube);

    // Aerosol spray cone indicator emerging from bottom thread tip (Y = -6.0 down to Y = -11.0)
    const sprayGeo = new THREE.ConeGeometry(2.0, 5.0, 16, 1, true);
    const matSpray = new THREE.MeshBasicMaterial({
      color: 0xFFFBF0,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    const sprayMesh = new THREE.Mesh(sprayGeo, matSpray);
    sprayMesh.rotation.x = Math.PI; // Expands downward as spray leaves nozzle
    sprayMesh.position.y = -8.5;
    strawGroup.add(sprayMesh);

    strawGroup.visible = false;
  }

  // Load CAD OBJ Models with graceful fallback
  function loadCADModels() {
    let nippelLoaded = false;
    let capLoaded = false;

    if (typeof THREE.OBJLoader !== 'undefined') {
      const loader = new THREE.OBJLoader();

      // 1. Nipple CAD Model
      loader.load(
        'assets/models/osn_nippel.obj',
        (obj) => {
          const activeMat = (currentMaterialType === 'rvs304') ? matRVS304 : matRVS316;
          obj.traverse((child) => {
            if (child.isMesh) {
              child.geometry.computeVertexNormals();
              child.material = activeMat;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          while (nippelGroup.children.length > 0) {
            nippelGroup.remove(nippelGroup.children[0]);
          }
          nippelGroup.add(obj);
          nippelLoaded = true;
        },
        undefined,
        (err) => {
          console.warn('CAD Nipple OBJ could not be loaded, using procedural fallback:', err);
          if (!nippelLoaded) buildProceduralNipple();
        }
      );

      // 2. Cap CAD Model (Correct orientation: open bottom, closed top)
      loader.load(
        'assets/models/osn_cap_mounted.obj',
        (obj) => {
          obj.traverse((child) => {
            if (child.isMesh) {
              child.geometry.computeVertexNormals();
              child.material = matCap;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          while (capGroup.children.length > 0) {
            capGroup.remove(capGroup.children[0]);
          }
          capGroup.add(obj);
          capLoaded = true;
          updateComponentMode(currentComponentMode, false);
        },
        undefined,
        (err) => {
          console.warn('CAD Cap OBJ could not be loaded, using procedural fallback:', err);
          if (!capLoaded) buildProceduralCap();
        }
      );
    } else {
      console.warn('OBJLoader not available, building procedural models.');
      buildProceduralNipple();
      buildProceduralCap();
    }
  }

  // Procedural geometry fallbacks
  function buildProceduralNipple() {
    const activeMat = (currentMaterialType === 'rvs304') ? matRVS304 : matRVS316;
    const bodyGeo = new THREE.CylinderGeometry(3.0, 3.0, 4.0, 6);
    const body = new THREE.Mesh(bodyGeo, activeMat);
    body.position.y = 5.0;
    body.castShadow = true;
    body.receiveShadow = true;
    nippelGroup.add(body);

    const threadGeo = new THREE.CylinderGeometry(2.5, 2.5, 8.0, 32);
    const thread = new THREE.Mesh(threadGeo, activeMat);
    thread.position.y = -1.0;
    thread.castShadow = true;
    thread.receiveShadow = true;
    nippelGroup.add(thread);

    const boreGeo = new THREE.CylinderGeometry(1.2, 1.2, 10.0, 24);
    const bore = new THREE.Mesh(boreGeo, matDark);
    bore.position.y = 3.5;
    nippelGroup.add(bore);
  }

  function buildProceduralCap() {
    const capBodyGeo = new THREE.CylinderGeometry(5.8, 5.8, 5.0, 32);
    const capBody = new THREE.Mesh(capBodyGeo, matCap);
    capBody.position.y = 4.5;
    capBody.castShadow = true;
    capGroup.add(capBody);

    const capDomeGeo = new THREE.SphereGeometry(5.8, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.35);
    const capDome = new THREE.Mesh(capDomeGeo, matCap);
    capDome.position.y = 7.0;
    capDome.castShadow = true;
    capGroup.add(capDome);
  }

  /**
   * Unified Framing Calculator
   * Determines the exact bounding height, vertical center, and optimal camera distance
   * so the model is NEVER cropped and ALWAYS centered with generous margins.
   */
  function getFraming(mode, explodePercent, viewName) {
    let targetY = 0;
    let distance = 16.0;

    if (viewName === 'straw') {
      // Straw demo: spans from spray cone tip (-11.0mm) to straw top (+21.0mm) = 32mm total
      // Center Y = +5.0mm (1.75 Three.js units). Generous distance so full straw & spray fit cleanly.
      targetY = 5.0 * MODEL_SCALE;
      distance = 34.0;
    } else if (mode === 'cap') {
      // Cap only: centered at origin (0, 0, 0), height 7mm, width 12mm
      targetY = 0;
      distance = 13.5;
    } else if (mode === 'nippel') {
      // Nipple only: Y from -6.0mm to +8.0mm, height 14mm, center = 1.0mm
      targetY = 1.0 * MODEL_SCALE;
      distance = 16.0;
    } else {
      // Assembly mode:
      // Mounted (0%): Y from -6.0mm to +9.0mm (height 15mm, center 1.5mm) -> distance 16.0
      // Exploded (100%): Y from -6.0mm to +23.0mm (height 29mm, center 8.5mm) -> distance 32.0
      const t = Math.max(0, Math.min(100, explodePercent)) / 100;
      targetY = (1.5 + 7.0 * t) * MODEL_SCALE;
      distance = 16.0 + 16.0 * t;
    }

    // Adapt distance if container is narrow or portrait
    if (container && camera) {
      const aspect = container.clientWidth / Math.max(1, container.clientHeight);
      if (aspect < 1.15) {
        distance /= Math.max(0.60, aspect);
      }
    }

    const target = new THREE.Vector3(0, targetY, 0);
    let position = new THREE.Vector3();

    switch (viewName) {
      case 'side':
        position.set(0, targetY, distance);
        break;

      case 'top':
        position.set(0, targetY + distance, 0.01);
        break;

      case 'straw':
        position.set(distance * 0.52, targetY + distance * 0.32, distance * 0.70);
        break;

      case 'iso':
      default:
        // Isometric 3D angle: 24-deg elevation, crisp perspective
        position.set(distance * 0.58, targetY + distance * 0.38, distance * 0.72);
        break;
    }

    return { position, target, distance, targetY };
  }

  // Exploded View Slider & Animation
  function setExplodePercent(percent, animate = false) {
    currentExplodePercent = Math.max(0, Math.min(100, percent));
    const explodeMm = (currentExplodePercent / 100) * MAX_EXPLODE_MM;

    if (explodeSlider) explodeSlider.value = currentExplodePercent;
    if (explodePercent) explodePercent.textContent = `${Math.round(currentExplodePercent)}%`;

    if (btnExplodeToggle) {
      btnExplodeToggle.textContent = currentExplodePercent > 50 ? 'Samenvoegen' : 'Explodeer';
    }

    if (currentComponentMode === 'assembly' && !isStrawVisible) {
      capGroup.position.set(0, explodeMm * MODEL_SCALE, 0);
      updateGuideLine(explodeMm);

      const frame = getFraming('assembly', currentExplodePercent, currentViewName);

      if (controls) {
        controls.target.y = frame.targetY;

        // When actively sliding, smoothly adjust camera distance along current viewing ray
        // so the exploding cap never clips the top border of the canvas!
        if (!animate && camera) {
          const ray = camera.position.clone().sub(controls.target);
          if (ray.lengthSq() > 0.01) {
            ray.normalize().multiplyScalar(frame.distance);
            camera.position.copy(controls.target).add(ray);
          }
        }
      }
    }
  }

  function animateExplodeTo(targetPercent, duration = 600) {
    if (explodeAnimFrame) cancelAnimationFrame(explodeAnimFrame);

    const startPercent = currentExplodePercent;
    const diff = targetPercent - startPercent;
    const startTime = performance.now();

    // Calculate start & target camera framings
    const startFrame = getFraming('assembly', startPercent, currentViewName);
    const targetFrame = getFraming('assembly', targetPercent, currentViewName);

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      const val = startPercent + diff * ease;

      setExplodePercent(val, true);

      // Smoothly track camera during explode animation
      if (controls && camera) {
        camera.position.lerpVectors(startFrame.position, targetFrame.position, ease);
        controls.target.lerpVectors(startFrame.target, targetFrame.target, ease);
        controls.update();
      }

      if (progress < 1) {
        explodeAnimFrame = requestAnimationFrame(step);
      } else {
        explodeAnimFrame = null;
      }
    }
    explodeAnimFrame = requestAnimationFrame(step);
  }

  function toggleExplode() {
    if (currentExplodePercent > 50) {
      animateExplodeTo(0);
    } else {
      animateExplodeTo(100);
    }
  }

  // Component Mode Switcher: Assembly / Nipple / Cap
  function updateComponentMode(mode, triggerCamera = true) {
    currentComponentMode = mode;

    // Reset straw demo if switching component modes
    if (isStrawVisible) {
      isStrawVisible = false;
      strawGroup.visible = false;
      currentViewName = 'iso';
      const strawBtn = document.querySelector('[data-view="straw"]');
      if (strawBtn) strawBtn.classList.remove('active');
      const isoBtn = document.querySelector('[data-view="iso"]');
      if (isoBtn) isoBtn.classList.add('active');
    }

    // Update Mode Tabs UI
    document.querySelectorAll('[data-component-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-component-mode') === mode);
    });

    if (mode === 'assembly') {
      // 1. Assembly Mode: both visible, mounted, explode bar active
      nippelGroup.visible = true;
      capGroup.visible = true;
      if (viewerExplodeBar) viewerExplodeBar.style.display = 'flex';
      if (materialToggleWrap) materialToggleWrap.style.display = 'flex';

      const explodeMm = (currentExplodePercent / 100) * MAX_EXPLODE_MM;
      capGroup.position.set(0, explodeMm * MODEL_SCALE, 0);
      updateGuideLine(explodeMm);

      if (shadowMesh) shadowMesh.position.y = -6.0 * MODEL_SCALE - 0.05;

      if (viewerLabel) {
        viewerLabel.textContent = 'FIG. 01 — SAMENSTELLING (ASSEMBLY & EXPLODED VIEW)';
      }

      if (triggerCamera) {
        const frame = getFraming('assembly', currentExplodePercent, currentViewName);
        tweenCamera(frame.position, frame.target);
      }

    } else if (mode === 'nippel') {
      // 2. Nipple Only: rotate freely around nipple
      nippelGroup.visible = true;
      capGroup.visible = false;
      if (viewerExplodeBar) viewerExplodeBar.style.display = 'none';
      if (materialToggleWrap) materialToggleWrap.style.display = 'flex';
      if (guideLine) guideLine.visible = false;

      if (shadowMesh) shadowMesh.position.y = -6.0 * MODEL_SCALE - 0.05;

      if (viewerLabel) {
        viewerLabel.textContent = 'FIG. 02 — OLIESMEERNIPPEL (RVS · SCHROEFDRAAD & INBUS)';
      }

      if (triggerCamera) {
        const frame = getFraming('nippel', 0, currentViewName);
        tweenCamera(frame.position, frame.target);
      }

    } else if (mode === 'cap') {
      // 3. Cap Only: rotate freely around cap at origin (0, 0, 0)
      nippelGroup.visible = false;
      capGroup.visible = true;
      if (viewerExplodeBar) viewerExplodeBar.style.display = 'none';
      if (materialToggleWrap) materialToggleWrap.style.display = 'none';
      if (guideLine) guideLine.visible = false;

      // Center cap around origin (CAD Y center is 5.5mm)
      capGroup.position.set(0, -CAP_CENTER_MM * MODEL_SCALE, 0);

      // Contact shadow directly beneath cap open rim
      if (shadowMesh) shadowMesh.position.y = (-CAP_CENTER_MM + CAP_BASE_MOUNTED_Y_MM) * MODEL_SCALE - 0.05;

      if (viewerLabel) {
        viewerLabel.textContent = 'FIG. 03 — AFSLUITDOP (POLYAMIDE METAALDETECTEERBAAR)';
      }

      if (triggerCamera) {
        const frame = getFraming('cap', 0, currentViewName);
        tweenCamera(frame.position, frame.target);
      }
    }
  }

  // Material Toggle
  function setMaterial(type) {
    currentMaterialType = type;
    const newMat = (type === 'rvs304') ? matRVS304 : matRVS316;

    nippelGroup.traverse(child => {
      if (child.isMesh && child.material !== matDark) {
        child.material = newMat;
      }
    });

    document.querySelectorAll('[data-material]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-material') === type);
    });
  }

  // Camera presets & smooth transitions
  function tweenCamera(targetPos, targetLookAt, duration = 650) {
    if (cameraTweenFrame) cancelAnimationFrame(cameraTweenFrame);
    isAutoRotating = false;
    lastUserInteraction = Date.now();

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();

    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // easeOutCubic

      camera.position.lerpVectors(startPos, targetPos, ease);
      controls.target.lerpVectors(startTarget, targetLookAt, ease);
      controls.update();

      if (progress < 1) {
        cameraTweenFrame = requestAnimationFrame(update);
      } else {
        cameraTweenFrame = null;
      }
    }
    cameraTweenFrame = requestAnimationFrame(update);
  }

  function setView(viewName) {
    currentViewName = viewName;

    document.querySelectorAll('.viewer-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-view="${viewName}"]`);
    if (btn) btn.classList.add('active');

    // Handle Straw view specially
    if (viewName === 'straw') {
      isStrawVisible = true;
      strawGroup.visible = true;

      // Nipple must be visible
      nippelGroup.visible = true;

      // Crucial: Cap MUST be invisible during straw demo (a straw cannot penetrate the cap)
      capGroup.visible = false;

      // Hide explode controls & guideline during straw demo
      if (viewerExplodeBar) viewerExplodeBar.style.display = 'none';
      if (guideLine) guideLine.visible = false;

      if (shadowMesh) shadowMesh.position.y = -6.0 * MODEL_SCALE - 0.05;

      if (viewerLabel) {
        viewerLabel.textContent = 'FIG. 04 — DEMO: RIETJE-DOSERING (DOP VERWIJDERD)';
      }

      const frame = getFraming(currentComponentMode, currentExplodePercent, 'straw');
      tweenCamera(frame.position, frame.target);
      return;
    }

    // Leaving straw mode: turn straw off and restore cap visibility
    if (isStrawVisible) {
      isStrawVisible = false;
      strawGroup.visible = false;
      if (currentComponentMode === 'assembly') {
        capGroup.visible = true;
        if (viewerExplodeBar) viewerExplodeBar.style.display = 'flex';
        const explodeMm = (currentExplodePercent / 100) * MAX_EXPLODE_MM;
        updateGuideLine(explodeMm);
      } else if (currentComponentMode === 'cap') {
        capGroup.visible = true;
        nippelGroup.visible = false;
      }
    }

    // Update label for view
    if (viewName === 'side') {
      if (viewerLabel) viewerLabel.textContent = 'ZIJAANZICHT (SCHROEFDRAAD & PROFIEL)';
    } else if (viewName === 'top') {
      if (viewerLabel) viewerLabel.textContent = 'BOVENAANZICHT (INBUS & RIETJE-BORING)';
    } else {
      if (viewerLabel) {
        if (currentComponentMode === 'assembly') {
          viewerLabel.textContent = 'FIG. 01 — SAMENSTELLING (ASSEMBLY & EXPLODED VIEW)';
        } else if (currentComponentMode === 'nippel') {
          viewerLabel.textContent = 'FIG. 02 — OLIESMEERNIPPEL (RVS · SCHROEFDRAAD & INBUS)';
        } else {
          viewerLabel.textContent = 'FIG. 03 — AFSLUITDOP (POLYAMIDE METAALDETECTEERBAAR)';
        }
      }
    }

    const frame = getFraming(currentComponentMode, currentExplodePercent, viewName);
    tweenCamera(frame.position, frame.target);
  }

  // Setup UI event listeners
  function setupUIControls() {
    // Mode tabs: Assembly / Nipple / Cap
    document.querySelectorAll('[data-component-mode]').forEach(tab => {
      tab.addEventListener('click', () => {
        updateComponentMode(tab.getAttribute('data-component-mode'));
      });
    });

    // Explode slider
    if (explodeSlider) {
      explodeSlider.addEventListener('input', (e) => {
        isAutoRotating = false;
        lastUserInteraction = Date.now();
        setExplodePercent(parseFloat(e.target.value));
      });
    }

    // Explode toggle button
    if (btnExplodeToggle) {
      btnExplodeToggle.addEventListener('click', () => {
        isAutoRotating = false;
        lastUserInteraction = Date.now();
        toggleExplode();
      });
    }

    // Camera preset buttons
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        setView(btn.getAttribute('data-view'));
      });
    });

    // Material switch
    document.querySelectorAll('[data-material]').forEach(btn => {
      btn.addEventListener('click', () => {
        setMaterial(btn.getAttribute('data-material'));
      });
    });

    // Reset View button: restores beautiful default framing, collapses explosion, iso view
    const btnResetView = document.getElementById('btnResetView');
    if (btnResetView) {
      btnResetView.addEventListener('click', () => {
        setExplodePercent(0);
        currentViewName = 'iso';
        updateComponentMode('assembly', false);

        document.querySelectorAll('.viewer-btn').forEach(b => b.classList.remove('active'));
        const isoBtn = document.querySelector('[data-view="iso"]');
        if (isoBtn) isoBtn.classList.add('active');

        const frame = getFraming('assembly', 0, 'iso');
        tweenCamera(frame.position, frame.target);
      });
    }

    // Fullscreen viewer button
    const btnFullscreen = document.getElementById('btnFullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          container.requestFullscreen?.().catch(() => {});
        } else {
          document.exitFullscreen?.();
        }
      });
    }
  }

  function onWindowResize() {
    if (!container || !camera || !renderer) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    // Auto-rotate model slowly when idle for > 4 seconds
    if (controls) {
      if (Date.now() - lastUserInteraction > 4000) {
        isAutoRotating = true;
      }
      if (isAutoRotating) {
        modelRootGroup.rotation.y += 0.007;
      }
      controls.update();
    }

    renderer.render(scene, camera);
  }

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export functions to window
  window.NippleViewer = {
    updateComponentMode,
    setExplodePercent,
    toggleExplode,
    setView,
    setMaterial,
    getFraming
  };
})();
