/* Exact Soluções · interface comum a todas as páginas
 * Menu (cápsula que se desprende do topo, pílula no hover, tela cheia no celular),
 * popup e formulários de pedido de projeto, botões, WhatsApp, rodapé animado e assinatura.
 * Nas páginas internas também monta a timeline de seções na faixa roxa.
 */
window.UI = (() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOME = document.body.dataset.page === 'home';
  const isMobile = () => innerWidth <= 860 || innerWidth / innerHeight < 1;
  const clamp01 = t => Math.max(0, Math.min(1, t));
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------------- menu que se desprende do topo ---------------- */
  const topEl = document.querySelector('.top');
  let menuST;
  function buildMenuAnim() {
    if (menuST) { menuST.kill(); menuST = null; }
    gsap.set(topEl, { clearProps: 'all' });
    if (reduce) return;
    const cs = getComputedStyle(topEl), W = innerWidth, hgt = parseFloat(cs.height);
    const gut = isMobile() ? 14 : Math.max(24, (W - 1180) / 2);
    const end = {
      top: cs.top, width: cs.width, height: hgt, borderRadius: hgt / 2,
      backgroundColor: cs.backgroundColor, boxShadow: cs.boxShadow, borderColor: cs.borderTopColor,
      paddingLeft: cs.paddingLeft, paddingRight: cs.paddingRight, '--mb': '14px', '--ms': 1.4
    };
    const from = {
      top: 0, width: W, height: hgt + (isMobile() ? 8 : 20), borderRadius: 0,
      backgroundColor: 'rgba(255, 255, 255, 0)', boxShadow: cs.boxShadow.replace(/rgba\(([^)]*),\s*[\d.]+\)/, 'rgba($1, 0)'),
      borderColor: 'rgba(255, 255, 255, 0)', paddingLeft: gut, paddingRight: isMobile() ? gut - 8 : gut, '--mb': '0px', '--ms': 1
    };
    const tw = gsap.fromTo(topEl, from, { ...end, ease: 'none', immediateRender: true });
    menuST = ScrollTrigger.create({ start: 0, end: () => innerHeight * .55, scrub: .4, animation: tw });
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

  // Início e logo: na home, volta ao topo e recarrega para a abertura do caminhão rodar de novo
  if (HOME) document.querySelectorAll('[data-home]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'instant' });
    location.reload();
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
      document.dispatchEvent(new Event('ui:resize'));
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


  /* ---------------- timeline de seções (páginas internas) ---------------- */
  if (!HOME) {
    const secs = [...document.querySelectorAll('main [data-label]')];
    const stepsEl = document.querySelector('.rail__steps');
    const fill = document.querySelector('.rail__fill'), railBox = document.querySelector('.rail__box');
    const nowNum = document.querySelector('.rail__num'), nowLabel = document.querySelector('.rail__label');
    const goSec = i => {
      const y = i === 0 ? 0 : secs[i].getBoundingClientRect().top + scrollY - (isMobile() ? 76 : 96);
      window.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    };
    const btns = secs.map((s, i) => {
      const li = document.createElement('li');
      li.style.left = `${secs.length > 1 ? (i / (secs.length - 1)) * 100 : 0}%`;
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `${String(i + 1).padStart(2, '0')} ${s.dataset.label}`);
      b.addEventListener('click', () => goSec(i));
      li.appendChild(b); stepsEl.appendChild(li);
      return b;
    });
    let cur = -1;
    const prog = () => {
      const mid = scrollY + innerHeight * .35;
      let idx = 0;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top + scrollY <= mid) idx = i; });
      const top = s => s.getBoundingClientRect().top + scrollY;
      const next = secs[idx + 1];
      const local = next ? clamp01((mid - top(secs[idx])) / (top(next) - top(secs[idx]))) : 0;
      const pos = secs.length > 1 ? (idx + local) / (secs.length - 1) * 100 : 0;
      fill.style.width = `${pos}%`; railBox.style.left = `${pos}%`;
      if (idx !== cur) {
        cur = idx;
        btns.forEach((b, i) => { b.classList.toggle('is-on', i === idx); b.classList.toggle('is-done', i < idx); });
        nowNum.textContent = String(idx + 1).padStart(2, '0');
        nowLabel.textContent = secs[idx].dataset.label;
      }
    };
    addEventListener('scroll', prog, { passive: true });
    prog();
    document.querySelectorAll('[data-sec]').forEach(a => a.addEventListener('click', e => {
      const i = secs.findIndex(s => s.id === a.dataset.sec);
      if (i < 0) return;
      e.preventDefault(); goSec(i);
    }));
  }

  /* ---------------- esteiras das páginas e entrada dos blocos ---------------- */
  // a caixa anda na mesma velocidade da lona (130 px/s), qualquer que seja a largura da tela
  const beltSpeed = () => document.documentElement.style.setProperty('--belt-d', `${(innerWidth + 90) / 130}s`);
  beltSpeed();
  if (!HOME && !reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.prod, .compare, .card, .values, .cta, .logos li, .steps li, .form-card, .channel, .map')
      .forEach((el, i) => { el.classList.add('reveal'); el.style.transitionDelay = `${(i % 3) * 70}ms`; io.observe(el); });
  }

  /* ---------------- inicialização ---------------- */
  buildMenuAnim();
  let lw = innerWidth, rt;
  addEventListener('resize', () => {
    if (innerWidth === lw) return; // barra de endereço do celular: nada muda
    lw = innerWidth;
    clearTimeout(rt);
    rt = setTimeout(() => { buildMenuAnim(); beltSpeed(); ScrollTrigger.refresh(); }, 160);
  });

  return { setMenu, openQuote, reduce, isMobile };
})();
