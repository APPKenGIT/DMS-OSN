/**
 * Oliesmeernippel — Interactive 3D WebGL Viewer (Three.js)
 * De Meester Industries
 */

(function () {
  'use strict';

  let scene, camera, renderer, controls;
  let nippleGroup, capGroup, strawGroup, shadowMesh;
  let matRVS304, matRVS316, matCap, matDark, matStraw;
  let currentMaterialType = 'rvs304';
  let isCapVisible = false;
  let isStrawVisible = false;
  let isAutoRotating = true;
  let lastUserInteraction = Date.now();
  let animationFrameId;

  const container = document.getElementById('canvasWrapper');
  const canvas = document.getElementById('threeCanvas');
  const fallbackImg = document.getElementById('fallbackImage');
  const viewerLabel = document.getElementById('viewerLabel');

  if (!container || !canvas) return;

  function init() {
    // 1. Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x181B1F);
    scene.fog = new THREE.Fog(0x181B1F, 12, 28);

    // 2. Camera setup
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    camera.position.set(4.8, 3.2, 5.8);

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
      controls.minDistance = 3.2;
      controls.maxDistance = 14;
      controls.maxPolarAngle = Math.PI * 0.88;
      controls.target.set(0, 0, 0);

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

    // 7. Procedural 3D Geometry
    build3DModel();

    // 8. Event listeners
    window.addEventListener('resize', onWindowResize);
    setupUIControls();

    // 9. Animation loop
    animate();
  }

  function setupLighting() {
    // Ambient / Fill light
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x22262C, 0.85);
    scene.add(hemiLight);

    // Key Light (warm metallic reflection)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(6, 9, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Rim / Back light (accents the ribbed shank edges)
    const rimLight = new THREE.DirectionalLight(0xE5A024, 0.7);
    rimLight.position.set(-6, 4, -6);
    scene.add(rimLight);

    // Soft Front Fill
    const fillLight = new THREE.DirectionalLight(0xD8E0EA, 0.6);
    fillLight.position.set(0, -3, 6);
    scene.add(fillLight);
  }

  function setupMaterials() {
    // RVS 304 - Brushed stainless steel
    matRVS304 = new THREE.MeshStandardMaterial({
      color: 0xDCE0E5,
      metalness: 0.86,
      roughness: 0.28,
      envMapIntensity: 1.0
    });

    // RVS 316 - Marine grade stainless steel (slightly deeper tone, higher lustre)
    matRVS316 = new THREE.MeshStandardMaterial({
      color: 0xC8CFD7,
      metalness: 0.92,
      roughness: 0.20,
      envMapIntensity: 1.2
    });

    // Metal-detectable Polyamide Cap (Signal Safety Blue)
    matCap = new THREE.MeshStandardMaterial({
      color: 0x1E67B6,
      metalness: 0.08,
      roughness: 0.42,
      clearcoat: 0.3,
      clearcoatRoughness: 0.25
    });

    // Internal socket cavity (shadowed bore)
    matDark = new THREE.MeshStandardMaterial({
      color: 0x1A1C1F,
      metalness: 0.7,
      roughness: 0.6
    });

    // Aerosol straw (Technical Red)
    matStraw = new THREE.MeshStandardMaterial({
      color: 0xDE3628,
      metalness: 0.05,
      roughness: 0.35
    });
  }

  function build3DModel() {
    nippleGroup = new THREE.Group();
    scene.add(nippleGroup);

    const activeMat = (currentMaterialType === 'rvs304') ? matRVS304 : matRVS316;

    // A. Main Hexagonal Head (Zeskant kraag)
    const hexRadius = 1.75;
    const hexHeight = 1.35;
    const hexGeo = new THREE.CylinderGeometry(hexRadius, hexRadius, hexHeight, 6);
    const hexMesh = new THREE.Mesh(hexGeo, activeMat);
    hexMesh.position.y = 0.9;
    hexMesh.castShadow = true;
    hexMesh.receiveShadow = true;
    nippleGroup.add(hexMesh);

    // B. Beveled Transition Collar (Conische afdichtingsrand)
    const collarGeo = new THREE.CylinderGeometry(1.72, 1.38, 0.45, 32);
    const collarMesh = new THREE.Mesh(collarGeo, activeMat);
    collarMesh.position.y = 0.05;
    collarMesh.castShadow = true;
    nippleGroup.add(collarMesh);

    // C. Internal Hex Socket Cavity (Inbus uitsparing)
    const inbusGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.7, 6);
    const inbusMesh = new THREE.Mesh(inbusGeo, matDark);
    inbusMesh.position.y = 1.35;
    nippleGroup.add(inbusMesh);

    // D. Central Injection Bore for Straw (Rietje-insteekopening)
    const boreGeo = new THREE.CylinderGeometry(0.35, 0.35, 3.8, 24);
    const boreMesh = new THREE.Mesh(boreGeo, matDark);
    boreMesh.position.y = 0.3;
    nippleGroup.add(boreMesh);

    // E. Entrance Chamfer (Conische insteekhoek)
    const coneGeo = new THREE.ConeGeometry(0.65, 0.35, 24, 1, true);
    const coneMesh = new THREE.Mesh(coneGeo, matDark);
    coneMesh.position.y = 1.55;
    coneMesh.rotation.x = Math.PI;
    nippleGroup.add(coneMesh);

    // F. Ribbed Press Shank (Geribbelde persschacht)
    const shankLength = 2.6;
    const shankRadius = 1.26;
    const shankGeo = new THREE.CylinderGeometry(shankRadius, shankRadius * 0.98, shankLength, 32);
    const shankMesh = new THREE.Mesh(shankGeo, activeMat);
    shankMesh.position.y = -1.4;
    shankMesh.castShadow = true;
    shankMesh.receiveShadow = true;
    nippleGroup.add(shankMesh);

    // G. Concentric Retention Ribs (Anti-trilling ribbels)
    const ribCount = 4;
    const ribSpacing = 0.52;
    for (let i = 0; i < ribCount; i++) {
      const ribGeo = new THREE.TorusGeometry(shankRadius + 0.02, 0.12, 12, 32);
      const ribMesh = new THREE.Mesh(ribGeo, activeMat);
      ribMesh.rotation.x = Math.PI / 2;
      ribMesh.position.y = -0.65 - (i * ribSpacing);
      ribMesh.castShadow = true;
      nippleGroup.add(ribMesh);
    }

    // H. Shank Tip Chamfer (Insteekzoekrand onderzijde)
    const tipGeo = new THREE.CylinderGeometry(shankRadius * 0.98, 0.9, 0.3, 32);
    const tipMesh = new THREE.Mesh(tipGeo, activeMat);
    tipMesh.position.y = -2.85;
    tipMesh.castShadow = true;
    nippleGroup.add(tipMesh);

    // I. Safety Cap (Polyamide Metaaldetecteerbare Afsluitdop)
    capGroup = new THREE.Group();
    
    // Cap main sleeve
    const capBodyGeo = new THREE.CylinderGeometry(1.88, 1.88, 1.6, 32);
    const capBody = new THREE.Mesh(capBodyGeo, matCap);
    capBody.position.y = 0.95;
    capBody.castShadow = true;
    capGroup.add(capBody);

    // Cap domed top
    const capDomeGeo = new THREE.SphereGeometry(1.88, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.35);
    const capDome = new THREE.Mesh(capDomeGeo, matCap);
    capDome.position.y = 1.65;
    capDome.castShadow = true;
    capGroup.add(capDome);

    // Cap pull tab / grip ring
    const tabGeo = new THREE.BoxGeometry(0.35, 0.9, 0.8);
    const tabMesh = new THREE.Mesh(tabGeo, matCap);
    tabMesh.position.set(1.9, 1.2, 0);
    tabMesh.castShadow = true;
    capGroup.add(tabMesh);

    capGroup.visible = isCapVisible;
    nippleGroup.add(capGroup);

    // J. Straw Demo (Aerosol rietje passing)
    strawGroup = new THREE.Group();
    const strawTubeGeo = new THREE.CylinderGeometry(0.24, 0.24, 4.8, 24);
    const strawTube = new THREE.Mesh(strawTubeGeo, matStraw);
    strawTube.position.y = 2.4;
    strawTube.castShadow = true;
    strawGroup.add(strawTube);

    // Aerosol spray cone indicator
    const sprayGeo = new THREE.ConeGeometry(0.8, 1.4, 16, 1, true);
    const matSpray = new THREE.MeshBasicMaterial({
      color: 0xFFFAEE,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    const sprayMesh = new THREE.Mesh(sprayGeo, matSpray);
    sprayMesh.position.y = -0.8;
    strawGroup.add(sprayMesh);

    strawGroup.visible = isStrawVisible;
    nippleGroup.add(strawGroup);

    // K. Ground Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(10, 10);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -3.2;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);
  }

  function setMaterial(type) {
    currentMaterialType = type;
    const newMat = (type === 'rvs304') ? matRVS304 : matRVS316;

    nippleGroup.traverse(child => {
      if (child.isMesh && child.material !== matDark && child.material !== matCap && child.material !== matStraw) {
        child.material = newMat;
      }
    });

    // Update active button state
    document.querySelectorAll('[data-material]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-material') === type);
    });
  }

  function toggleCap(visible) {
    isCapVisible = (visible !== undefined) ? visible : !isCapVisible;
    if (capGroup) {
      capGroup.visible = isCapVisible;
    }
    const capBtn = document.getElementById('btnToggleCap');
    if (capBtn) {
      capBtn.classList.toggle('active', isCapVisible);
    }
    if (viewerLabel) {
      viewerLabel.textContent = isCapVisible 
        ? 'FIG. 03 — MET METAALDETECTEERBARE DOP' 
        : 'FIG. 01 — 3D ZIJAANZICHT';
    }
  }

  function toggleStraw(visible) {
    isStrawVisible = (visible !== undefined) ? visible : !isStrawVisible;
    if (strawGroup) {
      strawGroup.visible = isStrawVisible;
    }
    const strawBtn = document.getElementById('btnToggleStraw');
    if (strawBtn) {
      strawBtn.classList.toggle('active', isStrawVisible);
    }
  }

  function tweenCamera(targetPos, targetLookAt, duration = 800) {
    isAutoRotating = false;
    lastUserInteraction = Date.now();

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();

    function update() {
      const now = performance.now();
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
    // Hide 2D fallback if active
    if (fallbackImg) fallbackImg.style.display = 'none';
    if (canvas) canvas.style.display = 'block';

    document.querySelectorAll('.viewer-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`[data-view="${viewName}"]`);
    if (btn) btn.classList.add('active');

    switch (viewName) {
      case 'side':
        toggleCap(false);
        toggleStraw(false);
        if (viewerLabel) viewerLabel.textContent = 'FIG. 01 — ZIJAANZICHT (SCHACHT & PROFIEL)';
        tweenCamera(new THREE.Vector3(0, 0, 7.5), new THREE.Vector3(0, -0.6, 0));
        break;

      case 'top':
        toggleCap(false);
        toggleStraw(false);
        if (viewerLabel) viewerLabel.textContent = 'FIG. 02 — BOVENAANZICHT (INBUS & RIETJE-OPENING)';
        tweenCamera(new THREE.Vector3(0, 7.2, 0.05), new THREE.Vector3(0, 0.9, 0));
        break;

      case 'cap':
        toggleCap(true);
        toggleStraw(false);
        if (viewerLabel) viewerLabel.textContent = 'FIG. 03 — MET AFSLUITDOP (POLYAMIDE DETECTEERBAAR)';
        tweenCamera(new THREE.Vector3(4.2, 3.2, 5.2), new THREE.Vector3(0, 0, 0));
        break;

      case 'straw':
        toggleCap(false);
        toggleStraw(true);
        if (viewerLabel) viewerLabel.textContent = 'FIG. 04 — WERKING: RIETJE-DOSERING';
        tweenCamera(new THREE.Vector3(4.5, 2.5, 5.0), new THREE.Vector3(0, 0.8, 0));
        break;

      case 'iso':
      default:
        toggleStraw(false);
        if (viewerLabel) viewerLabel.textContent = 'FIG. 01 — 3D ISOMETRISCH (VRIJ ROTEREN)';
        tweenCamera(new THREE.Vector3(4.8, 3.2, 5.8), new THREE.Vector3(0, 0, 0));
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

  function setupUIControls() {
    // Camera presets
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

    // Cap toggle button
    const btnToggleCap = document.getElementById('btnToggleCap');
    if (btnToggleCap) {
      btnToggleCap.addEventListener('click', () => toggleCap());
    }

    // Straw toggle button
    const btnToggleStraw = document.getElementById('btnToggleStraw');
    if (btnToggleStraw) {
      btnToggleStraw.addEventListener('click', () => toggleStraw());
    }

    // Reset View button
    const btnResetView = document.getElementById('btnResetView');
    if (btnResetView) {
      btnResetView.addEventListener('click', () => setView('iso'));
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
          // Switch back to 3D
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

    // Auto rotate gently when user has not interacted for 4 seconds
    if (controls) {
      if (Date.now() - lastUserInteraction > 4000) {
        isAutoRotating = true;
      }
      if (isAutoRotating) {
        nippleGroup.rotation.y += 0.007;
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

  // Export functions to window for quick testing
  window.NippleViewer = {
    setView,
    setMaterial,
    toggleCap,
    toggleStraw,
    show2DFallback
  };
})();
