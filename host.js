/* Thread Wars — host (projector) screen. Phones connect peer-to-peer with PeerJS; hands mode needs no network. */
(function () {
  const { icon, R1_STEPS, R1_SCRAMBLE, R2_OPTIONS, R3_ANSWER, ROUNDS, TEXT, score, PREFIX } = window.TW;
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const params = new URLSearchParams(location.search);
  const A = window.TWA;
  const TEAM_COLORS = ["#E93424", "#1E1E1E", "#2F5D9B", "#B7791F", "#2E7D5B", "#7A4FA0"];

  const S = {
    mode: params.get("mode") === "hands" ? "hands" : "phones",
    phase: "lobby", r: 0, deadline: 0, dur: 0, timerId: null,
    players: new Map(), teams: [], room: "", peer: null, peerOk: false, peerMsg: "Connecting to the game server…",
    revealTimer: null, revealStep: 0, revealSteps: [], revealDone: false, editing: null,
  };
  ["Team Cotton", "Team Yarn", "Team Needle", "Team Loop"].forEach((n, i) => S.teams.push({ name: n, color: TEAM_COLORS[i], score: 0, answers: {}, last: 0 }));

  /* ---------------- networking ---------------- */
  const randRoom = () => Array.from({ length: 4 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ"[Math.floor(Math.random() * 24)]).join("");
  let idTries = 0;
  function startPeer(forceNew) {
    if (typeof Peer === "undefined") { S.peerMsg = "The phone connection library did not load, so this computer is probably offline. Switch to hands mode to keep playing."; render(); return; }
    if (forceNew || !sessionStorage.tw_room) sessionStorage.tw_room = randRoom();
    S.room = sessionStorage.tw_room;
    const peer = new Peer(PREFIX + S.room.toLowerCase(), { debug: 1 });
    S.peer = peer;
    peer.on("open", () => { S.peerOk = true; S.peerMsg = ""; idTries = 0; render(); });
    peer.on("connection", (conn) => {
      conn.on("data", (d) => onData(conn, d));
      conn.on("close", () => { for (const p of S.players.values()) if (p.conn === conn) { p.online = false; } if (S.phase === "lobby") render(); else updateCounter(); });
    });
    peer.on("disconnected", () => { S.peerOk = false; S.peerMsg = "Lost contact with the game server. Reconnecting…"; render(); setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1500); });
    peer.on("error", (e) => {
      if (e.type === "unavailable-id") {
        // Usually the old host tab still holds the room for a few seconds after a reload.
        idTries++; peer.destroy();
        S.peerMsg = "Opening your game room…"; render();
        setTimeout(() => startPeer(idTries > 4), 2500);
      } else if (e.type === "peer-unavailable") {
        /* ignore */
      } else {
        S.peerOk = false;
        S.peerMsg = "Phones cannot connect right now (" + (e.type || "network error") + "). Check the internet connection, or switch to hands mode.";
        render();
      }
    });
  }

  function send(p, msg) { if (p.conn && p.conn.open) { try { p.conn.send(msg); } catch (e) {} } }
  function phaseMsg(p) {
    const m = { t: "phase", phase: S.phase, r: S.r, answered: !!(p.answers[S.r]) };
    if (S.phase === "answer") m.remain = Math.max(0, S.deadline - Date.now()), m.dur = S.dur;
    if ((S.phase === "reveal" || S.phase === "board") && p.results[S.r]) Object.assign(m, resultFor(p));
    if (S.phase === "final") Object.assign(m, finalFor(p));
    return m;
  }
  const broadcast = () => { for (const p of S.players.values()) send(p, phaseMsg(p)); };

  function onData(conn, d) {
    if (!d || typeof d !== "object") return;
    if (d.t === "hello") {
      const name = String(d.name || "").trim().replace(/\s+/g, " ").slice(0, 16);
      const key = String(d.key || "").slice(0, 40);
      if (!name || !key) return;
      let p = S.players.get(key);
      if (!p) {
        const clash = [...S.players.values()].find((x) => x.name.toLowerCase() === name.toLowerCase());
        if (clash) { conn.send({ t: "error", msg: `Someone is already playing as "${name}". Please add a letter or pick another nickname.` }); return; }
        p = { key, name, score: 0, answers: {}, results: {}, online: true, conn };
        S.players.set(key, p);
        A.play("pop");
      }
      p.conn = conn; p.online = true;
      send(p, { t: "welcome", name: p.name, room: S.room });
      send(p, phaseMsg(p));
      if (S.phase === "lobby") render(); else updateCounter();
    } else if (d.t === "answer") {
      const p = [...S.players.values()].find((x) => x.conn === conn);
      if (!p || S.mode !== "phones" || S.phase !== "answer" || d.r !== S.r || p.answers[S.r]) return;
      p.answers[S.r] = { a: d.a, tFrac: (S.deadline - Date.now()) / (S.dur || 1), at: Date.now() };
      send(p, { t: "locked", r: S.r });
      A.play("lock");
      updateCounter();
      const live = [...S.players.values()].filter((x) => x.online);
      if (live.length && live.every((x) => x.answers[S.r])) setTimeout(() => { if (S.phase === "answer") endAnswers(); }, 900);
    }
  }

  /* ---------------- bots for rehearsal: index.html?bots=12 ---------------- */
  const nBots = Math.min(40, Number(params.get("bots")) || 0);
  const BOT_NAMES = ["Ayu", "Budi", "Citra", "Dimas", "Eka", "Fajar", "Gita", "Hana", "Indra", "Joko", "Kiki", "Lala", "Made", "Nina", "Oki", "Putri", "Rina", "Sari", "Tono", "Wulan"];
  for (let i = 0; i < nBots; i++) {
    const key = "bot" + i;
    S.players.set(key, { key, name: BOT_NAMES[i % 20] + (i >= 20 ? i : ""), score: 0, answers: {}, results: {}, online: true, conn: null, bot: true });
  }
  function botAnswers() {
    for (const p of S.players.values()) if (p.bot) {
      const delay = 3000 + Math.random() * (S.dur - 6000);
      setTimeout(() => {
        if (S.phase !== "answer" || p.answers[S.r]) return;
        let a;
        if (S.r === 0) { a = { order: R1_STEPS.map((s) => s.id) }; if (Math.random() < .55) { const i = Math.floor(Math.random() * 5); [a.order[i], a.order[i + 1]] = [a.order[i + 1], a.order[i]]; } }
        else if (S.r === 1) a = { picks: R2_OPTIONS.filter((o) => Math.random() < (o.hit ? .7 : .25)).map((o) => o.id) };
        else a = { guess: Math.round(Math.random() < .3 ? Math.random() * 12 : Math.random() * 70), bet: 1 + Math.floor(Math.random() * 3) };
        p.answers[S.r] = { a, tFrac: (S.deadline - Date.now()) / S.dur, at: Date.now() };
        A.play("lock");
        updateCounter();
      }, delay);
    }
  }

  /* ---------------- game flow ---------------- */
  const competitors = () => S.mode === "phones" ? [...S.players.values()] : S.teams;
  function setPhase(ph) {
    S.phase = ph; clearInterval(S.timerId); clearTimeout(S.revealTimer);
    A.setScene(ph, { dur: ph === "answer" ? S.dur : 0 });
    if (ph === "intro") A.play("whoosh");
    else if (ph === "answer") { A.play("open"); A.duck(900); }
    else if (ph === "board") A.play("board", S.mode === "phones" ? Math.min(5, S.players.size) : S.teams.length);
    else if (ph === "final") A.play("drumroll", 1);
    render(); if (S.mode === "phones") broadcast();
  }
  function startGame() { S.r = 0; setPhase("intro"); }
  function openAnswers() {
    S.dur = ROUNDS[S.r].time * 1000; S.deadline = Date.now() + S.dur; S.lastSec = null; S.rang = false;
    competitors().forEach((c) => { delete c.answers[S.r]; });
    setPhase("answer");
    S.timerId = setInterval(tick, 200); tick();
    if (S.mode === "phones") botAnswers();
  }
  function tick() {
    const left = Math.max(0, S.deadline - Date.now());
    const num = $("#timerNum"), ring = $("#timerArc");
    if (num) num.textContent = Math.ceil(left / 1000);
    if (ring) ring.style.strokeDashoffset = String(126 * (1 - left / S.dur));
    const sec = Math.ceil(left / 1000);
    if (sec !== S.lastSec) { S.lastSec = sec; if (sec > 0 && sec <= 5) A.play("tick", sec); }
    if (left <= 0 && !S.rang) { S.rang = true; A.play("timeUp"); }
    if (left <= 0 && S.mode === "phones") endAnswers();
  }
  function endAnswers() {
    if (S.phase !== "answer") return;
    clearInterval(S.timerId);
    if (!S.rang) { S.rang = true; A.play("timeUp"); }
    // score the round
    for (const c of competitors()) {
      const ans = S.mode === "phones" ? c.answers[S.r] : (c.answers[S.r] ? { a: c.answers[S.r], tFrac: 0 } : null);
      const res = score(S.r, ans && ans.a, ans && ans.tFrac);
      if (S.mode === "phones") c.results[S.r] = res;
      c.lastRes = res;
      const before = c.score;
      c.score = Math.max(0, c.score + res.pts);
      c.last = c.score - before;
    }
    setPhase("reveal");
  }
  function ranked() { return competitors().slice().sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)); }
  function rankOf(p) { return ranked().indexOf(p) + 1; }
  function resultFor(p) { const r = p.results[S.r] || {}; return { pts: p.last || 0, total: p.score, rank: rankOf(p), of: S.players.size, detail: r.detail || "" }; }
  function finalFor(p) { return { total: p.score, rank: rankOf(p), of: S.players.size }; }
  function next() {
    if (S.phase === "lobby") return startGame();
    if (S.phase === "intro") return openAnswers();
    if (S.phase === "answer") return endAnswers();
    if (S.phase === "reveal") { if (!S.revealDone) return stepReveal(true); return setPhase("board"); }
    if (S.phase === "board") { if (S.r < 2) { S.r++; return setPhase("intro"); } return setPhase("final"); }
    if (S.phase === "final") return resetGame();
  }
  function resetGame() {
    competitors().forEach((c) => { c.score = 0; c.answers = {}; c.last = 0; if (c.results) c.results = {}; });
    S.r = 0; setPhase("lobby");
  }
  function switchMode() {
    S.mode = S.mode === "phones" ? "hands" : "phones";
    if (S.mode === "phones" && !S.peer) startPeer();
    if (S.phase === "answer" && S.mode === "hands") { clearInterval(S.timerId); S.timerId = setInterval(tick, 200); }
    render(); if (S.mode === "phones") broadcast();
  }

  /* ---------------- rendering ---------------- */
  const pipsHTML = () => [0, 1, 2].map((i) => `<i class="pip ${S.phase !== "lobby" && i <= S.r ? "on" : ""}"></i>`).join("");
  function render() {
    $("#pips").innerHTML = pipsHTML();
    $("#roomChip").innerHTML = S.mode === "phones" ? (S.room ? `Room <b>${S.room}</b> · ${[...S.players.values()].filter((p) => p.online).length} on phones` : "Opening room…") : `Hands mode · ${S.teams.length} teams`;
    $("#modeBtn").textContent = S.mode === "phones" ? "Switch to hands mode" : "Switch to phone mode";
    const L = $("#left"), St = $("#stage");
    const R = ROUNDS[S.r];
    if (S.phase === "lobby") {
      L.innerHTML = `<div class="h-kicker">A five-minute icebreaker in three rounds</div><h1 class="h-title">Thread Wars</h1>
        <p class="h-text">${S.mode === "phones" ? TEXT.lobby : TEXT.lobbyHands}</p>
        <div class="h-controls"><button class="btn" id="primary">Start the game</button></div>`;
      St.innerHTML = S.mode === "phones" ? lobbyPhones() : lobbyHands();
      if (S.mode === "phones") drawQR(); else bindTeamEditor();
    } else if (S.phase === "intro" || S.phase === "answer") {
      const open = S.phase === "answer";
      L.innerHTML = `<div class="h-kicker">Round ${S.r + 1} of 3</div><h1 class="h-title">${R.title}</h1>
        <p class="h-text ${open ? "" : "small"}">${open ? `<strong>${R.phone}</strong><br><br>${S.mode === "phones" ? "Answer on your phone now. The round closes when the timer runs out or when everyone has locked in." : "Talk it over with your team, then tell the host your answer. The host will tap your team's name and enter it."}` : R.intro}</p>
        <div class="h-controls"><button class="btn" id="primary">${open ? (S.mode === "phones" ? "Close answers now" : "Reveal the answer") : "Open answers"}</button></div>`;
      St.innerHTML = `<div class="stage-box dots" id="box">${open ? timerHTML() : ""}</div>`;
      drawRoundVisual(false);
      if (open && S.mode === "hands") drawTeamsPanel();
    } else if (S.phase === "reveal") {
      L.innerHTML = `<div class="h-kicker">Round ${S.r + 1} of 3 · the answer</div><h1 class="h-title">${R.title}</h1>
        <p class="h-text" id="leftText"><strong>The question was:</strong> ${R.phone}<br><br>The answer appears on the right, one step at a time, with the reason behind each step.</p>${R.source ? `<div class="h-src hidden" id="leftSrc">${R.source}</div>` : ""}
        <div class="h-controls"><button class="btn" id="primary">Next step</button><button class="btn ghost small" id="replay">Replay</button></div>`;
      St.innerHTML = `<div class="stage-box dots" id="box"></div>`;
      $("#replay").onclick = () => { clearTimeout(S.revealTimer); St.innerHTML = `<div class="stage-box dots" id="box"></div>`; startReveal(); };
      startReveal();
    } else if (S.phase === "board") {
      const rk = ranked(); const top = rk[0];
      const climber = competitors().slice().sort((a, b) => b.last - a.last)[0];
      L.innerHTML = `<div class="h-kicker">After round ${S.r + 1} of 3</div><h1 class="h-title">Leaderboard</h1>
        <p class="h-text">${top && top.score > 0 ? `<strong>${esc(top.name)}</strong> is in the lead with ${top.score} points.` : "Nobody has scored yet, so everything is still open."} ${climber && climber.last > 0 && climber !== top ? `The biggest jump this round came from <strong>${esc(climber.name)}</strong>, who earned ${climber.last} points.` : ""} ${S.r < 2 ? "There is still plenty of time to catch up." : "Let's see who wins."}</p>
        <div class="h-controls"><button class="btn" id="primary">${S.r < 2 ? "Next round" : "See the winners"}</button></div>`;
      St.innerHTML = `<div class="stage-box">${boardHTML()}</div>`;
      requestAnimationFrame(() => document.querySelectorAll(".bfill").forEach((f) => f.style.width = f.dataset.w));
    } else if (S.phase === "final") {
      L.innerHTML = `<div class="h-kicker">Final results</div><h1 class="h-title">We have a winner</h1><p class="h-text">${TEXT.final}</p>
        <div class="h-controls"><button class="btn ghost" id="primary">Play again</button></div>`;
      St.innerHTML = `<div class="stage-box">${podiumHTML()}</div>`;
      confetti();
    }
    const pb = $("#primary"); if (pb) pb.onclick = next;
  }

  function lobbyPhones() {
    const url = playURL();
    const list = [...S.players.values()];
    const warn = location.protocol === "file:" ? `<div class="status bad">This page was opened from a file on your computer, so phones cannot reach it. Publish the folder on GitHub Pages first (see the guide), or switch to hands mode.</div>` : "";
    return `<div class="join"><div class="qr-card"><div id="qr"></div><div class="qr-code">${S.room || "····"}</div><div class="qr-url">${esc(url.replace(/^https?:\/\//, ""))}</div></div>
      <div><div class="roster-head"><span class="roster-count">${list.filter((p) => p.online).length}</span><span>players have joined. Scan the code with your camera, type a nickname, and wait for the first round.</span></div>
      <div class="roster">${list.map((p) => `<span class="name-chip ${p.online ? "" : "off"}">${esc(p.name)}</span>`).join("")}</div>
      ${S.peerMsg ? `<div class="status ${S.peerOk ? "" : "bad"}">${esc(S.peerMsg)}</div>` : ""}${warn}</div></div>`;
  }
  function playURL() { const u = new URL("play.html", location.href); u.search = "?room=" + (S.room || ""); u.hash = ""; return u.toString(); }
  function drawQR() {
    const el = $("#qr"); if (!el || !S.room || typeof qrcode === "undefined") return;
    const q = qrcode(0, "M"); q.addData(playURL()); q.make();
    el.innerHTML = q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
    const svg = el.querySelector("svg"); if (svg) { svg.style.width = "min(30vh,300px)"; svg.style.height = "auto"; svg.setAttribute("role", "img"); svg.setAttribute("aria-label", "QR code to join the game"); }
  }
  function lobbyHands() {
    return `<div><p class="h-text small" style="margin-bottom:14px">Split the room into teams by where people are sitting. Rename the teams if you like. Each team picks one spokesperson who tells you the team's answer.</p>
      <div class="teams-edit" id="teamsEdit">${S.teams.map((t, i) => `<div class="row"><span class="swatch" style="background:${t.color}"></span><input value="${esc(t.name)}" data-i="${i}" aria-label="Team ${i + 1} name" maxlength="20"/></div>`).join("")}</div>
      <div class="actions" style="justify-content:flex-start"><button class="btn ghost small" id="tMinus" ${S.teams.length <= 2 ? "disabled" : ""}>Remove a team</button><button class="btn ghost small" id="tPlus" ${S.teams.length >= 6 ? "disabled" : ""}>Add a team</button></div></div>`;
  }
  function bindTeamEditor() {
    document.querySelectorAll("#teamsEdit input").forEach((inp) => inp.oninput = () => { S.teams[+inp.dataset.i].name = inp.value.trim() || `Team ${+inp.dataset.i + 1}`; $("#roomChip").textContent = `Hands mode · ${S.teams.length} teams`; });
    $("#tPlus").onclick = () => { const i = S.teams.length; S.teams.push({ name: ["Team Cotton", "Team Yarn", "Team Needle", "Team Loop", "Team Button", "Team Zipper"][i], color: TEAM_COLORS[i], score: 0, answers: {}, last: 0 }); render(); };
    $("#tMinus").onclick = () => { S.teams.pop(); render(); };
  }
  function timerHTML() {
    return `<div class="timer"><svg class="timer-ring" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="#F4F3F0" stroke-width="6"/>
      <circle id="timerArc" cx="24" cy="24" r="20" fill="none" stroke="#E93424" stroke-width="6" stroke-dasharray="126" stroke-dashoffset="0" transform="rotate(-90 24 24)" stroke-linecap="round"/></svg>
      <span class="timer-num" id="timerNum">${ROUNDS[S.r].time}</span><span class="answered" id="answered">${counterText()}</span></div>`;
  }
  function counterText() {
    if (S.mode === "phones") { const live = [...S.players.values()].filter((p) => p.online || p.answers[S.r]); return `${live.filter((p) => p.answers[S.r]).length} of ${live.length} answered`; }
    return `${S.teams.filter((t) => t.answers[S.r]).length} of ${S.teams.length} teams entered`;
  }
  function updateCounter() { const a = $("#answered"); if (a) a.textContent = counterText(); $("#roomChip") && S.mode === "phones" && ($("#roomChip").innerHTML = `Room <b>${S.room}</b> · ${[...S.players.values()].filter((p) => p.online).length} on phones`); }

  /* ----- hands-mode entry ----- */
  function drawTeamsPanel() {
    const box = $("#box"); let pnl = $("#teamsPanel");
    if (!pnl) { pnl = document.createElement("div"); pnl.className = "teams-panel"; pnl.id = "teamsPanel"; box.appendChild(pnl); }
    pnl.innerHTML = `<h3>Tap a team to enter its answer</h3><div class="tlist">${S.teams.map((t, i) => `<button class="trow ${t.answers[S.r] ? "done" : ""}" data-i="${i}"><span class="swatch" style="background:${t.color};height:30px;width:8px"></span><span><span class="tn">${esc(t.name)}</span><br><span class="ts">${t.answers[S.r] ? "Entered: " + esc(window.TWUI.summarize(S.r, t.answers[S.r])) : "Waiting for answer"}</span></span></button>`).join("")}</div>`;
    pnl.querySelectorAll(".trow").forEach((b) => b.onclick = () => openEntry(+b.dataset.i));
    updateCounter();
  }
  function openEntry(i) {
    const t = S.teams[i];
    const m = document.createElement("div"); m.className = "modal";
    m.innerHTML = `<div class="modal-card" role="dialog" aria-modal="true" aria-label="Enter answer for ${esc(t.name)}"><h3>${esc(t.name)}</h3><p>${ROUNDS[S.r].phone}</p><div id="entry"></div>
      <div class="actions"><button class="btn ghost small" id="cancel">Cancel</button></div></div>`;
    document.body.appendChild(m);
    S.editing = m;
    window.TWUI.renderAnswer($("#entry", m), S.r, (a) => { t.answers[S.r] = a; close(); drawTeamsPanel(); }, { lockLabel: "Save this team's answer", initial: t.answers[S.r] });
    const close = () => { m.remove(); S.editing = null; };
    $("#cancel", m).onclick = close;
    m.addEventListener("click", (e) => { if (e.target === m) close(); });
  }

  /* ----- round visuals ----- */
  const boxSize = () => { const b = $("#box"); return { w: b.clientWidth, h: b.clientHeight }; };
  function drawRoundVisual(reveal) {
    if (S.r === 0) drawJourney(); else if (S.r === 1) drawNetwork(); else drawBags();
  }
  // R1
  const jScramblePos = (id) => ({ x: 9 + R1_SCRAMBLE.indexOf(id) * 16.4, y: 44 });
  const jPos = (i) => ({ x: 9 + i * 16.4, y: i % 2 ? 56 : 30 });
  function drawJourney() {
    const box = $("#box");
    const j = document.createElement("div"); j.className = "journey"; j.id = "journey";
    j.innerHTML = `<svg class="thread" id="thread"></svg>` + R1_SCRAMBLE.map((id, i) => {
      const p = jScramblePos(id);
      return `<div class="jcard" id="jc-${id}" style="left:${p.x}%;top:${p.y}%"><span class="lt">${"ABCDEF"[i]}</span><span class="no"></span>${icon(id)}<div class="nm">${R1_STEPS.find((s) => s.id === id).name}</div></div>`;
    }).join("");
    box.prepend(j);
  }
  // R2
  const NPOS = { farm: [9, 20], fabric: [27, 20], port: [46, 40], factory: [27, 62], workers: [9, 62], warehouse: [66, 20], store: [88, 20], online: [66, 62], you: [88, 62], music: [46, 10] };
  const EDGES = [["farm", "fabric"], ["fabric", "port"], ["port", "factory"], ["factory", "workers"], ["port", "warehouse"], ["warehouse", "store"], ["warehouse", "online"], ["store", "you"], ["online", "you"]];
  function drawNetwork() {
    const box = $("#box"), { w, h } = boxSize();
    const n = document.createElement("div"); n.className = "net"; n.id = "net";
    const P = (id) => [NPOS[id][0] / 100 * w, NPOS[id][1] / 100 * h];
    n.innerHTML = `<svg class="wires" viewBox="0 0 ${w} ${h}">${EDGES.map(([a, b]) => { const [x1, y1] = P(a), [x2, y2] = P(b); return `<path class="wire" data-e="${a}-${b}" d="M${x1} ${y1} L${x2} ${y2}"/>`; }).join("")}</svg>` +
      Object.keys(NPOS).map((id) => {
        const o = R2_OPTIONS.find((x) => x.id === id);
        return `<div class="nnode ${id === "port" ? "port flood" : ""}" id="nn-${id}" style="left:${NPOS[id][0]}%;top:${NPOS[id][1]}%"><div class="disc">${icon(id === "port" ? "port" : id)}</div><div class="lbl">${id === "port" ? "Flooded port" : o.name}</div><div class="votes" id="nv-${id}"></div></div>`;
      }).join("");
    box.prepend(n);
  }
  // R3
  function drawBags() {
    const box = $("#box");
    const b = document.createElement("div"); b.className = "bags"; b.id = "bags";
    b.innerHTML = `<div class="bag-grid">${Array.from({ length: 100 }, (_, i) => `<div class="bag waste" id="bag-${i}">${icon("bag")}</div>`).join("")}</div>
      <div class="bag-side"><div class="big" id="bagBig">?</div><div class="of" id="bagOf">How many of these 100 bags come back from customers?</div><div class="closest hidden" id="closest"></div></div>`;
    box.prepend(b);
  }

  /* ----- reveal sequencing ----- */
  function caption(tag, text, trap) {
    let c = $("#caption"); const box = $("#box");
    if (!c) { c = document.createElement("div"); c.id = "caption"; box.appendChild(c); }
    c.className = "caption" + (trap ? " trap" : "");
    c.innerHTML = `${tag ? `<span class="tag">${esc(tag)}</span>` : ""}<span>${text}</span>`;
  }
  const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;
  function startReveal() {
    S.revealStep = 0; S.revealDone = false; S.revealSteps = [];
    drawRoundVisual(true);
    const comp = competitors().filter((c) => (S.mode === "phones" ? c.answers[S.r] : c.answers[S.r]));
    const ansOf = (c) => S.mode === "phones" ? c.answers[S.r].a : c.answers[S.r];
    const N = comp.length;
    const who = S.mode === "phones" ? "players" : "teams";
    const steps = S.revealSteps;
    if (S.r === 0) {
      const pts = [];
      R1_STEPS.forEach((s, i) => steps.push(() => {
        const el = $("#jc-" + s.id), p = jPos(i);
        el.style.left = p.x + "%"; el.style.top = p.y + "%"; el.classList.add("placed"); $(".no", el).textContent = i + 1;
        pts.push(p); drawThread(pts); A.play("stitch", i);
        const right = comp.filter((c) => (ansOf(c).order || [])[i] === s.id).length;
        caption("Step " + (i + 1), `<strong>${s.name}.</strong> ${s.text}${N ? ` <em>${pct(right, N)}% of ${who} put this one in the right spot.</em>` : ""}`);
      }));
      steps.push(() => {
        const perfect = comp.filter((c) => c.lastRes && c.lastRes.perfect);
        const fastest = S.mode === "phones" ? perfect.slice().sort((a, b) => a.answers[S.r].at - b.answers[S.r].at)[0] : null;
        A.play("tada");
        caption("", `${ROUNDS[0].outro} ${N ? `${perfect.length} of ${N} ${who} got the whole order right${fastest ? `, and <strong>${esc(fastest.name)}</strong> was the fastest to do it` : ""}.` : ""}`);
      });
    } else if (S.r === 1) {
      const hits = [["fabric", ["fabric-port"]], ["factory", ["port-factory"]], ["workers", ["factory-workers"]], ["warehouse", ["port-warehouse"]], ["store", ["warehouse-store"]], ["online", ["warehouse-online"]], ["you", ["store-you", "online-you"]]];
      const picked = (id) => comp.filter((c) => (ansOf(c).picks || []).includes(id)).length;
      steps.push(() => A.play("flood") || caption("Flood", "The port closes. For two weeks, ships cannot load or unload, and everything waiting on the dock just sits there. Now watch where the problem travels."));
      hits.forEach(([id, edges], k) => steps.push(() => {
        const o = R2_OPTIONS.find((x) => x.id === id); A.play("alarm", k);
        $("#nn-" + id).classList.add("hit"); edges.forEach((e) => { const w = document.querySelector(`.wire[data-e="${e}"]`); if (w) w.classList.add("hot"); });
        if (N) $("#nv-" + id).textContent = `${pct(picked(id), N)}% picked it`;
        caption(o.name, o.why);
      }));
      ["farm", "music"].forEach((id) => steps.push(() => {
        const o = R2_OPTIONS.find((x) => x.id === id);
        $("#nn-" + id).classList.add("safe", "trap"); A.play("trap");
        if (N) $("#nv-" + id).textContent = `${pct(picked(id), N)}% fell for it`;
        caption("Trap", o.why, true);
      }));
      steps.push(() => {
        let tip = "";
        if (N) { const hitIds = hits.map((h) => h[0]); const low = hitIds.map((id) => [id, picked(id)]).sort((a, b) => a[1] - b[1])[0]; const o = R2_OPTIONS.find((x) => x.id === low[0]); tip = ` The link most ${who} forgot was <strong>${o.name.toLowerCase()}</strong>, which only ${pct(low[1], N)}% picked.`; }
        A.play("tada"); caption("", ROUNDS[1].outro + tip);
      });
    } else {
      steps.push(() => caption("", "Here are the one hundred bags of fabric scraps and textile waste from the factories. Now let's see how many bags of old clothes customers bring back."));
      for (let i = 0; i < R3_ANSWER; i++) steps.push(() => { A.play("drop", i); $("#bag-" + i).className = "bag back"; $("#bagBig").textContent = i + 1; $("#bagOf").textContent = "out of 100 bags come back from customers."; caption("", `${i + 1} bag${i ? "s" : ""}…`); });
      steps.push(() => {
        $("#bagBig").textContent = "≈ 4"; A.play("tada");
        drawStrip(comp.map((c) => Number(ansOf(c).guess)));
        const best = comp.slice().sort((a, b) => Math.abs(ansOf(a).guess - R3_ANSWER) - Math.abs(ansOf(b).guess - R3_ANSWER))[0];
        const cl = $("#closest");
        if (best) { cl.classList.remove("hidden"); cl.innerHTML = `Closest guess: <strong>${esc(best.name)}</strong> with ${ansOf(best).guess} bags${ansOf(best).bet > 1 ? ` and a ×${ansOf(best).bet} bet` : ""}.`; }
        caption("", ROUNDS[2].outro);
        const src = $("#leftSrc"); if (src) src.classList.remove("hidden");
      });
    }
    stepReveal(false);
  }
  function stepReveal(manual) {
    clearTimeout(S.revealTimer);
    if (S.revealStep >= S.revealSteps.length) return;
    S.revealSteps[S.revealStep++]();
    const done = S.revealStep >= S.revealSteps.length;
    S.revealDone = done;
    const pb = $("#primary"); if (pb) pb.textContent = done ? "Show the leaderboard" : "Next step";
    if (!done) {
      const quick = S.r === 2 && S.revealStep >= 1 && S.revealStep <= R3_ANSWER;
      S.revealTimer = setTimeout(() => stepReveal(false), quick ? 900 : 4200);
    }
  }
  function drawThread(pts) {
    const svg = $("#thread"); if (!svg) return; const { w, h } = boxSize();
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    if (pts.length < 2) { svg.innerHTML = ""; return; }
    const P = pts.map((p) => [p.x / 100 * w, p.y / 100 * h]);
    let d = `M${P[0][0]} ${P[0][1]}`;
    for (let i = 1; i < P.length; i++) { const [x0, y0] = P[i - 1], [x1, y1] = P[i]; const mx = (x0 + x1) / 2; d += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`; }
    svg.innerHTML = `<path d="${d}"/>`;
  }
  function drawStrip(guesses) {
    const side = $(".bag-side"); if (!side || !guesses.length) return;
    const lab = document.createElement("div"); lab.className = "strip-label"; lab.textContent = "Every dot is one guess. The red line is the answer.";
    side.appendChild(lab); const s = document.createElement("div"); s.className = "strip";
    s.innerHTML = `<div class="axis"></div>${guesses.map((g) => `<span class="dot" style="left:${g}%"></span>`).join("")}<span class="ans" style="left:${R3_ANSWER}%" title="Answer"></span><div class="ticks"><span>0</span><span>50</span><span>100</span></div>`;
    side.appendChild(s);
  }

  /* ----- leaderboard & podium ----- */
  function boardHTML() {
    const rk = ranked(); const show = S.mode === "phones" ? rk.slice(0, 5) : rk; const max = Math.max(1, ...rk.map((c) => c.score));
    if (!rk.length) return `<div class="board"><p class="h-text">No players yet.</p></div>`;
    return `<div class="board">${show.map((c, i) => `<div class="brow" style="animation-delay:${i * 90}ms"><div class="brank">${i + 1}</div>
      <div class="bbar"><div class="bfill" style="width:0" data-w="${Math.max(6, c.score / max * 100)}%"></div><div class="bname">${esc(c.name)}</div></div>
      <div class="bscore">${c.score}<span class="bdelta ${c.last < 0 ? "neg" : ""}">${c.last >= 0 ? "+" : ""}${c.last} this round</span></div></div>`).join("")}
      ${rk.length > show.length ? `<div class="more">and ${rk.length - show.length} more players. Check your phone to see your own rank.</div>` : ""}</div>`;
  }
  function podiumHTML() {
    const rk = ranked(); const order = [rk[1], rk[0], rk[2]]; const hs = [62, 82, 46];
    return `<div class="podium">${order.map((c, i) => c ? `<div class="pod ${i === 1 ? "p1" : ""}"><div class="pname">${esc(c.name)}</div><div class="pscore">${c.score} points</div><div class="block" style="height:${hs[i]}%;animation-delay:${[300, 700, 0][i]}ms">${[2, 1, 3][i]}</div></div>` : `<div class="pod"></div>`).join("")}</div>`;
  }
  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = document.createElement("div"); c.className = "confetti";
    const cols = ["#E93424", "#1E1E1E", "#F4F3F0", "#B8231A"];
    c.innerHTML = Array.from({ length: 110 }, () => `<i style="left:${Math.random() * 100}%;background:${cols[Math.floor(Math.random() * 4)]};animation-duration:${2.4 + Math.random() * 2.6}s;animation-delay:${Math.random() * 1.2}s"></i>`).join("");
    document.body.appendChild(c); setTimeout(() => c.remove(), 6500);
  }

  /* ---------------- boot ---------------- */
  $("#modeBtn").onclick = switchMode;
  A.init({ music: true, storeKey: "tw_sound_host", defaultOn: true });
  A.onChange((st) => {
    $("#sndBtn").textContent = st.on ? "Sound on" : "Sound off";
    $("#sndBtn").setAttribute("aria-pressed", String(st.on));
    $("#sndVol").value = Math.round(st.vol * 100);
    $("#sndHint").classList.toggle("hidden", !st.on || !A.isBlocked());
  });
  $("#sndBtn").onclick = () => A.setOn(!A.state().on);
  $("#sndVol").oninput = (e) => A.setVol(e.target.value / 100);
  A.setScene("lobby");
  document.addEventListener("keydown", (e) => {
    if (S.editing || /INPUT|TEXTAREA/.test(document.activeElement.tagName)) return;
    if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); next(); }
    if (e.key === "m" || e.key === "M") A.setOn(!A.state().on);
  });
  let rz; addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (S.phase === "intro" || S.phase === "answer") render(); }, 250); });
  if (S.mode === "phones") startPeer();
  render();
  window.__TW = S; // for debugging and rehearsal
})();
