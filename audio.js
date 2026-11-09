/* Thread Wars — sound.
   Music: three licensed Artlist files in audio/ (lobby, countdown, win), played on the host screen only.
   Sound effects: synthesized live with the Web Audio API, so there are no extra files to license or load.
   The palette is "clean retail": soft marimba notes, a sewing-needle stitch, cloth thumps and a bright bell.
   Everything is silent until the first click or key press, because browsers block sound before that. */
window.TWA = (function () {
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, noiseBuf = null, unlocked = false;
  let cfg = { music: false, storeKey: "tw_sound", defaultOn: true };
  const pref = { on: true, vol: 0.8 };
  const listeners = [];

  /* ---------- settings ---------- */
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(cfg.storeKey) || "null");
      pref.on = s ? !!s.on : cfg.defaultOn;
      pref.vol = s && typeof s.vol === "number" ? s.vol : 0.8;
    } catch (e) { pref.on = cfg.defaultOn; }
  }
  function save() { try { localStorage.setItem(cfg.storeKey, JSON.stringify(pref)); } catch (e) {} }
  function emit() { listeners.forEach((f) => f(state())); }
  const state = () => ({ on: pref.on, vol: pref.vol, unlocked });

  /* ---------- Web Audio core ---------- */
  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = pref.on ? pref.vol : 0;
      master.connect(comp); comp.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  const ok = () => pref.on && unlocked && ensure();
  const now = () => ctx.currentTime;

  // A single oscillator voice with an attack/decay envelope and optional pitch glide.
  function tone(f, t, dur, o = {}) {
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || "sine"; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.glide || dur));
    const a = o.attack || 0.004, peak = o.gain == null ? 0.3 : o.gain;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = osc;
    if (o.lp) { const flt = ctx.createBiquadFilter(); flt.type = "lowpass"; flt.frequency.value = o.lp; osc.connect(flt); node = flt; }
    node.connect(g); g.connect(o.dest || master);
    osc.start(t); osc.stop(t + dur + 0.05);
  }
  // Filtered noise burst (needle clicks, cloth, whooshes, cymbal).
  function noise(t, dur, o = {}) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const flt = ctx.createBiquadFilter(); flt.type = o.type || "bandpass"; flt.Q.value = o.q || 1;
    flt.frequency.setValueAtTime(o.f || 1000, t);
    if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t + dur * (o.sweep || 1));
    const g = ctx.createGain(), peak = o.gain == null ? 0.2 : o.gain, a = o.attack || 0.003;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt); flt.connect(g); g.connect(master);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  // Marimba-like note: warm fundamental plus a quickly fading 4th partial.
  function mallet(f, t, gain = 0.22, dur = 0.5) {
    tone(f, t, dur, { gain });
    tone(f * 4, t, 0.07, { gain: gain * 0.35 });
    tone(f * 2, t, dur * 0.4, { gain: gain * 0.18, type: "triangle" });
  }
  // Bright bell: inharmonic partials with a long tail.
  function bell(f, t, gain = 0.2, dur = 1.4) {
    [[1, 1], [2.0, 0.45], [2.76, 0.3], [5.4, 0.12], [8.9, 0.05]].forEach(([m, a]) => tone(f * m, t, dur / Math.sqrt(m), { gain: gain * a }));
  }
  // C major pentatonic, so any run of notes sounds musical and fits upbeat funk keys.
  const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0];
  const note = (i) => PENTA[((i % 5) + 5) % 5] * Math.pow(2, Math.floor(i / 5));

  /* ---------- the sound effects ---------- */
  const fx = {
    // any button press: a short, soft tick
    click() { const t = now(); tone(1750, t, 0.035, { gain: 0.09 }); noise(t, 0.02, { type: "highpass", f: 5000, gain: 0.04 }); },
    // choosing a tile, a bet or the ± buttons on the answer screen
    tap(i = 0) { mallet(note(10 + (i % 7)), now(), 0.14, 0.25); },
    // a player joins the lobby: a bubbly pop at a slightly different pitch each time
    pop() {
      const t = now(), k = Math.floor(Math.random() * 5);
      tone(420 + k * 40, t, 0.12, { to: 980 + k * 60, glide: 0.07, gain: 0.22 });
      mallet(note(10 + k), t + 0.05, 0.12, 0.3);
    },
    // a new round starts: an air whoosh that lands on a low thump and two notes
    whoosh() {
      const t = now();
      noise(t, 0.62, { f: 350, to: 3200, sweep: 0.8, q: 1.4, gain: 0.22, attack: 0.25 });
      tone(90, t + 0.5, 0.35, { to: 55, gain: 0.35 });
      mallet(note(7), t + 0.55, 0.16, 0.5); mallet(note(10), t + 0.68, 0.18, 0.7);
    },
    // answers open: a quick rising arpeggio, the "go" signal
    open() { const t = now(); [5, 7, 9, 10, 12].forEach((n, i) => mallet(note(n), t + i * 0.065, 0.17, 0.5)); bell(note(15), t + 0.33, 0.07, 1.2); },
    // the last five seconds: a wood-block tick, higher for the final three
    tick(sec) { const t = now(), f = sec <= 3 ? 1500 : 1150; tone(f, t, 0.06, { gain: 0.22 }); noise(t, 0.03, { f: f * 2, q: 6, gain: 0.12 }); },
    // time is up / answers close: two bell strikes
    timeUp() { const t = now(); bell(988, t, 0.22, 1.4); bell(988, t + 0.2, 0.18, 1.6); tone(110, t, 0.5, { gain: 0.12, type: "triangle", lp: 600 }); },
    // someone locks in an answer (kept very quiet so a full class is not noisy)
    lock() { const t = now(); tone(660, t, 0.08, { gain: 0.08 }); tone(990, t + 0.05, 0.12, { gain: 0.07 }); },
    // the phone's own "answer locked" confirmation
    locked() { const t = now(); mallet(note(7), t, 0.2, 0.3); mallet(note(12), t + 0.08, 0.22, 0.6); },
    // Round 1 reveal: a sewing-needle stitch, then a note that climbs with each step
    stitch(i = 0) {
      const t = now();
      for (let k = 0; k < 5; k++) noise(t + k * 0.045, 0.025, { f: 3200, q: 4, gain: 0.13 });
      tone(180, t, 0.25, { gain: 0.06, type: "square", lp: 500 });
      mallet(note(5 + i), t + 0.24, 0.22, 0.7);
    },
    // Round 2 reveal: the flood hits the port, a low rumble with a wave
    flood() {
      const t = now();
      noise(t, 1.6, { type: "lowpass", f: 300, to: 1400, sweep: 0.5, gain: 0.32, attack: 0.3 });
      tone(65, t, 1.2, { to: 42, gain: 0.35 });
      tone(98, t + 0.05, 0.9, { gain: 0.12, type: "triangle", lp: 400 });
    },
    // Round 2 reveal: the problem spreads to another link, a warning pulse that rises each time
    alarm(i = 0) {
      const t = now(), f = 196 * Math.pow(2, i / 12 * 2);
      tone(f, t, 0.3, { type: "sawtooth", lp: 900, gain: 0.12 });
      tone(f * 1.5, t + 0.12, 0.32, { type: "sawtooth", lp: 1100, gain: 0.1 });
      tone(f / 2, t, 0.35, { gain: 0.25 });
    },
    // Round 2 reveal: a trap card, a playful "nope, this one is safe"
    trap() { const t = now(); tone(620, t, 0.18, { type: "triangle", to: 470, gain: 0.2 }); tone(470, t + 0.17, 0.3, { type: "triangle", to: 300, gain: 0.18 }); },
    // Round 3 reveal: a bag of clothes drops onto the pile, a little higher each time
    drop(i = 0) {
      const t = now();
      noise(t, 0.14, { type: "lowpass", f: 700, gain: 0.4 });
      tone(160 + i * 18, t, 0.16, { to: 80, gain: 0.35 });
      mallet(note(7 + i * 2), t + 0.04, 0.12, 0.4);
    },
    // end of a reveal: the answer lands
    tada() {
      const t = now();
      [5, 7, 8, 10].forEach((n, i) => mallet(note(n), t + i * 0.08, 0.2, 0.9));
      [note(5), note(7), note(8)].forEach((f) => tone(f, t + 0.32, 1.1, { type: "triangle", gain: 0.06, attack: 0.03 }));
      bell(note(15), t + 0.34, 0.09, 1.4);
    },
    // the leaderboard appears: a sparkle, then a soft note as each row slides in
    board(rows = 5) {
      const t = now();
      for (let k = 0; k < 8; k++) tone(note(14 + Math.floor(Math.random() * 6)), t + k * 0.04, 0.25, { gain: 0.05 });
      for (let k = 0; k < Math.min(rows, 8); k++) mallet(note(5 + k), t + 0.15 + k * 0.09, 0.13, 0.35);
    },
    // before the podium: a short snare roll that swells into a cymbal
    drumroll(sec = 1) {
      const t = now(), n = Math.floor(sec / 0.032);
      for (let k = 0; k < n; k++) noise(t + k * 0.032, 0.05, { f: 1800, q: 0.7, gain: 0.04 + 0.18 * (k / n) });
      noise(t + sec, 1.6, { type: "highpass", f: 6000, gain: 0.18 });
      tone(80, t + sec, 0.4, { to: 45, gain: 0.4 });
    },
    // synthesized fanfare: used on phones, and on the host if win.mp3 is missing
    fanfare() {
      const t = now();
      [[5, 0], [7, 0.12], [8, 0.24], [10, 0.36], [8, 0.6], [10, 0.72]].forEach(([n, d]) => { tone(note(n), t + d, 0.5, { type: "sawtooth", lp: 2400, gain: 0.08 }); mallet(note(n), t + d, 0.14, 0.5); });
      [note(5), note(7), note(8), note(10)].forEach((f) => tone(f, t + 0.84, 1.6, { type: "sawtooth", lp: 1800, gain: 0.05, attack: 0.05 }));
      bell(note(15), t + 0.84, 0.12, 1.8);
    },
    // phone: a soft "no points this time"
    meh() { const t = now(); mallet(note(7), t, 0.16, 0.3); mallet(note(5), t + 0.12, 0.14, 0.5); },
    // phone: something went wrong (wrong room code, name taken)
    error() { const t = now(); tone(220, t, 0.14, { type: "square", lp: 800, gain: 0.1 }); tone(180, t + 0.16, 0.2, { type: "square", lp: 800, gain: 0.1 }); },
  };
  function play(name, ...args) { if (!ok() || !fx[name]) return; try { fx[name](...args); } catch (e) {} }

  /* ---------- music (host only) ---------- */
  const tracks = {};
  const MUSIC_LEVEL = { lobby: 0.55, countdown: 0.6, win: 0.9 };
  let scene = "lobby", duckUntil = 0, delayTimer = null, fadeId = null, blocked = false;
  const target = { lobby: 0, countdown: 0, win: 0 };

  function setupMusic() {
    ["lobby", "countdown", "win"].forEach((k) => {
      const a = new Audio("audio/" + k + ".mp3");
      a.preload = "auto"; a.loop = k === "lobby"; a.volume = 0;
      a.addEventListener("error", () => { a.broken = true; });
      tracks[k] = a;
    });
    tracks.countdown.addEventListener("ended", () => { target.countdown = 0; if (scene === "answer") target.lobby = 0.35; });
    tracks.win.addEventListener("ended", () => { target.win = 0; if (scene === "final") target.lobby = 0.5; });
    fadeId = setInterval(fadeStep, 50);
  }
  function fadeStep() {
    const duck = Date.now() < duckUntil ? 0.45 : 1;
    for (const k in tracks) {
      const a = tracks[k]; if (a.broken) continue;
      const want = pref.on ? target[k] * MUSIC_LEVEL[k] * pref.vol * (k === "win" ? 1 : duck) : 0;
      const speed = k === "win" ? 0.2 : 0.035;
      const v = a.volume + Math.max(-speed, Math.min(speed, want - a.volume));
      a.volume = Math.max(0, Math.min(1, v));
      if (want > 0 && a.paused && unlocked) {
        const p = a.play(); if (p && p.catch) p.catch(() => { blocked = true; emit(); });
      }
      if (want === 0 && a.volume <= 0.001 && !a.paused) a.pause();
    }
  }
  // Called by the host every time the game phase changes.
  function setScene(ph, info = {}) {
    if (!cfg.music) return;
    scene = ph; clearTimeout(delayTimer);
    const c = tracks.countdown;
    if (ph !== "answer") { target.countdown = 0; }
    if (ph !== "final") target.win = 0;
    if (ph === "lobby") target.lobby = 1;
    else if (ph === "intro") target.lobby = 0.4;         // the host is reading the intro aloud
    else if (ph === "answer") {
      // Line the countdown up so its ending lands exactly when time runs out.
      const len = isFinite(c.duration) && c.duration ? c.duration : 40.15;
      const sec = (info.dur || 40000) / 1000;
      const start = () => { try { c.currentTime = Math.max(0, len - sec); } catch (e) {} target.lobby = 0; target.countdown = 1; };
      if (sec > len) { target.lobby = 0.45; delayTimer = setTimeout(start, (sec - len) * 1000); }
      else start();
    }
    else if (ph === "reveal") target.lobby = 0.22;       // quiet bed under the explanations
    else if (ph === "board") target.lobby = 0.85;
    else if (ph === "final") {
      target.lobby = 0;
      setTimeout(() => {
        if (scene !== "final") return;
        if (tracks.win.broken || !pref.on) return play("fanfare");
        try { tracks.win.currentTime = 0; } catch (e) {}
        tracks.win.volume = 0; target.win = 1;
      }, 1000);
    }
  }
  // Briefly lower the music so a sound effect or a key moment can be heard.
  function duck(ms = 1200) { duckUntil = Math.max(duckUntil, Date.now() + ms); }

  /* ---------- unlocking and controls ---------- */
  function unlock() {
    if (unlocked) return;
    unlocked = true; blocked = false; ensure(); emit();
  }
  function init(o) {
    cfg = Object.assign(cfg, o || {}); load();
    if (cfg.music) setupMusic();
    const u = () => { unlock(); };
    ["pointerdown", "keydown", "touchend"].forEach((ev) => addEventListener(ev, u, { capture: true }));
    // Every button gets a click; answer tiles get a musical tap instead.
    document.addEventListener("click", (e) => {
      const el = e.target.closest && e.target.closest("button, .trow"); if (!el || el.disabled) return;
      if (el.matches(".tile, .bet, .step")) { const i = [...el.parentNode.children].indexOf(el); play("tap", i); }
      else if (!el.dataset.nosound) play("click");
    }, true);
    emit();
  }
  function setOn(on) { pref.on = on; save(); if (master) master.gain.value = on ? pref.vol : 0; emit(); if (on) unlock(); }
  function setVol(v) { pref.vol = Math.max(0, Math.min(1, v)); save(); if (master && pref.on) master.gain.value = pref.vol; emit(); }
  function onChange(f) { listeners.push(f); f(state()); }
  function vibrate(p) { if (navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} } }

  return { _tracks: tracks, init, play, setScene, duck, setOn, setVol, onChange, vibrate, state, isBlocked: () => blocked || !unlocked };
})();
