# Master Specification: Modular Dual-Cartridge Trail Engine (`index.html`)

## 1. Executive Summary & Runtime Architecture

- **Deliverable:** A single-file, zero-dependency web application (`index.html`) executable directly in any modern desktop or mobile browser.
- **Technology Stack:**
  - **HTML5 `<canvas>` (800x400 Virtual Viewport):** 60 FPS non-reactive procedural 2D vector renderer with parallax scrolling, day/night dynamic lighting, and mini-game states.
  - **Tailwind CSS (CDN):** Responsive split-screen dashboard (`h-dvh flex flex-col overflow-hidden`).
  - **Alpine.js (CDN):** Reactive DOM binding, modal transitions, and turn-based simulation state.
  - **Web Audio API (Native Browser):** Zero-asset procedural 8-bit sound synthesizer for clicks, gunshots, horns, splashes, and jingles.
  - **Local Persistence (`localStorage`):** Mid-game auto-save state, cart-isolated leaderboards, and custom roadside memorial epigraphs.
- **Architectural Philosophy:** Complete separation of the **Core Simulation & Mathematical Engine** from the **Cartridge Registry**. Adding a 3rd or 4th storyline requires zero rewrites of the canvas renderer, physics, audio synth, or game loops.

---

## 2. Core Game Loop & Kinematic Mathematics

The engine evaluates all motion, consumption, and probability through normalized, unitless mathematical primitives.

### A. Turn Progress Function
Each travel step advances distance $\Delta D$ according to:

$$\Delta D = D_{\text{base}} \times M_{\text{pace}} \times \left( \frac{T_{\text{curr}}}{T_{\text{max}}} \right)^{0.75} \times (1 - \Omega_{\text{friction}}) \times (1 \pm \epsilon)$$

Where:
- $D_{\text{base}}$: Base distance step (e.g., $20\text{ mi}$ for 1848, $95\text{ km}$ for 2026).
- $M_{\text{pace}} \in [0.8, 1.6]$: Pacing speed coefficient.
- $T_{\text{curr}} / T_{\text{max}} \in [0.0, 1.0]$: Traction ratio (Oxen stamina or vehicle mechanical integrity).
- $\Omega_{\text{friction}} \in [0.0, 0.7]$: Cumulative friction (weather severity, mountain elevation, or roadworks).
- $\epsilon \sim \mathcal{U}(-0.08, +0.08)$: Uniform random variance preventing mechanical predictability.

### B. Dynamic Hazard Entropy Function
Hazard events trigger based on system degradation and party health entropy:

$$P(\text{Hazard}) = 1 - \exp\left( -\lambda_{\text{base}} \cdot \prod_{k} \gamma_k \right)$$

$$\prod_{k} \gamma_k = \left( 1 + \beta_1 (1 - \bar{H}_{\text{primary}}) \right) \times \left( 1 + \beta_2 (1 - \bar{H}_{\text{secondary}}) \right) \times M_{\text{pace}}^{1.35} \times W_{\text{severity}}$$

- $\lambda_{\text{base}} = 0.28$: Intrinsic baseline entropy constant.
- $\bar{H}_{\text{primary}} \in [0, 1]$: Mean vitality of primary characters (Adults/Parents).
- $\bar{H}_{\text{secondary}} \in [0, 1]$: Mean vitality of secondary characters (Children/Dependents).
- $\beta_1 = 1.0, \beta_2 = 1.5$: Asymmetric penalty weighting (restless children accelerate hazard generation).
- $W_{\text{severity}} \in [1.0, 2.2]$: Weather condition multiplier.

### C. Generalized Obstacle & Chokepoint Resolution Matrix
Obstacles (Rivers, Bridge Merges, Floodplains) are parameterized by **Density/Depth ($\Phi \in [0.0, 1.0]$)** and **Velocity/Volatility ($\Psi \in [0.0, 1.0]$)**:

| Tactical Choice | 1848 O.G. Archetype | 2026 Road Trip Archetype | Success Probability $P(\text{Success})$ | Penalty on Failure |
| :--- | :--- | :--- | :--- | :--- |
| `force` | Ford River | Brave Gridlock / Slingshot | $\max(0.05, 1.0 - (\Phi / 0.65)^2)$ | $-25$ Food/Snacks, $-25$ Traction |
| `adapt` | Caulk & Float | Backroad Detour | $\max(0.10, 1.0 - (\Phi \cdot \Psi \cdot 1.3))$ | $-15$ Health to all party members |
| `pay` | Take Ferry | Toll Road / Drive-Thru Bribe | $1.0\quad (100\%)$ | Cash: $C_{\text{base}} \times (1 + \Psi)$ |
| `delay` | Camp on Bank | Rest at Bakery / Lay Low | $1.0\quad (100\%)$ | $\Delta t = +1$, rations consumed |

