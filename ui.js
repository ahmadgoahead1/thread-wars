/* Thread Wars — answer input components shared by the phone page and the host's hands-mode panel. */
(function () {
  const { icon, R1_STEPS, R1_SCRAMBLE, R2_OPTIONS, BETS } = window.TW;
  const nameOf = (id) => (R1_STEPS.find((s) => s.id === id) || {}).name;

  // Renders the input UI for round r into el. onLock(answer) is called on "Lock in".
  function renderAnswer(el, r, onLock, opts) {
    opts = opts || {};
    const lockLabel = opts.lockLabel || "Lock in my answer";
    if (r === 0) {
      let order = (opts.initial && opts.initial.order) ? opts.initial.order.slice() : [];
      const draw = () => {
        el.innerHTML = `<div class="tiles tiles-order">${R1_SCRAMBLE.map((id, i) => {
          const n = order.indexOf(id);
          return `<button type="button" class="tile ${n >= 0 ? "on" : ""}" data-id="${id}" aria-pressed="${n >= 0}">
            <span class="tile-letter">${"ABCDEF"[i]}</span>${n >= 0 ? `<span class="tile-num">${n + 1}</span>` : ""}
            ${icon(id)}<span class="tile-name">${nameOf(id)}</span></button>`;
        }).join("")}</div>
        <p class="hint">${order.length < 6 ? `Tap stop number ${order.length + 1}. Tap a numbered stop again to undo it.` : "All six are in order. Check them, then lock in."}</p>
        <div class="actions"><button type="button" class="btn ghost" data-act="clear" ${order.length ? "" : "disabled"}>Start over</button>
        <button type="button" class="btn" data-act="lock" ${order.length === 6 ? "" : "disabled"}>${lockLabel}</button></div>`;
        el.querySelectorAll(".tile").forEach((b) => b.onclick = () => {
          const id = b.dataset.id, n = order.indexOf(id);
          if (n >= 0) order = order.slice(0, n); else order.push(id);
          draw();
        });
        el.querySelector('[data-act="clear"]').onclick = () => { order = []; draw(); };
        el.querySelector('[data-act="lock"]').onclick = () => onLock({ order: order.slice() });
      };
      draw();
    } else if (r === 1) {
      const picks = new Set((opts.initial && opts.initial.picks) || []);
      const draw = () => {
        el.innerHTML = `<div class="tiles tiles-pick">${R2_OPTIONS.map((o) => `<button type="button" class="tile ${picks.has(o.id) ? "on" : ""}" data-id="${o.id}" aria-pressed="${picks.has(o.id)}">
            ${picks.has(o.id) ? '<span class="tile-check" aria-hidden="true">✓</span>' : ""}${icon(o.id)}<span class="tile-name">${o.name}</span></button>`).join("")}</div>
        <p class="hint">${picks.size ? `You picked ${picks.size}. Wrong picks cost points, so choose carefully.` : "Tap every part you think will feel the flood."}</p>
        <div class="actions"><button type="button" class="btn" data-act="lock" ${picks.size ? "" : "disabled"}>${lockLabel}</button></div>`;
        el.querySelectorAll(".tile").forEach((b) => b.onclick = () => { const id = b.dataset.id; picks.has(id) ? picks.delete(id) : picks.add(id); draw(); });
        el.querySelector('[data-act="lock"]').onclick = () => onLock({ picks: [...picks] });
      };
      draw();
    } else {
      let guess = (opts.initial && opts.initial.guess != null) ? opts.initial.guess : 50;
      let bet = (opts.initial && opts.initial.bet) || 1;
      el.innerHTML = `<div class="guess">
          <div class="guess-visual" aria-hidden="true"><div class="gv-col"><div class="gv-label">Thrown away by factories</div><div class="gv-big">100</div><div class="gv-unit">bags</div></div>
          <div class="gv-col mine"><div class="gv-label">Brought back by customers</div><div class="gv-big" id="gnum">${guess}</div><div class="gv-unit">bags</div></div></div>
          <div class="slider-row"><button type="button" class="step" data-d="-1" aria-label="Minus one">−</button>
          <input type="range" min="0" max="100" step="1" value="${guess}" id="grange" aria-label="Your guess, in bags"/>
          <button type="button" class="step" data-d="1" aria-label="Plus one">+</button></div>
          <div class="bets" role="radiogroup" aria-label="Your bet">${BETS.map((b) => `<button type="button" role="radio" class="bet ${b.m === bet ? "on" : ""}" data-m="${b.m}" aria-checked="${b.m === bet}"><strong>${b.name}</strong><span>${b.sub}</span></button>`).join("")}</div>
          <div class="actions"><button type="button" class="btn" data-act="lock">${lockLabel}</button></div></div>`;
      const rng = el.querySelector("#grange"), num = el.querySelector("#gnum");
      const set = (v) => { guess = Math.max(0, Math.min(100, v)); rng.value = guess; num.textContent = guess; };
      rng.oninput = () => set(Number(rng.value));
      el.querySelectorAll(".step").forEach((b) => b.onclick = () => set(guess + Number(b.dataset.d)));
      el.querySelectorAll(".bet").forEach((b) => b.onclick = () => {
        bet = Number(b.dataset.m);
        el.querySelectorAll(".bet").forEach((x) => { x.classList.toggle("on", x === b); x.setAttribute("aria-checked", x === b); });
      });
      el.querySelector('[data-act="lock"]').onclick = () => onLock({ guess, bet });
    }
  }

  // Short human-readable summary of an answer (used in the host's team list).
  function summarize(r, a) {
    if (!a) return "";
    if (r === 0) return a.order.map((id) => "ABCDEF"[R1_SCRAMBLE.indexOf(id)]).join(" ");
    if (r === 1) return a.picks.length + " picked";
    return `${a.guess} bags, ×${a.bet}`;
  }

  window.TWUI = { renderAnswer, summarize };
})();
