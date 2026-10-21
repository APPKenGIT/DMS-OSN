/**
 * Oliesmeernippel — Interactive 3D WebGL Viewer (Three.js)
 * De Meester Industries
 * Real CAD 3D Model integration with Assembly, Isolation & Exploded View
 */

(function () {
  'use strict';

  // Constants & Scale
  const MODEL_SCALE = 0.35;        // CAD mm to Three.js units (14mm -> ~4.9 units)
  const MAX_EXPLODE_MM = 14.0;      // Max separation in CAD mm
  const NIPPLE_TOP_Y_MM = 8.0;      // CAD Y coord of nipple top face
  const CAP_BASE_MOUNTED_Y_MM = 1.5;// CAD Y coord of cap bottom face when mounted
  const CAP_CENTER_MM = 5.0;        // CAD Y center of cap

  // Scene state
  let scene, camera, renderer, controls;
  let modelRootGroup, nippelGroup, capGroup, strawGroup, shadowMesh, guideLine;
  let matRVS304, matRVS316, matCap, matDark, matStraw;
  
  let currentMaterialType = 'rvs304';
  let currentComponentMode = 'assembly'; // 'assembly' | 'nippel' | 'cap'
  let currentExplodePercent = 0;        // 0 to 100
  let isStrawVisible = false;
  let isAutoRotating = true;
  let lastUserInteraction = Date.now();
  let animationFrameId = null;
  let explodeAnimFrame = null;

  // DOM elements
  const container = document.getElementById('canvasWrapper');
  const canvas = document.getElementById('threeCanvas');
  const fallbackImg = document.getElementById('fallbackImage');
  const viewerLabel = document.getElementById('viewerLabel');
  const viewerExplodeBar = document.getElementById('viewerExplodeBar');
  const explodeSlider = document.getElementById('explodeSlider');
  const explodePercent = document.getElementById('explodePercent');
  const btnExplodeToggle = document.getElementById('btnExplodeToggle');
  const materialToggleWrap = document.getElementById('materialToggleWrap');

  if (!container || !canvas) return;

  function init() {
    // 1. Scene setup — pure white technical background
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFFFFFF);
    scene.fog = new THREE.Fog(0xFFFFFF, 18, 40);

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(38, aspect, 0.1, 100);
    camera.position.set(5.2, 3.4, 6.2);

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

    // 4. OrbitControls
    if (typeof THREE.OrbitControls !== 'undefined') {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = 2.8;
      controls.maxDistance = 16.0;
      controls.maxPolarAngle = Math.PI * 0.88;
      controls.target.set(0, 1.25 * MODEL_SCALE, 0);

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
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Key directional light with sharp soft shadow
    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 1.35);
    keyLight.position.set(7, 11, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.bias = -0.0004;
    scene.add(keyLight);

    // Rim highlight light (warm metallic edge)
    const rimLight = new THREE.DirectionalLight(0xE5A024, 0.45);
    rimLight.position.set(-7, 6, -6);
    scene.add(rimLight);

    // Front soft fill light
    const fillLight = new THREE.DirectionalLight(0x94A3B8, 0.55);
    fillLight.position.set(0, -3, 8);
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
    const shadowGeo = new THREE.PlaneGeometry(12, 12);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.14 });
    shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -6.0 * MODEL_SCALE - 0.05; // Placed right under bottom of nipple
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
      dashSize: 0.15,
      gapSize: 0.10,
      linewidth: 2,
      transparent: true,
      opacity: 0.75
    });
    guideLine = new THREE.Line(lineGeo, lineMat);
    guideLine.computeLineDistances();
    guideLine.frustumCulled = false;
    guideLine.visible = false;
    scene.add(guideLine);
  }

  function updateGuideLine(explodeMm) {
    if (!guideLine) return;
    if (currentComponentMode !== 'assembly' || explodeMm < 0.3) {
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
    // Straw entering top bore
    const strawTubeGeo = new THREE.CylinderGeometry(0.8, 0.8, 14, 24);
    const strawTube = new THREE.Mesh(strawTubeGeo, matStraw);
    strawTube.position.y = 12.0;
    strawTube.castShadow = true;
    strawGroup.add(strawTube);

    // Aerosol spray cone indicator
    const sprayGeo = new THREE.ConeGeometry(2.2, 4.0, 16, 1, true);
    const matSpray = new THREE.MeshBasicMaterial({
      color: 0xFFFAEE,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const sprayMesh = new THREE.Mesh(sprayGeo, matSpray);
    sprayMesh.position.y = 4.0;
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
          // Clear any fallback meshes in nippelGroup
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

      // 2. Cap CAD Model
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
          // Clear any fallback meshes in capGroup
          while (capGroup.children.length > 0) {
            capGroup.remove(capGroup.children[0]);
          }
          capGroup.add(obj);
          capLoaded = true;
          updateComponentMode(currentComponentMode);
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

  // Exploded View Slider & Animation
  function setExplodePercent(percent, animate = false) {
    currentExplodePercent = Math.max(0, Math.min(100, percent));
    const explodeMm = (currentExplodePercent / 100) * MAX_EXPLODE_MM;

    if (explodeSlider) explodeSlider.value = currentExplodePercent;
    if (explodePercent) explodePercent.textContent = `${Math.round(currentExplodePercent)}%`;

    if (btnExplodeToggle) {
      btnExplodeToggle.textContent = currentExplodePercent > 50 ? 'Samenvoegen' : 'Explodeer';
    }

    if (currentComponentMode === 'assembly') {
      capGroup.position.set(0, explodeMm * MODEL_SCALE, 0);
      updateGuideLine(explodeMm);

      // Adjust controls target slightly upward during explosion to keep assembly centered
      if (controls && !animate) {
        controls.target.y = (1.25 + (explodeMm * 0.45)) * MODEL_SCALE;
      }
    }
  }

  function animateExplodeTo(targetPercent, duration = 500) {
    if (explodeAnimFrame) cancelAnimationFrame(explodeAnimFrame);

    const startPercent = currentExplodePercent;
    const diff = targetPercent - startPercent;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const val = startPercent + diff * ease;

      setExplodePercent(val, true);

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
  function updateComponentMode(mode) {
    currentComponentMode = mode;

    // Update Mode Tabs UI
    document.querySelectorAll('[data-component-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-component-mode') === mode);
    });

    if (mode === 'assembly') {
      // 1. Assembly Mode: both visible, explode bar active
      nippelGroup.visible = true;
      capGroup.visible = true;
      if (viewerExplodeBar) viewerExplodeBar.style.display = 'flex';
      if (materialToggleWrap) materialToggleWrap.style.display = 'flex';

      // Restore cap position based on current explode slider
      const explodeMm = (currentExplodePercent / 100) * MAX_EXPLODE_MM;
      capGroup.position.set(0, explodeMm * MODEL_SCALE, 0);
      updateGuideLine(explodeMm);

      if (shadowMesh) shadowMesh.position.y = -6.0 * MODEL_SCALE - 0.05;

      if (viewerLabel) {
        viewerLabel.textContent = 'FIG. 01 — SAMENSTELLING (ASSEMBLY & EXPLODED VIEW)';
      }
      tweenCamera(
        new THREE.Vector3(5.2, 3.4, 6.2),
        new THREE.Vector3(0, (1.25 + (explodeMm * 0.45)) * MODEL_SCALE, 0)
      );

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
      tweenCamera(
        new THREE.Vector3(4.6, 2.6, 5.6),
        new THREE.Vector3(0, 1.0 * MODEL_SCALE, 0)
      );

    } else if (mode === 'cap') {
      // 3. Cap Only: rotate freely around cap at origin (0, 0, 0)
      nippelGroup.visible = false;
      capGroup.visible = true;
      if (viewerExplodeBar) viewerExplodeBar.style.display = 'none';
      if (materialToggleWrap) materialToggleWrap.style.display = 'none';
      if (guideLine) guideLine.visible = false;

      // Center cap around origin (Y CAD center was ~5.0mm)
      capGroup.position.set(0, -CAP_CENTER_MM * MODEL_SCALE, 0);

      if (shadowMesh) shadowMesh.position.y = (-CAP_CENTER_MM + 1.5) * MODEL_SCALE - 0.05;

      if (viewerLabel) {
        viewerLabel.textContent = 'FIG. 03 — AFSLUITDOP (POLYAMIDE METAALDETECTEERBAAR)';
      }
      tweenCamera(
        new THREE.Vector3(3.8, 2.4, 4.6),
        new THREE.Vector3(0, 0, 0)
      );
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

  // Camera presets
  function tweenCamera(targetPos, targetLookAt, duration = 750) {
    isAutoRotating = false;
    lastUserInteraction = Date.now();

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();

    function update(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 0.5 - 0.5 * Math.cos(progress * Math.PI);

      camera.position.lerpVectors(startPos, targetPos, ease);
      controls.target.lerpVectors(startTarget, targetLookAt, ease);
      controls.update();

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    requestAnimationFrame(update);
  }

  function setView(viewName) {
    if (fallbackImg) fallbackImg.style.display = 'none';
    if (canvas) canvas.style.display = 'block';

    document.querySelectorAll('.viewer-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-view="${viewName}"]`);
    if (btn) btn.classList.add('active');

    // Turn off straw if switching away
    if (viewName !== 'straw' && isStrawVisible) {
      isStrawVisible = false;
      strawGroup.visible = false;
    }

    const currentTargetY = controls.target.y;

    switch (viewName) {
      case 'side':
        if (viewerLabel) viewerLabel.textContent = 'ZIJAANZICHT (SCHROEFDRAAD & PROFIEL)';
        tweenCamera(new THREE.Vector3(0, currentTargetY, 7.8), new THREE.Vector3(0, currentTargetY, 0));
        break;

      case 'top':
        if (viewerLabel) viewerLabel.textContent = 'BOVENAANZICHT (INBUS & RIETJE-BORING)';
        tweenCamera(new THREE.Vector3(0, currentTargetY + 7.5, 0.05), new THREE.Vector3(0, currentTargetY, 0));
        break;

      case 'straw':
        isStrawVisible = true;
        strawGroup.visible = true;
        // Ensure nipple is visible for straw demo
        if (currentComponentMode === 'cap') {
          updateComponentMode('assembly');
        }
        if (viewerLabel) viewerLabel.textContent = 'DEMO: RIETJE-INVOER & AFSLUITING';
        tweenCamera(new THREE.Vector3(4.5, 3.2, 5.2), new THREE.Vector3(0, 2.5 * MODEL_SCALE, 0));
        break;

      case 'iso':
      default:
        if (viewerLabel) viewerLabel.textContent = '3D ISOMETRISCH (VRIJ ROTEREN)';
        tweenCamera(new THREE.Vector3(5.2, 3.4, 6.2), new THREE.Vector3(0, currentTargetY, 0));
        break;
    }
  }

  function show2DFallback(key) {
    if (!fallbackImg) return;
    const paths = {
      side: 'assets/images/view-side.png',
      top: 'assets/images/view-front.png',
      cap: 'assets/images/view-cap.png'
    };
    fallbackImg.src = paths[key] || paths.side;
    fallbackImg.style.display = 'block';
    if (canvas) canvas.style.display = 'none';

    document.querySelectorAll('.viewer-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-2d="${key}"]`);
    if (btn) btn.classList.add('active');

    if (viewerLabel) {
      viewerLabel.textContent = `2D RENDER — ${key.toUpperCase()}`;
    }
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

    // Reset View button
    const btnResetView = document.getElementById('btnResetView');
    if (btnResetView) {
      btnResetView.addEventListener('click', () => {
        setExplodePercent(0);
        updateComponentMode('assembly');
        setView('iso');
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

    // Toggle 2D / 3D fallback mode
    const btnToggle2D = document.getElementById('btnToggle2D');
    if (btnToggle2D) {
      btnToggle2D.addEventListener('click', () => {
        if (canvas.style.display === 'none') {
          setView('iso');
          btnToggle2D.textContent = 'Bekijk 2D Renders';
        } else {
          show2DFallback('side');
          btnToggle2D.textContent = 'Terug naar 3D Viewer';
        }
      });
    }
  }

  function onWindowResize() {
    if (!container || !camera || !renderer) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
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
    show2DFallback
  };
})();
