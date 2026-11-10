/* Thread Wars — phone (player) page. */
(function () {
  const { ROUNDS, PREFIX } = window.TW;
  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const body = $("#body");
  const A = window.TWA;
  A.init({ music: false, storeKey: "tw_sound_phone", defaultOn: false });
  A.onChange((st) => { const b = $("#snd"); b.textContent = st.on ? "Sound on" : "Sound off"; b.setAttribute("aria-pressed", String(st.on)); });
  $("#snd").onclick = () => { const on = !A.state().on; A.setOn(on); if (on) A.play("locked"); };
  const params = new URLSearchParams(location.search);
  let room = (params.get("room") || localStorage.tw_room || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
  let name = localStorage.tw_name || "";
  if (!localStorage.tw_key) localStorage.tw_key = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const key = localStorage.tw_key;
  let peer = null, conn = null, joined = false, last = null, barTimer = null, retry = null, wantJoin = false;

  function setMe() { $("#me").innerHTML = joined ? `<b>${esc(name)}</b>Room ${room}` : ""; }

  function showJoin(err) {
    joined = false; wantJoin = false; setMe();
    if (err) { A.play("error"); A.vibrate([80, 60, 80]); }
    body.innerHTML = `<h1 class="p-title">Join the game</h1>
      <p class="p-text">Type the four-letter room code from the big screen and a nickname your classmates will recognize.</p>
      <div class="field"><label for="room">Room code</label><input id="room" maxlength="4" autocomplete="off" autocapitalize="characters" value="${esc(room)}" placeholder="ABCD"/></div>
      <div class="field"><label for="nick">Your nickname</label><input id="nick" maxlength="16" autocomplete="nickname" value="${esc(name)}" placeholder="For example, Rina"/></div>
      <div class="p-err" role="alert">${err ? esc(err) : ""}</div>
      <button class="btn" id="go">Join the game</button>`;
    const go = () => {
      room = $("#room").value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4);
      name = $("#nick").value.trim().replace(/\s+/g, " ").slice(0, 16);
      if (room.length !== 4) return showJoin("The room code has four letters. You can find it under the QR code on the big screen.");
      if (!name) return showJoin("Please type a nickname so you show up on the leaderboard.");
      localStorage.tw_room = room; localStorage.tw_name = name;
      connect();
    };
    $("#go").onclick = go;
    $("#nick").onkeydown = (e) => { if (e.key === "Enter") go(); };
    if (!room) $("#room").focus(); else if (!name) $("#nick").focus();
  }

  function waiting(title, text) {
    body.innerHTML = `<div class="p-center"><div class="spinner" aria-hidden="true"></div><h1 class="p-title">${title}</h1><p class="p-note">${text}</p></div>`;
  }

  let slowTimer = null;
  function slowHint() {
    // If nothing happens for 12 seconds, the network is probably blocking the link. Say what to do.
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => {
      if (joined || !wantJoin) return;
      waiting("Still connecting…", "This network may be blocking the game. Turn off Wi-Fi and use mobile data, then reload this page. If it still will not connect, the host can switch to hands mode. (Stuck at step " + (peer && peer.open ? "2" : "1") + ", " + window.TW.BUILD + ")");
    }, 12000);
  }
  async function connect() {
    wantJoin = true;
    waiting("Connecting", "Step 1 of 2: reaching the game server for room " + room + ". (" + window.TW.BUILD + ")");
    slowHint();
    if (typeof Peer === "undefined") return showJoin("Your phone could not load the game. Check your internet connection and reload this page.");
    const config = await window.TW.ice();
    if (!peer || peer.destroyed) {
      peer = new Peer({ debug: 1, config });
      peer.on("open", () => { if (!joined) waiting("Connecting", "Step 2 of 2: found the game server, now linking to the host screen. (" + window.TW.BUILD + ")"); openConn(); });
      peer.on("error", (e) => {
        if (e.type === "peer-unavailable") showJoin(`We could not find room ${room}. Check the code on the big screen and try again.`);
        else if (wantJoin) { waiting("Reconnecting", "The connection dropped. Trying again…"); scheduleRetry(); }
      });
      peer.on("disconnected", () => { try { peer.reconnect(); } catch (e) {} });
    } else if (peer.open) openConn();
  }
  function scheduleRetry() { clearTimeout(retry); retry = setTimeout(() => { if (wantJoin) { if (peer && peer.open) openConn(); else { try { peer.destroy(); } catch (e) {} peer = null; connect(); } } }, 2500); }
  function openConn() {
    if (conn) { try { conn.close(); } catch (e) {} }
    conn = peer.connect(PREFIX + room.toLowerCase(), { reliable: true });
    const c = conn;
    c.on("open", () => c.send({ t: "hello", key, name }));
    c.on("data", onMsg);
    c.on("close", () => { if (c === conn && wantJoin) { waiting("Reconnecting", "The connection dropped. Hold on, we are getting you back in."); scheduleRetry(); } });
    c.on("error", () => scheduleRetry());
  }

  function onMsg(m) {
    if (!m || typeof m !== "object") return;
    if (m.t === "error") { wantJoin = false; try { conn.close(); } catch (e) {} return showJoin(m.msg); }
    if (m.t === "welcome") { clearTimeout(slowTimer); }
    if (m.t === "welcome") { if (!joined) { A.play("pop"); A.vibrate(40); } joined = true; name = m.name; setMe(); return; }
    if (m.t === "locked") return locked();
    if (m.t === "phase") { last = m; return show(m); }
  }

  let lastKey = "";
  function cue(m) {
    // Sound and vibration only when the phase really changes, not on reconnects.
    const k = m.phase + m.r; if (k === lastKey) return; const first = !lastKey; lastKey = k; if (first) return;
    if (m.phase === "intro") { A.play("whoosh"); A.vibrate(50); }
    else if (m.phase === "answer" && !m.answered) { A.play("open"); A.vibrate([70, 50, 70]); }
    else if (m.phase === "reveal" && m.total != null) { if (m.pts > 0) A.play("tada"); else A.play("meh"); A.vibrate(m.pts > 0 ? [40, 40, 120] : 60); }
    else if (m.phase === "final") { if (m.rank <= 3) A.play("fanfare"); else A.play("tada"); A.vibrate(m.rank <= 3 ? [80, 60, 80, 60, 200] : 80); }
  }
  function show(m) {
    clearInterval(barTimer); cue(m);
    const R = ROUNDS[m.r];
    if (m.phase === "lobby") return waiting("You're in!", `Hi ${esc(name)}. Keep your eyes on the big screen. The game starts as soon as everyone has joined.`);
    if (m.phase === "intro") return waiting(`Round ${m.r + 1}: ${R.title}`, "Listen to the host for a moment. Your answer buttons will appear here when the round opens.");
    if (m.phase === "answer") {
      if (m.answered) return locked();
      body.innerHTML = `<div class="p-bar" aria-hidden="true"><i id="bar" style="width:100%"></i></div>
        <h1 class="p-title">${R.title}</h1><p class="p-q">${R.phone}</p><div id="ans"></div>`;
      const end = Date.now() + (m.remain || 0), dur = m.dur || 1;
      let lastSec = null;
      barTimer = setInterval(() => {
        const left = Math.max(0, end - Date.now()); const b = $("#bar"); if (b) b.style.width = (left / dur * 100) + "%";
        const sec = Math.ceil(left / 1000); if (sec !== lastSec) { lastSec = sec; if (sec > 0 && sec <= 5) { A.play("tick", sec); if (sec <= 3) A.vibrate(25); } }
        if (!left) clearInterval(barTimer);
      }, 200);
      window.TWUI.renderAnswer($("#ans"), m.r, (a) => {
        if (!conn || !conn.open) return;
        conn.send({ t: "answer", r: m.r, a });
        waiting("Sending…", "");
      });
      return;
    }
    if (m.phase === "reveal" || m.phase === "board") {
      if (m.total == null) return waiting("Look at the big screen", "You did not answer this round, but you can still play the next one.");
      const sign = m.pts > 0 ? "+" : "";
      body.innerHTML = `<div class="p-center"><div class="p-note">Round ${m.r + 1} result</div><div class="p-big">${sign}${m.pts}</div>
        <p class="p-text">${esc(m.detail)}</p><div class="p-rank">You're #${m.rank} of ${m.of}</div><p class="p-note">You have ${m.total} points in total. Watch the big screen to see why.</p></div>`;
      return;
    }
    if (m.phase === "final") {
      body.innerHTML = `<div class="p-center"><div class="p-note">Final result</div><div class="p-big">#${m.rank}</div><div class="p-rank">out of ${m.of} players</div>
        <p class="p-text">You finished with ${m.total} points. ${m.rank === 1 ? "You won the whole game. Congratulations!" : m.rank <= 3 ? "You made the podium. Nicely done!" : "Thanks for playing, and enjoy the presentation."}</p></div>`;
    }
  }
  function locked() { clearInterval(barTimer); A.play("locked"); A.vibrate(40); waiting("Answer locked in", "Nice. Now watch the big screen while everyone else finishes. Faster correct answers earn bonus points."); $(".spinner").remove(); }

  document.addEventListener("visibilitychange", () => { if (!document.hidden && wantJoin && (!conn || !conn.open)) scheduleRetry(); });
  if (room && name && params.get("room") && localStorage.tw_room === room) connect(); else showJoin();
})();
