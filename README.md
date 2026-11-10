# Thread Wars: presenter guide

A 3-round, about 6-minute icebreaker that shows how a T-shirt's supply chain is connected.
Students answer on their phones, and the projector scores them, ranks them and plays an animated explanation of each answer.

- `index.html` is the **host screen** (open it on the laptop connected to the projector).
- `play.html` is the **phone page** (students reach it by scanning the QR code; you never open it yourself).
- Phones talk to the laptop **peer-to-peer** through the free PeerJS service. There is no account, database or password.

## 1. Publish it on GitHub Pages (one time, about 10 minutes)

The QR code only works if the game is online, so it needs a free public web address.

1. Sign in at github.com (create a free account if needed).
2. Click **+ → New repository**. Name it `thread-wars`, choose **Public**, and click **Create repository**.
3. On the next page, click **uploading an existing file**.
4. Open the `thread-wars` folder on your Mac, select **everything inside it** (`index.html`, `play.html`, `host.js`, `play.js`, `ui.js`, `content.js`, `audio.js`, `check.html`, `style.css`, `README.md` and the `lib`, `fonts` and `audio` folders), and drag it into the browser. Then click **Commit changes**.
5. Go to **Settings → Pages**. Under **Branch**, pick `main` and `/ (root)`, then click **Save**.
6. Wait 1–2 minutes. Your game is now at `https://YOUR-USERNAME.github.io/thread-wars/`.

Open that address on the presentation laptop. The QR code and room code appear automatically.

## 2. On presentation day

1. Open the GitHub Pages address on the laptop, press **F11** (Windows) or **Ctrl+Cmd+F** (Mac) for full screen.
2. Ask everyone to scan the QR code and type a nickname. Names pop up on screen as people join.
3. Press **Space** (or click the red button) to move forward. Each round has the same rhythm:
   - **Intro**: read the paragraph on the left out loud, then press Space to open answers.
   - **Answering**: phones show the question. The round closes automatically when the timer ends or everyone has answered.
   - **Reveal**: the answer animates step by step with a short explanation. It advances by itself every few seconds; press Space to skip ahead.
   - **Leaderboard**: the top 5 appear on screen, and each phone shows that player's own rank.
4. After Round 3, the podium and confetti appear. The closing sentence hands over to the presentation.

Scoring is automatic: correct answers earn points, faster correct answers earn a speed bonus, wrong picks in Round 2 cost points, and the Round 3 bet multiplies the result.

## Sound and music

- **Turn it on:** browsers stay silent until someone clicks or presses a key on the page. So once the host screen is open, click anywhere on it once. The red "Click anywhere to turn on the music" note disappears when sound is running.
- **Controls:** the **Sound on/off** button and the volume slider are bottom right. Press **M** to mute or unmute quickly. The laptop remembers your setting.
- **Music** plays on the projector only:
  - In the lobby, the upbeat track plays. It drops low while you read each round's intro.
  - When answers open, the music switches to the countdown track, which is timed to finish exactly when the timer hits zero.
  - During the reveal, the music stays quiet under the explanations, then comes back up for the leaderboard.
  - At the podium, there's a drumroll and then the win fanfare.
- **Sound effects** are built into the game, so there are no extra files:
  - a click on every button, a pop when someone joins and a whoosh for each new round;
  - a chime when answers open, ticks in the last five seconds and a bell when time runs out;
  - a sewing-needle stitch for each journey step, a flood rumble and warning pulses in Round 2, and a "safe" sound for the traps;
  - a thump for each bag in Round 3, a ta-da when each answer lands, and a sparkle for the leaderboard.
- **Phones** stay silent by default so the room doesn't get noisy. They vibrate instead when a round starts, when answers open, when an answer locks in and when results arrive (on Android; iPhones don't allow vibration from web pages). Players can tap **Sound off** in the top corner to turn sound on.
- **Music credits:** the three tracks in `audio/` (`lobby.mp3`, `countdown.mp3`, `win.mp3`) were downloaded from Artlist under your account's license. Check your plan's terms before sharing the game outside class.

## 3. Backup plan: hands mode (no phones, no internet)

Use this if the Wi-Fi blocks the connection, phones cannot join, or the room has too few phones.

1. Click **Switch to hands mode** (bottom right). It works at any moment, even in the middle of a round.
2. In the lobby, split the room into 2–6 teams by seating area and rename them if you like.
3. In each round, teams talk for the length of the timer and their spokesperson calls out the answer.
4. On the answer screen, **tap a team's name**, enter its answer on the same buttons the phones use, and click **Save this team's answer**. Repeat for each team (you can reopen a team to fix a mistake).
5. Click **Reveal the answer**. Scores, the animated reveal and the leaderboard work exactly as in phone mode (no speed bonus).

Hands mode does not need the internet at all, so you can also open `index.html?mode=hands` straight from the folder on your laptop.

## 4. Rehearse before class

- Open `index.html?bots=12` to fill the game with 12 practice players who answer by themselves.
- Use a second phone to join as a real player and check that everything moves together.
- If you reload the host page, the same room code is kept, so players reconnect on their own within a few seconds.

## 5. If phones get stuck on "Connecting…" (campus Wi-Fi)

Phones first find the laptop through the free PeerJS server, then try to open a direct link to it. Many campus networks block that direct link. When that happens, the game automatically sends messages through a **relay server** from Metered (free Open Relay plan), including over port 443, which almost every network allows. The credentials are already in `content.js` (`TURN_USER` and `TURN_PASS`).

- **Find out what is blocked:** open `check.html` (for example `https://YOUR-USERNAME.github.io/thread-wars/check.html`) on a phone on the classroom network and tap **Run the check**. It tests the game server, the direct link and every relay port, then says in plain words what works.
- **Rehearse the worst case:** open `index.html?relay=only` on the laptop and `play.html?relay=only` on a phone (type the room code by hand). This forces every message through the relay, just like on a strict campus network.
- **If a phone is still stuck after 12 seconds,** it tells the player to switch to mobile data. If several phones fail, switch to hands mode.
- **After the presentation,** remove the credential in the Metered dashboard (TURN Credentials → Remove). The repository is public, so anyone could read it there.
- **To use new credentials,** click **Add Credential** in Metered and paste the new username and password into `content.js`.

## Content and sources

- Rounds 1 and 2 are common-sense supply chain questions; nothing needs to be cited.
- Round 3 uses Fast Retailing's own figures: about 2,850 tonnes of clothing collected from customers (FY2025, estimated from about 9.5 million items) versus 65,332 tonnes of textile waste from UNIQLO and GU partner factories (2024). The two figures come from different years and estimation methods, so the game presents "about 4 in 100" as a rough comparison, and says so on screen.
- To change any wording, edit `content.js` (all questions, explanations and scoring live there).
