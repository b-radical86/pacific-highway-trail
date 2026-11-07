/**
 * Cartridge 1: 1848 Oregon Trail (Faithful Historical Simulation).
 *
 * Includes:
 * - Occupations (Banker, Carpenter, Farmer)
 * - 12 Waypoints with obstacle parameters (Phi, Psi, costCents)
 * - Matt's General Store Outfitter pricing
 * - 10 Classic Oregon Trail declarative events
 */

export const OREGON_1848_CARTRIDGE = {
  id: 'oregon_1848',
  title: 'The Oregon Trail (1848)',
  subtitle: 'Independence, Missouri to Willamette Valley, Oregon',
  totalDistance: 2000,
  distanceUnit: 'mi',
  timeUnit: 'days',
  dBase: 20,
  lambdaBase: 0.10,
  tPar: 160,
  kt: 25,

  // Occupations
  occupations: [
    {
      id: 'banker',
      label: 'Banker from Boston',
      cashCents: 160000, // $1,600.00
      scoreMultiplier: 1.0,
      description: 'Wealthy starting reserves. Balanced 1.0x score multiplier.',
      perks: {},
    },
    {
      id: 'carpenter',
      label: 'Carpenter from Ohio',
      cashCents: 80000, // $800.00
      scoreMultiplier: 2.0,
      description: 'Moderate budget. +35% field repair success chance.',
      perks: { carpenterPerk: true },
    },
    {
      id: 'farmer',
      label: 'Farmer from Illinois',
      cashCents: 40000, // $400.00
      scoreMultiplier: 3.0,
      description: 'Tight budget. +25% foraging yield & oxen resilience.',
      perks: { farmerPerk: true },
    },
  ],

  // Default Party Roster
  defaultParty: [
    { name: 'Dave (Leader)', role: 'primary', health: 100, morale: 100, status: 'Healthy', statusEffects: [] },
    { name: 'Sarah (Spouse)', role: 'primary', health: 100, morale: 100, status: 'Healthy', statusEffects: [] },
    { name: 'Thomas', role: 'secondary', health: 100, morale: 100, status: 'Healthy', statusEffects: [] },
    { name: 'Mary', role: 'secondary', health: 100, morale: 100, status: 'Healthy', statusEffects: [] },
    { name: 'Little Jed', role: 'secondary', health: 100, morale: 100, status: 'Healthy', statusEffects: [] },
  ],

  // Pacing Options
  paceMultipliers: {
    steady: 0.625,    // ~12.5 mi/day
    strenuous: 1.0,   // ~20.0 mi/day
    grueling: 1.375,  // ~27.5 mi/day
  },

  // Outfitter Catalog (Matt's General Store)
  outfitter: [
    { id: 'food', label: 'Provisions (Bacon, Flour, Sugar)', unitCostCents: 20, bundleSize: 10, unitLabel: 'lbs' },
    { id: 'ammo', label: 'Ammunition (Lead & Powder)', unitCostCents: 200, bundleSize: 20, unitLabel: 'rounds' },
    { id: 'partA', label: 'Spare Wagon Wheel', unitCostCents: 1000, bundleSize: 1, unitLabel: 'wheel' },
    { id: 'partB', label: 'Spare Wagon Axle', unitCostCents: 1000, bundleSize: 1, unitLabel: 'axle' },
    { id: 'partC', label: 'Spare Wagon Tongue', unitCostCents: 1000, bundleSize: 1, unitLabel: 'tongue' },
  ],

  // Barter & Emigrant Trade Configuration
  barterConfig: {
    noTradeText: 'Nobody wants to trade with you today. You lost 1 day.',
    slots: {
      food: { label: 'lbs of Provisions', baseQty: 40 },
      ammo: { label: 'rounds of Ammunition', baseQty: 25 },
      traction: { label: 'Oxen Stamina / Yoke Care', baseQty: 20 },
      partA: { label: 'Spare Wagon Wheel', baseQty: 1 },
      partB: { label: 'Spare Wagon Axle', baseQty: 1 },
      partC: { label: 'Spare Wagon Tongue', baseQty: 1 },
    },
    archetypes: [
      {
        speaker: 'Traveler from Ohio',
        template:
          'A traveler from Ohio offers you {offerQty} {offerLabel} in exchange for {demandQty} {demandLabel}.',
      },
      {
        speaker: 'Stranded Missouri Family',
        template:
          'A stranded family from Missouri will trade {offerQty} {offerLabel} if you give them {demandQty} {demandLabel}.',
      },
      {
        speaker: 'Mountain Fur Trapper',
        template:
          'A mountain fur trapper offers {offerQty} {offerLabel} for {demandQty} {demandLabel}.',
      },
    ],
  },

  // 12 Waypoints across the 2,000 Mile Trail
  waypoints: [
    {
      id: 'wp_indep',
      name: 'Independence, Missouri',
      distance: 0,
      landmark: true,
      tradingPost: true,
      hasStore: true,
      storeName: "Matt's General Store (Independence)",
    },
    {
      id: 'wp_kansas',
      name: 'Kansas River Crossing',
      distance: 102,
      obstacle: { type: 'river', phi: 0.35, psi: 0.30, costCents: 500, label: 'Kansas River (Depth: 2.8 ft)' },
    },
    {
      id: 'wp_blue',
      name: 'Big Blue River',
      distance: 185,
      obstacle: { type: 'river', phi: 0.50, psi: 0.45, costCents: 600, label: 'Big Blue River (Swift Current)' },
    },
    {
      id: 'wp_kearney',
      name: 'Fort Kearney',
      distance: 304,
      landmark: true,
      tradingPost: true,
      hasStore: true,
      storeName: "Fort Kearney Sutler's Post",
    },
    { id: 'wp_chimney', name: 'Chimney Rock', distance: 554, landmark: true },
    {
      id: 'wp_laramie',
      name: 'Fort Laramie',
      distance: 640,
      landmark: true,
      tradingPost: true,
      hasStore: true,
      storeName: 'Fort Laramie Trading Co.',
    },
    { id: 'wp_indep_rock', name: 'Independence Rock', distance: 830, landmark: true },
    { id: 'wp_south_pass', name: 'South Pass (Continental Divide)', distance: 932, landmark: true },
    {
      id: 'wp_green',
      name: 'Green River Crossing',
      distance: 1080,
      obstacle: { type: 'river', phi: 0.65, psi: 0.55, costCents: 800, label: 'Green River (Deep Chasm)' },
    },
    {
      id: 'wp_fort_hall',
      name: 'Fort Hall',
      distance: 1288,
      landmark: true,
      tradingPost: true,
      hasStore: true,
      storeName: "Hudson's Bay Co. Post (Fort Hall)",
    },
    {
      id: 'wp_snake',
      name: 'Snake River Crossing',
      distance: 1534,
      obstacle: {
        type: 'river',
        phi: 0.75,
        psi: 0.60,
        costCents: 1000,
        label: 'Snake River (Turbulent Rapids)',
        guideCost: { slot: 'partA', qty: 1, label: 'Hire Shoshone Guide (1 Spare Wheel)' },
      },
    },
    {
      id: 'wp_dalles',
      name: 'The Dalles',
      distance: 1808,
      obstacle: {
        type: 'gorge',
        phi: 0.70,
        psi: 0.70,
        costCents: 800,
        label: 'Columbia River Gorge / $8.00 Barlow Road Toll',
        guideCost: { slot: 'food', qty: 30, label: 'Hire Local Portage Crew (30 lbs Food)' },
      },
    },
    { id: 'wp_willamette', name: 'Willamette Valley, Oregon', distance: 2000, landmark: true, goal: true },
  ],

  // 10 Classic Declarative Hazards & Events
  events: [
    {
      id: 'EV_1848_DYSENTERY',
      title: 'Dysentery on the Trail',
      category: 'HAZARD',
      baseWeight: 14,
      preamble: 'A sudden, debilitating fever and stomach cramps have struck your wagon.',
      dialogue: [
        { speaker: 'Sarah', text: 'Jed cannot keep anything down. His skin is clammy.' },
        { speaker: 'Dave', text: 'We must decide whether to stop and nurse him or push onward.' },
      ],
      choices: [
        {
          label: 'Camp and Administer Restorative Tea',
          description: 'Spends 2 days resting and consumes 15 lbs rations. Restores health.',
          effects: [
            { op: 'addTime', turns: 2 },
            { op: 'addResource', item: 'food', amount: -15 },
            { op: 'addStat', target: 'role:child', stat: 'health', amount: 15 },
            { op: 'addStatus', target: 'role:child', status: 'Recovered' },
          ],
        },
        {
          label: 'Press Forward on the Trail',
          description: 'Keep driving schedule. Child loses 30 health and becomes Feverish.',
          effects: [
            { op: 'addStat', target: 'role:child', stat: 'health', amount: -30 },
            { op: 'addStatus', target: 'role:child', status: 'Feverish', durationTurns: 3 },
          ],
        },
      ],
    },
    {
      id: 'EV_1848_CHOLERA',
      title: 'Severe Cholera Outbreak',
      category: 'HAZARD',
      baseWeight: 10,
      preamble: 'Contaminated spring water has caused violent cholera chills in the camp.',
      dialogue: [
        { speaker: 'Sarah', text: 'The water tasted of iron. Now my head is spinning.' },
      ],
      choices: [
        {
          label: 'Halt Train for Full Bedrest',
          description: 'Costs 3 turns. Adults recover health without worsening.',
          effects: [
            { op: 'addTime', turns: 3 },
            { op: 'addStat', target: 'role:adult', stat: 'health', amount: -10 },
          ],
        },
        {
          label: 'Strenuous Push to the Next Fort',
          description: 'Roll d100. 50% chance of making it safely; 50% severe collapse.',
          roll: {
            type: 'd100',
            threshold: 50,
          },
          onPass: [
            { op: 'addStat', target: 'role:adult', stat: 'morale', amount: 10 },
          ],
          onFail: [
            { op: 'addStat', target: 'role:adult', stat: 'health', amount: -35 },
            { op: 'addStatus', target: 'role:adult', status: 'Critical' },
          ],
        },
      ],
    },
    {
      id: 'EV_1848_BROKEN_AXLE',
      title: 'Broken Wagon Axle',
      category: 'HAZARD',
      baseWeight: 12,
      preamble: 'A concealed boulder in the tall grass violently snaps your rear hickory axle.',
      dialogue: [
        { speaker: 'Dave', text: 'The wagon is listing thirty degrees. We are not moving anywhere on three wheels.' },
      ],
      choices: [
        {
          label: 'Fit Spare Wagon Axle',
          description: 'Requires 1x Spare Axle (Part B). Quick 1-hour swap.',
          requires: { item: 'partB', qty: 1 },
          effects: [
            { op: 'addResource', item: 'partB', amount: -1 },
            { op: 'addStatus', target: 'role:all', status: 'Repaired' },
          ],
        },
        {
          label: 'Fashion New Axle from River Birch',
          description: 'Costs 3 days of heavy manual labor. Party loses morale.',
          effects: [
            { op: 'addTime', turns: 3 },
            { op: 'addStat', target: 'role:all', stat: 'morale', amount: -15 },
          ],
        },
      ],
    },
    {
      id: 'EV_1848_BROKEN_WHEEL',
      title: 'Shattered Wooden Wheel',
      category: 'HAZARD',
      baseWeight: 12,
      preamble: 'A steep shale descent breaks the iron band and spokes of your right wheel.',
      dialogue: [
        { speaker: 'Dave', text: 'Spokes are kindling. Thank the stars the wagon didn’t roll over the cliff.' },
      ],
      choices: [
        {
          label: 'Mount Spare Wheel',
          description: 'Requires 1x Spare Wheel (Part A). Instant trail fix.',
          requires: { item: 'partA', qty: 1 },
          effects: [
            { op: 'addResource', item: 'partA', amount: -1 },
          ],
        },
        {
          label: 'Splice and Iron-Band the Rim',
          description: 'Roll d100 (Carpenter +35% bonus). 40% base pass chance.',
          roll: {
            type: 'd100',
            threshold: 40,
            modifiers: [{ condition: 'has_carpenter', modifier: 35 }],
          },
          onPass: [
            { op: 'addTime', turns: 1 },
          ],
          onFail: [
            { op: 'addTime', turns: 3 },
            { op: 'addStat', target: 'role:adult', stat: 'health', amount: -15 },
          ],
        },
      ],
    },
    {
      id: 'EV_1848_BROKEN_TONGUE',
      title: 'Split Wagon Tongue',
      category: 'HAZARD',
      baseWeight: 10,
      preamble: 'The oxen surged crossing a gully, snapping the oak tongue in half.',
      dialogue: [
        { speaker: 'Thomas', text: 'Father! The wagon is loose from the yoke!' },
      ],
      choices: [
        {
          label: 'Replace with Spare Tongue',
          description: 'Requires 1x Spare Tongue (Part C).',
          requires: { item: 'partC', qty: 1 },
          effects: [
            { op: 'addResource', item: 'partC', amount: -1 },
          ],
        },
        {
          label: 'Lash Tight with Rawhide',
          description: 'Takes 1 day. Traction reduced by 15%.',
          effects: [
            { op: 'addTime', turns: 1 },
            { op: 'addStat', target: 'run', stat: 'traction', amount: -15 },
          ],
        },
      ],
    },
    {
      id: 'EV_1848_SNAKEBITE',
      title: 'Prairie Rattlesnake Strike',
      category: 'HAZARD',
      baseWeight: 8,
      preamble: 'While gathering buffalo chips for the evening fire, Mary disturbed a coiled rattlesnake.',
      dialogue: [
        { speaker: 'Mary', text: 'Something stung my ankle in the brush!' },
      ],
      choices: [
        {
          label: 'Apply Tight Tourniquet and Salve',
          description: 'Camp for 2 days. Child health reduced by 25%.',
          effects: [
            { op: 'addTime', turns: 2 },
            { op: 'addStat', target: 'role:child', stat: 'health', amount: -25 },
            { op: 'addStatus', target: 'role:child', status: 'Venom Shock' },
          ],
        },
      ],
    },
    {
      id: 'EV_1848_THIEF',
      title: 'Thief in the Night',
      category: 'HAZARD',
      baseWeight: 10,
      preamble: 'A prowler snuck into camp under the cover of a moonless river fog.',
      dialogue: [
        { speaker: 'Dave', text: 'Footprints leading toward the river bank. They cut through the burlap sacks.' },
      ],
      choices: [
        {
          label: 'Take Inventory and Fortify Night Watch',
          description: 'Lose 30 lbs of food. Morale drops slightly.',
          effects: [
            { op: 'addResource', item: 'food', amount: -30 },
            { op: 'addStat', target: 'role:all', stat: 'morale', amount: -10 },
          ],
        },
      ],
    },
    {
      id: 'EV_1848_LOST_TRAIL',
      title: 'Dense Fog & Lost Ruts',
      category: 'HAZARD',
      baseWeight: 8,
      preamble: 'Thick mountain squalls obscured the scout trails. You are off course in badlands.',
      dialogue: [
        { speaker: 'Sarah', text: 'These cliffs do not match the emigrant guidebook.' },
      ],
      choices: [
        {
          label: 'Hire Local Shoshone Guide ($10.00)',
          description: 'Requires $10.00 cash. Safely puts wagon back on main trail.',
          requires: { item: 'cashCents', qty: 1000 },
          effects: [
            { op: 'addResource', item: 'cashCents', amount: -1000 },
            { op: 'addStat', target: 'role:all', stat: 'morale', amount: 10 },
          ],
        },
        {
          label: 'Scout Ahead by Compass',
          description: 'Spend 2 days wandering rough ravines. Lose 10% traction.',
          effects: [
            { op: 'addTime', turns: 2 },
            { op: 'addStat', target: 'run', stat: 'traction', amount: -10 },
          ],
        },
      ],
    },
    {
      id: 'EV_1848_BAD_WATER',
      title: 'Alkali Springs',
      category: 'HAZARD',
      baseWeight: 10,
      preamble: 'The only waterhole for miles is white-rimmed with toxic alkali minerals.',
      dialogue: [
        { speaker: 'Dave', text: 'The oxen smell it and turn away. We must be cautious.' },
      ],
      choices: [
        {
          label: 'Boil Water & Filter Through Charcoal',
          description: 'Costs 1 turn of rest and extra fuel.',
          effects: [
            { op: 'addTime', turns: 1 },
          ],
        },
        {
          label: 'Water Animals Quickly & Fill Barrels',
          description: 'Roll d100. 60% chance oxen sicken (-20% traction).',
          roll: {
            type: 'd100',
            threshold: 40,
          },
          onPass: [
            { op: 'addStat', target: 'role:all', stat: 'morale', amount: 5 },
          ],
          onFail: [
            { op: 'addStat', target: 'run', stat: 'traction', amount: -20 },
            { op: 'addStat', target: 'role:adult', stat: 'health', amount: -15 },
          ],
        },
      ],
    },
    {
      id: 'EV_1848_OX_INJURY',
      title: 'Injured Lead Ox',
      category: 'HAZARD',
      baseWeight: 10,
      preamble: 'Your strongest lead ox threw a shoe and pulled a tendon in heavy river silt.',
      dialogue: [
        { speaker: 'Dave', text: 'He cannot pull his share of the yoke without rest.' },
      ],
      choices: [
        {
          label: 'Rest Oxen for 2 Days',
          description: 'Restores traction to full.',
          effects: [
            { op: 'addTime', turns: 2 },
            { op: 'addStat', target: 'run', stat: 'traction', amount: 20 },
          ],
        },
        {
          label: 'Shift Load to Remaining Team',
          description: 'Lose 25% traction permanently until repaired.',
          effects: [
            { op: 'addStat', target: 'run', stat: 'traction', amount: -25 },
          ],
        },
      ],
    },
  ],
};
