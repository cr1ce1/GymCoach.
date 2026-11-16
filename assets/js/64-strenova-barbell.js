/* =====================================================================
   STRENOVA 3D BARBELL (2026-11-16)
   A real-time ray-traced Olympic barbell in a single fragment shader:
   analytic ray/cylinder intersections, chrome sleeves and hub, rubber
   bumper plates, studio environment lighting tinted by the section accent.
   No libraries, no textures. Drag to spin; scroll turns it as well.

   Usage: StrenovaBarbell.mount(canvas, { onReady }) -> controller
          controller.setAccent([r,g,b]) / setScroll(0..1) / destroy()
   Falls back to doing nothing (CSS shows the static poster) without WebGL.
   ===================================================================== */
(function () {
  'use strict';
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = `
precision highp float;
uniform vec2 uRes; uniform float uYaw; uniform float uPitch; uniform float uRoll; uniform vec3 uAccent; uniform vec3 uAccent2;
struct Hit { float t; vec3 n; float m; vec3 lp; };
mat3 rotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,-s, 0.,1.,0., s,0.,c);}
mat3 rotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0., 0.,c,s, 0.,-s,c);}
mat3 rotZ(float a){float c=cos(a),s=sin(a);return mat3(c,s,0., -s,c,0., 0.,0.,1.);}
// cylinder with axis along x, radius r, between x0 and x1 (solid with caps)
void cyl(vec3 ro, vec3 rd, float r, float x0, float x1, float m, inout Hit h){
  float a = rd.y*rd.y + rd.z*rd.z;
  float b = ro.y*rd.y + ro.z*rd.z;
  float c = ro.y*ro.y + ro.z*ro.z - r*r;
  float d = b*b - a*c;
  if (d >= 0. && a > 1e-6) {
    float t = (-b - sqrt(d)) / a;
    float x = ro.x + t*rd.x;
    if (t > 0. && t < h.t && x > x0 && x < x1) {
      vec3 p = ro + rd*t; h.t = t; h.n = normalize(vec3(0., p.y, p.z)); h.m = m; h.lp = p;
    }
  }
  if (abs(rd.x) > 1e-6) {
    for (int k = 0; k < 2; k++) {
      float xc = k == 0 ? x0 : x1;
      float t = (xc - ro.x) / rd.x;
      vec3 p = ro + rd*t;
      if (t > 0. && t < h.t && p.y*p.y + p.z*p.z < r*r) {
        h.t = t; h.n = vec3(k == 0 ? -1. : 1., 0., 0.); h.m = m; h.lp = p;
      }
    }
  }
}
// both sides of the bar at once (mirror in x)
void cyl2(vec3 ro, vec3 rd, float r, float x0, float x1, float m, inout Hit h){
  cyl(ro, rd, r, x0, x1, m, h); cyl(ro, rd, r, -x1, -x0, m, h);
}
vec3 env(vec3 d){
  // dark studio: soft top strip, accent panel left, second accent right, faint floor
  float y = d.y;
  vec3 col = vec3(0.012, 0.011, 0.018);
  // two hard white softboxes above (chrome needs sharp, high-contrast strips)
  col += vec3(1.25) * smoothstep(0.62, 0.66, y) * smoothstep(0.86, 0.82, y) * smoothstep(0.9, 0.5, abs(d.x));
  col += vec3(0.9) * smoothstep(0.30, 0.33, y) * smoothstep(0.40, 0.37, y) * smoothstep(0.35, 0.0, abs(d.x + 0.25));
  // coloured side panels
  col += uAccent * 1.5 * smoothstep(0.62, 0.8, -d.x) * smoothstep(0.55, 0.15, abs(y - 0.05));
  col += uAccent2 * 1.1 * smoothstep(0.62, 0.85, d.x) * smoothstep(0.55, 0.15, abs(y + 0.02));
  // horizon line and dim floor
  col += vec3(0.55, 0.55, 0.62) * smoothstep(0.035, 0.0, abs(y + 0.02)) * 0.6;
  col += mix(uAccent, vec3(0.2), 0.6) * 0.07 * smoothstep(0.0, -0.9, y);
  return col;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / uRes.y;
  vec3 ro = vec3(0., 0., 19.5);
  vec3 rd = normalize(vec3(uv, -2.35));
  mat3 R = rotY(uYaw) * rotX(uPitch) * rotZ(uRoll);
  mat3 Ri = R; // object -> world; use transpose for world -> object
  vec3 oro = ro * Ri; vec3 ord = rd * Ri;
  Hit h; h.t = 1e9; h.n = vec3(0.); h.m = -1.; h.lp = vec3(0.);
  cyl(oro, ord, 0.135, -3.30, 3.30, 1., h);         // knurled shaft
  cyl2(oro, ord, 0.43, 3.18, 3.32, 2., h);           // inner shoulder
  cyl2(oro, ord, 0.25, 3.32, 5.30, 2., h);           // sleeve
  cyl2(oro, ord, 2.25, 3.40, 3.80, 3., h);           // 20 kg bumper
  cyl2(oro, ord, 1.98, 3.84, 4.16, 4., h);           // 15 kg bumper
  cyl2(oro, ord, 0.58, 3.36, 4.20, 5., h);           // chrome hubs
  cyl2(oro, ord, 0.36, 4.22, 4.46, 2., h);           // collar
  if (h.m < 0.) { gl_FragColor = vec4(0.); return; }
  vec3 n = normalize(R * h.n);
  vec3 p = ro + rd * h.t;
  vec3 v = -rd;
  vec3 rf = reflect(rd, n);
  float fres = pow(1. - max(dot(n, v), 0.), 5.);
  vec3 L1 = normalize(vec3(-0.4, 0.9, 0.6));
  vec3 col;
  if (h.m == 1. || h.m == 2. || h.m == 5.) {
    // polished steel / chrome; the shaft gets a knurl pattern
    vec3 base = vec3(0.95, 0.95, 1.0);
    float rough = 0.;
    if (h.m == 1.) {
      float ang = atan(h.lp.z, h.lp.y);
      float kn = step(0.5, fract(h.lp.x * 9. + ang * 3.)) * step(0.5, fract(h.lp.x * 9. - ang * 3.));
      float inGrip = step(0.55, abs(h.lp.x)) * step(abs(h.lp.x), 2.9);
      rough = kn * inGrip * 0.55;
      base *= 0.82;
    }
    vec3 refl = env(rf);
    col = base * mix(refl, vec3(0.16) + env(normalize(rf + n * 0.6)) * 0.5, rough);
    col += pow(max(dot(rf, L1), 0.), 60.) * 1.2;
  } else {
    // rubber bumper plate: deep graphite with raised rings and a coloured band
    vec3 base = h.m == 3. ? vec3(0.05, 0.048, 0.06) : vec3(0.06, 0.058, 0.07);
    float r = length(h.lp.yz);
    float face = step(0.5, abs(h.n.x));
    float rings = face * (smoothstep(0.012, 0., abs(r - (h.m == 3. ? 1.95 : 1.68))) + smoothstep(0.012, 0., abs(r - 0.92)));
    float band = face * smoothstep(0.06, 0.0, abs(r - (h.m == 3. ? 2.08 : 1.82)) - 0.05);
    vec3 bandCol = h.m == 3. ? uAccent : uAccent2;
    float diff = max(dot(n, L1), 0.);
    col = base * (0.25 + 0.9 * diff) + bandCol * band * (0.55 + 0.6 * diff);
    col += vec3(0.5) * rings * 0.25;
    col += env(rf) * (0.05 + 0.5 * fres);
    col += pow(max(dot(rf, L1), 0.), 18.) * 0.12;
    // edge rim light picks up the accent
    col += uAccent * pow(1. - abs(dot(n, v)), 3.) * 0.35 * (1. - face);
  }
  col = col / (1. + col * 0.6);           // soft tone map
  col = pow(col, vec3(0.92));
  gl_FragColor = vec4(col, 1.);
}`;

  function compile(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn('[barbell]', gl.getShaderInfoLog(s)); gl.deleteShader(s); return null; }
    return s;
  }

  function mount(canvas, opts) {
    opts = opts || {};
    let gl = null;
    try { gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, antialias: true, preserveDrawingBuffer: !!opts.preserve }); } catch (_) {}
    if (!gl) return null;
    const vs = compile(gl, gl.VERTEX_SHADER, VS), fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) return null;
    const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
    gl.useProgram(pr);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = {}; ['uRes', 'uYaw', 'uPitch', 'uRoll', 'uAccent', 'uAccent2'].forEach((k) => { U[k] = gl.getUniformLocation(pr, k); });

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const st = {
      yaw: opts.yaw != null ? opts.yaw : 0.55, drag: 0, vel: 0, scroll: 0, t0: performance.now(),
      accent: [0.56, 0.43, 1.0], accent2: [0.25, 0.84, 0.63], acc: [0.56, 0.43, 1.0], acc2: [0.25, 0.84, 0.63],
      visible: true, raf: 0, dirty: true, down: false, lastX: 0, w: 0, h: 0
    };
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, opts.maxDpr || 1.75);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (w !== st.w || h !== st.h) { canvas.width = w; canvas.height = h; st.w = w; st.h = h; gl.viewport(0, 0, w, h); st.dirty = true; }
    }
    function draw(now) {
      st.raf = 0;
      if (!st.visible) return;
      resize();
      const time = (now - st.t0) / 1000;
      if (!st.down) { st.drag += st.vel; st.vel *= 0.94; if (Math.abs(st.vel) < 1e-4) st.vel = 0; }
      for (let i = 0; i < 3; i++) { st.acc[i] += (st.accent[i] - st.acc[i]) * 0.08; st.acc2[i] += (st.accent2[i] - st.acc2[i]) * 0.08; }
      const idle = reduce ? 0 : Math.sin(time * 0.32) * 0.32;
      const yaw = st.yaw + idle + st.drag + st.scroll * 0.7;
      gl.uniform2f(U.uRes, st.w, st.h);
      gl.uniform1f(U.uYaw, yaw);
      gl.uniform1f(U.uPitch, 0.32 - st.scroll * 0.25 + (reduce ? 0 : Math.sin(time * 0.7) * 0.03));
      gl.uniform1f(U.uRoll, -0.12 + st.scroll * 0.18);
      gl.uniform3fv(U.uAccent, st.acc); gl.uniform3fv(U.uAccent2, st.acc2);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      st.dirty = false;
      if (!st.ready) { st.ready = true; opts.onReady && opts.onReady(); }
      const settling = st.vel !== 0 || st.acc.some((v, i) => Math.abs(v - st.accent[i]) > 0.002);
      if (!reduce || settling || st.down) loop();
    }
    function loop() { if (!st.raf && st.visible && !document.hidden) st.raf = requestAnimationFrame(draw); }

    // drag to spin (pointer + touch); vertical page scroll still works on touch
    canvas.style.touchAction = 'pan-y';
    canvas.addEventListener('pointerdown', (e) => { st.down = true; st.lastX = e.clientX; st.vel = 0; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); loop(); });
    canvas.addEventListener('pointermove', (e) => { if (!st.down) return; const dx = (e.clientX - st.lastX) / Math.max(200, canvas.clientWidth) * 4.2; st.drag += dx; st.vel = dx; st.lastX = e.clientX; loop(); });
    const up = () => { st.down = false; loop(); };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
    canvas.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { st.vel = e.key === 'ArrowLeft' ? -0.06 : 0.06; loop(); e.preventDefault(); } });

    const io = 'IntersectionObserver' in window ? new IntersectionObserver((en) => { st.visible = en[0].isIntersecting; if (st.visible) loop(); }, { rootMargin: '80px' }) : null;
    if (io) io.observe(canvas);
    const onVis = () => { if (!document.hidden) loop(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', loop, { passive: true });
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(st.raf); st.raf = 0; opts.onLost && opts.onLost(); });
    loop();
    return {
      setAccent(a, b) { st.accent = a.slice(); if (b) st.accent2 = b.slice(); loop(); },
      setScroll(v) { st.scroll = v; loop(); },
      render(now) { draw(now || performance.now()); },
      destroy() { cancelAnimationFrame(st.raf); io && io.disconnect(); document.removeEventListener('visibilitychange', onVis); }
    };
  }
  window.StrenovaBarbell = { mount };
})();
