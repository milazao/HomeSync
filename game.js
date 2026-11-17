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

/* ================= CURSOR PIXELADO E SENSIBILIDADE ================= */
// A seta pixelada vale como cursor do sistema (sempre funciona) e como cursor virtual.
(() => {
  const A = ['#...........', '##..........', '#o#.........', '#oo#........', '#ooo#.......', '#oooo#......', '#ooooo#.....',
    '#oooooo#....', '#ooooooo#...', '#oooooooo#..', '#ooooo#####.', '#oo#oo#.....', '#o#.#oo#....', '##...#oo#...',
    '#.....#oo#..', '......#oo#..', '.......##...'];
  let r = '';
  A.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch !== '.') r += `<rect x='${x * 2}' y='${y * 2}' width='2' height='2' fill='${ch === '#' ? '#0a2f6b' : '#fff'}'/>`;
  }));
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='34' shape-rendering='crispEdges'>${r}</svg>`;
  const u = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  document.documentElement.style.setProperty('--cur', `${u} 0 0, auto`);
  document.documentElement.style.setProperty('--curimg', u);
})();

// Por padrão o mouse é o nativo. Com sensibilidade diferente de 1.0x, ao clicar o mouse
// é capturado (pointer lock) e passa a andar na velocidade escolhida. Esc solta.
let vx = 0, vy = 0, lx = 0, ly = 0, hov = null, touch = false;
const cur = $('#cursor'), locked = () => document.pointerLockElement === document.body;
const clamp = (v, m) => Math.min(m - 1, Math.max(0, v));
function setHov(b) {
  if (b === hov) return;
  if (hov) hov.classList.remove('hov', 'press');
  if (b) { b.classList.add('hov'); sfx(660, 0.04); }
  hov = b;
}
function moveCur() {
  cur.style.transform = `translate(${vx}px,${vy}px)`;
  const el = document.elementFromPoint(vx, vy);
  setHov(el && el.closest('[data-act]'));
}
function clickSnd() { // "tic-tac" de clique, respeita Efeitos sonoros
  if (!ac || !S.sfx) return;
  const t = ac.currentTime;
  tone(1500, t, 0.04, 'square', 0.12, sg); tone(900, t + 0.03, 0.07, 'square', 0.1, sg);
}
document.addEventListener('pointerlockchange', () => {
  const l = locked(); document.body.classList.toggle('virt', l);
  if (l) { vx = lx; vy = ly; moveCur(); } else setHov(null);
});
addEventListener('mousemove', e => {
  if (locked()) { vx = clamp(vx + e.movementX * sens(), innerWidth); vy = clamp(vy + e.movementY * sens(), innerHeight); moveCur(); }
  else { lx = e.clientX; ly = e.clientY; }
});
document.addEventListener('mouseover', e => { if (!locked() && !touch) setHov(e.target.closest('[data-act]')); });
addEventListener('mousedown', e => {
  if (touch) return;
  initAudio();
  const b = locked() ? hov : e.target.closest('[data-act]');
  if (b) { b.classList.add('press'); clickSnd(); }
  if (!locked() && sens() !== 1) { try { const p = document.body.requestPointerLock(); p && p.catch && p.catch(() => {}); } catch (_) {} }
});
addEventListener('mouseup', () => { if (hov) hov.classList.remove('press'); if (locked() && hov) hov.click(); });
addEventListener('click', e => { if (locked() && e.isTrusted) { e.stopPropagation(); e.preventDefault(); } }, true);
addEventListener('touchstart', e => {
  touch = true; initAudio();
  if (e.target.closest && e.target.closest('[data-act]')) clickSnd();
}, { passive: true });

/* ================= TELAS E AÇÕES ================= */
function show(id) {
  $$('.screen').forEach(s => s.classList.toggle('hidden', s.id !== id));
  setHov(null); if (locked()) moveCur();
}
let toastT;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
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

/* ================= EFEITOS SOBRE A IMAGEM (320x180) ================= */
const fx = $('#fx'), fc = fx.getContext('2d');
fx.width = 320; fx.height = 180;
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const sparks = [], bubs = [];
for (let i = 0; i < 34; i++) sparks.push({ x: rnd() * 320 | 0, y: rnd() * 140 | 0, p: rnd() * 6.28 });
for (let i = 0; i < 20; i++) bubs.push({ x: rnd() * 320, y: rnd() * 180, s: 2 + (rnd() * 3 | 0), v: 4 + rnd() * 8, p: rnd() * 6 });

function render(t) {
  fc.clearRect(0, 0, 320, 180);
  fc.fillStyle = '#fff';
  sparks.forEach(s => {
    const k = Math.sin(t * 2.2 + s.p);
    if (k > 0.55) { fc.fillRect(s.x, s.y, 1, 1); if (k > 0.85) { fc.fillRect(s.x - 1, s.y, 3, 1); fc.fillRect(s.x, s.y - 1, 1, 3); } }
  });
  bubs.forEach(b => {
    const y = ((b.y - t * b.v) % 190 + 190) % 190 - 5, x = Math.round(b.x + Math.sin(t + b.p) * 3);
    fc.globalAlpha = 0.7; fc.fillStyle = '#fff'; fc.fillRect(x, y, b.s, b.s);
    fc.globalAlpha = 0.4; fc.fillStyle = '#6ff0ff'; fc.fillRect(x + 1, y + 1, b.s - 2, b.s - 2);
  });
  fc.globalAlpha = 1;
}
let raf = 0;
function frame(ms) { render(ms / 1000); raf = requestAnimationFrame(frame); }
function setAnim() {
  cancelAnimationFrame(raf);
  if (S.anim) raf = requestAnimationFrame(frame); else fc.clearRect(0, 0, 320, 180);
}

applyUI();