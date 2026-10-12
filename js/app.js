(() => {
const S = window.SITE, $ = (s, r = document) => r.querySelector(s);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover)").matches;
const mailTo = (subj) => `mailto:${S.email}?subject=${encodeURIComponent(subj)}`;

$("#yr").textContent = new Date().getFullYear();

/* ---------- Nav ---------- */
const nav = $("#nav"), menu = $("#menu"), burger = $(".burger");
addEventListener("scroll", () => nav.classList.toggle("solid", scrollY > 30), { passive: true });
burger.addEventListener("click", () => { const o = menu.classList.toggle("open"); burger.setAttribute("aria-expanded", o); });
menu.addEventListener("click", e => { if (e.target.closest("a")) { menu.classList.remove("open"); burger.setAttribute("aria-expanded", false); } });
const links = [...menu.querySelectorAll("a:not(.btn)")];
const spy = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) links.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("main section[id]").forEach(s => spy.observe(s));

/* ---------- Preview controller: one preview at a time ---------- */
const Preview = {
  active: null, timer: null,
  start(item) {
    if (reduce || this.active === item) return;
    this.stop();
    const { video, p } = item._d;
    if (!video.src) { video.src = p.video; }
    this.active = item;
    const go = () => {
      if (this.active !== item) return;
      video.currentTime = p.start;
      video.muted = true;
      const pr = video.play();
      if (pr) pr.then(() => { if (this.active === item) item.classList.add("playing"); }).catch(() => this.stop());
      this.timer = setTimeout(() => this.stop(), (p.dur || 5) * 1000);
    };
    video.readyState >= 1 ? go() : video.addEventListener("loadedmetadata", go, { once: true });
    video.load && video.readyState === 0 && video.load();
  },
  stop() {
    clearTimeout(this.timer); this.timer = null;
    const it = this.active; this.active = null;
    if (!it) return;
    const v = it._d.video; v.pause(); it.classList.remove("playing");
    try { v.currentTime = it._d.p.start; } catch (e) {}
  }
};
document.addEventListener("visibilitychange", () => document.hidden && Preview.stop());
const vis = new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting && Preview.active === e.target) Preview.stop(); }), { threshold: .2 });

/* ---------- Viewer ---------- */
const viewer = $("#viewer"), vv = $("#vVideo"); let lastFocus = null;
function openViewer(p) {
  Preview.stop(); lastFocus = document.activeElement;
  vv.poster = p.poster; vv.src = p.video; vv.muted = false;
  $("#vTitle").textContent = p.title; $("#vDesc").textContent = p.desc;
  $("#vCta").href = mailTo("Similar video to: " + p.title);
  viewer.hidden = false; document.body.style.overflow = "hidden"; $("#vClose").focus();
}
function closeViewer() {
  vv.pause(); vv.removeAttribute("src"); vv.load();
  viewer.hidden = true; document.body.style.overflow = ""; lastFocus && lastFocus.focus();
}
$("#vClose").onclick = closeViewer;
viewer.addEventListener("click", e => e.target === viewer && closeViewer());
addEventListener("keydown", e => {
  if (viewer.hidden) return;
  if (e.key === "Escape") closeViewer();
  if (e.key === "Tab") { const f = [...viewer.querySelectorAll("button,a,video")]; const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
});

/* ---------- Reel ---------- */
const reel = $("#reel"), cats = ["All", ...new Set(S.projects.map(p => p.cat))];
S.projects.forEach(p => {
  const b = document.createElement("button");
  b.className = "item"; b.type = "button"; b.dataset.cat = p.cat;
  b.style.aspectRatio = p.ratio; b.style.setProperty("--r", p.ratio);
  b.setAttribute("aria-label", `Open video: ${p.title}`);
  b.innerHTML = `<img src="${p.poster}" alt="Poster frame from ${p.title}" loading="lazy"><video muted playsinline preload="none" loop aria-hidden="true"></video><span class="dot" aria-hidden="true">▶</span><span class="meta"><b>${p.title}</b><span>${p.cat}</span></span>`;
  const video = b.querySelector("video");
  video.addEventListener("error", () => { if (video.src) Preview.stop(); });
  b._d = { p, video };
  if (canHover) { b.addEventListener("pointerenter", e => e.pointerType === "mouse" && Preview.start(b)); b.addEventListener("pointerleave", () => Preview.active === b && Preview.stop()); }
  b.addEventListener("focus", () => Preview.start(b)); b.addEventListener("blur", () => Preview.active === b && Preview.stop());
  b.addEventListener("click", () => openViewer(p));
  reel.appendChild(b); vis.observe(b);
});
const fb = $("#filters");
cats.forEach((c, i) => {
  const b = document.createElement("button"); b.textContent = c; b.setAttribute("aria-pressed", i === 0);
  b.onclick = () => { Preview.stop(); fb.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", x === b));
    reel.querySelectorAll(".item").forEach(it => it.hidden = c !== "All" && it.dataset.cat !== c); };
  fb.appendChild(b);
});
$("#stills").innerHTML = S.stills.map((s, i) => `<img src="${s}" alt="AI generated scene still ${i + 1}: cinematic fantasy characters" loading="lazy">`).join("");
$("#toolList").innerHTML = S.tools.map(t => `<div><dt>${t[0]}</dt><dd>${t[1]}</dd><dd>${t[2]}</dd></div>`).join("");

/* ---------- Scroll reveals (restrained) ---------- */
if (!reduce) {
  const ro = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (e.target.classList.add("in"), ro.unobserve(e.target))), { threshold: .15 });
  document.querySelectorAll(".about > *,.services li,.steps li,dl > div,.contact > *").forEach(el => { el.classList.add("reveal"); ro.observe(el); });
}

