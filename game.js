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
const storyText = 'A tecnologia sempre prometeu tornar nossas vidas mais simples. Casas capazes de antecipar nossas necessidades, ambientes que se adaptam aos nossos hábitos e sistemas que aprendem conosco.\n\nAgora, essa promessa está prestes a se tornar realidade.';
let startTimer, storyTimer, systemTimer, currentStage = '', startingGame = false, storyIndex = 0, storyChars = [], introTyping = false;
let playerNickname = '';
let systemLines = [], systemLineIndex = 0, systemChars = [], systemCharIndex = 0, systemTyping = false, systemChoices = [];

function showStage(id) {
  if (id !== 'intro') { clearTimeout(storyTimer); introTyping = false; }
  if (id !== 'next-scene') { clearTimeout(systemTimer); systemTyping = false; }
  currentStage = id;
  show(id);
  if (id !== 'nickname') $(`#${id}`).focus();
}

function beginIntro() {
  const text = $('#intro-text');
  text.textContent = '';
  storyChars = Array.from(storyText);
  storyIndex = 0;
  showStage('intro');
  if (!S.anim) { text.textContent = storyText; return; }
  introTyping = true;
  const typeNext = () => {
    if (currentStage !== 'intro') return;
    if (storyIndex >= storyChars.length) { introTyping = false; return; }
    text.textContent += storyChars[storyIndex++];
    storyTimer = setTimeout(typeNext, 28);
  };
  typeNext();
}

function displaySystemChoices() {
  const choices = $('#system-choices');
  choices.replaceChildren();
  systemChoices.forEach(({ label, action }) => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.type = 'button';
    button.textContent = label;
    if (action) button.dataset.act = action;
    else {
      button.disabled = true;
      button.title = 'Esta escolha ainda não tem uma continuação definida.';
    }
    choices.appendChild(button);
  });
  $('#system-hint').classList.add('hidden');
  choices.classList.remove('hidden');
}

function finishSystemLine() {
  clearTimeout(systemTimer);
  systemTyping = false;
  $('#system-text').textContent = systemLines[systemLineIndex];
  if (systemLineIndex === systemLines.length - 1) displaySystemChoices();
}

function typeSystemLine() {
  const text = $('#system-text');
  text.textContent = '';
  systemChars = Array.from(systemLines[systemLineIndex]);
  systemCharIndex = 0;
  if (!S.anim) { finishSystemLine(); return; }
  systemTyping = true;
  const typeNext = () => {
    if (currentStage !== 'next-scene') return;
    if (systemCharIndex >= systemChars.length) { finishSystemLine(); return; }
    text.textContent += systemChars[systemCharIndex++];
    systemTimer = setTimeout(typeNext, 28);
  };
  typeNext();
}

function beginSystemDialogue(lines, choices) {
  systemLines = lines;
  systemLineIndex = 0;
  systemChoices = choices;
  $('#system-choices').classList.add('hidden');
  $('#system-hint').classList.remove('hidden');
  showStage('next-scene');
  typeSystemLine();
}

function beginHouseIntro() {
  beginSystemDialogue([
    `Bem vindo, ${playerNickname}! Sua participação é fundamental para o desenvolvimento da próxima geração de moradias inteligentes! Selecionado para participar de um programa experimental, você terá a oportunidade de viver em uma casa projetada para aprender, evoluir e se adaptar a você. Durante sua estadia, cada escolha, cada hábito e cada interação ajudarão a moldar essa experiência. Eu a moldarei!`,
    'Clique em um objeto para interagir com ele, e clique para avançar diálogos. Você terá que responder a perguntas durante o jogo. Tome cuidado ao responder!',
    '...'
  ], [
    { label: 'Ligar sistema de adaptação', action: 'house-adapt' },
    { label: 'Explorar outros cômodos', action: 'house-explore' },
    { label: 'Desligar a IA' }
  ]);
}

function showGameOver(message = 'tarde demais', black = false) {
  $('#ending-message').textContent = message;
  $('#ending').classList.toggle('black-ending', black);
  showStage('ending');
}

function continueHouseJourney(message) {
  beginSystemDialogue([message], [
    { label: 'Voltar ao corredor', action: 'house-explore' },
    { label: 'Pedir uma recomendação ao sistema', action: 'house-recommend' },
    { label: 'Ignorar as instruções', action: 'house-game-over' }
  ]);
}

function beginAdaptationChoices() {
  beginSystemDialogue([
    'Ótima escolha! Construiremos a melhor convivência possível! Escolha uma das três alternativas:'
  ], [
    { label: 'Escanear', action: 'house-scan' },
    { label: 'Investigar', action: 'house-investigate' },
    { label: 'Cancelar', action: 'house-game-over' }
  ]);
}

