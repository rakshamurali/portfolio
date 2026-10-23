// Scroll-driven particle scene.
//
// A few thousand points morph between frontend-themed shapes, one per page
// section (any element with data-shape="..."). Positions are mixed on the CPU
// only while a morph is in progress; drift, depth and twinkle run in the
// shader, so a held shape costs almost nothing per frame.
(() => {
  const stage = document.getElementById("scene");
  if (!stage) return;

  const canvas = stage.querySelector("canvas");
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, premultipliedAlpha: false });
  if (!gl) return; // the CSS gradient background stays as the fallback

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const small = window.innerWidth < 768;
  const COUNT = small ? 3600 : 8000; // shape particles
  const DUST = small ? 220 : 420; // ambient particles that never morph
  const TOTAL = COUNT + DUST;

  /* ---------------- Deterministic randomness ---------------- */
  let seedState = 1337;
  const rand = () => {
    seedState |= 0;
    seedState = (seedState + 0x6d2b79f5) | 0;
    let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /* ---------------- Shape samplers ---------------- */
  // Rasterise a 2D drawing and scatter points over its filled pixels.
  const fromCanvas = (draw, n, depth = 0.14) => {
    const S = 320;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = ctx.strokeStyle = "#fff";
    ctx.translate(S / 2, S / 2);
    draw(ctx, S);
    const data = ctx.getImageData(0, 0, S, S).data;
    const hits = [];
    for (let i = 0; i < S * S; i++) if (data[i * 4 + 3] > 140) hits.push(i % S, (i / S) | 0);

    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const k = ((rand() * hits.length) / 2) | 0;
      out[i * 3] = (hits[k * 2] + rand() - S / 2) / (S / 2);
      out[i * 3 + 1] = -(hits[k * 2 + 1] + rand() - S / 2) / (S / 2);
      out[i * 3 + 2] = (rand() * 2 - 1) * depth;
    }
    return out;
  };

  const fitText = (ctx, S, text, weight = 600) => {
    ctx.font = `${weight} 100px Inter, system-ui, sans-serif`;
    const w = ctx.measureText(text).width;
    const size = Math.min(S * 0.62, (S * 0.92 * 100) / w);
    ctx.font = `${weight} ${size}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 0, size * 0.04);
  };

  // Scatter points along 3D line segments, weighted by length.
  // segs is a flat list: x1, y1, z1, x2, y2, z2, ...
  const fromSegments = (segs, n, jitter = 0.012, warp) => {
    const count = segs.length / 6;
    const cum = new Float32Array(count);
    let total = 0;
    for (let i = 0; i < count; i++) {
      const o = i * 6;
      total += Math.hypot(segs[o + 3] - segs[o], segs[o + 4] - segs[o + 1], segs[o + 5] - segs[o + 2]);
      cum[i] = total;
    }
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const r = rand() * total;
      let lo = 0;
      let hi = count - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (cum[mid] < r) lo = mid + 1;
        else hi = mid;
      }
      const o = lo * 6;
      const t = rand();
      let x = segs[o] + (segs[o + 3] - segs[o]) * t + (rand() - 0.5) * jitter;
      let y = segs[o + 1] + (segs[o + 4] - segs[o + 1]) * t + (rand() - 0.5) * jitter;
      let z = segs[o + 2] + (segs[o + 5] - segs[o + 2]) * t + (rand() - 0.5) * jitter;
      if (warp) [x, y, z] = warp(x, y, z);
      out[i * 3] = x;
      out[i * 3 + 1] = y;
      out[i * 3 + 2] = z;
    }
    return out;
  };

  const line = (segs, x1, y1, z1, x2, y2, z2) => segs.push(x1, y1, z1, x2, y2, z2);
  const rect = (segs, x, y, w, h, z) => {
    line(segs, x, y, z, x + w, y, z);
    line(segs, x + w, y, z, x + w, y + h, z);
    line(segs, x + w, y + h, z, x, y + h, z);
    line(segs, x, y + h, z, x, y, z);
  };
  // Closed curve from a parametric point function, as segments.
  const curve = (segs, fn, steps = 96) => {
    let prev = fn(0);
    for (let i = 1; i <= steps; i++) {
      const next = fn((i / steps) * Math.PI * 2);
      line(segs, ...prev, ...next);
      prev = next;
    }
  };

  // Combine sub-shapes by share of the particle budget.
  const combine = (parts, n) => {
    const out = new Float32Array(n * 3);
    let offset = 0;
    parts.forEach(([share, make], i) => {
      const m = i === parts.length - 1 ? n - offset : Math.round(n * share);
      out.set(make(m), offset * 3);
      offset += m;
    });
    return out;
  };

  const sphere = (n, r, cx = 0, cy = 0, cz = 0) => {
    const out = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = rand() * 2 - 1;
      const a = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const rr = r * (0.85 + rand() * 0.15);
      out[i * 3] = cx + rr * s * Math.cos(a);
      out[i * 3 + 1] = cy + rr * u;
      out[i * 3 + 2] = cz + rr * s * Math.sin(a);
    }
    return out;
  };

  const SHAPES = {
    // </>  the hero
    code: (n) => fromCanvas((ctx, S) => fitText(ctx, S, "</>", 500), n),

    // React-style atom: three tilted orbits around a nucleus
    atom: (n) =>
      combine(
        [
          [
            0.84,
            (m) => {
              const segs = [];
              for (let k = 0; k < 3; k++) {
                const phi = (k * Math.PI) / 3;
                const c = Math.cos(phi);
                const s = Math.sin(phi);
                curve(segs, (t) => {
                  const x = Math.cos(t) * 0.98;
                  const y = Math.sin(t) * 0.36;
                  const z = Math.sin(t) * 0.22;
                  return [x * c - y * s, x * s + y * c, z];
                }, 140);
              }
              return fromSegments(segs, m, 0.035);
            },
          ],
          [0.16, (m) => sphere(m, 0.13)],
        ],
        n
      ),

    // Stacked browser windows: frame, title bar, traffic lights, sidebar, content lines
    windows: (n) => {
      const segs = [];
      [-1, 0, 1].forEach((j) => {
        const w = 1.25;
        const h = 0.86;
        const x = -w / 2 + j * 0.26 - 0.05;
        const y = -h / 2 - j * 0.2;
        const z = j * 0.32;
        rect(segs, x, y, w, h, z);
        const bar = y + h - 0.13;
        line(segs, x, bar, z, x + w, bar, z);
        for (let d = 0; d < 3; d++) {
          const cx = x + 0.07 + d * 0.06;
          curve(segs, (t) => [cx + Math.cos(t) * 0.018, bar + 0.065 + Math.sin(t) * 0.018, z], 16);
        }
        if (j === 1) {
          // front window gets real-looking content
          line(segs, x + 0.3, y, z, x + 0.3, bar, z);
          [0.12, 0.22, 0.32, 0.42].forEach((dy, i) => line(segs, x + 0.07, bar - dy, z, x + 0.22 - (i % 2) * 0.05, bar - dy, z));
          rect(segs, x + 0.38, bar - 0.36, w - 0.46, 0.26, z);
          [0.46, 0.56, 0.64].forEach((dy, i) => line(segs, x + 0.38, bar - dy, z, x + w - 0.1 - i * 0.18, bar - dy, z));
        }
      });
      return fromSegments(segs, n, 0.012);
    },

    // Bento grid of component cards on a gently curved surface
    bento: (n) => {
      const segs = [];
      const cols = 4;
      const rows = 3;
      const W = 2.1;
      const H = 1.45;
      const gap = 0.05;
      const cards = [
        [0, 0, 2, 2],
        [2, 0, 1, 1],
        [3, 0, 1, 2],
        [2, 1, 1, 1],
        [0, 2, 1, 1],
        [1, 2, 3, 1],
      ];
      cards.forEach(([c, r, cw, rh]) => {
        const x = -W / 2 + (c / cols) * W + gap / 2;
        const y = H / 2 - ((r + rh) / rows) * H + gap / 2;
        const w = (cw / cols) * W - gap;
        const h = (rh / rows) * H - gap;
        rect(segs, x, y, w, h, 0);
        line(segs, x + 0.07, y + h - 0.1, 0, x + Math.min(w * 0.6, 0.5), y + h - 0.1, 0);
        if (h > 0.6) line(segs, x + 0.07, y + h - 0.18, 0, x + w * 0.35, y + h - 0.18, 0);
      });
      return fromSegments(segs, n, 0.012, (x, y, z) => [x, y, z - 0.32 * x * x + 0.12]);
    },

    // { }  the toolkit
    braces: (n) => fromCanvas((ctx, S) => fitText(ctx, S, "{ }", 400), n),

    // Star for recognition
    star: (n) =>
      fromCanvas((ctx, S) => {
        const R = S * 0.44;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? R * 0.42 : R;
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r + S * 0.03);
        }
        ctx.closePath();
        ctx.lineWidth = S * 0.045;
        ctx.lineJoin = "round";
        ctx.stroke();
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(0, S * 0.03, R * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }, n, 0.12),

    // Wireframe globe for "get in touch"
    globe: (n) =>
      combine(
        [
          [
            0.88,
            (m) => {
              const segs = [];
              const R = 0.88;
              for (let i = 1; i < 6; i++) {
                const lat = -Math.PI / 2 + (i * Math.PI) / 6;
                curve(segs, (t) => [R * Math.cos(lat) * Math.cos(t), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(t)], 96);
              }
              for (let i = 0; i < 6; i++) {
                const lon = (i * Math.PI) / 6;
                curve(segs, (t) => [R * Math.cos(t) * Math.cos(lon), R * Math.sin(t), R * Math.cos(t) * Math.sin(lon)], 96);
              }
              return fromSegments(segs, m, 0.014);
            },
          ],
          [0.12, (m) => sphere(m, 0.9)],
        ],
        n
      ),
  };

  /* ---------------- GL setup ---------------- */
  const VERT = `
    attribute vec3 aPos;
    attribute float aSeed;
    uniform mat3 uRot;
    uniform float uTime;
    uniform float uAspect;
    uniform float uScale;
    uniform float uPx;
    uniform vec2 uOffset;
    varying float vAlpha;
    varying float vSeed;
    void main() {
      vec3 p = uRot * aPos;
      float s = aSeed * 6.2831;
      p += 0.012 * vec3(sin(uTime * 0.9 + s * 7.0), cos(uTime * 0.7 + s * 5.0), sin(uTime * 0.6 + s * 3.0));
      float depth = 3.2 - p.z;
      vec2 xy = p.xy * (3.2 / depth) * uScale;
      if (uAspect > 1.0) xy.x /= uAspect; else xy.y *= uAspect;
      gl_Position = vec4(xy + uOffset, 0.0, 1.0);
      gl_PointSize = uPx * (0.9 + aSeed * 1.9) * (3.2 / depth);
      vAlpha = clamp(1.5 - depth * 0.26, 0.35, 1.0) * (0.75 + 0.25 * sin(uTime * 1.3 + s * 11.0));
      vSeed = aSeed;
    }`;
  const FRAG = `
    precision mediump float;
    varying float vAlpha;
    varying float vSeed;
    void main() {
      float r = length(gl_PointCoord - 0.5);
      if (r > 0.5) discard;
      float a = smoothstep(0.5, 0.05, r);
      vec3 cool = vec3(0.86, 0.91, 1.0);
      vec3 warm = vec3(1.0, 0.68, 0.34);
      vec3 col = mix(cool, warm, step(0.8, vSeed));
      gl_FragColor = vec4(col, a * vAlpha);
    }`;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  };

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (err) {
    return;
  }
  gl.useProgram(program);

  const u = {};
  ["uRot", "uTime", "uAspect", "uScale", "uPx", "uOffset"].forEach((name) => (u[name] = gl.getUniformLocation(program, name)));

  const positions = new Float32Array(TOTAL * 3);
  const seeds = new Float32Array(TOTAL);
  for (let i = 0; i < TOTAL; i++) seeds[i] = rand();

  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

  const seedBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, seedBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, seeds, gl.STATIC_DRAW);
  const aSeed = gl.getAttribLocation(program, "aSeed");
  gl.enableVertexAttribArray(aSeed);
  gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.clearColor(0, 0, 0, 0);

  /* ---------------- Sections → shapes ---------------- */
  let sections = [];
  let shapes = [];
  let anchors = [];

  const measure = () => {
    const offset = window.innerHeight * 0.35;
    anchors = sections.map((el, i) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      return i === 0 ? 0 : Math.max(0, top - offset);
    });
  };

  // Fractional shape index for a scroll position; shapes hold, then morph mid-way.
  const indexFor = (y) => {
    if (anchors.length < 2) return 0;
    for (let i = 0; i < anchors.length - 1; i++) {
      if (y < anchors[i + 1]) {
        const raw = (y - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i]);
        const t = Math.min(Math.max((raw - 0.15) / 0.7, 0), 1);
        return i + t * t * (3 - 2 * t);
      }
    }
    return anchors.length - 1;
  };

  /* ---------------- Morph ---------------- */
  let lastIndex = -1;
  const morph = (f) => {
    const i = Math.min(Math.floor(f), shapes.length - 1);
    const t = f - i;
    const A = shapes[i];
    const B = shapes[Math.min(i + 1, shapes.length - 1)];
    for (let p = 0; p < COUNT; p++) {
      const s = seeds[p];
      let e = Math.min(Math.max((t - s * 0.35) / 0.65, 0), 1);
      e = e * e * (3 - 2 * e);
      const burst = 1 + Math.sin(Math.PI * e) * (0.18 + s * 0.22);
      const o = p * 3;
      positions[o] = (A[o] + (B[o] - A[o]) * e) * burst;
      positions[o + 1] = (A[o + 1] + (B[o + 1] - A[o + 1]) * e) * burst;
      positions[o + 2] = (A[o + 2] + (B[o + 2] - A[o + 2]) * e) * burst;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions.subarray(0, COUNT * 3));
  };

  /* ---------------- Frame loop ---------------- */
  let width = 0;
  let height = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(u.uAspect, width / height);
    gl.uniform1f(u.uScale, width < 768 ? 0.82 : 0.7);
    gl.uniform1f(u.uPx, (width < 768 ? 2.6 : 3.2) * dpr);
    gl.uniform2f(u.uOffset, width < 768 ? 0 : 0.06, 0.02);
    measure();
    lastIndex = -1;
  };

  let smoothY = window.scrollY;
  let pointerX = 0;
  let pointerY = 0;
  let lookX = 0;
  let lookY = 0;

  window.addEventListener(
    "pointermove",
    (e) => {
      pointerX = (e.clientX / width) * 2 - 1;
      pointerY = (e.clientY / height) * 2 - 1;
    },
    { passive: true }
  );

  const rotation = (yaw, pitch) => {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    // Ry(yaw) * Rx(pitch), column-major
    return new Float32Array([cy, 0, -sy, sy * sp, cp, cy * sp, sy * cp, -sp, cy * cp]);
  };

  const draw = (time) => {
    const f = indexFor(smoothY);
    if (Math.abs(f - lastIndex) > 0.0005) {
      morph(f);
      lastIndex = f;
    }
    const yaw = Math.sin(time * 0.18) * 0.32 + lookX * 0.28;
    const pitch = Math.cos(time * 0.15) * 0.1 + lookY * 0.16;
    gl.uniformMatrix3fv(u.uRot, false, rotation(yaw, pitch));
    gl.uniform1f(u.uTime, time);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, TOTAL);
  };

  const tick = (ms) => {
    smoothY += (window.scrollY - smoothY) * 0.12;
    if (Math.abs(window.scrollY - smoothY) < 0.5) smoothY = window.scrollY;
    lookX += (pointerX - lookX) * 0.05;
    lookY += (pointerY - lookY) * 0.05;
    draw(ms / 1000);
    requestAnimationFrame(tick);
  };

  const start = () => {
    sections = [...document.querySelectorAll("[data-shape]")].filter((el) => SHAPES[el.dataset.shape]);
    if (!sections.length) sections = [document.body];
    const cache = {};
    shapes = sections.map((el) => {
      const name = el.dataset.shape || "code";
      return (cache[name] ||= SHAPES[name](COUNT));
    });
    // Ambient dust: same random position in every shape, so it never morphs.
    for (let i = COUNT; i < TOTAL; i++) {
      const o = i * 3;
      positions[o] = (rand() * 2 - 1) * 2.6;
      positions[o + 1] = (rand() * 2 - 1) * 1.6;
      positions[o + 2] = (rand() * 2 - 1) * 1.4;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);

    resize();
    window.addEventListener("resize", resize);
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(document.body);

    if (reduceMotion) {
      // No drift or morph animation: snap to the shape of the section in view.
      const still = () => {
        smoothY = window.scrollY;
        const f = Math.round(indexFor(smoothY));
        morph(f);
        lastIndex = f;
        gl.uniformMatrix3fv(u.uRot, false, rotation(0, 0));
        gl.uniform1f(u.uTime, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.POINTS, 0, TOTAL);
      };
      still();
      window.addEventListener("scroll", still, { passive: true });
      window.addEventListener("resize", still);
    } else {
      requestAnimationFrame(tick);
    }
    stage.classList.add("is-ready");
  };

  // Text shapes need Inter loaded before they're rasterised.
  const fontsReady = document.fonts && document.fonts.load ? document.fonts.load("500 100px Inter").catch(() => {}) : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(start);
})();