/* ---------- 3D hero: floating screens using real poster frames ---------- */
(function hero() {
  const stage = $("#stage"), fallback = $("#fallback");
  const picks = ["olay-ad", "bound-alpha-king", "sona-headphone", "arthritis-ad-vertical", "love-in-lagos"];
  fallback.innerHTML = picks.slice(0, 3).map(n => `<img src="posters/${n}.jpg" alt="">`).join("");
  let ok = false;
  try { const c = document.createElement("canvas"); ok = !!(window.THREE && (c.getContext("webgl") || c.getContext("experimental-webgl"))); } catch (e) {}
  if (!ok) { stage.classList.add("no-gl"); return; }
  const canvas = $("#gl");
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  r.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, .1, 50); cam.position.z = 9;
  const group = new THREE.Group(); scene.add(group);
  scene.add(new THREE.AmbientLight(0xffffff, 1));
  const loader = new THREE.TextureLoader();
  const layout = [[-1.9,.5,-.6,-.18,3,4],[0,-.2,.4,0,3,4],[1.9,.6,-.4,.18,3,4],[-.9,-1.9,-1.2,.1,4,2.25],[1.4,-1.8,-.8,-.1,2.25,3]];
  const panels = picks.map((n, i) => {
    const [x, y, z, ry, w, h] = layout[i], k = .62;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * k * 1.1, h * k * 1.1), new THREE.MeshBasicMaterial({ color: 0xE8DDF8 }));
    m.position.set(x, y, z); m.rotation.y = ry; m.userData = { y, ry, ph: i * 1.3 };
    loader.load(`posters/${n}.jpg`, t => { t.encoding = THREE.sRGBEncoding; m.material.map = t; m.material.color.set(0xffffff);
      const a = t.image.width / t.image.height; m.geometry.dispose(); m.geometry = new THREE.PlaneGeometry(2.5 * a > 3.4 ? 3.4 : 2.5 * a, 2.5 * a > 3.4 ? 3.4 / a : 2.5); m.material.needsUpdate = true; });
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color: 0xB69AE8 }));
    group.add(m); return m;
  });
  const pts = new THREE.BufferGeometry(), N = 90, arr = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) arr[i] = (Math.random() - .5) * 12;
  pts.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  group.add(new THREE.Points(pts, new THREE.PointsMaterial({ color: 0x8061B8, size: .04, transparent: true, opacity: .6 })));
  const size = () => { const w = stage.clientWidth, h = stage.clientHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.position.z = w < 500 ? 12 : 9; cam.updateProjectionMatrix(); };
  size(); addEventListener("resize", size);
  let tx = 0, ty = 0, on = true, raf;
  addEventListener("pointermove", e => { tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5); }, { passive: true });
  const t0 = performance.now();
  const frame = () => {
    const t = (performance.now() - t0) / 1000;
    group.rotation.y += (tx * .5 - group.rotation.y) * .05; group.rotation.x += (ty * .3 - group.rotation.x) * .05;
    if (!reduce) panels.forEach(m => m.position.y = m.userData.y + Math.sin(t * .8 + m.userData.ph) * .12);
    r.render(scene, cam); raf = on && !document.hidden ? requestAnimationFrame(frame) : 0;
  };
  new IntersectionObserver(es => { on = es[0].isIntersecting; if (on && !raf) frame(); }).observe(stage);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && on && !raf) frame(); });
  r.render(scene, cam); frame();
  canvas.addEventListener("webglcontextlost", () => { stage.classList.add("no-gl"); on = false; });
})();
})();