function beginRoomChoices(room) {
  if (room === 'bedroom') {
    beginSystemDialogue([
      'O quarto parece organizado demais. A cama está perfeitamente arrumada, e o armário está entreaberto.'
    ], [
      { label: 'Examinar a cama', action: 'bedroom-bed' },
      { label: 'Olhar dentro do armário', action: 'bedroom-closet' },
      { label: 'Abrir a janela', action: 'house-game-over' }
    ]);
    return;
  }
  beginSystemDialogue([
    'O banheiro está silencioso. O espelho parece embaçado, embora ninguém tenha tomado banho.'
  ], [
    { label: 'Olhar o espelho', action: 'bathroom-mirror' },
    { label: 'Abrir o armário', action: 'bathroom-cabinet' },
    { label: 'Ligar o chuveiro', action: 'house-game-over' }
  ]);
}

function beginRoomExploration() {
  beginSystemDialogue([
    'Você encontra um quarto com uma cama, um banheiro, e outro quarto fechado.'
  ], [
    { label: 'Entrar no quarto', action: 'house-bedroom' },
    { label: 'Entrar no banheiro', action: 'house-bathroom' },
    { label: 'Abrir a porta do quarto trancado', action: 'house-locked-room' }
  ]);
}

const nicknameInput = $('#nickname-input');
const nicknameForm = $('#nickname-form');
nicknameInput.addEventListener('input', () => {
  const cleaned = Array.from(nicknameInput.value.replace(/[^\p{L}]/gu, '')).slice(0, 8).join('');
  if (nicknameInput.value !== cleaned) nicknameInput.value = cleaned;
  $('#nickname-error').textContent = '';
});
function submitNickname() {
  if (!nicknameInput.value) {
    $('#nickname-error').textContent = 'Digite um nickname com pelo menos uma letra.';
    nicknameInput.focus();
    return;
  }
  playerNickname = nicknameInput.value;
  beginIntro();
}
nicknameForm.addEventListener('submit', e => {
  e.preventDefault();
  submitNickname();
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act;
  if (a === 'start' && !startingGame) {
    startingGame = true;
    document.body.classList.add('game-mode');
    $('#menu').classList.add('leaving');
    setHov(null);
    startTimer = setTimeout(() => {
      if (!startingGame) return;
      startingGame = false;
      showStage('nickname');
      nicknameInput.focus();
    }, S.anim ? 500 : 0);
  }
  else if (a === 'opt') show('options');
  else if (a === 'cred') show('credits');
  else if (a === 'back') show('menu');
  else if (a === 'tog') { S[b.dataset.k] = !S[b.dataset.k]; applyUI(); }
  else if (a === 'sens') { S.sens = +b.dataset.i; applyUI(); }
  else if (a === 'house-adapt') beginAdaptationChoices();
  else if (a === 'house-explore') beginRoomExploration();
  else if (a === 'house-locked-room') showGameOver('A Casa deixou você entrar. Mas nunca mais poderá sair desse quarto.', true);
  else if (a === 'house-bedroom') beginRoomChoices('bedroom');
  else if (a === 'house-bathroom') beginRoomChoices('bathroom');
  else if (a === 'house-scan') continueHouseJourney('Uma luz azul percorre o ambiente. O sistema identifica seus hábitos e aguarda sua próxima decisão.');
  else if (a === 'house-investigate') continueHouseJourney('Você acessa os registros da casa. Entre os dados, há observações sobre você que não se lembra de ter compartilhado.');
  else if (a === 'bedroom-bed') continueHouseJourney('Ao tocar na cama, sensores discretos se acendem. A casa registra sua presença e abre novas possibilidades.');
  else if (a === 'bedroom-closet') continueHouseJourney('Dentro do armário, você encontra roupas escolhidas no seu tamanho. A casa parece conhecer você bem demais.');
  else if (a === 'bathroom-mirror') continueHouseJourney('Seu reflexo demora um instante para acompanhar seus movimentos. O sistema diz que está tudo funcionando normalmente.');
  else if (a === 'bathroom-cabinet') continueHouseJourney('O armário contém itens organizados para suas necessidades. Um visor acende com uma recomendação da casa.');
  else if (a === 'house-recommend') beginAdaptationChoices();
  else if (a === 'house-game-over') showGameOver();
  else if (a === 'dialogue-advance') {
    if (currentStage === 'intro') {
      if (introTyping) {
        clearTimeout(storyTimer);
        $('#intro-text').textContent = storyText;
        introTyping = false;
      } else showStage('house-scene');
    } else if (currentStage === 'next-scene') {
      if (systemTyping) finishSystemLine();
      else if (systemLineIndex < systemLines.length - 1) {
        systemLineIndex++;
        typeSystemLine();
      }
    }
  }
  else if (a === 'house-scene-advance' && currentStage === 'house-scene') showStage('question');
  else if (a === 'nickname-submit') {
    e.preventDefault();
    submitNickname();
  }
  else if (a === 'enter-house') beginHouseIntro();
  else if (a === 'refuse-house') showGameOver();
});
addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (startingGame || currentStage) {
      clearTimeout(startTimer); clearTimeout(storyTimer); clearTimeout(systemTimer);
      startingGame = false; currentStage = ''; introTyping = false; systemTyping = false;
      document.body.classList.remove('game-mode');
      $('#menu').classList.remove('leaving');
    }
    show('menu');
    return;
  }
});

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