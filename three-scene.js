// Escena 3D de fondo para toda la página. Three.js se carga bajo demanda;
// si falla (sin WebGL o sin red), se elimina el canvas y la página queda igual.
const canvas = document.querySelector('.bg-3d');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function start() {
  if (!canvas) return;

  const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const FOV = 45;
  const CAMERA_Z = 10;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);
  camera.position.z = CAMERA_Z;
  const viewHeightAtZero = 2 * CAMERA_Z * Math.tan((FOV * Math.PI) / 360);

  // Tamaño y conversión píxeles -> unidades del mundo (plano z = 0).
  let vw = window.innerWidth;
  let vh = window.innerHeight;
  let k = viewHeightAtZero / vh;
  let isMobile = vw < 760;
  let docHeight = document.documentElement.scrollHeight;

  // Paleta: sale de las variables CSS, así que cambia con el tema.
  const palette = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
  const themed = [];
  let isLight = false;

  // ---------- Partículas con shader (campo de fondo) ----------
  const pointCount = isMobile ? 170 : 420;
  const positions = new Float32Array(pointCount * 3);
  const sizes = new Float32Array(pointCount);
  const phases = new Float32Array(pointCount);
  const mixes = new Float32Array(pointCount);
  for (let i = 0; i < pointCount; i += 1) {
    positions[i * 3] = Math.random() * 2 - 1;
    positions[i * 3 + 1] = Math.random() - 0.5;
    positions[i * 3 + 2] = -6 + Math.random() * 8;
    sizes[i] = 2 + Math.random() * 5;
    phases[i] = Math.random();
    mixes[i] = Math.random();
  }
  const pointsGeometry = new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  pointsGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  pointsGeometry.setAttribute('aMix', new THREE.BufferAttribute(mixes, 1));

  const pointsMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uOffset: { value: 0 },
      uW: { value: 1 },
      uH: { value: 1 },
      uPR: { value: renderer.getPixelRatio() },
      uMouse: { value: new THREE.Vector2(999, 999) },
      uMouseR: { value: 2.2 },
      uOpacity: { value: 0.9 },
      uC1: { value: palette[0] },
      uC2: { value: palette[1] },
      uC3: { value: palette[2] }
    },
    vertexShader: `
      uniform float uTime, uOffset, uW, uH, uPR, uMouseR;
      uniform vec2 uMouse;
      attribute float aSize, aPhase, aMix;
      varying float vMix, vAlpha;
      void main() {
        vec3 p = position;
        p.x *= uW;
        float f = 0.14 + 0.1 * (p.z + 6.0) / 8.0;
        p.y = mod(p.y * uH + uOffset * f + uH * 0.5, uH) - uH * 0.5;
        p.x += sin(uTime * 0.2 + aPhase * 6.28) * 0.18;
        p.y += cos(uTime * 0.17 + aPhase * 8.0) * 0.18;
        vec2 d = p.xy - uMouse;
        float push = smoothstep(uMouseR, 0.0, length(d));
        p.xy += normalize(d + 0.0001) * push * 0.9;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uPR * (10.0 / -mv.z) * (1.0 + push * 0.8);
        vMix = aMix;
        vAlpha = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.4 + aPhase * 6.28)) + push * 0.4;
      }`,
    fragmentShader: `
      uniform vec3 uC1, uC2, uC3;
      uniform float uOpacity;
      varying float vMix, vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = smoothstep(0.5, 0.0, d);
        vec3 col = vMix < 0.5 ? mix(uC1, uC2, vMix * 2.0) : mix(uC2, uC3, (vMix - 0.5) * 2.0);
        gl_FragColor = vec4(col, a * vAlpha * uOpacity);
      }`
  });
  const points = new THREE.Points(pointsGeometry, pointsMaterial);
  points.frustumCulled = false;
  scene.add(points);

  // ---------- Formas flotantes repartidas por la página ----------
  const makeShape = (geometry, colorIndex) => {
    const group = new THREE.Group();
    const edgeMaterial = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.6 });
    const fillMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.07, depthWrite: false, side: THREE.DoubleSide });
    group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial));
    group.add(new THREE.Mesh(geometry, fillMaterial));
    themed.push(() => {
      edgeMaterial.color.copy(palette[colorIndex]);
      fillMaterial.color.copy(palette[colorIndex]);
    });
    scene.add(group);
    return group;
  };

  const shapeSpecs = [
    { x: 0.07, y: 0.16, size: 70, parallax: 0.9, depth: 1.0, color: 0, geometry: () => new THREE.IcosahedronGeometry(1, 0) },
    { x: 0.93, y: 0.27, size: 80, parallax: 0.75, depth: 0.6, color: 1, geometry: () => new THREE.TorusKnotGeometry(0.62, 0.19, 90, 10, 2, 3) },
    { x: 0.06, y: 0.43, size: 55, parallax: 1.05, depth: 1.4, color: 2, geometry: () => new THREE.OctahedronGeometry(1) },
    { x: 0.94, y: 0.58, size: 75, parallax: 0.85, depth: 0.8, color: 0, geometry: () => new THREE.TorusGeometry(0.75, 0.24, 8, 22) },
    { x: 0.07, y: 0.72, size: 65, parallax: 0.8, depth: 0.7, color: 1, geometry: () => new THREE.DodecahedronGeometry(1) },
    { x: 0.93, y: 0.86, size: 70, parallax: 1.0, depth: 1.2, color: 2, geometry: () => new THREE.TetrahedronGeometry(1.15) }
  ];
  const shapes = shapeSpecs.slice(0, isMobile ? 4 : shapeSpecs.length).map((spec, index) => ({
    ...spec,
    mesh: makeShape(spec.geometry(), spec.color),
    spin: { x: 0.15 + (index % 3) * 0.08, y: 0.2 + (index % 2) * 0.12 }
  }));

  // ---------- Objeto principal detrás de la foto ----------
  const hero = new THREE.Group();
  const knotGeometry = new THREE.TorusKnotGeometry(0.62, 0.19, 160, 14, 2, 3);
  const knotColors = new Float32Array(knotGeometry.attributes.position.count * 3);
  knotGeometry.setAttribute('color', new THREE.BufferAttribute(knotColors, 3));
  const knot = new THREE.Mesh(knotGeometry, new THREE.MeshBasicMaterial({ wireframe: true, vertexColors: true, transparent: true, opacity: 0.55 }));
  const shell = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1, 1)),
    new THREE.LineBasicMaterial({ transparent: true, opacity: 0.4 })
  );
  hero.add(knot, shell);

  const rings = [1.18, 0.92].map((radius, index) => {
    const ring = new THREE.Group();
    const ringMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55 });
    const orbMaterial = new THREE.MeshBasicMaterial();
    ring.add(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 6, 96), ringMaterial));
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 12), orbMaterial);
    ring.add(orb);
    ring.rotation.set(index ? 1.1 : 0.5, index ? -0.4 : 0.3, 0);
    themed.push(() => {
      ringMaterial.color.copy(palette[index ? 2 : 1]);
      orbMaterial.color.copy(palette[index ? 2 : 1]);
    });
    hero.add(ring);
    return { ring, orb, radius, speed: index ? -0.7 : 0.5 };
  });
  scene.add(hero);

  const tint = new THREE.Color();
  const paintKnot = () => {
    const pos = knotGeometry.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const t = (Math.atan2(pos.getY(i), pos.getX(i)) / (Math.PI * 2) + 0.5) * 3;
      const segment = Math.floor(t) % 3;
      tint.copy(palette[segment]).lerp(palette[(segment + 1) % 3], t - Math.floor(t));
      knotColors[i * 3] = tint.r;
      knotColors[i * 3 + 1] = tint.g;
      knotColors[i * 3 + 2] = tint.b;
    }
    knotGeometry.attributes.color.needsUpdate = true;
  };
  themed.push(() => shell.material.color.copy(palette[0]), paintKnot);

  const applyTheme = () => {
    const styles = getComputedStyle(document.documentElement);
    ['--accent', '--accent-2', '--accent-3'].forEach((name, i) => palette[i].set(styles.getPropertyValue(name).trim() || '#b8f36b'));
    isLight = document.documentElement.dataset.theme === 'light';
    pointsMaterial.blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    pointsMaterial.uniforms.uOpacity.value = isLight ? 0.75 : 0.9;
    pointsMaterial.needsUpdate = true;
    themed.forEach((apply) => apply());
  };
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ---------- Tamaño ----------
  const heroCard = document.querySelector('.hero-card');
  const resize = () => {
    vw = window.innerWidth;
    vh = window.innerHeight;
    isMobile = vw < 760;
    k = viewHeightAtZero / vh;
    docHeight = document.documentElement.scrollHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
    pointsMaterial.uniforms.uW.value = (vw * k) * 1.9;
    pointsMaterial.uniforms.uH.value = viewHeightAtZero * 1.8;
  };
  window.addEventListener('resize', resize, { passive: true });
  new ResizeObserver(() => { docHeight = document.documentElement.scrollHeight; }).observe(document.body);
  resize();

  // ---------- Interacción ----------
  const pointer = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  const mouse = { x: 999, y: 999, active: false };
  if (window.matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (event) => {
      pointer.x = (event.clientX / vw - 0.5) * 2;
      pointer.y = (event.clientY / vh - 0.5) * 2;
      mouse.x = (event.clientX - vw / 2) * k;
      mouse.y = -(event.clientY - vh / 2) * k;
      mouse.active = true;
    }, { passive: true });
    document.addEventListener('pointerleave', () => { mouse.active = false; });
  }

  let lastScroll = window.scrollY;
  let boost = 0;
  let lastTime = 0;

  const update = (time) => {
    const t = time * 0.001;
    const dt = Math.min(t - lastTime, 0.05);
    lastTime = t;

    const scroll = window.scrollY;
    boost += (Math.min(Math.abs(scroll - lastScroll) * 0.04, 3) - boost) * 0.08;
    lastScroll = scroll;
    current.x += (pointer.x - current.x) * 0.05;
    current.y += (pointer.y - current.y) * 0.05;

    pointsMaterial.uniforms.uTime.value = t;
    pointsMaterial.uniforms.uOffset.value = scroll * k;
    pointsMaterial.uniforms.uMouse.value.set(mouse.active ? mouse.x : 999, mouse.active ? mouse.y : 999);

    // Formas ancladas a posiciones de la página, con parallax según su profundidad.
    const sizeScale = isMobile ? 0.65 : 1;
    shapes.forEach((shape) => {
      const screenY = shape.y * docHeight - scroll * shape.parallax;
      const onScreen = screenY > -200 && screenY < vh + 200;
      shape.mesh.visible = onScreen;
      if (!onScreen) return;
      const screenX = shape.x * vw + current.x * 18 * shape.depth;
      shape.mesh.position.set((screenX - vw / 2) * k, -(screenY + current.y * 12 * shape.depth - vh / 2) * k, 0);
      shape.mesh.scale.setScalar(shape.size * sizeScale * k);
      shape.mesh.rotation.x += dt * (shape.spin.x + boost * 0.6);
      shape.mesh.rotation.y += dt * (shape.spin.y + boost * 0.6);
    });

    // Objeto principal: sigue a la foto, se inclina con el ratón y se acelera al hacer scroll.
    if (heroCard) {
      const rect = heroCard.getBoundingClientRect();
      const inView = rect.bottom > -300 && rect.top < vh + 300;
      hero.visible = inView;
      if (inView) {
        hero.position.set((rect.left + rect.width / 2 - vw / 2) * k, -(rect.top + rect.height / 2 - vh / 2) * k, -0.5);
        hero.scale.setScalar(rect.width * 0.72 * k);
        hero.rotation.y += dt * (0.18 + boost * 0.8);
        hero.rotation.x += (current.y * 0.4 - hero.rotation.x) * 0.03;
        knot.rotation.set(t * 0.25, t * 0.35, 0);
        shell.rotation.set(-t * 0.1, t * 0.15, 0);
        rings.forEach((entry) => {
          entry.ring.rotation.z += dt * 0.12;
          const angle = t * entry.speed;
          entry.orb.position.set(Math.cos(angle) * entry.radius, Math.sin(angle) * entry.radius, 0);
        });
      }
    }
  };

  const render = (time = 0) => {
    update(time);
    renderer.render(scene, camera);
  };

  canvas.classList.add('is-ready');

  if (reducedMotion) {
    render();
    window.addEventListener('resize', () => render(), { passive: true });
    return;
  }

  let frame = 0;
  const loop = (time) => {
    render(time);
    frame = document.hidden ? 0 : requestAnimationFrame(loop);
  };
  const resume = () => { if (!frame && !document.hidden) frame = requestAnimationFrame(loop); };
  document.addEventListener('visibilitychange', resume);
  resume();
}

start().catch(() => canvas?.remove());