### D. Scoring & Leaderboard Normalization Engine
Runs compute a final normalized score when completed or when all members collapse:

$$\text{Final Score} = \left[ S_{\text{comp}} + \sum_{p} (H_p \cdot W_{\text{role}}) + \sum_{r} (Q_r \cdot V_r) + \max(0, (T_{\text{par}} - T_{\text{actual}}) \cdot K_t) - \sum \Pi_{\text{penalties}} \right] \times M_{\text{diff}}$$

Where:
- $S_{\text{comp}}$: Base completion reward ($5,000\text{ pts}$ on arrival, or proportional distance if abandoned).
- $W_{\text{role}}$: Vitality value ($25\text{ pts}/\%$ for primary providers; $12\text{ pts}/\%$ for secondary).
- $Q_r \cdot V_r$: Unused resources valuation ($5\text{ pts}$ per Food/Snack, $1.5\text{ pts}$ per Cash, $60\text{ pts}$ per Spare Part).
- $M_{\text{diff}}$: Difficulty multiplier selected at outfitter (e.g., $1.0\times$ Banker vs $3.0\times$ Farmer).

---

## 3. Cartridge 1: 1848 Oregon Trail (Faithful O.G. Mode)

### A. Kinematics & Mechanics
- **Total Route:** 2,000 Miles from Independence, Missouri to Willamette Valley, Oregon.
- **Base Step:** 20 Miles per day.
- **Occupations:**
  - *Banker from Boston:* Starts with $1,600, $1.0\times$ Score Multiplier.
  - *Carpenter from Ohio:* Starts with $800, $2.0\times$ Multiplier (+35% field repair success chance).
  - *Farmer from Illinois:* Starts with $400, $3.0\times$ Multiplier (+25% foraging yield & oxen stamina).
- **Ration Tiers:** Filling (3 lbs/day/person), Meager (1.5 lbs/day/person), Bare Bones (0.5 lbs/day/person).
- **Pacing Tiers:** Steady (10–15 mi/day), Strenuous (18–22 mi/day), Grueling (25–30 mi/day).

### B. Waypoints & Obstacles (2,000 mi)
1. `0 mi` — Independence, Missouri (Departure Outfitter)
2. `102 mi` — Kansas River Crossing (River Obstacle: Ford, Caulk, or Ferry for $5.00)
3. `185 mi` — Big Blue River (River Obstacle: Swift current, deep channel)
4. `304 mi` — Fort Kearney (Trading Post & Rest)
5. `554 mi` — Chimney Rock (Landmark modal card)
6. `640 mi` — Fort Laramie (Trading Post & Blacksmith)
7. `830 mi` — Independence Rock (Landmark: Inscribe your name)
8. `932 mi` — South Pass (Continental Divide)
9. `1,080 mi` — Green River Crossing (River Obstacle: Dangerous current)
10. `1,288 mi` — Fort Hall (Trading Post)
11. `1,534 mi` — Snake River Crossing (River Obstacle: Caulk & Float recommended)
12. `1,808 mi` — The Dalles (Columbia River Decision: Float raft down rapids OR Barlow Road Toll)
13. `2,000 mi` — Willamette Valley (Victory Screen & Final Tally)

---

## 4. Cartridge 2: 2026 The M1 Gauntlet (Sydney to Brisbane)

### A. Concept & Atmosphere
- **Tone:** Inspired by Hamish & Andy’s signature larrikin humor, power moves, suburban pettiness, and Australian road trip nostalgia.
- **Total Route:** 920 km from Sydney Harbour / Northconnex to Brisbane River.
- **Base Step:** 95 km per driving leg (~1.5 hours).
- **Roster:**
  - `Brad`: Adult (Driver), Status: 'Zen', Health: 100
  - `Tegan`: Adult (Co-Pilot), Status: 'Zen', Health: 100
  - `Jack`: Child (Age 6), Status: 'Happy', Health: 100
  - `Oliver`: Child (Age 4), Status: 'Happy', Health: 100
  - `Arthur`: Child (Age 2), Status: 'Clean', Health: 100
  - `Maple`: Pet (Siberian Cat in Carrier), Status: 'Purring', Health: 100

