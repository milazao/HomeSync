'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];

/* ================= CONFIGURAÇÕES ================= */
let S = { sens: 3, anim: true, music: true, sfx: true };
try { Object.assign(S, JSON.parse(localStorage.getItem('homesync') || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem('homesync', JSON.stringify(S)); } catch (e) {} };
const sens = () => (S.sens + 1) * 0.25; // 0.25x ... 2.5x
const LABELS = { anim: ['DESATIVADAS', 'ATIVADAS'], music: ['DESATIVADA', 'ATIVADA'], sfx: ['DESATIVADOS', 'ATIVADOS'] };

$$('.title span').forEach((s, i) => s.style.setProperty('--i', i));
for (let i = 0; i < 10; i++) {
  const d = document.createElement('div');
  d.className = 'seg'; d.dataset.act = 'sens'; d.dataset.i = i;
  $('#segs').appendChild(d);
}

function applyUI() {
  $$('.seg').forEach((s, i) => s.classList.toggle('fill', i <= S.sens));
  $('#sensVal').textContent = sens().toFixed(2).replace(/0$/, '') + 'x';
  $$('.tog').forEach(b => {
    const on = S[b.dataset.k];
    b.classList.toggle('on', on);
    b.querySelector('span').textContent = LABELS[b.dataset.k][+on];
  });
  document.body.classList.toggle('noanim', !S.anim);
  applyAudio(); setAnim(); save();
}

/* ================= ÁUDIO (sintetizado, sem arquivos) ================= */
let ac, mg, sg, step = 0, next = 0;
const CH = [[0, 4, 7, 11], [5, 9, 12, 16], [9, 12, 16, 19], [7, 11, 14, 17]];
const hz = n => 261.63 * 2 ** (n / 12);
function initAudio() {
  if (ac) { ac.resume(); return; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
  mg = ac.createGain(); sg = ac.createGain();
  mg.connect(ac.destination); sg.connect(ac.destination);
  applyAudio(); next = ac.currentTime + 0.1; setInterval(sched, 100);
}
function applyAudio() { if (!ac) return; mg.gain.value = S.music ? 0.5 : 0; sg.gain.value = S.sfx ? 0.5 : 0; }
function tone(f, t, d, type, v, dest) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.05);
}
function sched() {
  while (next < ac.currentTime + 0.4) {
    const c = CH[(step >> 3) & 3], i = step & 7;
    tone(hz(c[[0, 1, 2, 3, 2, 1, 3, 2][i]] + 12), next, 0.35, 'triangle', 0.16, mg);
    if (i === 0) tone(hz(c[0] - 12), next, 1.6, 'sine', 0.3, mg);
    step++; next += 0.24;
  }
}
function sfx(f, d = 0.06) { if (ac && S.sfx) tone(f, ac.currentTime, d, 'square', 0.1, sg); }

/* ================= CURSOR VIRTUAL (sensibilidade) ================= */
let vx = 0, vy = 0, ready = false, hov = null, touch = false;
const cur = $('#cursor');
function updateCursor() {
  cur.style.transform = `translate(${vx}px,${vy}px)`;
  const el = document.elementFromPoint(vx, vy), b = el && el.closest('[data-act]');
  if (b !== hov) {
    if (hov) hov.classList.remove('hov', 'press');
    if (b) { b.classList.add('hov'); sfx(660, 0.04); }
    hov = b;
  }
}
addEventListener('mousemove', e => {
  if (touch) return;
  if (!ready) { vx = e.clientX; vy = e.clientY; ready = true; }
  else {
    vx = Math.min(innerWidth - 1, Math.max(0, vx + e.movementX * sens()));
    vy = Math.min(innerHeight - 1, Math.max(0, vy + e.movementY * sens()));
  }
  updateCursor();
});
addEventListener('mousedown', e => { initAudio(); if (!touch && hov) hov.classList.add('press'); });
addEventListener('mouseup', () => { if (!touch && hov) { hov.classList.remove('press'); hov.click(); } });
addEventListener('touchstart', () => { touch = true; document.body.classList.add('touch'); initAudio(); }, { passive: true });
// cliques reais são ignorados no desktop: só vale o cursor virtual
addEventListener('click', e => { if (e.isTrusted && !touch) { e.stopPropagation(); e.preventDefault(); } }, true);

