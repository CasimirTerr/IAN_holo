/* Particle stage for the site.
   ~16k points that hold four shapes and morph between them as you scroll:
     0  IAN himself (sampled from his artwork, pixel for pixel)
     1  a rotating globe with edge-network arcs
     2  a loose field of drifting points
     3  the IAN wordmark
   The page sets the timeline with IANFx.set(t), t in [0, 3]. */
(function () {
  "use strict";
  const canvas = document.getElementById("fx");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" });
  if (!gl) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = Math.min(innerWidth, innerHeight) < 700;
  const N = small ? 9000 : 16000;

  const VERT = `
attribute vec3 a, b, ca, cb; attribute float s;
uniform float m, t, asp, px, alpha; uniform vec2 rot, size, ptr; uniform vec3 oa, ob;
varying vec3 vc; varying float va;
vec3 ry(vec3 p, float r){ float c = cos(r), n = sin(r); return vec3(c*p.x + n*p.z, p.y, -n*p.x + c*p.z); }
void main(){
  float k = clamp(m*1.7 - s*.7, 0., 1.); k = k*k*(3. - 2.*k);
  vec3 p = mix(ry(a, rot.x) + oa, ry(b, rot.y) + ob, k);
  float sw = sin(k*3.14159);
  p += sw*.16*vec3(sin(s*40. + t*.6), cos(s*57. + t*.5), sin(s*23. - t*.4));
  p.xy += .0035*vec2(sin(t*.9 + s*90.), cos(t*.8 + s*70.));
  vec2 dl = p.xy - ptr; float dd = length(dl);            // particles lean away from the pointer
  p.xy += dl/(dd + .0001)*.05*smoothstep(.15, 0., dd);
  float w = 1./(1. - p.z*.55);
  gl_Position = vec4(p.x*w*2./asp, p.y*w*2., 0., 1.);
  gl_PointSize = mix(size.x, size.y, k)*px*w*(.7 + .6*fract(s*7.31));
  vc = mix(ca, cb, k);
  va = alpha*(.72 + .28*sin(t*1.6 + s*31.));
}`;
  const FRAG = `
precision mediump float; varying vec3 vc; varying float va;
void main(){ float d = length(gl_PointCoord - .5); float f = smoothstep(.5, .12, d)*va; gl_FragColor = vec4(vc*f, f); }`;

  function sh(type, src) { const o = gl.createShader(type); gl.shaderSource(o, src); gl.compileShader(o); return o; }
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.clearColor(0, 0, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const u = { m: U("m"), t: U("t"), asp: U("asp"), px: U("px"), alpha: U("alpha"), rot: U("rot"), size: U("size"), oa: U("oa"), ob: U("ob"), ptr: U("ptr") };
  function attr(name, n) { const buf = gl.createBuffer(), loc = gl.getAttribLocation(prog, name); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); return buf; }
  const B = { a: attr("a", 3), b: attr("b", 3), ca: attr("ca", 3), cb: attr("cb", 3), s: attr("s", 1) };
  const seeds = new Float32Array(N); for (let i = 0; i < N; i++) seeds[i] = Math.random();
  gl.bindBuffer(gl.ARRAY_BUFFER, B.s); gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);

  // ---------------------------------------------------------------- shapes
  const ICE = [.81, .92, 1], SIG = [.36, .78, 1];
  let asp = innerWidth / innerHeight;
  const shapes = [null, null, null, null];     // { pos, col, off:[x,y,z], size, alpha, spin }
  const blank = () => ({ pos: new Float32Array(N * 3), col: new Float32Array(N * 3) });

  // pick N samples from a list of [x, y, r, g, b] (repeat or thin as needed)
  function fill(shape, pts, jitter) {
    const n = pts.length;
    for (let i = 0; i < N; i++) {
      const p = pts[n >= N ? Math.floor(i * n / N) : Math.floor(Math.random() * n)];
      shape.pos[i * 3] = p[0] + (Math.random() - .5) * jitter; shape.pos[i * 3 + 1] = p[1] + (Math.random() - .5) * jitter; shape.pos[i * 3 + 2] = (Math.random() - .5) * .02;
      shape.col[i * 3] = p[2]; shape.col[i * 3 + 1] = p[3]; shape.col[i * 3 + 2] = p[4];
    }
  }
  function sample(draw, w, h, step, colorOf) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const x = c.getContext("2d", { willReadFrequently: true }); draw(x, w, h);
    const d = x.getImageData(0, 0, w, h).data, pts = [];
    for (let j = 0; j < h; j += step) for (let i = 0; i < w; i += step) {
      const o = (j * w + i) * 4;
      if (d[o + 3] > 120) pts.push([i, j].concat(colorOf(d[o] / 255, d[o + 1] / 255, d[o + 2] / 255)));
    }
    return pts;
  }

  // 0: IAN, placed exactly where the hero image sits so the two can cross-fade
  function buildFigure(img) {
    const mobile = innerWidth <= 900;
    const H = mobile ? .56 : .82, cy = mobile ? .5 - .11 - H / 2 : -.5 + .02 + H / 2;
    const w = 450, h = Math.round(450 * img.naturalHeight / img.naturalWidth);
    const pts = sample(x => x.drawImage(img, 0, 0, w, h), w, h, 2, (r, g, b) => [r * .5, g * .52, b * .56]);
    const k = H / h, sp = blank();
    fill(sp, pts.map(p => [(p[0] - w / 2) * k, (h / 2 - p[1]) * k, p[2], p[3], p[4]]), k * 2);
    shapes[0] = Object.assign(sp, { off: [0, cy, 0], size: 2.3, alpha: 1, spin: 0 });
  }
  // 1: globe + arcs between edge nodes
  function buildGlobe() {
    const mobile = innerWidth <= 900, R = Math.min(.31, asp * .4);
    const sp = blank(), surf = Math.floor(N * .74), nodes = [];
    for (let i = 0; i < 14; i++) { const y = Math.random() * 1.6 - .8, a = Math.random() * 6.283, r = Math.sqrt(1 - y * y); nodes.push([r * Math.cos(a), y, r * Math.sin(a)]); }
    for (let i = 0; i < N; i++) {
      let x, y, z, c;
      if (i < surf) {
        y = 1 - 2 * (i + .5) / surf; const r = Math.sqrt(1 - y * y), a = i * 2.39996323;
        x = r * Math.cos(a); z = r * Math.sin(a);
        const land = Math.sin(x * 5.1 + 1.3) * Math.sin(y * 6.3 - .4) + Math.sin(z * 4.2 + x * 2.1) * .6;
        const l = land > .25 ? .85 : .24; c = [SIG[0] * l, SIG[1] * l, SIG[2] * l];
        x *= R; y *= R; z *= R;
      } else {
        const A = nodes[i % nodes.length], Bn = nodes[(i * 7 + 3) % nodes.length], f = Math.random();
        let vx = A[0] + (Bn[0] - A[0]) * f, vy = A[1] + (Bn[1] - A[1]) * f, vz = A[2] + (Bn[2] - A[2]) * f;
        const len = Math.hypot(vx, vy, vz) || 1, lift = R * (1 + .22 * Math.sin(Math.PI * f));
        x = vx / len * lift; y = vy / len * lift; z = vz / len * lift;
        const e = (f < .03 || f > .97) ? 1 : .55; c = [ICE[0] * e, ICE[1] * e, ICE[2] * e];
      }
      sp.pos.set([x, y, z], i * 3); sp.col.set(c, i * 3);
    }
    shapes[1] = Object.assign(sp, { off: mobile ? [0, .15, 0] : [asp * .21, 0, 0], size: 2.6, alpha: 1, spin: .22 });
  }
  // 2: field
  function buildField() {
    const sp = blank();
    for (let i = 0; i < N; i++) {
      sp.pos.set([(Math.random() - .5) * asp * 1.5, (Math.random() - .5) * 1.4, Math.random() * 1.1 - .8], i * 3);
      const l = .1 + Math.random() * .3; sp.col.set([SIG[0] * l, SIG[1] * l, SIG[2] * l], i * 3);
    }
    shapes[2] = Object.assign(sp, { off: [0, 0, 0], size: 1.8, alpha: .5, spin: .012 });
  }
  // 3: wordmark
  function buildWord() {
    const w = 900, h = 300;
    const pts = sample((x) => { x.font = '900 300px Archivo, system-ui, sans-serif'; try { x.fontStretch = "extra-expanded"; } catch (e) {} x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#fff"; x.fillText("IAN", w / 2, h / 2 + 14, w - 20); }, w, h, 2, () => [ICE[0] * .8, ICE[1] * .8, ICE[2] * .8]);
    const k = Math.min(asp * .8, 1.25) / w, sp = blank();
    fill(sp, pts.map(p => [(p[0] - w / 2) * k, (h / 2 - p[1]) * k, p[2], p[3], p[4]]), k * 2);
    shapes[3] = Object.assign(sp, { off: [0, innerWidth <= 900 ? .2 : .2, 0], size: small ? 1.7 : 2.5, alpha: 1, spin: 0 });
  }

  // ---------------------------------------------------------------- timeline
  let ready = false, seg = -1, target = 0, cur = 0, fade = 0, fadeTarget = 0, raf = 0, visible = true;
  let intro = !still, introStart = 0; const INTRO_MS = 2600;
  const ptr = [9, 9], nudge = [0, 0];
  addEventListener("pointermove", e => { ptr[0] = (e.clientX / innerWidth - .5) * asp; ptr[1] = .5 - e.clientY / innerHeight; }, { passive: true });
  document.addEventListener("pointerleave", () => { ptr[0] = ptr[1] = 9; });
  function born() { if (!intro) return; intro = false; seg = -1; fade = 1; window.dispatchEvent(new Event("ian:born")); }
  function uploadPair(A, Bs) {
    gl.bindBuffer(gl.ARRAY_BUFFER, B.a); gl.bufferData(gl.ARRAY_BUFFER, A.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, B.b); gl.bufferData(gl.ARRAY_BUFFER, Bs.pos, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, B.ca); gl.bufferData(gl.ARRAY_BUFFER, A.col, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, B.cb); gl.bufferData(gl.ARRAY_BUFFER, Bs.col, gl.DYNAMIC_DRAW);
  }
  const withNudge = sh => sh === shapes[0] ? [sh.off[0] + nudge[0], sh.off[1] + nudge[1], sh.off[2]] : sh.off;
  function upload(i) { seg = i; uploadPair(shapes[i], shapes[i + 1]); }
  function resize() {
    const d = Math.min(devicePixelRatio || 1, 1.5), w = Math.round(innerWidth * d), h = Math.round(innerHeight * d);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    asp = innerWidth / innerHeight;
  }
  function draw(now) {
    const time = now / 1000;
    let A, Bs, m, a;
    if (intro) {                                   // first seconds of life: the field pulls together into IAN
      if (!introStart) introStart = now;
      const p = Math.min(1, (now - introStart) / INTRO_MS);
      if (seg !== 99) { seg = 99; uploadPair(shapes[2], shapes[0]); }
      A = shapes[2]; Bs = shapes[0]; m = p; a = Math.min(1, p * 4) * (.5 + .5 * p);
      if (p >= 1 || target > .03) { born(); return; }
    } else {
      cur += (target - cur) * (still ? 1 : .12); fade += (fadeTarget - fade) * (still ? 1 : .15);
      const i = Math.min(2, Math.floor(cur)); m = Math.min(1, cur - i);
      if (i !== seg) upload(i);
      A = shapes[i]; Bs = shapes[i + 1]; a = fade * (A.alpha + (Bs.alpha - A.alpha) * m);
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (a < .004) return;
    gl.uniform1f(u.m, m); gl.uniform1f(u.t, still ? 0 : time); gl.uniform1f(u.asp, asp);
    gl.uniform1f(u.px, canvas.height / 860); gl.uniform1f(u.alpha, a); gl.uniform2f(u.ptr, ptr[0], ptr[1]);
    gl.uniform2f(u.rot, still ? .6 * (A.spin ? 1 : 0) : time * A.spin, still ? .6 * (Bs.spin ? 1 : 0) : time * Bs.spin);
    gl.uniform2f(u.size, A.size, Bs.size); gl.uniform3fv(u.oa, withNudge(A)); gl.uniform3fv(u.ob, withNudge(Bs));
    gl.drawArrays(gl.POINTS, 0, N);
  }
  function loop(now) { raf = requestAnimationFrame(loop); if (visible) draw(now); }

  function buildAll(img) { resize(); buildFigure(img); buildGlobe(); buildField(); buildWord(); seg = -1; }
  const img = new Image();
  img.onload = () => {
    const go = () => {
      buildAll(img); ready = true;
      let rt = 0; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { buildAll(img); if (still) draw(0); }, 200); });
      if (still) { draw(0); } else { raf = requestAnimationFrame(loop); document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(loop); }); }
      document.documentElement.classList.add("fx-ready");
      if (still) window.dispatchEvent(new Event("ian:born"));
    };
    (document.fonts && document.fonts.load ? document.fonts.load('900 100px Archivo').then(go, go) : go());
  };
  img.src = canvas.dataset.src || "assets/ian-float.webp";

  window.IANFx = {
    // t: 0 figure .. 3 wordmark, alpha: overall visibility 0..1
    set(t, alpha) { target = Math.max(0, Math.min(3, t)); fadeTarget = alpha; if (still && ready) { cur = target; fade = alpha; draw(0); } },
    show(v) { visible = v; },
    // keep the particle body locked to the artwork as it bobs and leans (values in px)
    nudge(xPx, yPx) { nudge[0] = xPx / innerHeight; nudge[1] = -yPx / innerHeight; },
    skipIntro: born,
    info: { particles: N, gpu: (() => { try { const e = gl.getExtension("WEBGL_debug_renderer_info"); return e ? String(gl.getParameter(e.UNMASKED_RENDERER_WEBGL)) : "webgl"; } catch (x) { return "webgl"; } })() }
  };
})();
