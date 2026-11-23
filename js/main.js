/* Exact Soluções · motor da esteira
 * Uma caixa percorre o site. Todo o cenário é um SVG "mundo" desenhado aqui;
 * a câmera acompanha a caixa e o scroll controla uma timeline GSAP única.
 * Unidades do mundo: superfície da esteira em y=480, chão em y=640.
 */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mk = (tag, a = {}, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in a) e.setAttribute(k, a[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const txt = (parent, x, y, s, a = {}) => { const t = mk('text', { x, y, ...a }, parent); t.textContent = s; return t; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp01 = t => Math.max(0, Math.min(1, t));

  const C = {
    red: '#5b2fb3', redD: '#3f1f86', yel: '#f2b705', lime: '#7b4fe0', pur: '#5b2fb3',
    leg: '#a79dc0', legD: '#8a7fa6', kraft: '#c99158', kraftL: '#dcae78', kraftD: '#9c6b3c',
    blue: '#3b3350', steel: '#dcd7e8', ink: '#1e1533', muted: '#7a7092'
  };
  const REST = 820;
  const FLOOR = 640, Y = 480, LOW = 560, TF = 400; // TF = piso do baú
  const P = {
    rampA: -180, rampB: -40,
    cub: 1900, dat: 2400, sort: 3000,
    chuteA: 3060, chuteB: 3160, incA: 3500, incB: 3740,
    truck: 3750, inTruck: 4010,
    factory: 4900, clientsA: 6150, dest: 8650, end: 8210
  };

  // caminho que a caixa percorre (y em função de x)
  function pathY(x) {
    if (x < P.rampA) return TF;
    if (x < P.rampB) return lerp(TF, Y, (x - P.rampA) / (P.rampB - P.rampA));
    if (x < P.chuteA) return Y;
    if (x < P.chuteB) return lerp(Y, LOW, (x - P.chuteA) / (P.chuteB - P.chuteA));
    if (x < P.incA) return LOW;
    if (x < P.incB) return lerp(LOW, TF, (x - P.incA) / (P.incB - P.incA));
    return TF;
  }

  /* ---------------- estado animado ---------------- */
  const S = {
    x: -420, truck: P.truck, camOff: 0, zoom: 1,
    laser: 0, scan: 0, dim: 0, read: 0,
    link: 0, data: 0, ok: 0,
    lane: 0, flap: 0, doors: 0, done: 0
  };

  const svg = document.getElementById('scene');
  const L = id => document.getElementById(id);
  const para = L('para'), cam = L('cam');
  const ground = L('ground'), scenery = L('scenery'), lines = L('lines'),
    mback = L('mback'), boxLayer = L('boxLayer'), trucks = L('trucks'), mfront = L('mfront');
  const rollers = [];
  const R = {}; // referências para o render

  /* ---------------- construtores ---------------- */
  function legsFor(p, x1, y1, x2, y2, floor = FLOOR, step = 170) {
    const g = mk('g', {}, p);
    const xs = [];
    for (let lx = x1 + 28; lx < x2 - 20; lx += step) xs.push(lx);
    xs.push(x2 - 24);
    xs.forEach(lx => {
      const top = lerp(y1, y2, (lx - x1) / (x2 - x1)) + 24;
      mk('rect', { x: lx - 4, y: top, width: 8, height: Math.max(0, floor - top), fill: C.leg }, g);
      mk('rect', { x: lx - 11, y: floor - 6, width: 22, height: 6, fill: C.legD }, g);
    });
  }

  function conveyor(p, x1, y1, x2, y2, type, o = {}) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const ang = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
    if (!o.noLegs) legsFor(p, x1, y1, x2, y2, o.floor ?? FLOOR, o.legStep);
    const g = mk('g', { transform: `translate(${x1},${y1}) rotate(${ang})`, opacity: o.opacity ?? 1 }, p);
    if (type === 'roller') {
      mk('rect', { x: 0, y: 4, width: len, height: 6, fill: '#5a5170' }, g);
      for (let r = 9; r < len - 4; r += 19) {
        const rg = mk('g', {}, g);
        mk('circle', { cx: r, cy: 6, r: 8, fill: C.steel }, rg);
        mk('rect', { x: r - 7, y: 5, width: 14, height: 2, fill: '#a39bb8' }, rg);
        rollers.push({ el: rg, cx: r, cy: 6 });
      }
    } else {
      mk('rect', { x: 0, y: 0, width: len, height: 12, fill: type === 'mod' ? 'url(#pMod)' : 'url(#pBelt)' }, g);
    }
    const frame = o.frame || C.red;
    mk('rect', { x: -4, y: 10, width: len + 8, height: 17, fill: frame }, g);
    mk('rect', { x: -4, y: 10, width: len + 8, height: 3, fill: 'rgba(255,255,255,.22)' }, g);
    mk('rect', { x: -4, y: 24, width: len + 8, height: 3, fill: 'rgba(0,0,0,.25)' }, g);
    if (o.motor) {
      const m = mk('g', { transform: `translate(${len * o.motor},27)` }, g);
      mk('rect', { x: -15, y: 0, width: 30, height: 36, rx: 5, fill: C.blue }, m);
      mk('rect', { x: -15, y: 8, width: 30, height: 3, fill: 'rgba(255,255,255,.25)' }, m);
      mk('rect', { x: -8, y: 36, width: 16, height: 8, fill: '#2a2340' }, m);
    }
    if (o.tag) {
      const t = mk('g', { transform: `translate(${len / 2},48)` }, g);
      mk('rect', { x: -44, y: 0, width: 88, height: 18, fill: '#ffffff', stroke: 'rgba(123,79,224,.4)' }, t);
      txt(t, 0, 13, o.tag, { 'text-anchor': 'middle', 'font-size': 10, fill: C.lime, 'letter-spacing': 1.5 });
    }
    return g;
  }

  function buildBox() {
    const g = mk('g', { id: 'box' }, boxLayer);
    const inner = mk('g', {}, g);
    // volume com leve profundidade (face superior e lateral)
    mk('polygon', { points: '-45,-70 -35,-80 55,-80 45,-70', fill: C.kraftL }, inner);
    mk('polygon', { points: '45,-70 55,-80 55,-10 45,0', fill: C.kraftD }, inner);
    mk('rect', { x: -45, y: -70, width: 90, height: 70, fill: C.kraft }, inner);
    mk('rect', { x: -6, y: -70, width: 12, height: 70, fill: 'rgba(240,210,160,.55)' }, inner);
    mk('polygon', { points: '-1,-70 9,-80 21,-80 11,-70', fill: 'rgba(240,210,160,.6)' }, inner);
    // etiqueta com código de barras
    const lab = mk('g', { transform: 'translate(-38,-58)' }, inner);
    mk('rect', { x: 0, y: 0, width: 30, height: 36, fill: '#f6f3ea' }, lab);
    [2, 4, 7, 8, 11, 14, 15, 18, 21, 22, 25].forEach((bx, i) =>
      mk('rect', { x: bx + 1, y: 4, width: i % 3 ? 1.2 : 2, height: 14, fill: '#1a1a1a' }, lab));
    txt(lab, 15, 27, 'SC-02', { 'text-anchor': 'middle', 'font-size': 7, fill: '#1a1a1a', 'font-weight': 600 });
    txt(lab, 15, 33, 'EX-48213', { 'text-anchor': 'middle', 'font-size': 4.5, fill: '#444' });
    R.label = mk('rect', { x: -40, y: -60, width: 34, height: 40, fill: 'none', stroke: C.lime, 'stroke-width': 2, opacity: 0 }, inner);
    // selo de "cubado"
    const ok = mk('g', { transform: 'translate(22,-96)', opacity: 0 }, g);
    mk('rect', { x: -22, y: -12, width: 64, height: 22, fill: C.lime }, ok);
    mk('path', { d: 'M-14,-1 l5,5 l9,-10', fill: 'none', stroke: '#ffffff', 'stroke-width': 3 }, ok);
    txt(ok, 18, 4, 'OK', { 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: '#ffffff' });
    R.box = g; R.boxIn = inner; R.ok = ok;
  }

  /* Caminhão baú de transportadora (não é da Exact).
   * Origem (0,0) = canto traseiro no piso do baú. Chão fica em y = +240.
   * Proporção: caixa de 70u ≈ 40 cm, então roda com ~1 m de diâmetro ≈ r 80. */
  function buildTruck(parent, x, flip) {
    const GR = FLOOR - TF;            // 240: distância do piso do baú ao chão
    const WR = 80, WY = GR - WR;      // raio e centro das rodas (encostadas no chão)
    const g = mk('g', { transform: `translate(${x},${TF})${flip ? ' scale(-1,1)' : ''}` }, parent);
    const ink = '#2a2338', ink2 = '#3a3150', cabC = '#352a5c', cabL = '#4a3d78';

    // portas traseiras abertas
    const doors = mk('g', {}, g);
    mk('rect', { x: -46, y: -286, width: 44, height: 292, rx: 3, fill: '#f1eef7', stroke: '#cfc7e2', 'stroke-width': 2 }, doors);
    for (let i = 0; i < 3; i++) mk('rect', { x: -40, y: -250 + i * 90, width: 32, height: 3, fill: '#d8d1e8' }, doors);
    mk('rect', { x: -30, y: -150, width: 5, height: 46, rx: 2, fill: '#9d94b6' }, doors);

    // chassi: longarina contínua e suspensão
    mk('rect', { x: 10, y: 6, width: 700, height: 30, rx: 4, fill: ink }, g);
    mk('rect', { x: 120, y: 36, width: 260, height: 26, rx: 4, fill: ink2 }, g);
    mk('rect', { x: 580, y: 36, width: 90, height: 22, rx: 4, fill: ink2 }, g);
    mk('rect', { x: 400, y: 30, width: 110, height: 50, rx: 8, fill: '#4b4266' }, g);
    mk('rect', { x: 408, y: 40, width: 94, height: 4, fill: 'rgba(255,255,255,.18)' }, g);
    mk('rect', { x: 412, y: 92, width: 120, height: 8, rx: 3, fill: '#cfc8e0' }, g);
    mk('rect', { x: 412, y: 116, width: 120, height: 8, rx: 3, fill: '#cfc8e0' }, g);

    // baú
    mk('rect', { x: 0, y: -290, width: 520, height: 296, rx: 6, fill: '#ffffff' }, g);
    mk('rect', { x: 0, y: -290, width: 520, height: 12, rx: 6, fill: '#e6e1f1' }, g);
    mk('rect', { x: 0, y: -8, width: 520, height: 14, fill: '#d9d4e6' }, g);
    for (let i = 65; i < 520; i += 65) mk('rect', { x: i, y: -278, width: 1.5, height: 270, fill: '#eeeaf6' }, g);
    // faixa refletiva vermelha e branca (obrigatória em caminhões no Brasil)
    for (let i = 4; i < 516; i += 24) mk('rect', { x: i, y: -26, width: 12, height: 8, fill: (i - 4) % 48 === 0 ? '#e5484d' : '#d9d4e6' }, g);
    // pintura da transportadora: ondas lilás + símbolo genérico de carga em movimento
    const art = mk('g', flip ? { transform: 'translate(520,0) scale(-1,1)' } : {}, g);
    mk('path', { d: 'M0,-96 C140,-96 220,-156 360,-156 C430,-156 480,-138 520,-126 V-34 H0 Z', fill: '#ece6fc' }, art);
    mk('path', { d: 'M0,-60 C150,-60 240,-116 380,-116 C440,-116 490,-104 520,-96 V-34 H0 Z', fill: '#c9b8f5' }, art);
    const em = mk('g', { transform: 'translate(120,-236)' }, art);
    [0, 14, 28].forEach((dy, i) => mk('rect', { x: i * 10, y: 6 + dy, width: 38 - i * 10, height: 6, rx: 3, fill: C.lime }, em));
    mk('rect', { x: 46, y: 0, width: 52, height: 46, rx: 6, fill: C.pur }, em);
    mk('path', { d: 'M46,16 H98 M72,0 V16', stroke: '#ffffff', 'stroke-width': 3, fill: 'none' }, em);
    txt(em, 112, 21, 'CARGAS E', { 'font-size': 18, 'font-weight': 700, fill: C.ink, 'letter-spacing': 1 });
    txt(em, 112, 44, 'ENCOMENDAS', { 'font-size': 18, 'font-weight': 700, fill: C.pur, 'letter-spacing': 1 });

    // porta fechada (aparece ao carregar)
    const shut = mk('rect', { x: -4, y: -290, width: 8, height: 296, rx: 2, fill: '#b8b0cc', opacity: 0 }, g);

    // para-choque traseiro com refletivo e lanterna
    mk('rect', { x: 18, y: 36, width: 10, height: 84, fill: ink }, g);
    mk('rect', { x: 4, y: 116, width: 74, height: 18, rx: 3, fill: ink }, g);
    for (let i = 0; i < 4; i++) mk('rect', { x: 8 + i * 17, y: 120, width: 9, height: 10, fill: i % 2 ? '#f4f2fa' : '#e5484d' }, g);
    mk('rect', { x: 2, y: 8, width: 12, height: 20, rx: 3, fill: '#e5484d' }, g);

    // defletor de ar entre cabine e baú
    mk('path', { d: 'M548,-212 L556,-284 H644 L676,-212 Z', fill: cabL }, g);
    mk('path', { d: 'M556,-284 H644 L650,-268 H558 Z', fill: 'rgba(255,255,255,.12)' }, g);
    // cabine avançada
    mk('path', { d: 'M540,6 V-196 Q540,-214 558,-214 H690 Q708,-214 712,-196 L726,-60 V6 Z', fill: cabC }, g);
    mk('path', { d: 'M640,-200 H694 Q702,-200 704,-190 L714,-110 H640 Z', fill: '#bfe0ec' }, g);
    mk('path', { d: 'M654,-196 H700 L705,-160 Z', fill: 'rgba(255,255,255,.6)' }, g);
    mk('path', { d: 'M566,-196 H628 V-120 H566 Z', fill: '#bfe0ec', opacity: .92 }, g);
    mk('path', { d: 'M560,-206 H634 V-10 H560 Z', fill: 'none', stroke: 'rgba(255,255,255,.16)', 'stroke-width': 2 }, g);
    mk('rect', { x: 602, y: -96, width: 22, height: 6, rx: 3, fill: '#a99fd0' }, g);
    mk('rect', { x: 540, y: -66, width: 186, height: 10, fill: C.lime }, g);
    mk('rect', { x: 716, y: -176, width: 6, height: 60, rx: 3, fill: ink }, g);
    mk('rect', { x: 720, y: -168, width: 16, height: 44, rx: 5, fill: ink }, g);
    mk('rect', { x: 688, y: -50, width: 40, height: 40, rx: 6, fill: '#2a2140' }, g);
    for (let i = 0; i < 4; i++) mk('rect', { x: 694, y: -44 + i * 9, width: 30, height: 4, rx: 2, fill: '#4a3d78' }, g);
    mk('rect', { x: 712, y: -6, width: 26, height: 32, rx: 5, fill: ink }, g);
    mk('rect', { x: 722, y: -40, width: 14, height: 16, rx: 4, fill: '#fff4c2' }, g);
    mk('rect', { x: 588, y: 8, width: 40, height: 10, rx: 3, fill: ink2 }, g);

    // para-lamas
    const fender = (x1, x2) => mk('path', {
      d: `M${x1},${WY} A${WR + 12},${WR + 12} 0 0 1 ${x1 + WR + 12},${WY - WR - 12} H${x2 - WR - 12} A${WR + 12},${WR + 12} 0 0 1 ${x2},${WY}`,
      fill: 'none', stroke: ink, 'stroke-width': 10, 'stroke-linecap': 'round'
    }, g);
    fender(150 - WR - 12, 320 + WR + 12);
    fender(634 - WR - 12, 634 + WR + 12);

    // rodas: pneu, aro, cubo e parafusos (o grupo interno gira)
    const wheels = [];
    [150, 320, 634].forEach(cx => {
      const w = mk('g', {}, g);
      mk('circle', { cx, cy: WY, r: WR, fill: '#221c33' }, w);
      mk('circle', { cx, cy: WY, r: 46, fill: '#dcd7e8' }, w);
      mk('circle', { cx, cy: WY, r: 40, fill: '#c3bcd6' }, w);
      const spin = mk('g', {}, w);
      mk('circle', { cx, cy: WY, r: WR - 7, fill: 'none', stroke: '#3a3150', 'stroke-width': 4, 'stroke-dasharray': '9 9' }, spin);
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4;
        mk('circle', { cx: cx + Math.cos(a) * 28, cy: WY + Math.sin(a) * 28, r: 5, fill: '#8d84a6' }, spin);
      }
      mk('circle', { cx, cy: WY, r: 15, fill: '#8d84a6' }, spin);
      mk('rect', { x: cx - 3, y: WY - 15, width: 6, height: 10, fill: '#dcd7e8' }, spin);
      wheels.push({ el: spin, cx, cy: WY });
    });
    // sombra no chão
    mk('ellipse', { cx: 370, cy: GR + 3, rx: 400, ry: 9, fill: 'rgba(42,35,56,.16)' }, g);
    return { g, doors, shut, wheels };
  }

  /* ---------------- o mundo ---------------- */
  function buildWorld() {
    // chão do galpão e depois estrada
    mk('rect', { x: -3000, y: FLOOR, width: 6900, height: 600, fill: '#ebe7f4' }, ground);
    mk('rect', { x: -3000, y: FLOOR, width: 6900, height: 2, fill: 'rgba(123,79,224,.35)' }, ground);
    for (let x = -1400; x < 3860; x += 60) mk('rect', { x, y: FLOOR + 40, width: 30, height: 6, fill: 'rgba(91,47,179,.16)' }, ground);
    mk('rect', { x: 3900, y: FLOOR, width: 6000, height: 600, fill: '#d9d3e5' }, ground);
    mk('rect', { x: 3900, y: FLOOR, width: 6000, height: 4, fill: '#bdb4d1' }, ground);
    for (let x = 3950; x < 9800; x += 110) mk('rect', { x, y: FLOOR + 52, width: 56, height: 6, fill: '#ffffff' }, ground);

    // doca do galpão (moldura listrada)
    mk('rect', { x: 3700, y: 60, width: 36, height: 580, fill: '#ffffff' }, scenery);
    mk('rect', { x: 3730, y: 60, width: 10, height: 580, fill: 'url(#pHazard)' }, scenery);
    const doca = mk('g', { transform: 'translate(3640,40)' }, scenery);
    mk('rect', { x: 0, y: 0, width: 96, height: 30, fill: '#ffffff', stroke: C.yel }, doca);
    txt(doca, 48, 20, 'DOCA 04', { 'text-anchor': 'middle', 'font-size': 12, fill: C.ink, 'letter-spacing': 2 });

    buildFactory();
    buildBillboards();
    buildDestination();

    // linha principal
    const hz = mk('g', {}, lines);
    // rampa de descarga (sai do caminhão da hero)
    conveyor(hz, P.rampA, TF, P.rampB, Y, 'roller', { frame: C.yel, legStep: 90 });
    conveyor(hz, P.rampB, Y, 560, Y, 'belt', { motor: .5, tag: 'LONA' });
    conveyor(hz, 560, Y, 1100, Y, 'roller', { motor: .5, tag: 'ROLETES', frame: '#9b7be8' });
    conveyor(hz, 1100, Y, 1640, Y, 'mod', { motor: .5, tag: 'MODULAR', frame: '#8f86ad' });
    conveyor(hz, 1640, Y, 2160, Y, 'belt', { motor: .2 });
    conveyor(hz, 2160, Y, P.chuteA, Y, 'belt', { motor: .5 });
    // linha que segue para outras rotas (ao fundo)
    conveyor(hz, P.chuteA + 20, Y, 3400, Y, 'belt', { opacity: .45, noLegs: true });
    // rampa do sorter e linha inferior
    conveyor(hz, P.chuteA, Y, P.chuteB, LOW, 'roller', { frame: C.yel, legStep: 80 });
    conveyor(hz, P.chuteB, LOW, P.incA, LOW, 'roller', { frame: C.yel, motor: .5 });
    // transportador de carga subindo para o baú
    conveyor(hz, P.incA, LOW, P.incB, TF, 'mod', { frame: C.yel, motor: .4, legStep: 110 });

    buildCubagem();
    buildDados();
    buildSorter();
    buildBox();

    R.heroTruck = buildTruck(trucks, P.rampA, true);
    R.truck = buildTruck(trucks, P.truck, false);
  }

  function buildCubagem() {
    const x = P.cub, g = mk('g', {}, mback), f = mk('g', {}, mfront);
    // balança
    mk('rect', { x: x - 72, y: Y + 27, width: 144, height: 16, fill: '#3a3054' }, g);
    txt(g, x, Y + 60, 'BALANÇA', { 'text-anchor': 'middle', 'font-size': 10, fill: C.muted, 'letter-spacing': 2 });
    // pórtico
    mk('rect', { x: x - 112, y: 206, width: 16, height: FLOOR - 206, fill: C.red }, g);
    mk('rect', { x: x + 96, y: 206, width: 16, height: FLOOR - 206, fill: C.red }, g);
    mk('rect', { x: x - 120, y: 196, width: 240, height: 34, fill: '#2a2140' }, g);
    mk('rect', { x: x - 120, y: 226, width: 240, height: 3, fill: C.lime }, g);
    txt(g, x, 218, 'ADVANCED LASER', { 'text-anchor': 'middle', 'font-size': 11, fill: '#ffffff', 'letter-spacing': 2 });
    mk('rect', { x: x - 20, y: 230, width: 40, height: 18, fill: '#3a3054' }, g);
    // leitor de código
    mk('rect', { x: x - 96, y: 410, width: 22, height: 26, fill: '#2a2140' }, g);
    R.read = mk('polygon', { points: `${x - 74},418 ${x - 74},428 ${x - 46},440 ${x - 46},404`, fill: '#ff4d4d', opacity: 0 }, f);
    // feixe e linha de varredura
    R.beam = mk('polygon', { points: `${x - 6},248 ${x + 6},248 ${x + 72},${Y} ${x - 72},${Y}`, fill: 'url(#gLaser)', opacity: 0 }, f);
    R.scan = mk('rect', { x: x - 70, y: 250, width: 140, height: 3, fill: C.lime, filter: 'url(#fGlow)', opacity: 0 }, f);
    // cotas
    const d = mk('g', { opacity: 0 }, f);
    mk('path', { d: `M${x - 45},392 H${x + 45} M${x - 45},386 V398 M${x + 45},386 V398`, stroke: C.lime, 'stroke-width': 2, fill: 'none' }, d);
    R.dW = txt(d, x, 382, '45 cm', { 'text-anchor': 'middle', 'font-size': 13, fill: C.lime, 'font-weight': 600 });
    mk('path', { d: `M${x - 60},410 V${Y} M${x - 66},410 H${x - 54} M${x - 66},${Y} H${x - 54}`, stroke: C.lime, 'stroke-width': 2, fill: 'none' }, d);
    R.dH = txt(d, x - 70, 450, '32 cm', { 'text-anchor': 'end', 'font-size': 13, fill: C.lime, 'font-weight': 600 });
    R.dims = d;
    // monitor com leituras
    const m = mk('g', {}, g);
    mk('rect', { x: x + 150, y: 330, width: 8, height: FLOOR - 330, fill: C.leg }, m);
    mk('rect', { x: x + 98, y: 232, width: 116, height: 104, fill: '#1e1533', stroke: '#cbbfeb', 'stroke-width': 3 }, m);
    R.rd = ['A', 'L', 'C', 'P'].map((k, i) => txt(m, x + 108, 254 + i * 21, `${k} --`, { 'font-size': 12, fill: '#d4c6fb' }));
    R.screenX = x + 156; R.screenY = 232;
  }

  function buildDados() {
    const x = P.dat, g = mk('g', {}, mback), f = mk('g', {}, mfront);
    // pórtico de identificação
    mk('rect', { x: x - 90, y: 300, width: 10, height: FLOOR - 300, fill: C.leg }, g);
    mk('rect', { x: x + 80, y: 300, width: 10, height: FLOOR - 300, fill: C.leg }, g);
    mk('rect', { x: x - 96, y: 290, width: 192, height: 16, fill: '#2a2140' }, g);
    R.gate = mk('rect', { x: x - 96, y: 304, width: 192, height: 3, fill: C.lime, opacity: .2 }, g);
    // sistemas
    const nodes = [['ERP', x - 210, 96], ['WMS', x - 30, 64], ['TMS', x + 150, 96]];
    R.links = []; R.packets = [];
    nodes.forEach(([n, nx, ny], i) => {
      const path = mk('path', {
        d: `M${R.screenX},${R.screenY} C${R.screenX + 60},${ny - 20} ${nx - 80},${ny + 80} ${nx + 36},${ny + 20}`,
        fill: 'none', stroke: C.lime, 'stroke-width': 1.5, 'stroke-dasharray': '4 6', opacity: 0
      }, f);
      R.links.push(path);
      const node = mk('g', { opacity: 0 }, f);
      mk('rect', { x: nx, y: ny, width: 72, height: 28, rx: 8, fill: '#ffffff', stroke: C.lime }, node);
      txt(node, nx + 36, ny + 19, n, { 'text-anchor': 'middle', 'font-size': 12, fill: C.ink, 'font-weight': 600 });
      path._node = node;
      const pk = mk('rect', { width: 10, height: 10, x: -5, y: -5, fill: C.lime, filter: 'url(#fGlow)', opacity: 0 }, f);
      R.packets.push({ el: pk, path, delay: i * .18 });
    });
    txt(g, x, 286, 'WEBSERVICE', { 'text-anchor': 'middle', 'font-size': 10, fill: C.muted, 'letter-spacing': 2 });
  }

  function buildSorter() {
    const x = P.sort, g = mk('g', {}, mback), f = mk('g', {}, mfront);
    // placa de rotas
    mk('rect', { x: x - 120, y: 250, width: 8, height: FLOOR - 250, fill: C.leg }, g);
    mk('rect', { x: x + 150, y: 250, width: 8, height: FLOOR - 250, fill: C.leg }, g);
    mk('rect', { x: x - 130, y: 222, width: 298, height: 46, fill: '#ffffff', stroke: '#cbbfeb', 'stroke-width': 2 }, g);
    R.lanes = ['SC-01', 'SC-02', 'RS-01'].map((n, i) => {
      const lx = x - 122 + i * 96;
      const bg = mk('rect', { x: lx, y: 230, width: 90, height: 30, fill: C.lime, opacity: 0 }, g);
      const t = txt(g, lx + 45, 250, n, { 'text-anchor': 'middle', 'font-size': 13, fill: C.ink, 'font-weight': 600 });
      return { bg, t };
    });
    txt(g, x + 20, 214, 'SORTER PNEUMÁTICO', { 'text-anchor': 'middle', 'font-size': 10, fill: C.muted, 'letter-spacing': 2 });
    // desviador pneumático (braço amarelo + cilindro)
    mk('rect', { x: x + 40, y: Y - 120, width: 12, height: 70, fill: '#8d84a6' }, f);
    mk('rect', { x: x + 43, y: Y - 60, width: 6, height: 30, fill: C.steel }, f);
    R.flap = mk('rect', { x: x + 20, y: Y - 34, width: 64, height: 12, fill: C.yel, rx: 2 }, f);
    R.flapPivot = [x + 84, Y - 28];
  }

  function buildFactory() {
    const x = P.factory, g = mk('g', {}, scenery);
    // galpão alto com telhado em shed, maior que o caminhão para aparecer por trás
    let d = `M${x},${FLOOR} V20`;
    for (let i = 0; i < 7; i++) d += ` L${x + i * 130 + 96},-50 V20`;
    d += ` H${x + 910} V${FLOOR} Z`;
    mk('path', { d, fill: '#e3dcf4' }, g);
    for (let i = 0; i < 7; i++) mk('polygon', { points: `${x + i * 130 + 10},16 ${x + i * 130 + 92},-46 ${x + i * 130 + 92},16`, fill: 'rgba(123,79,224,.12)' }, g);
    for (let i = 0; i < 7; i++) mk('rect', { x: x + i * 130 + 24, y: 150, width: 84, height: 50, fill: 'rgba(123,79,224,.14)' }, g);
    const sign = mk('g', { transform: `translate(${x + 300},40)` }, g);
    mk('rect', { x: 0, y: 0, width: 330, height: 64, fill: '#ffffff' }, sign);
    mk('image', { href: 'assets/img/logo-exact.png', x: 14, y: 9, width: 140, height: 46 }, sign);
    txt(sign, 314, 29, 'FÁBRICA', { 'text-anchor': 'end', 'font-size': 14, fill: '#1a1a1a', 'font-weight': 600 });
    txt(sign, 314, 49, 'RODEIO/SC', { 'text-anchor': 'end', 'font-size': 14, fill: C.pur, 'font-weight': 600 });
    mk('rect', { x: x + 860, y: -170, width: 30, height: 190, fill: '#e3dcf4' }, g);
  }

  function buildBillboards() {
    const names = ['J&T EXPRESS', 'RODONAVES', 'SATURNO BRASIL', 'FM TRANSPORTES', 'ÍCARO EXPRESS', 'R3 EXPRESS', 'VESTRA', 'ACEVILLE'];
    names.forEach((n, i) => {
      const x = P.clientsA + i * 230, g = mk('g', {}, scenery);
      mk('rect', { x: x + 96, y: -10, width: 8, height: FLOOR + 10, fill: '#b3a9c9' }, g);
      mk('rect', { x: 0 + x, y: -70, width: 200, height: 60, fill: '#ffffff', stroke: 'rgba(123,79,224,.5)', 'stroke-width': 2 }, g);
      txt(g, x + 100, -34, n, { 'text-anchor': 'middle', 'font-size': 15, fill: C.ink, 'font-weight': 600 });
    });
  }

  function buildDestination() {
    const x = P.dest, g = mk('g', {}, scenery);
    mk('rect', { x, y: 140, width: 760, height: FLOOR - 140, fill: '#e3dcf4' }, g);
    mk('rect', { x, y: 140, width: 760, height: 6, fill: C.lime, opacity: .5 }, g);
    for (let i = 0; i < 3; i++) {
      mk('rect', { x: x + 60 + i * 230, y: 380, width: 170, height: 260, fill: '#cfc5ea' }, g);
      mk('rect', { x: x + 60 + i * 230, y: 370, width: 170, height: 10, fill: 'url(#pHazard)' }, g);
    }
    R.destSign = mk('g', { transform: `translate(${x + 90},190)` }, g);
    R.destBg = mk('rect', { x: 0, y: 0, width: 520, height: 110, fill: '#ffffff', stroke: C.lime, 'stroke-width': 3 }, R.destSign);
    R.destT1 = txt(R.destSign, 260, 48, 'SUA OPERAÇÃO', { 'text-anchor': 'middle', 'font-size': 40, 'font-weight': 600, fill: C.ink, 'letter-spacing': 3 });
    txt(R.destSign, 260, 86, 'PRÓXIMO DESTINO', { 'text-anchor': 'middle', 'font-size': 16, fill: C.lime, 'letter-spacing': 6 });
  }

  // fundo em paralaxe: estantes do galpão e depois morros do Vale
  function buildParallax() {
    const g = mk('g', {}, para);
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let x = -900; x < 1180; x += 150) {
      mk('rect', { x, y: 150, width: 6, height: 490, fill: '#e2dcf1' }, g);
      mk('rect', { x: x + 140, y: 150, width: 6, height: 490, fill: '#e2dcf1' }, g);
      for (let s = 0; s < 4; s++) {
        const sy = 230 + s * 100;
        mk('rect', { x, y: sy, width: 146, height: 5, fill: '#e2dcf1' }, g);
        let bx = x + 10;
        while (bx < x + 130) {
          const w = 20 + rnd() * 26, h = 26 + rnd() * 50;
          if (bx + w > x + 140) break;
          if (rnd() > .25) mk('rect', { x: bx, y: sy - h, width: w, height: h, fill: rnd() > .5 ? '#dcd3ef' : '#d4caea' }, g);
          bx += w + 4;
        }
      }
    }
    // morros e cidade
    let d = 'M1180,640 L1180,420';
    for (let x = 1180; x < 3400; x += 80) d += ` Q${x + 40},${330 + rnd() * 70} ${x + 80},${380 + rnd() * 60}`;
    d += ' L3400,640 Z';
    mk('path', { d, fill: '#e9e4f5' }, g);
    for (let x = 1250; x < 3300; x += 40 + rnd() * 60) {
      const h = 30 + rnd() * 80;
      mk('rect', { x, y: 560 - h, width: 24 + rnd() * 30, height: h + 80, fill: '#e1daf2' }, g);
    }
  }

  /* ---------------- câmera e render ---------------- */
  let view = { w: 1200, h: 760, s: 1, mobile: false, ax: 0, ay: 0 };

  function layout() {
    const W = innerWidth, H = innerHeight;
    const mobile = W <= 860 || W / H < 1;
    const s = mobile ? W / 560 : Math.min(H / 760, W / 1100);
    view = { w: W / s, h: H / s, s, mobile };
    view.ax = view.w * (mobile ? .5 : .66);
    view.ay = view.h * (mobile ? .82 : .76);
    svg.setAttribute('viewBox', `0 0 ${view.w} ${view.h}`);
  }

  let lastRead = '';
  function render() {
    const x = S.x, y = pathY(x);
    const slope = (pathY(x + 2) - pathY(x - 2)) / 4;
    const ang = Math.atan(slope) * 57.3;
    R.box.setAttribute('transform', `translate(${x.toFixed(2)},${y.toFixed(2)})`);
    R.boxIn.setAttribute('transform', `rotate(${ang.toFixed(2)})`);

    const z = S.zoom, tx = x + S.camOff;
    cam.setAttribute('transform', `translate(${view.ax},${view.ay}) scale(${z}) translate(${-tx},${-Y})`);
    para.setAttribute('transform', `translate(${view.ax},${view.ay}) scale(${z}) translate(${-tx * .3},${-Y})`);

    // esteiras e roletes andam junto com a caixa
    const belt = `translate(${(x % 26).toFixed(2)},0)`;
    L('pBelt').setAttribute('patternTransform', belt);
    L('pMod').setAttribute('patternTransform', `translate(${(x % 16).toFixed(2)},0)`);
    const rot = (x / 8) * 57.3;
    for (const r of rollers) r.el.setAttribute('transform', `rotate(${rot.toFixed(1)} ${r.cx} ${r.cy})`);

    // caminhão de expedição
    const tr = S.truck;
    R.truck.g.setAttribute('transform', `translate(${tr},${TF})`);
    const wr = ((tr - P.truck) / 80) * 57.3;
    R.truck.wheels.forEach(w => w.el.setAttribute('transform', `rotate(${wr.toFixed(1)} ${w.cx} ${w.cy})`));
    R.truck.doors.setAttribute('opacity', 1 - S.doors);
    R.truck.shut.setAttribute('opacity', S.doors);

    // cubagem
    R.beam.setAttribute('opacity', S.laser * .9);
    R.scan.setAttribute('opacity', S.laser);
    const sy = lerp(250, Y - 4, S.scan), hw = lerp(8, 72, (sy - 248) / (Y - 248));
    R.scan.setAttribute('y', sy); R.scan.setAttribute('x', P.cub - hw); R.scan.setAttribute('width', hw * 2);
    R.dims.setAttribute('opacity', clamp01(S.dim * 3) * (1 - clamp01((x - P.cub - 60) / 120)));
    R.read.setAttribute('opacity', S.read);
    R.label.setAttribute('opacity', S.read);
    const k = S.dim;
    const rd = k <= 0 ? ['A --', 'L --', 'C --', 'P --'] : [
      `A ${Math.round(32 * k)} cm`, `L ${Math.round(45 * k)} cm`, `C ${Math.round(60 * k)} cm`,
      `P ${(8.42 * k).toFixed(2).replace('.', ',')} kg`];
    const key = rd.join('|');
    if (key !== lastRead) { rd.forEach((s, i) => (R.rd[i].textContent = s)); lastRead = key; }

    // dados
    R.gate.setAttribute('opacity', .2 + S.ok * .8);
    R.links.forEach(p => { p.setAttribute('opacity', S.link); p._node.setAttribute('opacity', S.link); });
    R.packets.forEach(pk => {
      const t = clamp01((S.data - pk.delay) / .6);
      if (t <= 0 || t >= 1) { pk.el.setAttribute('opacity', 0); return; }
      const len = pk.path.getTotalLength(), pt = pk.path.getPointAtLength(len * t);
      pk.el.setAttribute('opacity', 1);
      pk.el.setAttribute('transform', `translate(${pt.x},${pt.y})`);
    });
    R.ok.setAttribute('opacity', S.ok);

    // sorter
    R.lanes[1].bg.setAttribute('opacity', S.lane);
    R.lanes[1].t.setAttribute('fill', S.lane > .5 ? '#ffffff' : C.ink);
    R.flap.setAttribute('transform', `rotate(${(-S.flap * 28).toFixed(1)} ${R.flapPivot[0]} ${R.flapPivot[1]})`);

    // destino
    R.destBg.setAttribute('fill', S.done > .5 ? C.lime : '#ffffff');
    R.destT1.setAttribute('fill', S.done > .5 ? '#ffffff' : C.ink);
  }

  /* ---------------- timeline de scroll ---------------- */
  let st, tl, intro;
  const sections = [...document.querySelectorAll('.step')];

  function buildTimeline() {
    if (st) st.kill();
    if (tl) tl.kill();
    const vh = innerHeight;
    const max = document.documentElement.scrollHeight - vh;
    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    const win = i => {
      const s = sections[i];
      const a = Math.max(0, s.offsetTop - vh * .85);
      const b = Math.min(max, s.offsetTop + s.offsetHeight - vh);
      return [a, Math.max(a + 1, b)];
    };
    const at = (i, f0, f1) => { const [a, b] = win(i); return [a + (b - a) * f0, (b - a) * (f1 - f0)]; };
    const go = (i, f0, f1, from, to, ease = 'power1.inOut') => {
      const [t, d] = at(i, f0, f1);
      tl.fromTo(S, from, { ...to, duration: d, ease, immediateRender: false }, t);
    };

    // 02 transporte: a caixa atravessa lona, roletes e modular
    go(1, 0, 1, { x: REST }, { x: 1560 }, 'power1.in');
    // 03 cubagem
    go(2, 0, .3, { x: 1560 }, { x: P.cub }, 'power2.out');
    go(2, .3, .38, { laser: 0 }, { laser: 1 });
    go(2, .34, .62, { scan: 0 }, { scan: 1 }, 'none');
    go(2, .4, .7, { dim: 0 }, { dim: 1 }, 'power2.out');
    go(2, .62, .68, { read: 0 }, { read: 1 });
    go(2, .78, .86, { read: 1 }, { read: 0 });
    go(2, .8, .9, { laser: 1 }, { laser: 0 });
    // 04 dados
    go(3, 0, .3, { x: P.cub }, { x: P.dat }, 'power2.inOut');
    go(3, .3, .42, { link: 0 }, { link: 1 });
    go(3, .36, .85, { data: 0 }, { data: 1 }, 'none');
    go(3, .7, .8, { ok: 0 }, { ok: 1 });
    // 05 triagem
    go(4, 0, .3, { x: P.dat }, { x: P.sort }, 'power2.inOut');
    go(4, .3, .4, { lane: 0 }, { lane: 1 });
    go(4, .4, .5, { flap: 0 }, { flap: 1 }, 'back.out(2)');
    go(4, .55, 1, { x: P.sort }, { x: 3330 }, 'power1.in');
    // 06 expedição
    go(5, 0, .7, { x: 3330 }, { x: P.inTruck }, 'power1.inOut');
    go(5, .75, .9, { doors: 0 }, { doors: 1 });
    // 07 fábrica: o caminhão sai e a câmera abre
    go(5, .7, 1, { zoom: 1, camOff: 0 }, { zoom: view.mobile ? .66 : .72, camOff: 180 });
    go(6, 0, 1, { x: P.inTruck, truck: P.truck }, { x: 5600, truck: 5600 - (P.inTruck - P.truck) }, 'power1.in');
    // 08 clientes
    go(7, 0, 1, { x: 5600, truck: 5600 - (P.inTruck - P.truck) }, { x: 7300, truck: 7300 - (P.inTruck - P.truck) });
    // 09 destino
    go(8, 0, .6, { camOff: 180, zoom: view.mobile ? .66 : .72 }, { camOff: view.mobile ? 600 : 520, zoom: view.mobile ? .56 : .62 }, 'power1.inOut');
    go(8, 0, .6, { x: 7300, truck: 7300 - (P.inTruck - P.truck) }, { x: P.end, truck: P.end - (P.inTruck - P.truck) }, 'power2.out');
    go(8, .6, .7, { done: 0 }, { done: 1 });
    tl.set({}, {}, max); // duração da timeline = pixels de scroll

    st = ScrollTrigger.create({
      start: 0, end: 'max', scrub: reduce ? true : .7, animation: tl,
      onUpdate: self => {
        if (intro && intro.isActive() && self.scroll() > 20) intro.progress(1);
        railProgress(self.progress);
      }
    });
  }

  /* ---------------- trilho de etapas no topo ---------------- */
  const stepsEl = document.querySelector('.rail__steps');
  const fill = document.querySelector('.rail__fill'), railBox = document.querySelector('.rail__box');
  const nowNum = document.querySelector('.rail__num'), nowLabel = document.querySelector('.rail__label');
  const buttons = sections.map((s, i) => {
    const li = document.createElement('li');
    li.style.left = `${(i / (sections.length - 1)) * 100}%`;
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `${String(i + 1).padStart(2, '0')} ${s.dataset.label}`);
    b.addEventListener('click', () => {
      const y = i === 0 ? 0 : s.offsetTop + Math.min(s.offsetHeight - innerHeight, innerHeight * .9);
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    });
    li.appendChild(b); stepsEl.appendChild(li);
    return b;
  });
  let current = -1;
  function railProgress() {
    const mid = scrollY + innerHeight * .5;
    let idx = 0;
    sections.forEach((s, i) => { if (s.offsetTop <= mid) idx = i; });
    const s = sections[idx], next = sections[idx + 1];
    const local = next ? clamp01((mid - s.offsetTop) / (next.offsetTop - s.offsetTop)) : 0;
    const pos = (idx + local) / (sections.length - 1) * 100;
    fill.style.width = `${pos}%`; railBox.style.left = `${pos}%`;
    if (idx !== current) {
      current = idx;
      buttons.forEach((b, i) => { b.classList.toggle('is-on', i === idx); b.classList.toggle('is-done', i < idx); });
      nowNum.textContent = String(idx + 1).padStart(2, '0');
      nowLabel.textContent = s.dataset.label;
    }
  }

  /* ---------------- inicialização ---------------- */
  gsap.registerPlugin(ScrollTrigger);
  buildParallax();
  buildWorld();
  layout();

  if (scrollY < 20 && !reduce) {
    S.x = -420;
    intro = gsap.to(S, { x: REST, duration: 3.4, ease: 'power2.inOut', delay: .4 });
  } else {
    S.x = REST;
  }
  buildTimeline();
  gsap.ticker.add(render);
  railProgress();

  let rt;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { layout(); buildTimeline(); ScrollTrigger.refresh(); }, 150);
  });
})();
