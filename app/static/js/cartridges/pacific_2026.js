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

export const PACIFIC_2026_TALK_POOLS = {
  mooney_mooney: [
    {
      speaker: 'Dave (NRMA Tow Truckie eating a Chiko Roll)',
      quote:
        "Listen to me, mate: you've got three boys under seven and a Siberian cat in the boot of a loaded family bus. If you hammer the right lane on 'The Cannonball' pace, someone's throwing a full-blown tanty before the Gosford turnoff. Set cruise to 100, crack the air-con, and stick to 'Grand Cruise'.",
    },
    {
      speaker: 'Kylie (Caravan Veteran in a 200 Series LandCruiser)',
      quote:
        "The Mooney Mooney bridge camera flashes both ways, champ. Don't try and slingshot down the hill past the logging trucks. And check your roof pod latch right now—if that thing pops at 110, your camping chairs will be all over the Hawkesbury.",
    },
    {
      speaker: 'Brett (Stressed Dad pumping 98 Octane)',
      quote:
        "Whatever you do, don't let the kids start the Bluey iPad playlist yet. Burn through normal radio while they're still looking out the window at the sandstone cliffs. Save the screens for when the wheels really fall off around Karuah!",
    },
  ],
  heatherbrae_pies: [
    {
      speaker: 'Shazza (Heatherbrae Bakery Legend)',
      quote:
        'Order the chunky steak and pepper pies, darl, and grab two bags of sausage rolls for the console. Once you pass Bulahdelah, the servo food turns into lukewarm plastic triangles that will give your driver the stomach wobbles before Coffs.',
    },
    {
      speaker: 'Gaz (Tradie in Hi-Vis clutching an Oak Choccy Milk)',
      quote:
        "Mate, if you've got any 12V USB-C leads in the glovebox, hold onto 'em like gold. Some bloke over by the caravan pumps just offered me twenty bucks and a meat pie for an iPhone cord because his daughter's tablet died.",
    },
    {
      speaker: 'Wendy (Grey Nomad washing her windscreen)',
      quote:
        "Bucketts Way shortcut ahead looks tempting on Google Maps, love, but it's eighty k's of winding potholed bitumen with logging trucks and zero phone reception. If your little ones get car sick, stay on the M1 dual carriageway.",
    },
  ],
  bulahdelah: [
    {
      speaker: 'Mick (Driver Reviver Volunteer pouring instant blend)',
      quote:
        'Free tea, instant coffee, and an Arrowroot biscuit, mate! Take twenty minutes to let the boys kick a footy on the grass. A twenty-minute run in the park resets the backseat border wars better than any snack drop.',
    },
    {
      speaker: 'Chloe (Mum juggling toddlers by the swing set)',
      quote:
        'Check the baby nappy before you strap them back in! Arthur looks comfortable now, but twenty minutes in a warm booster seat on the Pacific Highway will turn a damp pouch into an apocalyptic Code Brown. Do not risk it!',
    },
    {
      speaker: 'Terry (Truckie on his compulsory logbook break)',
      quote:
        "Caravans are grouping up thick near Nabiac, mate. If you get stuck behind Gary doing 74 in the overtaking lane, don't ride his bumper and fry your brakes. Drop back, wait for the dual-lane grade, and pass clean.",
    },
  ],
  port_macquarie: [
    {
      speaker: 'Brooke (Koala Hospital Volunteer)',
      quote:
        'Take the detour into Town Beach if your cabin sanity is below fifty percent! Twenty minutes watching the waves and letting the kids spot dolphins will cure that glassy-eyed thousand-yard stare both of you have got right now.',
    },
    {
      speaker: 'Wayne (Local Fisherman in stubbies and thongs)',
      quote:
        'Highway servo prices past Port Macquarie are fair dinkum armed robbery. Seven dollars for a bottle of water and fifteen bucks for a sandwich! If you need supplies, pull into the real supermarket in town and load the esky.',
    },
    {
      speaker: 'Garry (Dual-Cab Ranger owner)',
      quote:
        'East Coast low pressure trough is dumping rain over the Macleay floodplain ahead. When that spray kicks up off the B-doubles, visibility drops to two white posts. Check your wiper blades and turn your real headlights on, not just the daytime LEDs.',
    },
  ],
  kempsey: [
    {
      speaker: 'Trevor (Macleay Valley Highway Patrol Officer)',
      quote:
        "Afternoon, folks. Everyone buckled up proper in rows two and three? Don't let the kids unclip their shoulder belts to reach dropped iPads under the seats. We've got radar set up along the bypass flats all long weekend.",
    },
    {
      speaker: 'Baz (Grey Nomad hauling a 28ft Jayco)',
      quote:
        "G'day mate! Yeah, I know I'm sitting on 78 in a 110 zone, but Cheryl reckons the tow-ball oscillates if I hit eighty! We'll pull into the slow vehicle turnout eventually, but don't hold your breath—we're listening to an audiobook!",
    },
    {
      speaker: 'Eileen (Local River Resident)',
      quote:
        "If the highway's backed up at the bridge, some folks try the old river flats detour. Don't do it in a front-wheel-drive family wagon; the causeway's got two inches of greasy river mud that will spin your street tyres in a heartbeat.",
    },
  ],
  coffs_harbour: [
    {
      speaker: 'Banana Jim (Big Banana Staff in Yellow Visor)',
      quote:
        'Welcome to the Big Yellow Boss, mate! Look, do yourself a favor: buy the boys a chocolate-coated frozen banana and take the photo on the giant concrete step. If you drive past without stopping, the kids will stage a protest scream that will shatter your windscreen.',
    },
    {
      speaker: 'Steve (Melbourne Dad doing the north run)',
      quote:
        "We tried the 'Look kids, a horse!' distraction at 110 km/h. Jack saw the banana from three kilometers out. Complete meltdown. Cost me forty-five minutes, thirty-two dollars, and my dignity. Just pull over, mate.",
    },
    {
      speaker: 'Sandy (Cafe Attendant)',
      quote:
        'Double-shot flat white for the driver? Take two. The Coffs bypass roadworks ahead squeeze three lanes into one with concrete barriers. It is forty minutes of bumper-to-bumper clutch-slipping gridlock.',
    },
  ],
  maclean: [
    {
      speaker: 'Uncle Col (Clarence Valley Cane Farmer)',
      quote:
        "Notice the telephone poles painted in Scottish tartan? You're in Maclean, champ. If you want the real coastal secret, take the turnoff out to Brooms Head or Iluka for twenty minutes. Best fish and chips on the east coast, and zero highway madness.",
    },
    {
      speaker: 'Fiona (Campervan Traveller from Byron)',
      quote:
        'Clarence River vehicular ferry is running if the highway bridge is jammed, but it only takes six cars at a time. Unless you have twenty minutes to yarn with the ferryman about cane toads, stay on the bridge.',
    },
    {
      speaker: 'Darren (Tradie towing a jet ski)',
      quote:
        "Highway's wide and smooth through the cane fields here—you can finally make good time! Just watch for coastal emus wandering out of the scrub near the national park. Hitting an emu at a hundred will total your radiator.",
    },
  ],
  ballina: [
    {
      speaker: 'Mick (Prawn Trawler Deckhand at the Big Prawn)',
      quote:
        'Grab a kilo of fresh school prawns from the co-op, mate! Tailgate lunch right under the giant fiberglass prawn. Just make sure the boys do not drop prawn heads down the car door cup holders—twenty-four hours in sub-tropical sun and your SUV will smell like an open sewer forever.',
    },
    {
      speaker: 'Bec (Byron Hinterland Commuter)',
      quote:
        'Byron Bay turnoff ahead is gridlocked with campervans and kombis trying to find parking. Do not take the scenic lighthouse detour unless you want to spend two hours idling in first gear while the kids kick your back seat.',
    },
    {
      speaker: 'Russ (Retired Truckie)',
      quote:
        "You're entering the home stretch now, but don't lose your focus. The dual lanes through the St Helena tunnel have speed cameras on both portals. Keep cruise locked to 110 and let the impatient utes tailgate all they want.",
    },
  ],
  tugun_border: [
    {
      speaker: 'Gold Coast Merge Warden (Traffic Controller in Neon)',
      quote:
        'Welcome to the Sunshine State merge, legend! Three lanes of M1 traffic squeezed down into Gold Coast holiday madness at thirty-two degrees. If the air-con isn not blowing arctic and the snacks are not flowing, you are in for a rough run.',
    },
    {
      speaker: 'Liam (Surfer in a beaten-up Subaru)',
      quote:
        'Currumbin bottleneck ahead! If you have snacks left in your esky, this is where you deploy the nuclear option. Give Jack and Oliver the Freddo Frogs and put Arthur pacifier in right now. It is twenty k of stop-start brake lights to Nerang.',
    },
    {
      speaker: 'Barb (Tweed Heads Local)',
      quote:
        'Almost in Brisbane, love! Just watch the lane merges after the airport tunnel. Keep Brad focused on the overhead gantry signs for the Gateway Motorway—miss that exit and you will find yourself touring Surfers Paradise high-rises with a screaming two-year-old!',
    },
  ],
  brisbane_arrival: [
    {
      speaker: 'Neighbour Kev (Leaning on the Fence with a Coldie)',
      quote:
        "G'day Brad, g'day Tegan! You made it! Look at that roof pod—covered in bugs from the Clarence Valley, but the wagon's in one piece. Step out of the car, leave the bags in the boot for tomorrow, and crack a cold one. You survived the M1!",
    },
    {
      speaker: 'Grandma Carter (Standing at the Front Door)',
      quote:
        'Look at my beautiful boys! Jack, Oliver, Arthur! Come inside and get a real home-cooked meal. Did your father try to do the whole nine hundred kilometers without stopping for a proper sit-down lunch again?',
    },
    {
      speaker: 'Maple (Stretching Out of the Pet Carrier)',
      quote:
        '*Prrrr-meow!* (Translation: The acoustic trials of the St Helena tunnel were severe, human, but my paws are once again on solid northern ground. Bring me tuna immediately.)',
    },
  ],
};

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

  // Waypoints from Sydney Harbour to Brisbane River
  waypoints: [
    {
      id: 'wp_sydney',
      name: 'Sydney Harbour / Northconnex',
      distance: 0,
      landmark: true,
      servoStop: true,
      hasStore: true,
      storeName: 'Woolworths & Servo Express (Pennant Hills)',
      talkPool: PACIFIC_2026_TALK_POOLS.mooney_mooney,
      isCheckpoint: true,
    },
    {
      id: 'wp_hawkesbury',
      name: 'Hawkesbury River Bridge',
      distance: 55,
      talkPool: PACIFIC_2026_TALK_POOLS.mooney_mooney,
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
      talkPool: PACIFIC_2026_TALK_POOLS.heatherbrae_pies,
      isBranchPoint: true,
      branches: [
        {
          id: 'bucketts',
          label: 'Take Bucketts Way / Putty Shortcut (-40 km, no police, 1.6x motion sickness & potholes)',
          distanceDelta: -40,
          hazardMult: 1.6,
        },
        {
          id: 'm1_coastal',
          label: 'Stay on M1 Pacific Motorway (+25 km, smooth cruising & servos)',
          distanceDelta: 25,
          hazardMult: 0.9,
        },
      ],
      isCheckpoint: true,
    },
    {
      id: 'wp_bulahdelah',
      name: 'Bulahdelah Driver Reviver',
      distance: 235,
      landmark: true,
      servoStop: true,
      hasStore: true,
      storeName: 'Bulahdelah Roadhouse & Driver Reviver',
      talkPool: PACIFIC_2026_TALK_POOLS.bulahdelah,
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
      talkPool: PACIFIC_2026_TALK_POOLS.port_macquarie,
      isCheckpoint: true,
    },
    {
      id: 'wp_kempsey',
      name: 'Kempsey / Macleay River',
      distance: 420,
      servoStop: true,
      hasStore: true,
      storeName: "Kempsey 24hr Neon Roadhouse ('Yes, the Sandwich is $14.50')",
      talkPool: PACIFIC_2026_TALK_POOLS.kempsey,
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
      talkPool: PACIFIC_2026_TALK_POOLS.coffs_harbour,
      isCheckpoint: true,
    },
    {
      id: 'wp_maclean',
      name: 'Maclean & Brooms Head Turnoff',
      distance: 660,
      landmark: true,
      talkPool: PACIFIC_2026_TALK_POOLS.maclean,
    },
    {
      id: 'wp_ballina',
      name: 'Ballina Big Prawn & Byron Hinterland',
      distance: 740,
      landmark: true,
      servoStop: true,
      hasStore: true,
      storeName: 'Ballina Highway Oasis & Bait Shop',
      talkPool: PACIFIC_2026_TALK_POOLS.ballina,
      isBranchPoint: true,
      branches: [
        {
          id: 'coastal_strip',
          label: 'Take Gold Coast Highway Coastal Strip (Free, beach traffic & lights)',
          distanceDelta: 15,
          hazardMult: 1.4,
        },
        {
          id: 'tugun_bypass',
          label: 'Take M1 Tugun Bypass / Express Lane (Toll/bribe option, high speed)',
          distanceDelta: -10,
          hazardMult: 0.85,
        },
      ],
      isCheckpoint: true,
    },
    {
      id: 'wp_border',
      name: 'Tugun / QLD Border',
      distance: 820,
      servoStop: true,
      hasStore: true,
      storeName: 'Tugun Border Express Mart',
      talkPool: PACIFIC_2026_TALK_POOLS.tugun_border,
      obstacle: {
        type: 'gridlock',
        phi: 0.70,
        psi: 0.60,
        costCents: 800,
        label: 'Gold Coast Holiday Crawl',
        guideCost: { slot: 'food', qty: 25, label: 'Choccy Milk & Red Frog Peace Accord (25 Snacks)' },
      },
    },
    {
      id: 'wp_brisbane',
      name: 'Brisbane River / Northern Suburbs',
      distance: 920,
      landmark: true,
      goal: true,
      talkPool: PACIFIC_2026_TALK_POOLS.brisbane_arrival,
      isCheckpoint: true,
    },
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