/* ================= TELAS E AÇÕES ================= */
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('hidden', s.id !== id));
  hov = null; if (ready) updateCursor();
}
let toastT;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  initAudio(); sfx(880, 0.05); setTimeout(() => sfx(1175, 0.08), 50);
  const a = b.dataset.act;
  if (a === 'start') { // ainda não configurado
    $('#toast').classList.remove('hidden'); clearTimeout(toastT);
    toastT = setTimeout(() => $('#toast').classList.add('hidden'), 1500);
  }
  else if (a === 'opt') show('options');
  else if (a === 'cred') show('credits');
  else if (a === 'back') show('menu');
  else if (a === 'tog') { S[b.dataset.k] = !S[b.dataset.k]; applyUI(); }
  else if (a === 'sens') { S.sens = +b.dataset.i; applyUI(); }
});
addEventListener('keydown', e => { if (e.key === 'Escape') show('menu'); });

/* ================= CENÁRIO PIXEL ART (320x180) ================= */
const W = 320, H = 180, cv = $('#bg'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H;
let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const R = (c, x, y, w, h, g = ctx) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };

const st = document.createElement('canvas'); st.width = W; st.height = H;
const sg2 = st.getContext('2d');
const wins = [], ants = [], wifis = [], clouds = [], bubbles = [], drones = [];
const WIFI = ['.XXXXXXX.', 'X.......X', '..XXXXX..', '.X.....X.', '...XXX...', '....X....'];

function buildScene() {
  // céu em faixas com dithering
  const sky = ['#5ec3ff', '#78cffd', '#93daff', '#aee4ff', '#c6edff', '#dcf5ff', '#eefaff', '#fbfeff'];
  sky.forEach((c, i) => {
    R(c, 0, i * 16, W, 16, sg2);
    if (i < 7) for (let y = 12; y < 16; y++) for (let x = (y % 2); x < W; x += 2) R(sky[i + 1], x, i * 16 + y, 1, 1, sg2);
  });
  // skyline distante
  for (let x = 0; x < W; x += 0) {
    const w = 10 + (rnd() * 14 | 0), h = 18 + (rnd() * 34 | 0);
    R('#9fd3ee', x, 130 - h, w, h, sg2); R('#cdeefb', x, 130 - h, w, 2, sg2); R('#b6e1f5', x, 130 - h, 2, h, sg2);
    x += w + 1;
  }
  R('#9fd3ee', 0, 130, W, 20, sg2);
  // torres principais
  const pal = [['#e8f7ff', '#b7e1f5', '#5aa9dc'], ['#d4f7e4', '#8fdcb2', '#3da876'], ['#d6ecff', '#8cc6f0', '#3f8fd0']];
  let x = 4;
  while (x < W - 16) {
    const w = 18 + (rnd() * 14 | 0), h = 44 + (rnd() * 48 | 0), p = pal[(rnd() * 3) | 0], top = 146 - h;
    R(p[1], x, top, w, h, sg2); R(p[0], x, top, 3, h, sg2); R(p[2], x + w - 4, top, 4, h, sg2); R(p[2], x, top, w, 2, sg2);
    for (let wy = top + 6; wy < 140; wy += 6) for (let wx = x + 6; wx < x + w - 6; wx += 5) {
      R('#7fc4ec', wx, wy, 3, 3, sg2); wins.push({ x: wx, y: wy, p: rnd() * 6.28, c: rnd() > 0.6 ? '#b8ffd8' : '#fff8b0' });
    }
    const k = rnd();
    if (k < 0.35) { for (let gx = x + 1; gx < x + w - 1; gx += 3) R(gx % 2 ? '#43c872' : '#2f9e5a', gx, top - 3 - (gx % 2), 3, 3 + (gx % 2), sg2); }
    else if (k < 0.7) { R('#5aa9dc', x + (w >> 1), top - 10, 1, 10, sg2); ants.push({ x: x + (w >> 1), y: top - 12, p: rnd() * 3 }); }
    else if (k < 0.85) wifis.push({ x: x + (w >> 1) - 4, y: top - 12, p: rnd() * 6 });
    x += w + 2 + (rnd() * 4 | 0);
  }
  // colinas escalonadas, árvores e gramado
  for (let hx = 0; hx < W; hx += 4) {
    const h = 6 + Math.round(3 * Math.sin(hx / 23) + 2 * Math.sin(hx / 9));
    R('#5fd37f', hx, 154 - h, 4, h + 10, sg2); R('#8dec9f', hx, 154 - h, 4, 2, sg2);
  }
  for (let y = 158; y < H; y += 4) for (let gx = 0; gx < W; gx += 8) {
    R((gx / 8 + y / 4) % 2 ? '#3aa85a' : '#43b865', gx, y, 8, 4, sg2);
  }
  R('#eaf6ff', 0, 166, W, 8, sg2); R('#bfe3f7', 0, 174, W, 2, sg2);
  for (let dx = 4; dx < W; dx += 24) R('#7cc7f0', dx, 169, 12, 2, sg2);
  [14, 58, 112, 168, 226, 282].forEach((tx, i) => {
    const ty = i % 2 ? 150 : 154;
    R('#7a5a3a', tx + 4, ty + 6, 3, 8, sg2); R('#2f9e5a', tx, ty - 6, 11, 12, sg2); R('#6fe09a', tx + 1, ty - 6, 5, 4, sg2);
  });
  for (let i = 0; i < 40; i++) R(rnd() > 0.5 ? '#fff' : '#fff3a0', rnd() * W, 177 + rnd() * 3, 1, 1, sg2);

  // elementos dinâmicos
  for (let i = 0; i < 6; i++) clouds.push({ x: rnd() * 400, y: 10 + rnd() * 58, w: 26 + rnd() * 30, s: 3 + rnd() * 4 });
  for (let i = 0; i < 26; i++) bubbles.push({ x: rnd() * W, y: rnd() * H, s: 2 + (rnd() * 3 | 0), v: 5 + rnd() * 9, p: rnd() * 6 });
  for (let i = 0; i < 3; i++) drones.push({ x: rnd() * W, y: 28 + i * 22, v: (i % 2 ? -1 : 1) * (9 + i * 4) });
}

