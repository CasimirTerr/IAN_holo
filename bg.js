/* Deep-current background: one fragment shader on a fixed canvas.
   Renders at reduced resolution, pauses when the tab is hidden, and draws a
   single still frame when the visitor prefers reduced motion. */
(function () {
  "use strict";
  const canvas = document.getElementById("bg");
  if (!canvas) return;
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) { canvas.classList.add("bg-fallback"); return; }

  const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
  const FRAG = `
precision mediump float;
uniform vec2 r; uniform float t; uniform float d; uniform vec2 m; uniform float k;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(7.1,3.7);a*=.5;}return s;}
void main(){
  vec2 uv=gl_FragCoord.xy/r; vec2 p=(gl_FragCoord.xy-.5*r)/r.y;
  p+= (m-.5)*.06;
  float tt=t*.045;
  vec2 q=vec2(fbm(p*1.6+vec2(0.,tt)),fbm(p*1.6+vec2(5.2,-tt*.8)));
  vec2 w=vec2(fbm(p*1.9+3.*q+vec2(1.7,9.2)+tt*.6),fbm(p*1.9+3.*q+vec2(8.3,2.8)-tt*.5));
  float f=fbm(p*1.4+3.2*w+vec2(0.,d*1.6));
  float ridge=smoothstep(.46,.5,f)*smoothstep(.56,.5,f);
  vec3 abyss=vec3(.012,.043,.09), deep=vec3(.027,.115,.23), sig=vec3(.36,.78,1.);
  vec3 c=mix(abyss,deep,smoothstep(.15,.85,f+.25*w.x));
  c+=sig*ridge*(.22+.25*k);
  c+=sig*.05*pow(w.y,3.);
  float halo=exp(-3.2*length(p-vec2(.0,.08)));
  c+=vec3(.10,.26,.42)*halo*(.35+.5*k)*(1.-d);
  c*=mix(1.,.42,d);
  c*=1.-.55*pow(length(uv-.5)*1.25,2.2);
  c+=(h(gl_FragCoord.xy+t)-.5)*.012;
  gl_FragColor=vec4(c,1.);
}`;

  function compile(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.classList.add("bg-fallback"); return; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = n => gl.getUniformLocation(prog, n);
  const uR = U("r"), uT = U("t"), uD = U("d"), uM = U("m"), uK = U("k");

  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = { depth: 0, talk: 0, mx: .5, my: .5, tx: .5, ty: .5 };

  function resize() {
    const s = Math.min(window.devicePixelRatio || 1, 2) * 0.5;
    const w = Math.max(2, Math.round(innerWidth * s)), h = Math.max(2, Math.round(innerHeight * s));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  }
  addEventListener("resize", resize); resize();
  addEventListener("pointermove", e => { state.tx = e.clientX / innerWidth; state.ty = 1 - e.clientY / innerHeight; }, { passive: true });

  let last = 0, raf = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (now - last < 32) return;           // ~30 fps is plenty for slow water
    last = now;
    state.mx += (state.tx - state.mx) * .04; state.my += (state.ty - state.my) * .04;
    state.talk *= .94;
    draw(now / 1000);
  }
  function draw(t) {
    gl.uniform2f(uR, canvas.width, canvas.height);
    gl.uniform1f(uT, t); gl.uniform1f(uD, state.depth); gl.uniform1f(uK, state.talk);
    gl.uniform2f(uM, state.mx, state.my);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  if (still) { draw(12); addEventListener("resize", () => draw(12)); }
  else {
    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!document.hidden) raf = requestAnimationFrame(frame); });
  }

  window.IANBg = {
    depth(v) { state.depth = Math.max(0, Math.min(1, v)); if (still) draw(12); },
    talk(v) { state.talk = Math.max(state.talk, v); }
  };
})();