### B. Resource Mapping & Equipment
- `Food` $\rightarrow$ **Car Snacks (pkts)** *(Shapes, Sultanas, Apple Pouches, Freddo Frogs)*
- `Ammo` $\rightarrow$ **Hot Chips & 50¢ Coins (units)** *(Used for mini-game targeting and distractions)*
- `Traction` $\rightarrow$ **Fuel Tank & Barista Espresso (%)**
- `Part A` $\rightarrow$ **Emergency Nappy & Wipe Kits** *(Cures Arthur's Code Brown blowout)*
- `Part B` $\rightarrow$ **12V USB-C Fast Chargers** *(Cures iPad battery deaths and Backseat Mutiny)*
- `Part C` $\rightarrow$ **Gastro-Stop & Panadol Blister Packs** *(Cures Roadside Kebab poisoning & adult headaches)*

### C. Narrative Dialogue & Event Deck

#### 1. `EV_CODE_BROWN`: The Newcastle Air Quality Crisis
- **Preamble:** *A sudden, warm sulfurous vapor rolls through the air vents past Mooney Mooney Bridge. Arthur is staring peacefully into the distance.*
- **Dialogue:**
  > **Tegan:** "Brad. Do not look back, just crack the windows. Sweet mother of pearl, what did he eat at Heatherbrae?"
  > **Brad:** "I told you that third custard pouch was an act of war! If that hits the upholstery, we’re burning the car."
  > **Jack (6):** "DAD! IT SMELLS LIKE A WET DOG COOKED ON A BARBECUE!"
- **Choices:**
  - *Emergency Boot Change:* Requires 1x Emergency Nappy Kit. Lose 35 km of progress, but preserves Adult Sanity. Arthur $\rightarrow$ 'Clean'.
  - *The 110 km/h Aerodynamic Venturi Gamble:* Free. Roll 1d100. 70% chance air suction clears smell (+15 Dad Ego). 30% chance crosswind whips dirty wipe into Oliver's face (-25 Sanity, -15 Morale).
  - *The Cannonball:* Push through to next BP. Full progress, but Parents lose -30 Sanity.

#### 2. `EV_SONG_LOOP`: The Toddler Guantanamo Playlist
- **Preamble:** *Arthur has locked the infotainment console into 'The Wiggles: Toot Toot Chugga Chugga Big Red Car'. Consecutive play #42 is underway.*
- **Dialogue:**
  > **Song:** *♫ Big Red Car, travel along, singin' a song... ♫*
  > **Brad:** "If I hear that guitar riff once more, I’m steering into the guardrail."
  > **Tegan:** "Don't touch that screen! If the music stops, the screaming starts!"
  > **Boys:** *♫ CHUGGA CHUGGA BIG RED CAR! ♫*
- **Choices:**
  - *Endure the Loop:* Kids gain +20 Morale (Hyped); Adults take -25 Sanity and gain 'Earworm Twitch' status.
  - *The "Accidental" Bluetooth Disconnect (Hamish Power Move):* Brad taps the steering wheel skip button while coughing. 49% pass ("No mobile reception in these hills"). 51% caught by Jack ("DAD PUSHED THE BUTTON!") triggering full cabin mutiny.
  - *Noise-Cancelling AirPod Truce:* Negates sanity drain, but 25% chance of missing highway exit (-25 km).

#### 3. `EV_KEBAB_ROULETTE`: Garlic Sauce Roulette
- **Preamble:** *The trailer behind the abandoned timber yard promised 'Authentic Charcoal Doner'. Brad claimed tradie utes out front were a sign of Michelin-tier flavor.*
- **Dialogue:**
  > **Brad (40 km later):** "...Right. Need an off-ramp. Any off-ramp. Find me a tree, a servo, or a council depot right now."
  > **Tegan:** "The man wiped his forehead with the flatbread, Brad. You bought this on yourself."
- **Choices:**
  - *Pop Gastro-Stop:* Requires 1x Gastro-Stop. Instant cure.
  - *Emergency Mangrove Sprint:* Brad disappears into the mudflats for 40 mins. Lose 40 km, Tegan loses -20 Sanity guarding restless kids alone.
  - *White-Knuckle Spasms:* Brad gains 'Kebab Regret (Food Poisoning)'. Driving pace cut by 30% for 2 days.

#### 4. `EV_BORDER_WAR`: Row Two Armrest Demilitarized Zone
- **Preamble:** *Jack has placed a plastic ruler down the fabric seam of the middle row seats.*
- **Dialogue:**
  > **Jack:** "Mum! Oliver's elbow is 2 millimetres over the crease! That's my airspace!"
  > **Oliver:** "He kicked my drink bottle on purpose!"
- **Choices:**
  - *Impose Snack Tax:* Confiscate snacks until next servo. Peace enforced, but restlessness increases 40%.
  - *The 'Look, a Wedge-Tailed Eagle!' Feint:* Point out left window at empty paddock. Distracts boys (+5 Morale).
  - *Deploy Screen Time Duopoly:* Spend 10% device battery to buy 30 minutes of silence.

#### 5. `EV_MAPLE_SOLO`: Maple's St Helena Tunnel Reverb Opera
- **Preamble:** *Entering the 430-meter tunnel near Byron, the Siberian cat discovers acoustic resonance.*
- **Dialogue:**
  > **Maple:** *"MREEEE-OOOOWWWWW-RRRRRR!"*
  > **Arthur:** (Waking instantly from nap) "KITTY! LET HER OUT!"
- **Choices:**
  - *Cat Treat Bribery:* Costs 2 Snacks. Maple purrs (+10 Pet Calm).
  - *Endure the Choir:* Arthur mimics cat yowls for 30 km (-15 Adult Sanity).

#### 6. Bottlenecks & Boss Waypoints (920 km Route)
1. `0 km` — Sydney Harbour / Northconnex (Departure)
2. `55 km` — Hawkesbury River Bridge (Bottleneck: Holiday merge gridlock)
3. `160 km` — Heatherbrae Pies (Landmark: Stop for hot steak pies or push past)
4. `315 km` — Port Macquarie Turnoff (Landmark: Koala hospital & beach run)
5. `420 km` — Kempsey / Macleay River (Bottleneck: Stuck behind Gary's 28ft Jayco Caravan at 68 km/h)
6. `530 km` — Coffs Harbour: The Big Banana (Boss Landmark: Backseat mutiny if skipped!)
7. `660 km` — Maclean & Brooms Head Turnoff (Landmark: Sugarcane fields)
8. `740 km` — Ballina Big Prawn & Byron Hinterland (Landmark: Fiberglass crustacean photo)
9. `820 km` — Tugun / QLD Border (Bottleneck: Gold Coast holiday crawl)
10. `920 km` — Brisbane River / Northern Suburbs (Victory Screen)

---

## 5. Procedural 2D Vector Canvas Architecture

- **Canvas Dimensions:** Hardcoded internal virtual resolution `800x400`. Scaled in CSS via `object-contain`.
- **Render Loop:** Single frame-rate independent `requestAnimationFrame` loop with delta-time (`dt = (now - lastTime) / 1000`).
- **Layers Pipeline:**
  1. **Dynamic Day/Night Sky:** Smooth gradient interpolation over day progression:
     - Dawn: `linear-gradient(#ff7e5f, #feb47b)`
     - Midday: `linear-gradient(#2980b9, #6dd5fa)`
     - Sunset: `linear-gradient(#e65c00, #F9D423)`
     - Night: `linear-gradient(#0f2027, #203a43)` with blinking stars and celestial arc (sun/moon).
  2. **Parallax Layer 1 (Distant Silhouette - 0.2x speed):** Jagged Rocky Mountains (1848) vs. Eucalyptus Great Dividing Range silhouettes (2026).
  3. **Parallax Layer 2 (Midground Trees/Hills - 0.5x speed):** Pine forests & buttes (1848) vs. Wattle bushes, gum trees, and green highway exit signs (2026).
  4. **Parallax Layer 3 (Foreground Trail - 1.0x speed):** Textured dirt/gravel trail (1848) vs. Asphalt highway with white dashed lines (2026).
  5. **Hero Vehicle Artist:**
     - 1848: Prairie Schooner with spoked rotating wheels, canvas cover ribs, and 2-frame walking oxen with horns.
     - 2026: Stylized metallic 7-seater SUV with roof cargo pod, spinning alloy rims, automatic twilight headlights, and active status VFX:
       - *Green wavy stink lines (`ctx.bezierCurveTo`) wafting from windows when Arthur's Code Brown is active.*
       - *Floating musical notes drifting above the roof when the Kids' Song loop is playing.*
  6. **Mini-Game Scene (`SCENE_HUNT`):**
     - 1848: Crosshair hunting mini-game spawning moving Bison (slow, 200 lbs), Deer (medium, 100 lbs), and Rabbits (fast, 15 lbs).
     - 2026: Rest Stop Seagull & Bin Chicken Defence. Tap swooping Bin Chickens (Ibises) and Seagulls to protect snacks; tap floating Flat Whites (+Sanity) and Sausage Rolls (+Snacks).
  7. **Bottleneck / River Scene (`SCENE_RIVER`):**
     - 1848: Multi-layer flowing water with water depth gauge (1.5 ft to 9.0 ft) and wagon bobbing physics.
     - 2026: Flooded highway / gridlock causeway with interactive Congestion Index gauge and vehicle crossing animation.

---

## 6. Procedural Web Audio API Synthesizer

Zero external audio files. Pure procedural audio built via native browser `AudioContext`:
- `playBeep(freq, type, duration)`: UI feedback and navigation blips.
- `playMusket()`: Burst of white noise passed through a rapid low-pass envelope filter.
- `playHonk()`: Dual square-wave oscillators at 440Hz and 554Hz with slight detune.
- `playSplash()`: Frequency-modulated low sine wave with noise buffer sweep.
- `playFanfare()`: Arpeggiated C-Major triad (C5 $\rightarrow$ E5 $\rightarrow$ G5 $\rightarrow$ C6) for landmark arrivals and game victories.

---

## 7. Persistence & State Storage Schema

Stored under `localStorage.getItem('OREGON_ENGINE_DATA_V1')`:
```json
{
  "activeRun": {
    "cartridgeId": "pacific_2026",
    "day": 4,
    "distance": 420,
    "cash": 285.50,
    "supplies": { "food": 65, "ammo": 24, "partA": 1, "partB": 0, "partC": 1 },
    "party": [
      { "name": "Brad", "role": "primary", "health": 85, "status": "Zen" },
      { "name": "Tegan", "role": "primary", "health": 90, "status": "Zen" },
      { "name": "Jack", "role": "secondary", "health": 100, "status": "Happy" },
      { "name": "Oliver", "role": "secondary", "health": 75, "status": "Restless" },
      { "name": "Arthur", "role": "secondary", "health": 80, "status": "Clean" },
      { "name": "Maple", "role": "pet", "health": 100, "status": "Purring" }
    ],
    "totalHours": 18
  },
  "leaderboards": {
    "oregon_1848": [
      { "name": "Carpenter Dave", "score": 5200, "days": 134, "date": "2026-11-06", "epitaph": "Rest in Pepperoni" }
    ],
    "pacific_2026": [
      { "name": "Brad & Fam", "score": 7450, "hours": 14, "date": "2026-11-06", "epitaph": "The Big Banana saved our sanity" }
    ]
  }
}
```

---

## 8. Step-by-Step Implementation Checklist for Antigravity

- [ ] **Step 1: HTML Skeleton & Viewport Layout**
  - Create `index.html` with Tailwind CSS CDN, Alpine.js CDN, and non-scrolling `100dvh` split layout.
  - Setup top `<canvas id="viewport" width="800" height="400">` and bottom Alpine.js dashboard container.
- [ ] **Step 2: Core Math Engine Class**
  - Implement standalone `CoreTrailEngine` class with `stepTurn()`, `evaluateHazardRoll()`, `resolveObstacle()`, and `calculateFinalScore()`.
- [ ] **Step 3: Cartridge Registry**
  - Define `CARTRIDGES.oregon_1848` and `CARTRIDGES.pacific_2026` matching the contract.
  - Insert all dialogue, choices, party profiles, and waypoint arrays.
- [ ] **Step 4: Vector Canvas Renderer**
  - Build `CanvasEngine` with delta-time loop, dynamic day/night sky gradients, 3-layer parallax, and vector drawers (`drawSchooner`, `drawSUV`, `drawOxen`, `drawTrees`, `drawRoadSigns`).
  - Implement visual status overlays (green stink waves for Arthur, musical notes for song loop).
- [ ] **Step 5: Mini-Games (`SCENE_HUNT` & `SCENE_RIVER`)**
  - Implement pointer-coordinate normalized click handling.
  - Render target entities (Bison/Deer/Rabbits vs. Bin Chickens/Seagulls/Flat Whites).
  - Implement live depth/congestion gauges and crossing choice animations.
- [ ] **Step 6: Alpine.js UI & Web Audio**
  - Wire start screen cartridge picker, outfitter store, party status badges, event log ticker, action buttons, and dilemma modals.
  - Wire Web Audio synthesizer to button clicks, rifle shots, car horns, and victory fanfares.
  - Wire auto-save to `localStorage` and cartridge-separated leaderboard tables.