function render(t) {
  ctx.drawImage(st, 0, 0);
  const pulse = S.anim ? Math.round(Math.sin(t * 1.5) * 2) : 0;
  for (let k = 3; k >= 0; k--) { const s = 14 + k * 10 + pulse * 2; ctx.globalAlpha = 0.13; R('#fff', 250 - s / 2, 34 - s / 2, s, s); }
  ctx.globalAlpha = 1; R('#fffbd0', 244, 28, 12, 12); R('#fff', 247, 31, 6, 6);
  clouds.forEach(c => {
    const x = ((c.x + t * c.s) % (W + 80)) - 60;
    R('#d4ecfb', x, c.y + 4, c.w, 4); R('#fff', x, c.y, c.w, 5); R('#fff', x + c.w * .2, c.y - 4, c.w * .45, 5); R('#fff', x + c.w * .55, c.y - 2, c.w * .3, 3);
  });
  wins.forEach(w => { if (Math.sin(t * 0.7 + w.p) > 0.1) R(w.c, w.x, w.y, 3, 3); });
  ants.forEach(a => R(Math.sin(t * 3 + a.p) > 0 ? '#ff6b6b' : '#7dffa8', a.x - 1, a.y, 3, 3));
  wifis.forEach(w => {
    const by = w.y + Math.round(Math.sin(t * 2 + w.p));
    WIFI.forEach((row, ry) => [...row].forEach((c, rx) => { if (c === 'X') R('#fff', w.x + rx, by + ry, 1, 1); }));
  });
  drones.forEach(d => {
    const x = ((d.x + t * d.v) % (W + 40) + W + 40) % (W + 40) - 20, on = Math.sin(t * 8) > 0;
    R('#fff', x, d.y, 7, 2); R('#5aa9dc', x + 2, d.y + 2, 3, 1); R('#fff', x - 2, d.y - 1, 3, 1); R('#fff', x + 6, d.y - 1, 3, 1);
    R(on ? '#ff6b6b' : '#7dffa8', x + 3, d.y - 1, 1, 1);
  });
  bubbles.forEach(b => {
    const y = ((b.y - t * b.v) % (H + 10) + H + 10) % (H + 10) - 5, x = b.x + Math.round(Math.sin(t + b.p) * 3);
    ctx.globalAlpha = 0.75; R('#fff', x, y, b.s, b.s); ctx.globalAlpha = 0.45; R('#78cffd', x + 1, y + 1, b.s - 2, b.s - 2);
  });
  ctx.globalAlpha = 1;
}

let raf = 0;
function frame(ms) { render(ms / 1000); raf = requestAnimationFrame(frame); }
function setAnim() {
  cancelAnimationFrame(raf);
  if (S.anim) raf = requestAnimationFrame(frame); else render(0);
}

buildScene(); applyUI();