/**
 * Cartridge 2: 2026 The M1 Gauntlet (Sydney to Brisbane).
 *
 * Inspired by Hamish & Andy humor, Australian road trip nostalgia, and family road trip realism.
 * Includes:
 * - Vehicle choices (Kia Carnival, 2009 Territory, Mate's Ute)
 * - Fixed 6-member family roster (Brad, Tegan, Jack, Oliver, Arthur, Maple)
 * - 10 Waypoints with obstacle metrics along the Pacific Motorway
 * - Servo / Woolies outfitter catalog
 * - 10 Hamish & Andy declarative hazards and dilemmas
 */

export const PACIFIC_2026_CARTRIDGE = {
  id: 'pacific_2026',
  title: 'The M1 Gauntlet (2026)',
  subtitle: 'Sydney Harbour to Brisbane River — 920 km Family Road Trip',
  totalDistance: 920,
  distanceUnit: 'km',
  timeUnit: 'legs',
  dBase: 45,
  lambdaBase: 0.22,
  tPar: 24,
  kt: 150,

  // Vehicle Difficulty Pickers (Multipliers)
  occupations: [
    {
      id: 'kia_carnival',
      label: "Dad's Leased Kia Carnival",
      cashCents: 160000, // $1,600.00
      scoreMultiplier: 1.0,
      description: 'Plush 8-seater, dual sunroofs, pristine aircon. 1.0x score multiplier.',
      perks: { comfortRating: 1.2 },
    },
    {
      id: 'territory_2009',
      label: 'The 2009 Ford Territory With a Check-Engine Light',
      cashCents: 80000, // $800.00
      scoreMultiplier: 2.0,
      description: 'Thirsty straight-six Barra engine. 2.0x score multiplier.',
      perks: { fuelBurnPenalty: 1.2 },
    },
    {
      id: 'mates_ute',
      label: "Borrowed Mate's Dual-Cab Ute + Cage Trailer",
      cashCents: 40000, // $400.00
      scoreMultiplier: 3.0,
      description: 'Hard suspension, luggage under tarp, kids squeezed tight. 3.0x multiplier.',
      perks: { moraleDecayPenalty: 1.3 },
    },
  ],

  // Fixed Family Roster
  defaultParty: [
    { name: 'Brad', role: 'primary', health: 100, morale: 100, status: 'Zen', statusEffects: [] },
    { name: 'Tegan', role: 'primary', health: 100, morale: 100, status: 'Zen', statusEffects: [] },
    { name: 'Jack (6)', role: 'secondary', health: 100, morale: 100, status: 'Happy', statusEffects: [] },
    { name: 'Oliver (4)', role: 'secondary', health: 100, morale: 100, status: 'Happy', statusEffects: [] },
    { name: 'Arthur (2)', role: 'secondary', health: 100, morale: 100, status: 'Clean', statusEffects: [] },
    { name: 'Maple', role: 'pet', health: 100, morale: 100, status: 'Purring', statusEffects: [] },
  ],

  // Pacing Options (Driving Speed & Energy)
  paceMultipliers: {
    cruise: 0.8,         // ~36 km/leg (Cruise control 90 km/h)
    sit_on_limit: 1.0,   // ~45 km/leg (Sit on 110 km/h)
    hamish: 1.25,        // ~56 km/leg ('Hamish Mode' right-lane overtakes)
  },

  // Servo & Woolies Pre-Departure Outfitter
  outfitter: [
    { id: 'food', label: 'Car Snacks (Shapes, Freddo Frogs, Sultanas)', unitCostCents: 250, bundleSize: 5, unitLabel: 'pkts' },
    { id: 'ammo', label: 'Hot Chips & 50¢ Distraction Coins', unitCostCents: 100, bundleSize: 5, unitLabel: 'units' },
    { id: 'partA', label: 'Emergency Nappy & Wet-Wipe Kit', unitCostCents: 1500, bundleSize: 1, unitLabel: 'kit' },
    { id: 'partB', label: '12V USB-C Fast Charger & Cable', unitCostCents: 2000, bundleSize: 1, unitLabel: 'charger' },
    { id: 'partC', label: 'Gastro-Stop & Panadol Blister Pack', unitCostCents: 1200, bundleSize: 1, unitLabel: 'pack' },
  ],

  // Barter & Rest-Stop Swap Configuration
  barterConfig: {
    noTradeText:
      'Every caravaner in the rest area had their head down eating lukewarm pies. Nobody wanted to swap. Lost 1 leg (30 mins).',
    slots: {
      food: { label: 'Car Snack Packets', baseQty: 12 },
      ammo: { label: 'Hot Chips & 50¢ Coins', baseQty: 10 },
      traction: { label: 'Jerrycan Fuel & Espresso Boost', baseQty: 20 },
      partA: { label: 'Emergency Nappy & Wet-Wipe Kit', baseQty: 1 },
      partB: { label: '12V USB-C Fast Charger', baseQty: 1 },
      partC: { label: 'Gastro-Stop & Panadol Pack', baseQty: 1 },
    },
    archetypes: [
      {
        speaker: 'Gary & Cheryl (28ft Jayco Caravan)',
        template:
          "G'day mate, saw you looking stressed near the picnic tables. I'll swap you {offerQty} {offerLabel} if you've got {demandQty} {demandLabel} for Cheryl.",
      },
      {
        speaker: 'Frazzled Kia Carnival Mum',
        template:
          'Look, I am desperate. I will trade you {offerQty} {offerLabel} right now on the bonnet of my car for {demandQty} {demandLabel}.',
      },
      {
        speaker: 'Wayne (Hi-Vis Tradie at Driver Reviver)',
        template:
          "Mate, servo's fleecing everyone inside. Flick us {demandQty} {demandLabel} and you can take {offerQty} {offerLabel} off the back of the ute.",
      },
    ],
  },

  // 10 Waypoints from Sydney Harbour to Brisbane River
  waypoints: [
    {
      id: 'wp_sydney',
      name: 'Sydney Harbour / Northconnex',
      distance: 0,
      landmark: true,
      servoStop: true,
      hasStore: true,
      storeName: 'Woolworths & Servo Express (Pennant Hills)',
      isCheckpoint: true,
    },
    {
      id: 'wp_hawkesbury',
      name: 'Hawkesbury River Bridge',
      distance: 55,
      obstacle: { type: 'gridlock', phi: 0.50, psi: 0.40, costCents: 500, label: 'Holiday Merge Gridlock' },
    },
    {
      id: 'wp_heatherbrae',
      name: 'Heatherbrae Pies',
      distance: 160,
      landmark: true,
      servoStop: true,
      hasStore: true,
      storeName: 'Heatherbrae Highway Servo & Pie Warmers',
      isCheckpoint: true,
    },
    {
      id: 'wp_port_mac',
      name: 'Port Macquarie Turnoff',
      distance: 315,
      landmark: true,
      servoStop: true,
      hasStore: true,
      storeName: 'Port Macquarie 24hr Highway Roadhouse',
      isCheckpoint: true,
    },
    {
      id: 'wp_kempsey',
      name: 'Kempsey / Macleay River',
      distance: 420,
      servoStop: true,
      hasStore: true,
      storeName: "Kempsey 24hr Neon Roadhouse ('Yes, the Sandwich is $14.50')",
      obstacle: {
        type: 'caravan',
        phi: 0.60,
        psi: 0.50,
        costCents: 600,
        label: "Gary's 28ft Jayco Caravan (68 km/h)",
        guideCost: { slot: 'ammo', qty: 10, label: 'Call Truckie Convoy on UHF Ch 40 (10 Coins/Fuel)' },
      },
    },
    {
      id: 'wp_coffs',
      name: 'Coffs Harbour: The Big Banana',
      distance: 530,
      landmark: true,
      bossStop: true,
      servoStop: true,
      hasStore: true,
      storeName: 'Coffs Harbour Big Banana Gift Shop & Servo',
      isCheckpoint: true,
    },
    { id: 'wp_maclean', name: 'Maclean & Brooms Head Turnoff', distance: 660, landmark: true },
    {
      id: 'wp_ballina',
      name: 'Ballina Big Prawn & Byron Hinterland',
      distance: 740,
      landmark: true,
      servoStop: true,
      hasStore: true,
      storeName: 'Ballina Highway Oasis & Bait Shop',
      isCheckpoint: true,
    },
    {
      id: 'wp_border',
      name: 'Tugun / QLD Border',
      distance: 820,
      servoStop: true,
      hasStore: true,
      storeName: 'Tugun Border Express Mart',
      obstacle: {
        type: 'gridlock',
        phi: 0.70,
        psi: 0.60,
        costCents: 800,
        label: 'Gold Coast Holiday Crawl',
        guideCost: { slot: 'food', qty: 25, label: 'Choccy Milk & Red Frog Peace Accord (25 Snacks)' },
      },
    },
    { id: 'wp_brisbane', name: 'Brisbane River / Northern Suburbs', distance: 920, landmark: true, goal: true, isCheckpoint: true },
  ],

  // 10 Declarative Hamish & Andy Road Trip Hazards
  events: [
    {
      id: 'EV_CODE_BROWN',
      title: 'The Newcastle Air Quality Crisis',
      category: 'HAZARD',
      baseWeight: 14,
      preamble: 'A sudden, warm sulfurous vapor rolls through the air vents past Mooney Mooney Bridge. Arthur is staring peacefully into the distance.',
      dialogue: [
        { speaker: 'Tegan', text: 'Brad. Do not look back, just crack the windows. Sweet mother of pearl, what did he eat at Heatherbrae?' },
        { speaker: 'Brad', text: 'I told you that third custard pouch was an act of war! If that hits the upholstery, we are burning the car.' },
        { speaker: 'Jack (6)', text: 'DAD! IT SMELLS LIKE A WET DOG COOKED ON A BARBECUE!' },
      ],
      choices: [
        {
          label: 'Emergency Boot Change',
          description: 'Requires 1x Nappy Kit. Lose 1 leg (+30 mins), preserves Adult Sanity. Arthur -> Clean.',
          requires: { item: 'partA', qty: 1 },
          effects: [
            { op: 'addResource', item: 'partA', amount: -1 },
            { op: 'addTime', turns: 1 },
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: 10 },
            { op: 'addStatus', target: 'member:Arthur', status: 'Clean' },
            { op: 'setFlag', flag: 'vfxStinkLines', value: false },
          ],
        },
        {
          label: 'The 110 km/h Aerodynamic Venturi Gamble',
          description: 'Roll d100. 70% clears cabin smell (+15 Dad Ego). 30% crosswind dirty wipe backlash.',
          roll: {
            type: 'd100',
            threshold: 70,
            modifiers: [{ condition: "pace === 'hamish'", modifier: 10 }],
          },
          onPass: [
            { op: 'addStat', target: 'run', stat: 'dadEgo', amount: 15 },
            { op: 'addStatus', target: 'member:Arthur', status: 'Clean' },
            { op: 'setFlag', flag: 'vfxStinkLines', value: false },
          ],
          onFail: [
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: -25 },
            { op: 'addStat', target: 'member:Oliver', stat: 'morale', amount: -15 },
            { op: 'addStatus', target: 'member:Oliver', status: 'Traumatized' },
          ],
        },
        {
          label: 'The Cannonball (Push to Next BP)',
          description: 'Full speed ahead. Zero time lost, but adults take -30 Sanity.',
          effects: [
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: -30 },
            { op: 'addStatus', target: 'member:Arthur', status: 'Toxic' },
            { op: 'setFlag', flag: 'vfxStinkLines', value: true },
          ],
        },
      ],
    },
    {
      id: 'EV_SONG_LOOP',
      title: 'The Toddler Guantanamo Playlist',
      category: 'HAZARD',
      baseWeight: 12,
      preamble: "Arthur has locked the infotainment console into 'The Wiggles: Toot Toot Chugga Chugga Big Red Car'. Consecutive replay #42 is underway.",
      dialogue: [
        { speaker: 'Song', text: '♫ Big Red Car, travel along, singin a song... ♫' },
        { speaker: 'Brad', text: 'If I hear that four-bar bass riff once more, I am steering into the guardrail.' },
        { speaker: 'Tegan', text: 'Do not touch that screen! If the music stops, the screaming starts!' },
        { speaker: 'Boys', text: '♫ CHUGGA CHUGGA BIG RED CAR! ♫' },
      ],
      choices: [
        {
          label: 'Endure the Loop',
          description: 'Kids gain +20 Morale; Adults lose -25 Sanity and gain Earworm Twitch.',
          effects: [
            { op: 'addStat', target: 'role:child', stat: 'morale', amount: 20 },
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: -25 },
            { op: 'addStatus', target: 'role:adult', status: 'Earworm Twitch', durationTurns: 2 },
          ],
        },
        {
          label: 'The "Accidental" Bluetooth Cough (Hamish Power Move)',
          description: 'Brad taps the steering wheel skip button while coughing. 50% pass chance.',
          roll: {
            type: 'd100',
            threshold: 50,
          },
          onPass: [
            { op: 'addStat', target: 'run', stat: 'dadEgo', amount: 20 },
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: 15 },
          ],
          onFail: [
            { op: 'addStat', target: 'role:child', stat: 'morale', amount: -30 },
            { op: 'addStatus', target: 'role:child', status: 'Mutinous' },
          ],
        },
        {
          label: 'Noise-Cancelling AirPod Truce',
          description: 'Negates sanity loss, but 25% chance of missing highway exit (+1 Leg).',
          roll: {
            type: 'd100',
            threshold: 75,
          },
          onPass: [
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: 5 },
          ],
          onFail: [
            { op: 'addTime', turns: 1 },
            { op: 'addStat', target: 'run', stat: 'traction', amount: -10 },
          ],
        },
      ],
    },
    {
      id: 'EV_KEBAB_ROULETTE',
      title: 'Garlic Sauce Roulette',
      category: 'HAZARD',
      baseWeight: 10,
      preamble: "The trailer behind the timber yard promised 'Authentic Charcoal Doner'. Brad claimed tradie utes out front guaranteed Michelin flavor.",
      dialogue: [
        { speaker: 'Brad (40 km later)', text: '...Right. Need an off-ramp. Any off-ramp. Find me a tree, a servo, or a council depot right now.' },
        { speaker: 'Tegan', text: 'The man wiped his forehead with the flatbread, Brad. You bought this on yourself.' },
      ],
      choices: [
        {
          label: 'Pop Gastro-Stop Tablet',
          description: 'Requires 1x Gastro-Stop (Part C). Instant clinical relief.',
          requires: { item: 'partC', qty: 1 },
          effects: [
            { op: 'addResource', item: 'partC', amount: -1 },
            { op: 'addStat', target: 'member:Brad', stat: 'health', amount: 10 },
          ],
        },
        {
          label: 'Emergency Mangrove Sprint',
          description: 'Lose 1 leg. Tegan loses -20 Sanity guarding restless kids alone.',
          effects: [
            { op: 'addTime', turns: 1 },
            { op: 'addStat', target: 'member:Tegan', stat: 'morale', amount: -20 },
          ],
        },
        {
          label: 'White-Knuckle Spasms (Push On)',
          description: "Brad gains 'Kebab Regret' food poisoning. Pacing cut 30% for 2 legs.",
          effects: [
            { op: 'addStat', target: 'member:Brad', stat: 'health', amount: -25 },
            { op: 'addStatus', target: 'member:Brad', status: 'Kebab Regret', durationTurns: 2 },
          ],
        },
      ],
    },
    {
      id: 'EV_BORDER_WAR',
      title: 'Row Two Armrest Demilitarized Zone',
      category: 'HAZARD',
      baseWeight: 12,
      preamble: 'Jack has placed a 30cm plastic school ruler down the fabric seam of the middle row seats.',
      dialogue: [
        { speaker: 'Jack (6)', text: "Mum! Oliver's elbow is 2 millimetres over the crease! That is my sovereign airspace!" },
        { speaker: 'Oliver (4)', text: 'He kicked my drink bottle on purpose!' },
      ],
      choices: [
        {
          label: 'Impose Snack Tax',
          description: 'Confiscate snacks until next servo. Peace enforced, but kids grow restless.',
          effects: [
            { op: 'addResource', item: 'food', amount: -5 },
            { op: 'addStat', target: 'role:child', stat: 'morale', amount: -15 },
          ],
        },
        {
          label: "The 'Look, a Wedge-Tailed Eagle!' Feint",
          description: 'Point out left window at empty paddock. Distracts boys (+10 Morale).',
          effects: [
            { op: 'addStat', target: 'role:child', stat: 'morale', amount: 10 },
          ],
        },
        {
          label: 'Deploy Screen Time Duopoly',
          description: 'Requires 1x USB-C Charger (Part B). Buys 1 hour of silence.',
          requires: { item: 'partB', qty: 1 },
          effects: [
            { op: 'addStat', target: 'role:child', stat: 'morale', amount: 25 },
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: 15 },
          ],
        },
      ],
    },
    {
      id: 'EV_MAPLE_SOLO',
      title: "Maple's St Helena Tunnel Reverb Opera",
      category: 'HAZARD',
      baseWeight: 10,
      preamble: 'Entering the 430-meter tunnel near Byron, the Siberian cat discovers acoustic resonance.',
      dialogue: [
        { speaker: 'Maple', text: 'MREEEE-OOOOWWWWW-RRRRRR!' },
        { speaker: 'Arthur', text: 'KITTY! LET HER OUT!' },
      ],
      choices: [
        {
          label: 'Cat Treat Bribery',
          description: 'Costs 2 Car Snacks. Maple purrs (+15 Pet Calm).',
          requires: { item: 'food', qty: 2 },
          effects: [
            { op: 'addResource', item: 'food', amount: -2 },
            { op: 'addStat', target: 'member:Maple', stat: 'morale', amount: 15 },
          ],
        },
        {
          label: 'Endure the Choir',
          description: 'Arthur mimics cat yowls for next 30 km (-15 Adult Sanity).',
          effects: [
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: -15 },
          ],
        },
      ],
    },
    {
      id: 'EV_SERVO_BARTER',
      title: 'The M1 Roadside Gouging Crisis',
      category: 'HAZARD',
      baseWeight: 10,
      preamble: 'Pulling in for fuel, the price board reads $2.49/L and a 600ml water bottle costs $9.50.',
      dialogue: [
        { speaker: 'Brad', text: 'Nine dollars for Mount Franklin?! I could buy a desalinisation plant for less!' },
        { speaker: 'Tegan', text: 'Brad, the children are licking the condensation off the passenger window. Pay the man.' },
      ],
      choices: [
        {
          label: 'Pay Highway Robbery Rates ($25.00)',
          description: 'Buy water and cold pies. Full morale recovery.',
          requires: { item: 'cashCents', qty: 2500 },
          effects: [
            { op: 'addResource', item: 'cashCents', amount: -2500 },
            { op: 'addResource', item: 'food', amount: 10 },
            { op: 'addStat', target: 'role:all', stat: 'morale', amount: 10 },
          ],
        },
        {
          label: 'Stand on Principle and Drive Out',
          description: 'Refuse to support extortion. Adults gain +15 Dad Ego, kids lose -15 Morale.',
          effects: [
            { op: 'addStat', target: 'run', stat: 'dadEgo', amount: 15 },
            { op: 'addStat', target: 'role:child', stat: 'morale', amount: -15 },
          ],
        },
      ],
    },
    {
      id: 'EV_FUEL_CHICKEN',
      title: 'The 0 km Remaining Chicken Run',
      category: 'HAZARD',
      baseWeight: 10,
      preamble: "The digital dashboard flashes 'Range: 0 km'. Brad claims every Japanese & Korean engine has an unadvertised 40 km buffer.",
      dialogue: [
        { speaker: 'Brad', text: 'Look at the needle, it still has a millimeter of bounce. We will easily make the Shell at Nabiac.' },
        { speaker: 'Tegan', text: 'If we break down on the Mooney Mooney bridge, I am leaving you in the breakdown lane.' },
      ],
      choices: [
        {
          label: 'Slipstream a B-Double Truck in Neutral',
          description: 'Roll d100. 65% pass into servo (+25 Dad Ego). 35% engine stalls on highway.',
          roll: {
            type: 'd100',
            threshold: 65,
          },
          onPass: [
            { op: 'addStat', target: 'run', stat: 'dadEgo', amount: 25 },
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: 10 },
          ],
          onFail: [
            { op: 'addTime', turns: 2 },
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: -35 },
            { op: 'addStat', target: 'run', stat: 'traction', amount: -20 },
          ],
        },
        {
          label: 'Panic Exit at Nearest Rural General Store',
          description: 'Costs $15 extra for artisanal mower petrol, but guaranteed safe.',
          requires: { item: 'cashCents', qty: 1500 },
          effects: [
            { op: 'addResource', item: 'cashCents', amount: -1500 },
            { op: 'addStat', target: 'run', stat: 'traction', amount: 20 },
          ],
        },
      ],
    },
    {
      id: 'EV_RED_FROG_TAX',
      title: 'The Red Frog Backseat Extortion',
      category: 'HAZARD',
      baseWeight: 10,
      preamble: 'Oliver has found the hidden packet of Allen’s Red Frogs in the glovebox and now controls the family currency.',
      dialogue: [
        { speaker: 'Oliver (4)', text: 'I got the red ones! If Jack touches me I eat all of them right now!' },
        { speaker: 'Jack (6)', text: 'HE IS HOLDING FIVE IN HIS MOUTH! MUM!' },
      ],
      choices: [
        {
          label: 'Bribe with YouTube Kids Download',
          description: 'Requires USB Charger (Part B). Boys calm down peacefully.',
          requires: { item: 'partB', qty: 1 },
          effects: [
            { op: 'addStat', target: 'role:child', stat: 'morale', amount: 20 },
          ],
        },
        {
          label: 'Dad Arm Reach Blind Grab',
          description: 'Roll d100. 50% successfully snatch bag. 50% red frog stuck to seat fabric.',
          roll: {
            type: 'd100',
            threshold: 50,
          },
          onPass: [
            { op: 'addResource', item: 'food', amount: 5 },
            { op: 'addStat', target: 'run', stat: 'dadEgo', amount: 15 },
          ],
          onFail: [
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: -20 },
            { op: 'addStat', target: 'role:child', stat: 'morale', amount: -15 },
          ],
        },
      ],
    },
    {
      id: 'EV_CARAVAN_OVERTAKE',
      title: "Gary's Jayco Caravan Convoys",
      category: 'HAZARD',
      baseWeight: 12,
      preamble: 'Stuck behind a tandem-axle Jayco caravan doing 71 km/h on a single-lane bypass with double white lines.',
      dialogue: [
        { speaker: 'Brad', text: 'Gary has had five pull-over bays and ignored every single one. He is doing this to spite me specifically.' },
        { speaker: 'Tegan', text: 'Breathe, Brad. Do not undertake on the gravel verge.' },
      ],
      choices: [
        {
          label: 'The Overtaking Lane Slingshot',
          description: 'Floor the accelerator when the 400m passing lane appears. Consumes fuel.',
          effects: [
            { op: 'addStat', target: 'run', stat: 'traction', amount: -10 },
            { op: 'addStat', target: 'run', stat: 'dadEgo', amount: 20 },
          ],
        },
        {
          label: 'Accept Gary as Your Spiritual Guide',
          description: 'Drive at 70 km/h for the next hour. Saves fuel, but Adults lose Sanity.',
          effects: [
            { op: 'addTime', turns: 1 },
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: -20 },
          ],
        },
      ],
    },
    {
      id: 'EV_MUTINY_COFFS',
      title: 'The Big Banana Backseat Mutiny',
      category: 'HAZARD',
      baseWeight: 12,
      preamble: 'The iconic 13-meter fiberglass banana looms on the highway crest outside Coffs Harbour.',
      dialogue: [
        { speaker: 'Boys', text: 'THE BIG BANANA! DAD STOP! STOP THE CAR! WE HAVE TO GO ON THE TOBOGGAN!' },
        { speaker: 'Brad', text: 'We are four hours behind schedule and the toll road closes at eight!' },
      ],
      choices: [
        {
          label: 'Pull In for 30 Mins of Tourist Glory',
          description: 'Costs $35 and 1 leg. Restores all Kids to 100% Morale.',
          requires: { item: 'cashCents', qty: 3500 },
          effects: [
            { op: 'addResource', item: 'cashCents', amount: -3500 },
            { op: 'addTime', turns: 1 },
            { op: 'addStat', target: 'role:child', stat: 'morale', amount: 35 },
            { op: 'addStatus', target: 'role:child', status: 'Delighted' },
          ],
        },
        {
          label: 'The Cold-Blooded Bypass Push',
          description: 'Keep driving past the exit. Triggers full cabin tantrum mutiny (-35 Morale).',
          effects: [
            { op: 'addStat', target: 'role:child', stat: 'morale', amount: -35 },
            { op: 'addStatus', target: 'role:child', status: 'Mutinous' },
          ],
        },
      ],
    },
  ],
};
