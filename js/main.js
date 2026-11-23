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
  const FLOOR = 640, Y = 480, LOW = 560, TF = 470; // TF = piso do baú
  const P = {
    rampA: -180, rampB: -40,
    cub: 1900, dat: 2500, sort: 3000,
    chuteA: 3060, chuteB: 3160, incA: 3500, incB: 3740,
    truck: 3750, inTruck: 4010,
    factory: 4900, clientsA: 5950, dest: 9300, end: 8680
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
        rollers.push({ el: rg, cx: r, cy: 6, wx: x1 + r * Math.cos(ang * Math.PI / 180) });
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
   * Origem (0,0) = canto traseiro no piso do baú; o chão fica em y = GR.
   * Proporção de caminhão real: piso a ~1,3 m, roda de ~1 m, baú de ~2,6 m de altura
   * e ~7 m de comprimento (encurtado), eixo traseiro duplo e cabine avançada. */
  function buildTruck(parent, x, flip) {
    const GR = FLOOR - TF;            // 170: piso do baú até o chão
    const WR = 60, WY = GR - WR;      // rodas encostadas no chão
    const BL = 760, BH = 330;         // baú
    const CX = BL + 18;               // início da cabine
    const g = mk('g', { transform: `translate(${x},${TF})${flip ? ' scale(-1,1)' : ''}` }, parent);
    const ink = '#2a2338', ink2 = '#3a3150', cabC = '#352a5c', cabL = '#4a3d78';

    // portas traseiras abertas
    const doors = mk('g', {}, g);
    mk('rect', { x: -46, y: -BH + 4, width: 44, height: BH + 2, rx: 3, fill: '#f1eef7', stroke: '#cfc7e2', 'stroke-width': 2 }, doors);
    for (let i = 0; i < 3; i++) mk('rect', { x: -40, y: -BH + 40 + i * 100, width: 32, height: 3, fill: '#d8d1e8' }, doors);
    mk('rect', { x: -30, y: -170, width: 5, height: 50, rx: 2, fill: '#9d94b6' }, doors);

    // chassi, suspensão, tanque, caixa de ferramentas e protetor lateral
    mk('rect', { x: 10, y: 6, width: CX + 170, height: 26, rx: 4, fill: ink }, g);
    mk('rect', { x: 96, y: 32, width: 258, height: 20, rx: 4, fill: ink2 }, g);
    mk('rect', { x: CX + 50, y: 32, width: 96, height: 16, rx: 4, fill: ink2 }, g);
    mk('rect', { x: 400, y: 36, width: 86, height: 46, rx: 5, fill: ink2 }, g);
    mk('rect', { x: 432, y: 50, width: 22, height: 5, rx: 2, fill: '#6d6290' }, g);
    mk('rect', { x: 520, y: 34, width: 140, height: 52, rx: 12, fill: '#4b4266' }, g);
    mk('rect', { x: 530, y: 44, width: 120, height: 4, rx: 2, fill: 'rgba(255,255,255,.18)' }, g);
    mk('rect', { x: 384, y: 96, width: 380, height: 7, rx: 3, fill: '#cfc8e0' }, g);
    mk('rect', { x: 384, y: 116, width: 380, height: 7, rx: 3, fill: '#cfc8e0' }, g);
    // para-barro atrás do eixo traseiro
    mk('rect', { x: 66, y: 40, width: 8, height: 104, rx: 2, fill: ink }, g);

    // baú
    mk('rect', { x: 0, y: -BH, width: BL, height: BH + 6, rx: 6, fill: '#ffffff' }, g);
    mk('rect', { x: 0, y: -BH, width: BL, height: 12, rx: 6, fill: '#e6e1f1' }, g);
    mk('rect', { x: 0, y: -8, width: BL, height: 14, fill: '#d9d4e6' }, g);
    for (let i = 76; i < BL; i += 76) mk('rect', { x: i, y: -BH + 12, width: 1.5, height: BH - 20, fill: '#eeeaf6' }, g);
    // faixa refletiva vermelha e branca (obrigatória em caminhões no Brasil)
    for (let i = 4; i < BL - 8; i += 24) mk('rect', { x: i, y: -26, width: 12, height: 8, fill: (i - 4) % 48 === 0 ? '#e5484d' : '#d9d4e6' }, g);
    // pintura da transportadora: ondas lilás + símbolo genérico de carga em movimento
    const art = mk('g', flip ? { transform: `translate(${BL},0) scale(-1,1)` } : {}, g);
    const k = BL / 520;
    mk('path', { d: `M0,-110 C${140 * k},-110 ${220 * k},-176 ${360 * k},-176 C${430 * k},-176 ${480 * k},-156 ${BL},-142 V-34 H0 Z`, fill: '#ece6fc' }, art);
    mk('path', { d: `M0,-68 C${150 * k},-68 ${240 * k},-128 ${380 * k},-128 C${440 * k},-128 ${490 * k},-114 ${BL},-106 V-34 H0 Z`, fill: '#c9b8f5' }, art);
    const em = mk('g', { transform: `translate(150,${-BH + 60})` }, art);
    [0, 16, 32].forEach((dy, i) => mk('rect', { x: i * 12, y: 8 + dy, width: 46 - i * 12, height: 7, rx: 3.5, fill: C.lime }, em));
    mk('rect', { x: 56, y: 0, width: 62, height: 56, rx: 7, fill: C.pur }, em);
    mk('path', { d: 'M56,19 H118 M87,0 V19', stroke: '#ffffff', 'stroke-width': 3.5, fill: 'none' }, em);
    txt(em, 136, 25, 'CARGAS E', { 'font-size': 22, 'font-weight': 700, fill: C.ink, 'letter-spacing': 1 });
    txt(em, 136, 52, 'ENCOMENDAS', { 'font-size': 22, 'font-weight': 700, fill: C.pur, 'letter-spacing': 1 });

    // porta fechada (aparece ao carregar)
    const shut = mk('rect', { x: -4, y: -BH, width: 8, height: BH + 6, rx: 2, fill: '#b8b0cc', opacity: 0 }, g);

    // para-choque traseiro com refletivo e lanterna
    mk('rect', { x: 18, y: 32, width: 10, height: 92, fill: ink }, g);
    mk('rect', { x: 4, y: 120, width: 74, height: 16, rx: 3, fill: ink }, g);
    for (let i = 0; i < 4; i++) mk('rect', { x: 8 + i * 17, y: 123, width: 9, height: 10, fill: i % 2 ? '#f4f2fa' : '#e5484d' }, g);
    mk('rect', { x: 2, y: 8, width: 12, height: 20, rx: 3, fill: '#e5484d' }, g);

    // defletor de ar entre cabine e baú
    mk('path', { d: `M${CX + 6},-236 L${CX + 14},${-BH + 6} H${CX + 112} L${CX + 150},-236 Z`, fill: cabL }, g);
    mk('path', { d: `M${CX + 14},${-BH + 6} H${CX + 112} L${CX + 118},${-BH + 22} H${CX + 16} Z`, fill: 'rgba(255,255,255,.12)' }, g);
    // cabine avançada
    mk('path', { d: `M${CX},10 V-222 Q${CX},-240 ${CX + 18},-240 H${CX + 150} Q${CX + 168},-240 ${CX + 172},-222 L${CX + 188},-66 V10 Z`, fill: cabC }, g);
    mk('path', { d: `M${CX + 102},-226 H${CX + 154} Q${CX + 162},-226 ${CX + 164},-216 L${CX + 175},-128 H${CX + 102} Z`, fill: '#bfe0ec' }, g);
    mk('path', { d: `M${CX + 116},-222 H${CX + 158} L${CX + 163},-186 Z`, fill: 'rgba(255,255,255,.6)' }, g);
    mk('path', { d: `M${CX + 26},-224 H${CX + 90} V-140 H${CX + 26} Z`, fill: '#bfe0ec', opacity: .92 }, g);
    mk('path', { d: `M${CX + 20},-232 H${CX + 96} V-12 H${CX + 20} Z`, fill: 'none', stroke: 'rgba(255,255,255,.16)', 'stroke-width': 2 }, g);
    mk('rect', { x: CX + 64, y: -110, width: 22, height: 6, rx: 3, fill: '#a99fd0' }, g);
    mk('rect', { x: CX, y: -80, width: 188, height: 10, fill: C.lime }, g);
    mk('rect', { x: CX + 176, y: -198, width: 6, height: 64, rx: 3, fill: ink }, g);
    mk('rect', { x: CX + 180, y: -190, width: 16, height: 46, rx: 5, fill: ink }, g);
    mk('rect', { x: CX + 148, y: -62, width: 40, height: 44, rx: 6, fill: '#2a2140' }, g);
    for (let i = 0; i < 4; i++) mk('rect', { x: CX + 154, y: -56 + i * 10, width: 30, height: 4, rx: 2, fill: '#4a3d78' }, g);
    mk('rect', { x: CX + 172, y: -8, width: 28, height: 34, rx: 5, fill: ink }, g);
    mk('rect', { x: CX + 182, y: -50, width: 14, height: 16, rx: 4, fill: '#fff4c2' }, g);
    mk('rect', { x: CX + 36, y: 12, width: 44, height: 10, rx: 3, fill: ink2 }, g);

    // para-lamas
    const fender = (x1, x2) => mk('path', {
      d: `M${x1},${WY} A${WR + 10},${WR + 10} 0 0 1 ${x1 + WR + 10},${WY - WR - 10} H${x2 - WR - 10} A${WR + 10},${WR + 10} 0 0 1 ${x2},${WY}`,
      fill: 'none', stroke: ink, 'stroke-width': 9, 'stroke-linecap': 'round'
    }, g);
    const AX = [150, 284, CX + 96];
    fender(AX[0] - WR - 10, AX[1] + WR + 10);
    fender(AX[2] - WR - 10, AX[2] + WR + 10);

    // rodas: pneu, aro, cubo e parafusos (o grupo interno gira)
    const wheels = [];
    AX.forEach(cx => {
      const w = mk('g', {}, g);
      mk('circle', { cx, cy: WY, r: WR, fill: '#221c33' }, w);
      mk('circle', { cx, cy: WY, r: 35, fill: '#dcd7e8' }, w);
      mk('circle', { cx, cy: WY, r: 30, fill: '#c3bcd6' }, w);
      const spin = mk('g', {}, w);
      mk('circle', { cx, cy: WY, r: WR - 6, fill: 'none', stroke: '#3a3150', 'stroke-width': 3.5, 'stroke-dasharray': '7 7' }, spin);
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        mk('circle', { cx: cx + Math.cos(a) * 21, cy: WY + Math.sin(a) * 21, r: 3.8, fill: '#8d84a6' }, spin);
      }
      mk('circle', { cx, cy: WY, r: 11, fill: '#8d84a6' }, spin);
      mk('rect', { x: cx - 2.5, y: WY - 11, width: 5, height: 8, fill: '#dcd7e8' }, spin);
      wheels.push({ el: spin, cx, cy: WY });
    });
    // sombra no chão
    mk('ellipse', { cx: (CX + 200) / 2, cy: GR + 3, rx: (CX + 260) / 2, ry: 8, fill: 'rgba(42,35,56,.16)' }, g);
    return { g, doors, shut, wheels, WR };
  }

  /* ---------------- o mundo ---------------- */
  function buildWorld() {
    // chão do galpão e depois estrada
    mk('rect', { x: -3000, y: FLOOR, width: 6900, height: 600, fill: '#ebe7f4' }, ground);
    mk('rect', { x: -3000, y: FLOOR, width: 6900, height: 2, fill: 'rgba(123,79,224,.35)' }, ground);
    for (let x = -1400; x < 3860; x += 60) mk('rect', { x, y: FLOOR + 40, width: 30, height: 6, fill: 'rgba(91,47,179,.16)' }, ground);
    mk('rect', { x: 3900, y: FLOOR, width: 7400, height: 600, fill: '#d9d3e5' }, ground);
    mk('rect', { x: 3900, y: FLOOR, width: 7400, height: 4, fill: '#bdb4d1' }, ground);
    for (let x = 3950; x < 11200; x += 110) mk('rect', { x, y: FLOOR + 52, width: 56, height: 6, fill: '#ffffff' }, ground);

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
    mk('path', { d: `M${x + 68},410 V${Y} M${x + 62},410 H${x + 74} M${x + 62},${Y} H${x + 74}`, stroke: C.lime, 'stroke-width': 2, fill: 'none' }, d);
    mk('rect', { x: x + 76, y: 436, width: 50, height: 20, rx: 4, fill: '#ffffff' }, d);
    R.dH = txt(d, x + 101, 450, '32 cm', { 'text-anchor': 'middle', 'font-size': 13, fill: C.lime, 'font-weight': 600 });
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
    // pórtico do webservice com antena no topo
    mk('rect', { x: x - 90, y: 300, width: 10, height: FLOOR - 300, fill: C.leg }, g);
    mk('rect', { x: x + 80, y: 300, width: 10, height: FLOOR - 300, fill: C.leg }, g);
    mk('rect', { x: x - 96, y: 288, width: 192, height: 20, fill: '#2a2140' }, g);
    txt(g, x, 302, 'WEBSERVICE', { 'text-anchor': 'middle', 'font-size': 10, fill: '#ffffff', 'letter-spacing': 2 });
    R.gate = mk('rect', { x: x - 96, y: 306, width: 192, height: 3, fill: C.lime, opacity: .2 }, g);
    mk('rect', { x: x - 2, y: 270, width: 4, height: 18, fill: '#2a2140' }, g);
    R.hub = mk('circle', { cx: x, cy: 268, r: 6, fill: C.lime, opacity: .3 }, g);
    // sistemas em leque acima do pórtico
    const nodes = [['ERP', x - 250, 150], ['WMS', x - 36, 92], ['TMS', x + 178, 150]];
    R.links = []; R.packets = [];
    nodes.forEach(([n, nx, ny], i) => {
      const cx = nx + 36, by = ny + 28;
      const path = mk('path', {
        d: `M${x},262 C${x},${by + 60} ${cx},${by + 70} ${cx},${by}`,
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
    mk('rect', { x: x + 40, y: Y - 120, width: 12, height: 70, fill: '#8d84a6' }, g);
    mk('rect', { x: x + 43, y: Y - 60, width: 6, height: 30, fill: C.steel }, g);
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

  const BB = 8; // topo das placas de clientes
  function buildBillboards() {
    const logos = ['jt-express', 'rodonaves', 'saturno-brasil', 'fm-transportes', 'icaro-express',
      'r3-express', 'vestra', 'aceville', 'dulog', 'dia-e-noite'];
    logos.forEach((n, i) => {
      const x = P.clientsA + i * 320, g = mk('g', {}, scenery);
      mk('rect', { x: x + 146, y: 120, width: 8, height: FLOOR - 120, fill: '#b3a9c9' }, g);
      mk('rect', { x, y: BB, width: 300, height: 118, rx: 8, fill: '#ffffff', stroke: 'rgba(123,79,224,.4)', 'stroke-width': 2 }, g);
      mk('image', { href: `assets/img/clientes/${n}.webp`, x: x + 18, y: BB + 12, width: 264, height: 94, preserveAspectRatio: 'xMidYMid meet' }, g);
    });
  }

  function buildDestination() {
    const x = P.dest, g = mk('g', {}, scenery);
    mk('rect', { x, y: -60, width: 760, height: FLOOR + 60, fill: '#e3dcf4' }, g);
    mk('rect', { x, y: -60, width: 760, height: 6, fill: C.lime, opacity: .5 }, g);
    for (let i = 0; i < 3; i++) {
      mk('rect', { x: x + 60 + i * 230, y: 380, width: 170, height: 260, fill: '#cfc5ea' }, g);
      mk('rect', { x: x + 60 + i * 230, y: 370, width: 170, height: 10, fill: 'url(#pHazard)' }, g);
    }
    R.destSign = mk('g', { transform: `translate(${x + 120},0)` }, g);
    R.destBg = mk('rect', { x: 0, y: 0, width: 520, height: 110, fill: '#ffffff', stroke: C.lime, 'stroke-width': 3 }, R.destSign);
    R.destT1 = txt(R.destSign, 260, 48, 'SUA OPERAÇÃO', { 'text-anchor': 'middle', 'font-size': 40, 'font-weight': 600, fill: C.ink, 'letter-spacing': 3 });
    R.destT2 = txt(R.destSign, 260, 86, 'PRÓXIMO DESTINO', { 'text-anchor': 'middle', 'font-size': 16, fill: C.lime, 'letter-spacing': 6 });
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

  const stageEl = document.querySelector('.stage');
  let panelMax = 520;

  // Ancora a esteira perto do pé do palco e mede quanto espaço sobra acima dela para os cards.
  // zoom da câmera: [etapas 1-6, etapa 7, destino, clientes]. No celular é fixo (sem a pista crescendo ao rolar).
  const ZM = .64;
  const ZOOM = { desk: [1, .72, .62, .45], mob: [ZM, ZM, ZM, ZM] };
  const CLEAR = [110, 110, 300, 345, 280, 360, 360];  // no celular: altura das máquinas de cada etapa acima da esteira
  let bounds = [];

  // Ancora a esteira perto do pé do palco e calcula, para cada card, a faixa livre:
  // etapas 1 a 6 entre o menu e a esteira; 7 a 9 entre o menu e a estrada.
  const svhProbe = document.createElement('div');
  svhProbe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:100vh;height:100svh;visibility:hidden;pointer-events:none';
  document.body.appendChild(svhProbe);

  function layout(sceneOnly = false) {
    const W = innerWidth, H = stageEl.clientHeight;
    const mobile = W <= 860 || W / innerHeight < 1;
    // no celular a âncora usa a menor altura de tela, então a cena não pula com a barra de endereço
    const barH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--bar-h')) || 58;
    const HA = mobile ? Math.min(H, svhProbe.offsetHeight - barH) : H;
    const s = mobile ? W / 560 : Math.min(H / 740, W / 1100);
    view = { w: W / s, h: H / s, s, mobile };
    view.ax = view.w * (mobile ? .5 : .66);
    view.ay = HA / s - (mobile ? 12 : 22) / s - (FLOOR - Y) * (mobile ? ZM : 1);
    svg.setAttribute('viewBox', `0 0 ${view.w} ${view.h}`);
    const belt = view.ay * s - 4;                     // topo da esteira na tela, em px
    document.documentElement.style.setProperty('--belt', `${belt}px`);
    if (sceneOnly) return;
    const road = z => (view.ay + (FLOOR - Y) * z) * s - 4;
    const topH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')) || 74;
    const gap = mobile ? 10 : 18;
    const [z0, z1, z2, z8] = mobile ? ZOOM.mob : ZOOM.desk;
    const sy = (y, z) => (view.ay + (y - Y) * z) * s;   // altura na tela de um ponto do mundo
    bounds = panels.map((p, i) => {
      let bottom;
      if (i === 8) bottom = HA;                                      // destino: popup no meio da tela
      else if (i === 7) bottom = sy(BB, z8) - 6;                     // clientes: card acima das placas
      else if (mobile) bottom = sy(Y - CLEAR[i], z0);                // celular: card acima das máquinas
      else if (i < 6) bottom = belt;                                 // desktop: entre o menu e a esteira
      else bottom = road(z1);                                        // desktop: entre o menu e a estrada
      return [topH + gap, bottom - gap];
    });
    document.documentElement.style.setProperty('--belt', `${belt}px`);
    fitPanels();
  }

  // Nenhum card passa da esteira ou da estrada: reduz por níveis, escala se preciso e centraliza na faixa livre.
  function fitPanels() {
    panels.forEach((p, i) => {
      const [t, b] = bounds[i] || [96, 600];
      const max = b - t;
      p.classList.remove('fit-1', 'fit-2', 'fit-3', 'fit-4');
      gsap.set(p, { scale: 1 });
      let lvl = 0;
      while (p.offsetHeight > max && lvl < 4) p.classList.add(`fit-${++lvl}`);
      const h = p.offsetHeight;
      const k = h > max && !view.mobile ? Math.max(.6, max / h) : 1;
      gsap.set(p, { scale: k }); p._k = k;
      p.style.top = `${Math.round(t + Math.max(0, (max - h * k) / 2))}px`;
    });
  }

  let lastRead = '';
  // só redesenha quando algo mudou (no celular, quadro parado custa zero)
  let lastKey = '';
  function render() {
    const frameKey = Object.values(S).map(v => (+v).toFixed(2)).join() + view.w + view.ay;
    if (frameKey === lastKey) return;
    lastKey = frameKey;
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
    const half = view.w / S.zoom, cx0 = x + S.camOff;            // gira só os roletes na tela
    for (const r of rollers) if (Math.abs(r.wx - cx0) < half) r.el.setAttribute('transform', `rotate(${rot.toFixed(1)} ${r.cx} ${r.cy})`);

    // caminhão de expedição
    const tr = S.truck;
    R.truck.g.setAttribute('transform', `translate(${tr},${TF})`);
    const wr = ((tr - P.truck) / R.truck.WR) * 57.3;
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
    R.hub.setAttribute('opacity', .3 + S.link * .7);
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
    R.destT2.setAttribute('fill', S.done > .5 ? '#e7defd' : C.lime);
  }

  /* ---------------- timeline de scroll ---------------- */
  let st, tl, intro;
  const sections = [...document.querySelectorAll('.step')];
  const panels = sections.map(s => s.querySelector('.panel'));

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

    // cards: um por vez. O anterior sai antes do próximo entrar, nunca ficam colados.
    sections.forEach((sec, i) => {
      const p = panels[i], T = sec.offsetTop, Hs = sec.offsetHeight;
      if (i === 8) {
        const [t8, d8] = at(8, .68, .84);
        tl.fromTo(p, { autoAlpha: 0, y: 30, scale: p._k * .94 }, { autoAlpha: 1, y: 0, scale: p._k, duration: d8, ease: 'back.out(1.4)', immediateRender: false }, t8);
      } else if (i > 0) tl.fromTo(p, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: vh * .22, ease: 'power2.out', immediateRender: false }, Math.max(0, T - vh * .34));
      if (i < sections.length - 1) tl.fromTo(p, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -26, duration: vh * .2, ease: 'power2.in', immediateRender: false }, T + Hs - vh * .76);
    });

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
    go(4, 0, .2, { link: 1 }, { link: 0 });
    go(4, 0, .3, { x: P.dat }, { x: P.sort }, 'power2.inOut');
    go(4, .3, .4, { lane: 0 }, { lane: 1 });
    go(4, .4, .5, { flap: 0 }, { flap: 1 }, 'back.out(2)');
    go(4, .55, 1, { x: P.sort }, { x: 3330 }, 'power1.in');
    // 06 expedição
    go(5, 0, .7, { x: 3330 }, { x: P.inTruck }, 'power1.inOut');
    go(5, .75, .9, { doors: 0 }, { doors: 1 });
    // 07 fábrica: o caminhão sai e a câmera abre
    const [z0, z1, z2, z8] = view.mobile ? ZOOM.mob : ZOOM.desk;
    S.zoom = z0;
    go(5, .7, 1, { zoom: z0, camOff: 0 }, { zoom: z1, camOff: 180 });
    const lead = P.inTruck - P.truck;
    go(6, 0, 1, { x: P.inTruck, truck: P.truck }, { x: 5600, truck: 5600 - lead }, 'power1.in');
    // 08 clientes
    go(7, 0, .35, { zoom: z1 }, { zoom: z8 });
    go(7, 0, 1, { x: 5600, truck: 5600 - lead }, { x: 7300, truck: 7300 - lead });
    // 09 destino
    go(8, 0, .6, { camOff: 180, zoom: z8 }, { camOff: view.mobile ? 860 : 640, zoom: z2 }, 'power1.inOut');
    go(8, 0, .6, { x: 7300, truck: 7300 - lead }, { x: P.end, truck: P.end - lead }, 'power2.out');
    go(8, .6, .7, { done: 0 }, { done: 1 });
    tl.set({}, {}, max); // duração da timeline = pixels de scroll

    st = ScrollTrigger.create({
      start: 0, end: 'max', scrub: reduce ? true : .7, animation: tl,
      onUpdate: self => {
        if (intro && self.scroll() > 20) {
          // rolou antes ou durante a abertura: encerra e redesenha a cena no ponto do scroll
          intro.progress(1).kill(); intro = null;
          const t = tl.time(); tl.time(0, true).time(t, true);
        }
        railProgress();
      }
    });
  }

  /* ---------------- menu que se desprende do topo ---------------- */
  const topEl = document.querySelector('.top');
  let menuST;
  function buildMenuAnim() {
    if (menuST) { menuST.kill(); menuST = null; }
    gsap.set(topEl, { clearProps: 'all' });
    if (reduce) return;
    const cs = getComputedStyle(topEl), W = innerWidth, hgt = parseFloat(cs.height);
    const gut = view.mobile ? 14 : Math.max(24, (W - 1180) / 2);
    const end = {
      top: cs.top, width: cs.width, height: hgt, borderRadius: hgt / 2,
      backgroundColor: cs.backgroundColor, boxShadow: cs.boxShadow, borderColor: cs.borderTopColor,
      paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, '--mb': '14px', '--ms': 1.4
    };
    const from = {
      top: 0, width: W, height: hgt + (view.mobile ? 8 : 20), borderRadius: 0,
      backgroundColor: 'rgba(255, 255, 255, 0)', boxShadow: cs.boxShadow.replace(/rgba\(([^)]*),\s*[\d.]+\)/, 'rgba($1, 0)'),
      borderColor: 'rgba(255, 255, 255, 0)', paddingLeft: gut, paddingRight: view.mobile ? gut - 8 : gut, '--mb': '0px', '--ms': 1
    };
    const tw = gsap.fromTo(topEl, from, { ...end, ease: 'none', immediateRender: true });
    menuST = ScrollTrigger.create({ start: 0, end: () => innerHeight * .55, scrub: .4, animation: tw });
  }

  /* ---------------- navegação ---------------- */
  function goTo(i) {
    const s = sections[i];
    const y = i === 0 ? 0 : s.offsetTop + innerHeight * .6;
    window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  }

  const stepsEl = document.querySelector('.rail__steps');
  const fill = document.querySelector('.rail__fill'), railBox = document.querySelector('.rail__box');
  const nowNum = document.querySelector('.rail__num'), nowLabel = document.querySelector('.rail__label');
  const buttons = sections.map((s, i) => {
    const li = document.createElement('li');
    li.style.left = `${(i / (sections.length - 1)) * 100}%`;
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `${String(i + 1).padStart(2, '0')} ${s.dataset.label}`);
    b.addEventListener('click', () => goTo(i));
    li.appendChild(b); stepsEl.appendChild(li);
    return b;
  });
  let current = -1;
  function railProgress() {
    const mid = scrollY + innerHeight * .3;
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

  // menu de páginas
  const menu = document.querySelector('.menu'), menuBtn = menu.querySelector('.menu__toggle');
  const sheet = document.getElementById('menu-sheet');
  const setMenu = open => {
    if (open === menu.classList.contains('is-open')) return;
    menu.classList.toggle('is-open', open); sheet.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open); menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    sheet.setAttribute('aria-hidden', !open); sheet.inert = !open;
    document.documentElement.classList.toggle('is-locked', open);
  };
  menuBtn.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  sheet.addEventListener('click', e => { if (e.target.closest('a, button')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  // hover das páginas no menu: a pílula desliza até o link
  const list = document.querySelector('.menu__list'), pill = list.querySelector('.menu__pill');
  let pillOn = false;
  const wide = () => !matchMedia('(max-width: 1180px)').matches;
  list.querySelectorAll('a').forEach(a => a.addEventListener('mouseenter', () => {
    if (!wide()) return;
    const x = a.offsetLeft, w = a.offsetWidth;
    if (!pillOn) {
      gsap.set(pill, { x, width: w });
      gsap.fromTo(pill, { opacity: 0, scaleX: .5 }, { opacity: 1, scaleX: 1, duration: .35, ease: 'back.out(2)' });
      pillOn = true;
    } else gsap.to(pill, { x, width: w, duration: reduce ? 0 : .45, ease: 'power3.out' });
  }));
  list.addEventListener('mouseleave', () => {
    if (!pillOn) return;
    pillOn = false;
    gsap.to(pill, { opacity: 0, scaleX: .7, duration: .25, ease: 'power2.in' });
  });

  // Início e logo: volta ao topo e recarrega para a abertura do caminhão rodar de novo
  document.querySelectorAll('[data-home]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'instant' });
    location.reload();
  }));
  document.querySelectorAll('[data-go]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault(); setMenu(false); goTo(+a.dataset.go);
  }));

  /* ---------------- formulários e popup de pedido de projeto ---------------- */
  // Protótipo: sem destino configurado o envio só mostra a confirmação.
  // Para enviar de verdade, preencher data-endpoint no <form> (Formspree, Web3Forms ou API do cliente).
  const tpl = document.getElementById('tpl-form');
  document.querySelectorAll('.form-slot').forEach(slot => {
    const pre = slot.dataset.form;
    const frag = tpl.content.cloneNode(true);
    frag.querySelectorAll('input, select, textarea').forEach(el => (el.id = `${pre}-${el.name}`));
    slot.appendChild(frag);
    const form = slot.querySelector('form'), ok = slot.querySelector('.form__ok'), err = slot.querySelector('.form__err');
    form.addEventListener('input', e => e.target.closest('.field')?.classList.remove('is-bad'));
    form.addEventListener('submit', async e => {
      e.preventDefault();
      let msg = '';
      form.querySelectorAll('[required]').forEach(el => {
        const bad = !el.value.trim();
        el.closest('.field').classList.toggle('is-bad', bad);
        if (bad) msg = 'Preencha nome, WhatsApp e o que você precisa.';
      });
      const tel = form.whatsapp.value.replace(/\D/g, '');
      if (!msg && tel.length < 10) { form.whatsapp.closest('.field').classList.add('is-bad'); msg = 'Confira o WhatsApp com DDD.'; }
      if (!msg && form.email.value && !form.email.checkValidity()) { form.email.closest('.field').classList.add('is-bad'); msg = 'Confira o e-mail informado.'; }
      err.hidden = !msg; err.textContent = msg;
      if (msg) { form.querySelector('.is-bad input, .is-bad select')?.focus(); return; }
      const send = form.querySelector('.form__send');
      send.disabled = true; send.textContent = 'Enviando';
      try {
        if (form.dataset.endpoint) await fetch(form.dataset.endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      } catch (_) { /* protótipo: segue para a confirmação */ }
      const nome = form.nome.value.trim().split(/\s+/)[0];
      ok.querySelector('strong').textContent = `Pedido enviado, ${nome}.`;
      form.hidden = true; ok.hidden = false;
      fitPanels();
    });
  });

  // botões: rótulo que rola no hover
  const rollLabels = () => document.querySelectorAll('.btn').forEach(b => {
    if (b.querySelector('.btn__roll')) return;
    const t = b.textContent.trim();
    b.innerHTML = `<span class="btn__roll" data-t="${t}"><span>${t}</span></span>`;
  });
  rollLabels();

  const dlg = document.getElementById('orcamento');
  const openQuote = () => { setMenu(false); dlg.showModal(); document.documentElement.classList.add('is-locked'); };
  document.querySelectorAll('[data-quote]').forEach(b => b.addEventListener('click', openQuote));
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => document.documentElement.classList.remove('is-locked'));
  dlg.addEventListener('click', e => {
    const r = dlg.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
  });

  /* ---------------- inicialização ---------------- */
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
  buildParallax();
  buildWorld();
  layout();

  gsap.set(panels.slice(1), { autoAlpha: 0 });
  if (scrollY < 20 && !reduce) {
    S.x = view.mobile ? -660 : -420;
    gsap.set(panels[0], { autoAlpha: 0 });
    // abertura: o caminhão descarrega, a caixa desce a rampa e só então o título aparece
    intro = gsap.timeline({ delay: .3 })
      .to(S, { x: REST, duration: 3, ease: 'power2.inOut' }, 0)
      .fromTo(panels[0], { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: .8, ease: 'power2.out' }, 1.95);
  } else {
    S.x = REST;
    gsap.set(panels[0], { autoAlpha: 1 });
  }
  buildTimeline();
  buildMenuAnim();
  gsap.ticker.add(render);
  railProgress();

  // a faixa inferior sai quando o rodapé entra
  const bar = document.querySelector('.bar');
  new IntersectionObserver(([e]) => bar.classList.toggle('is-hidden', e.isIntersecting))
    .observe(document.querySelector('.foot'));

  // fundo do rodapé: esteiras vistas de cima com caixas circulando (tom bem claro)
  (() => {
    const cv = document.querySelector('.foot__belts');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const BELTS = [
      [[-.05, .26], [1.05, .26]],
      [[.38, .26], [.46, .40], [1.05, .40]],
      [[.62, .26], [.70, .12], [1.05, .12]],
      [[1.05, .80], [.15, .80], [.15, .26]]
    ];
    const ROUTES = [
      [[-.05, .26], [1.05, .26]],
      [[-.05, .26], [.38, .26], [.46, .40], [1.05, .40]],
      [[-.05, .26], [.62, .26], [.70, .12], [1.05, .12]],
      [[1.05, .80], [.15, .80], [.15, .26], [.62, .26], [.70, .12], [1.05, .12]],
      [[1.05, .80], [.15, .80], [.15, .26], [.38, .26], [.46, .40], [1.05, .40]]
    ];
    let W = 0, H = 0, bw = 28, boxes = [], last = 0, spawn = 0, raf = 0, seed = 3;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const pts = r => r.map(([a, b]) => [a * W, b * H]);
    const lenOf = p => p.slice(1).reduce((t, q, i) => t + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
    function at(p, d) {
      for (let i = 1; i < p.length; i++) {
        const [x0, y0] = p[i - 1], [x1, y1] = p[i], l = Math.hypot(x1 - x0, y1 - y0);
        if (d <= l) return [x0 + (x1 - x0) * d / l, y0 + (y1 - y0) * d / l, Math.atan2(y1 - y0, x1 - x0)];
        d -= l;
      }
      const q = p[p.length - 1]; return [q[0], q[1], 0];
    }
    function size() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bw = W < 700 ? 22 : 28;
    }
    function addBox(d0 = 0) {
      const p = pts(ROUTES[Math.floor(rnd() * ROUTES.length)]);
      boxes.push({ p, len: lenOf(p), d: d0, s: bw * (.5 + rnd() * .22) });
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      const run = (t / 1000) * 46;
      BELTS.forEach(b => {
        const p = pts(b);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(201,184,245,.13)'; ctx.lineWidth = bw + 3;
        ctx.beginPath(); p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
        // recorta o miolo: sobra a borda e um véu bem leve na lona
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = bw - 1;
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
        // roletes andando no sentido da esteira
        ctx.strokeStyle = 'rgba(201,184,245,.09)'; ctx.lineWidth = 1.5;
        for (let i = 1; i < p.length; i++) {
          const [x0, y0] = p[i - 1], [x1, y1] = p[i], l = Math.hypot(x1 - x0, y1 - y0);
          const ux = (x1 - x0) / l, uy = (y1 - y0) / l, h = bw / 2 - 3;
          for (let d = run % 14; d < l; d += 14) {
            const cx = x0 + ux * d, cy = y0 + uy * d;
            ctx.beginPath(); ctx.moveTo(cx - uy * h, cy + ux * h); ctx.lineTo(cx + uy * h, cy - ux * h); ctx.stroke();
          }
        }
      });
      boxes.forEach(b => {
        const [x, y, a] = at(b.p, b.d), h = b.s / 2;
        ctx.save(); ctx.translate(x, y); ctx.rotate(a);
        ctx.fillStyle = 'rgba(201,145,88,.2)'; ctx.fillRect(-h, -h, b.s, b.s);
        ctx.fillStyle = 'rgba(240,214,171,.16)'; ctx.fillRect(-h, -1.5, b.s, 3);
        ctx.strokeStyle = 'rgba(240,214,171,.22)'; ctx.lineWidth = 1; ctx.strokeRect(-h, -h, b.s, b.s);
        ctx.restore();
      });
    }
    function tick(t) {
      const dt = Math.min(.05, (t - (last || t)) / 1000); last = t;
      spawn -= dt;
      if (spawn <= 0) { addBox(); spawn = 1.1 + rnd() * .9; }
      boxes.forEach(b => (b.d += dt * 46));
      boxes = boxes.filter(b => b.d < b.len);
      draw(t);
      raf = requestAnimationFrame(tick);
    }
    function prime() { boxes = []; for (let i = 0; i < 14; i++) { addBox(); boxes[i].d = rnd() * boxes[i].len; } }
    size(); prime(); draw(0);
    new IntersectionObserver(([e]) => {
      if (reduce) return;
      if (e.isIntersecting && !raf) { last = 0; raf = requestAnimationFrame(tick); }
      else if (!e.isIntersecting && raf) { cancelAnimationFrame(raf); raf = 0; }
    }).observe(cv);
    addEventListener('resize', () => { size(); prime(); draw(0); });
  })();

  const sig = document.querySelector('.sig');
  const sigIo = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { sig.classList.add('is-on'); sigIo.disconnect(); }
  }, { rootMargin: '0px 0px -20px 0px' });
  sigIo.observe(sig);

  document.fonts?.ready.then(() => { fitPanels(); ScrollTrigger.refresh(); });

  let rt, lastW = innerWidth;
  addEventListener('resize', () => {
    if (view.mobile && innerWidth === lastW) return; // barra de endereço do celular: nada muda
    lastW = innerWidth;
    clearTimeout(rt);
    rt = setTimeout(() => { layout(); buildTimeline(); buildMenuAnim(); ScrollTrigger.refresh(); railProgress(); }, 150);
  });
})();
