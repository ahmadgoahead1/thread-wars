/* Thread Wars — shared content, icons and scoring (used by host and phone pages). */
(function () {
  const ICON = {
    farm: '<path d="M24 42V24"/><path d="M24 30c-6 0-10-4-10-10 6 0 10 4 10 10zM24 26c6 0 10-4 10-10-6 0-10 4-10 10z"/><circle cx="17" cy="12" r="4"/><circle cx="24" cy="9" r="4"/><circle cx="31" cy="12" r="4"/><path d="M10 42h28"/>',
    yarn: '<path d="M14 8h20M14 40h20"/><path d="M17 8v32M31 8v32"/><path d="M17 14l14 4M17 20l14 4M17 26l14 4M17 32l14 4"/>',
    fabric: '<ellipse cx="14" cy="24" rx="6" ry="14"/><path d="M14 10h22v28H14"/><path d="M36 38l4 4"/><ellipse cx="14" cy="24" rx="2" ry="5"/>',
    factory: '<path d="M6 40V22l10 6v-6l10 6v-6l10 6V10h6v30z"/><path d="M12 34h4M20 34h4M28 34h4"/>',
    ship: '<path d="M6 32h36l-5 8H11z"/><path d="M12 32V22h24v10"/><path d="M16 22v-6h8v6M26 22v-8h6v8"/><path d="M4 44c4 0 4-2 8-2s4 2 8 2 4-2 8-2 4 2 8 2 4-2 8-2"/>',
    store: '<path d="M8 20h32v20H8z"/><path d="M5 20l5-10h28l5 10z"/><path d="M5 20c0 3 3 5 6 5s6-2 6-5c0 3 3 5 6 5s6-2 6-5c0 3 3 5 6 5s6-2 6-5"/><path d="M20 40V30h8v10"/>',
    warehouse: '<path d="M6 18L24 8l18 10v22H6z"/><path d="M14 40V26h20v14"/><path d="M14 33h20"/>',
    workers: '<circle cx="17" cy="15" r="5"/><circle cx="31" cy="15" r="5"/><path d="M8 38c0-6 4-11 9-11s9 5 9 11"/><path d="M24 30c1-2 4-3 7-3 5 0 9 5 9 11"/>',
    online: '<rect x="14" y="5" width="20" height="38" rx="3"/><path d="M21 37h6"/><path d="M19 16h10l-1 9h-8z"/><path d="M21 16a3 3 0 0 1 6 0"/>',
    you: '<circle cx="24" cy="13" r="6"/><path d="M14 22l-6 6 4 4 4-3v14h16V29l4 3 4-4-6-6c-3-2-6-3-10-3s-7 1-10 3z"/>',
    music: '<path d="M18 36V12l18-4v24"/><circle cx="14" cy="36" r="4"/><circle cx="32" cy="32" r="4"/>',
    port: '<path d="M10 42V14"/><path d="M10 14h22l-6 6"/><path d="M26 20v8"/><rect x="21" y="28" width="10" height="7"/><path d="M4 42h40"/>',
    box: '<path d="M8 16h32v24H8z"/><path d="M6 10h36v6H6z"/><path d="M20 26a5 5 0 0 1 9-2M29 31a5 5 0 0 1-9 2"/><path d="M29 20v4h-4M20 37v-4h4"/>',
    bag: '<path d="M12 16h24l3 26H9z"/><path d="M18 16v-3a6 6 0 0 1 12 0v3"/>',
    water: '<path d="M4 20c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3 4-3 8-3"/><path d="M4 30c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3 4-3 8-3"/><path d="M4 40c4 0 4-3 8-3s4 3 8 3 4-3 8-3 4 3 8 3 4-3 8-3"/>',
  };
  const icon = (k, cls) => `<svg class="ico ${cls || ""}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k] || ""}</svg>`;

  const R1_STEPS = [
    { id: "farm", name: "Cotton farm", text: "It all starts in a field. Farmers grow and pick cotton, the soft, fluffy fiber that grows around the seeds of the cotton plant." },
    { id: "yarn", name: "Yarn mill", text: "Next, a spinning mill cleans that cotton and twists the short fibers into long, strong threads called yarn." },
    { id: "fabric", name: "Fabric mill", text: "A fabric mill then knits or weaves the yarn into big rolls of cloth, and usually dyes it into the colors you see in stores." },
    { id: "factory", name: "Sewing factory", text: "At the sewing factory, workers cut the cloth into pieces and stitch those pieces together into a finished T-shirt." },
    { id: "ship", name: "Shipping and warehouse", text: "The finished shirts are packed into containers, shipped, often across an ocean, and stored in a warehouse in the country where they will be sold." },
    { id: "store", name: "Store", text: "Finally, the shirts arrive at the store, where you pick one up, try it on, and take it home." },
  ];
  // Fixed scrambled order shown to everyone (letters A–F).
  const R1_SCRAMBLE = ["ship", "fabric", "farm", "store", "factory", "yarn"];

  const R2_OPTIONS = [
    { id: "fabric", name: "Fabric deliveries", hit: true, why: "Fabric bought from other countries also travels by ship, so it gets stuck at the port, and the sewing factory waits for material it needs." },
    { id: "factory", name: "Sewing factory", hit: true, why: "Finished shirts cannot leave, so boxes pile up, and the factory has to slow down or even pause production." },
    { id: "workers", name: "Factory workers", hit: true, why: "When production slows down, workers may get fewer shifts or less overtime, which means less money at the end of the month." },
    { id: "warehouse", name: "Warehouse", hit: true, why: "No new shipments arrive, so the warehouse slowly runs out of shirts to send to the stores." },
    { id: "store", name: "Store shelves", hit: true, why: "Popular sizes and colors sell out, and the store has nothing new to put back on the shelves." },
    { id: "online", name: "Online orders", hit: true, why: "Online orders are packed from the same warehouse, so delivery dates slip or items show up as sold out." },
    { id: "you", name: "Customers", hit: true, why: "In the end, you feel it too. Your size is gone, you wait longer, or you walk out and buy from another brand." },
    { id: "farm", name: "Cotton farms", hit: false, why: "The farms sit at the very start of the chain, usually in another country. They might feel it months later, but not within two weeks." },
    { id: "music", name: "The store's music", hit: false, why: "This one was a trap. The background music keeps playing, no matter what happens at the port." },
  ];

  const R3_ANSWER = 4;
  const BETS = [
    { m: 1, name: "Play it safe", sub: "×1, you can't lose points" },
    { m: 2, name: "Be bold", sub: "×2, win or lose double" },
    { m: 3, name: "All in", sub: "×3, high risk, high reward" },
  ];

  const ROUNDS = [
    {
      kind: "order", title: "Put the journey in order", time: 45,
      intro: "Every T-shirt you have ever owned started its life far away from the store where you bought it. Before it reached the shelf, it passed through several places, and each place had to finish its job before the next one could begin. On your phone, you will see six stops in a T-shirt's journey, all mixed up. Tap them in the order you think the shirt travels, from the very first step to the very last. You have forty-five seconds, and the faster you lock in a correct answer, the more bonus points you earn.",
      phone: "Tap the six stops in the order a T-shirt travels, from first to last.",
      outro: "That is six different places, often in different countries, and every one of them has to do its job for a single shirt to reach you. Remember this chain, because in the next round, we are going to break it.",
    },
    {
      kind: "pick", title: "Chain reaction", time: 40,
      intro: "Now that you know the chain, let's see what happens when one link breaks. Imagine a huge flood hits the main port where the shirts are loaded and unloaded. For two whole weeks, nothing can get in and nothing can get out. On your phone, tap every part of the chain that you think will feel this problem within those two weeks. Be careful, though, because a couple of the choices are traps, and every wrong pick takes points away from you.",
      phone: "The port is closed for two weeks. Tap every part of the chain that will feel it.",
      outro: "One closed port, and seven different parts of the chain felt it within two weeks, from the factory floor all the way to your shopping cart. That is what people mean when they say a supply chain is connected: a problem in one place never stays in one place.",
    },
    {
      kind: "guess", title: "Closest guess wins", time: 40,
      intro: "For the final round, let's follow the shirt one step further, to the end of its life. Many stores, including UNIQLO, now have recycle boxes where you can drop off clothes you no longer wear. Here is the question. Imagine the partner factories that make UNIQLO's clothes throw away one hundred bags of fabric scraps and textile waste. How many bags' worth of old clothes do customers bring back to the recycle boxes? Slide to your best guess, and then decide how bold you want to be. A bigger bet multiplies your points if you are close, but it costs you points if you are far off. This is your last chance to climb the leaderboard.",
      phone: "Factories throw away 100 bags of textile waste. How many bags of old clothes do customers bring back?",
      outro: "The answer is about four bags. According to Fast Retailing, UNIQLO's parent company, customers returned roughly 2,850 tonnes of clothing in a recent year, while the partner factories that make UNIQLO and GU clothes produced about 65,332 tonnes of textile waste. So for every hundred bags of waste created before the shirts are even sold, only about four bags come back from customers. The recycle box is a real loop, but it is a small one, and the bigger opportunity sits much earlier in the chain, inside the factories.",
      source: "Source: Fast Retailing recycling and waste disclosures (clothes collected in FY2025; partner-factory textile waste in 2024). The two figures come from different years and estimation methods, so treat this as a rough comparison.",
    },
  ];

  const TEXT = {
    lobby: "Welcome to Thread Wars. Grab your phone, scan the code, and type a nickname your classmates will recognize. Over the next few minutes, you will follow one ordinary T-shirt on its trip around the world, and you will find out how much you really know about where your clothes come from. Answer correctly and answer quickly, because both of those earn you points.",
    lobbyHands: "Welcome to Thread Wars. Today you will play in teams. Each team talks it over, agrees on one answer, and tells it to the host, who enters it on this screen. Over the next few minutes, you will follow one ordinary T-shirt on its trip around the world, and you will find out which team really knows where its clothes come from.",
    final: "Thank you for playing. Today you followed one T-shirt from a cotton field to a store shelf, watched one flooded port shake the whole chain, and discovered how little comes back at the very end. Keep those three ideas in mind, because they are exactly what our presentation is about.",
  };

  /* ---------- scoring ---------- */
  function score(r, a, tFrac) {
    tFrac = Math.max(0, Math.min(1, tFrac || 0));
    if (!a) return { pts: 0, detail: "No answer was locked in this round." };
    if (r === 0) {
      const ord = Array.isArray(a.order) ? a.order : [];
      let c = 0;
      R1_STEPS.forEach((s, i) => { if (ord[i] === s.id) c++; });
      const base = c * 100;
      const bonus = c === 6 ? Math.round(200 * tFrac) : Math.round((c / 6) * 80 * tFrac);
      return { pts: base + bonus, correct: c, perfect: c === 6, detail: c === 6 ? "You put all six stops in the right place." : `You put ${c} of the 6 stops in the right place.` };
    }
    if (r === 1) {
      const picks = new Set(Array.isArray(a.picks) ? a.picks : []);
      let good = 0, bad = 0;
      R2_OPTIONS.forEach((o) => { if (picks.has(o.id)) { if (o.hit) good++; else bad++; } });
      const base = Math.max(0, good * 100 - bad * 150);
      const bonus = Math.round((base / 700) * 150 * tFrac);
      const total = R2_OPTIONS.filter((o) => o.hit).length;
      return { pts: base + bonus, good, bad, detail: `You found ${good} of the ${total} links that felt the flood` + (bad ? `, but ${bad} trap${bad > 1 ? "s" : ""} cost you points.` : ", and you avoided every trap.") };
    }
    const g = Math.max(0, Math.min(100, Number(a.guess) || 0));
    const m = [1, 2, 3].includes(Number(a.bet)) ? Number(a.bet) : 1;
    const diff = Math.abs(g - R3_ANSWER);
    let pts = (300 - 15 * diff) * m;
    if (m === 1) pts = Math.max(0, pts);
    pts = Math.max(-450, pts);
    return { pts, diff, guess: g, bet: m, detail: `You guessed ${g} and the answer was about ${R3_ANSWER}, so you were ${diff === 0 ? "spot on" : diff + " away"}${m > 1 ? ` with a ×${m} bet` : ""}.` };
  }

  /* ----- network relay (TURN) -----
     Campus Wi-Fi often blocks the direct phone-to-laptop link. When that happens, these relay servers pass the
     messages through instead, including over port 443, which almost every network allows.
     Credentials come from the free Metered Open Relay account (metered.ca dashboard → TURN Credentials).
     Delete them in the Metered dashboard after the presentation. */
  const TURN_USER = "7d200b23f4322d24e7260fcf";
  const TURN_PASS = "hOLQA/Y02B4gS5k4";
  const STUN = [{ urls: "stun:stun.relay.metered.ca:80" }, { urls: "stun:stun.l.google.com:19302" }];
  const TURN = TURN_USER ? [
    { urls: "turn:global.relay.metered.ca:80", username: TURN_USER, credential: TURN_PASS },
    { urls: "turn:global.relay.metered.ca:80?transport=tcp", username: TURN_USER, credential: TURN_PASS },
    { urls: "turn:global.relay.metered.ca:443", username: TURN_USER, credential: TURN_PASS },
    { urls: "turns:global.relay.metered.ca:443?transport=tcp", username: TURN_USER, credential: TURN_PASS },
  ] : [];
  // ?relay=only forces every message through the relay, to rehearse the worst-case campus network.
  const forceRelay = new URLSearchParams(location.search).get("relay") === "only";
  function ice() { return Promise.resolve({ iceServers: STUN.concat(TURN), iceTransportPolicy: forceRelay && TURN.length ? "relay" : "all" }); }

  window.TW = { icon, R1_STEPS, R1_SCRAMBLE, R2_OPTIONS, R3_ANSWER, BETS, ROUNDS, TEXT, score, PREFIX: "uq-threadwars-", ice, hasRelay: TURN.length > 0 };
})();
