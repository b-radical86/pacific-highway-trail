/**
 * Cartridge 1: 1848 Oregon Trail (Faithful Historical Simulation).
 *
 * Includes:
 * - Occupations (Banker, Carpenter, Farmer)
 * - 12 Waypoints with obstacle parameters (Phi, Psi, costCents)
 * - Matt's General Store Outfitter pricing
 * - 10 Classic Oregon Trail declarative events
 */

export const OREGON_1848_TALK_POOLS = {
  independence: [
    {
      speaker: 'Zebediah (Veteran Wagon Master)',
      quote:
        "Don't skimp on your oxen team, friend. Two beasts can barely haul an unloaded schooner out of Missouri mud. You want at least three yokes—six sturdy oxen—if you hope to see the Platte before summer heat boils the grass.",
    },
    {
      speaker: 'Clara (Departing Emigrant)',
      quote:
        "Matt's General Store right here in town is the cheapest flour you'll see. By the time you reach Fort Laramie, prices jump double; by Fort Hall, they'll demand three times the coin. Fill your barrels now!",
    },
    {
      speaker: "Silas (Blacksmith's Apprentice)",
      quote:
        'Take at least one spare axle and two extra wheels. You can patch canvas with greasy rags, but when a hickory axle snaps thirty miles past the Big Blue, you either trade half your flour to a passing wagon or leave your trunk in the ditch.',
    },
  ],
  kansas_river: [
    {
      speaker: 'Ferryman Jacques',
      quote:
        "She's running deep today—over four feet in the channel. If the depth gauge reads above three feet, don't even think of fording. You'll swamp your bed, soak your powder, and drown your winter bacon. Pay the five dollars or caulk tight.",
    },
    {
      speaker: 'Abner (Illinois Farmer on the Bank)',
      quote:
        "We've been camped here two days watching the water mark on that willow stump. If the rain holds off, the river drops nearly half a foot every sunup. Rations cost less than a sunken wagon—sometimes waiting is the shrewd move.",
    },
    {
      speaker: 'Martha (Mending Canvas)',
      quote:
        "The ferry queue's backed up half a mile into the scrub. If you've got the five dollars, hand it over and wait your turn; if not, grease your floor seams with tallow and pray the current doesn't roll your box.",
    },
  ],
  big_blue_river: [
    {
      speaker: 'Marnie Stewart (Tired Emigrant)',
      quote:
        'My cousin tried to rush across last Tuesday after a prairie squall. Current took his lead oxen right off their feet. Lost fifty pounds of lead shot and his good wool coats. Respect the mud on these banks.',
    },
    {
      speaker: 'Jedediah (Cattle Drover)',
      quote:
        "Watch your beasts closely along the Blue. Grass looks green and lush, but standing water breeds the belly rot. If an ox starts limping or heaving, slacken your pace to 'Steady' or you'll be pulling the tongue yourself.",
    },
    {
      speaker: 'Doctor Thorne',
      quote:
        "Wash your tin cups in boiling water, folks. The cholera hasn't caught up to us from the settlements yet, but dirty creek water and bad salt pork will bring on the black vomit faster than an Indian arrow.",
    },
  ],
  fort_kearney: [
    {
      speaker: "Sergeant O'Malley (Post Quartermaster)",
      quote:
        "Welcome to the frontier garrison. Notice the price board? Flour's thirty cents a pound here—up from twenty back home. Stock up on lead balls if you plan to hunt the buffalo herds along the Platte.",
    },
    {
      speaker: 'Buckskin Joe (Platte River Scout)',
      quote:
        'Greenhorns waste twenty rounds of powder shooting at every shaggy bull on the horizon, then realize they can only lug a hundred pounds of meat back before the wolves circle. Shoot one good cow, take the hump meat, and keep rolling.',
    },
    {
      speaker: 'Reverend Whitfield',
      quote:
        'Ahead lies five hundred miles of sand hills and alkali dust. Check your wheel rims every evening; the dry prairie air shrinks the green felloes until the iron tires roll right off the wood.',
    },
  ],
  chimney_rock: [
    {
      speaker: 'Celinda Hines (Diarist on the Trail)',
      quote:
        "You can see that great spire thirty miles off, yet you pull toward it all day and seem no closer! It's an inspiring sight, but don't wander off the tracks to sketch it—rattlesnakes nest thick in the sagebrush.",
    },
    {
      speaker: 'Gideon (Ohio Emigrant)',
      quote:
        "The Shoshone and Pawnee bands trading near the bluffs are peaceful enough if you mind your manners. They're keen for sturdy boots and wool clothing—they'll swap fresh antelope meat or dried buffalo tongue on fair terms.",
    },
    {
      speaker: 'Maude (Stirring a Dutch Oven)',
      quote:
        "We cut down to 'Meager' rations two days back to stretch the flour. The children grumble, but our oxen are slowing down on the gravel tracks. Keep your pace steady and don't tire your team before the mountains.",
    },
  ],
  fort_laramie: [
    {
      speaker: 'Trader Pierre (French-Canadian Trapper)',
      quote:
        'Beyond Laramie, the plains end and the real climb begins. Everything at my trading counter costs double what you paid in Missouri, but try finding a hickory wagon tongue between here and South Pass! Buy spares while you can.',
    },
    {
      speaker: 'Lieutenant Evans',
      quote:
        'Inspect your running gear before tackling the Black Hills. Steep grades and flint rock shatter brittle spokes. If an axle cracks, pull into camp and attempt a trade—passing wagons often have parts if you have lead or bacon to barter.',
    },
    {
      speaker: 'Running Wolf (Lakota Trader)',
      quote:
        'Mountain water runs sweet and cold, but mountain air turns freezing fast when the leaves turn yellow. If you reach the big pass after October, the snow will cover your wagons before you smell the Pacific.',
    },
  ],
  independence_rock: [
    {
      speaker: 'Caleb (Carving His Initials on Granite)',
      quote:
        "They call it the Great Register of the Desert. If you reach Independence Rock by the Fourth of July, you're on good time to cross the Blue Mountains before the snows fall. If it's already August, you had best whip up your team!",
    },
    {
      speaker: 'Hannah (Washing Skirts at Sweetwater River)',
      quote:
        'Drink your fill here at the Sweetwater, girls! Beyond this ridge, the alkali sinks start. White crust covers the ground like frost, and if your oxen drink that brackish poison, they will bloat and drop dead within the hour.',
    },
    {
      speaker: 'Enoch (Old Mountain Man)',
      quote:
        "Don't let the clear sky fool you. High plains lightning will strike an iron-rimmed wagon clean in the middle of a dry flat. Keep your team calm and don't run on 'Grueling' pace when the wind howls off the divide.",
    },
  ],
  south_pass: [
    {
      speaker: 'Guide Jim Bridger',
      quote:
        "You've crossed the Continental Divide, pilgrims! Waters behind you flow to the Atlantic; waters ahead run to the Pacific. Ahead lies your biggest choice: head south to my fort for good grass and smithing, or gamble on the dry Sublette Cutoff.",
    },
    {
      speaker: 'Ezra (Debating the Trail Fork)',
      quote:
        "The Sublette Cutoff shaves nearly sixty miles off the trail, but it's fifty miles of desert with not a drop of sweet water from the Big Sandy to Green River! If your water casks are dry, stay on the road to Fort Bridger.",
    },
    {
      speaker: 'Widow Campbell',
      quote:
        'We are taking the fort road. It is longer, aye, but my husband died of the fever back at Laramie, and I cannot risk these three young ones in a dry waterless furnace without a blacksmith nearby.',
    },
  ],
  green_river: [
    {
      speaker: 'Mormon Ferry Operator',
      quote:
        'Ten dollars or two prime wool blankets to ride the cable ferry across the Green. She runs swift, deep, and ice-cold right out of the Wind River snowfields. Fording here is pure suicide for an overloaded schooner.',
    },
    {
      speaker: 'Tobias (Caulking His Wagon Box)',
      quote:
        'Ten dollars is robbery! We took our wagon box off the bolsters, smeared pine pitch into the planks, and we are floating her across ourselves. High risk, sure, but ten dollars buys sixty pounds of salt pork at Fort Hall!',
    },
    {
      speaker: 'Seth (Watching the Churning Current)',
      quote:
        "If you wait a day or two, sometimes the high snowmelt crest passes and the river calms down. Don't be too proud to camp on the shingle and rest your cattle while the current drops an inch or two.",
    },
  ],
  fort_hall: [
    {
      speaker: "Hudson's Bay Factor MacLeod",
      quote:
        'Aye, flour is sixty-five cents a pound here, and salt pork is forty! Freight comes hundreds of miles up the Columbia Gorge on bateaux. Complain if you like, but you have five hundred miles of basalt canyon ahead.',
    },
    {
      speaker: 'Amos (Wagon Driver from Indiana)',
      quote:
        'Throw out that heavy mahogany dresser, folks. The Snake River canyon trails are narrow rock shelves where a heavy wagon will drag the oxen over the precipice. Travel light, keep your powder dry, and check your brakes.',
    },
    {
      speaker: 'Prudence (Boiling Sage Tea)',
      quote:
        'The dust along the Snake is like flour—it gets into your eyes, your bread, your lungs. Keep wet rags over the children faces when the wind picks up off the volcanic plains.',
    },
  ],
  snake_river_crossing: [
    {
      speaker: 'Shoshone River Guide',
      quote:
        'River wide, current treacherous over slick round boulders. For two shirts or a good spare wheel, I ride the lead horse and show you the shallow gravel bar across the islands. Without guide, many wagons flip.',
    },
    {
      speaker: 'Captain Lewis (Trail Veteran)',
      quote:
        "The water isn't deep—barely four feet over the gravel shelf—but the current pulls like a team of runaway horses. Double-team your strongest oxen to the lead wagon and don't stop moving for a second.",
    },
    {
      speaker: 'Dorothy (Crying over a Lost Chest)',
      quote:
        'Our box took a lurch on a submerged boulder! The tailgate burst open and my mother silver teapot went straight to the riverbed. Hold tight to your lines and do not carry extra weight on the downriver side.',
    },
  ],
  the_dalles: [
    {
      speaker: 'Barge Captain Silas',
      quote:
        "You've reached the Columbia, travellers! From here, the overland trail ends at the rock walls. You can build a pine raft and shoot the rapids down to Fort Vancouver, or pay the toll and take the Barlow Road around Mount Hood.",
    },
    {
      speaker: "Sam Barlow's Toll Collector",
      quote:
        'Eight dollars toll for the Mount Hood road! It is a brutal, axle-snapping drag through mud and timber, but at least your wagon stays on dry ground. The Columbia rapids have drowned more families than the fever ever did.',
    },
    {
      speaker: 'Horace (Surveying the River Gorge)',
      quote:
        "If you've got strong arms and steady nerves, raft the river! It costs no coin, but one scrape on the basalt pillars at the Cascades and your whole year journey ends in the foam. Choose with your head, not your wallet.",
    },
  ],
  willamette: [
    {
      speaker: 'Judge Thornton (Oregon City Magistrate)',
      quote:
        'Welcome to the Willamette Valley! Stake your claim, register your township lot, and let your oxen graze in clover. You have conquered two thousand miles of mountain, dust, and river.',
    },
    {
      speaker: 'Eliza (First Emigrant Wave of 1843)',
      quote:
        'Rest your weary bones, friends. The soil here is black gold—potatoes grow as big as children heads and winter wheat yields sixty bushels to the acre. You are home!',
    },
    {
      speaker: 'Dr. John McLoughlin (Fort Vancouver)',
      quote:
        'You have crossed the continent through grit and perseverance. May your harvests be bountiful and your hearth warm. Welcome to Oregon!',
    },
  ],
};

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
      talkPool: OREGON_1848_TALK_POOLS.independence,
      isCheckpoint: true,
    },
    {
      id: 'wp_kansas',
      name: 'Kansas River Crossing',
      distance: 102,
      talkPool: OREGON_1848_TALK_POOLS.kansas_river,
      obstacle: { type: 'river', phi: 0.35, psi: 0.30, costCents: 500, label: 'Kansas River Crossing' },
    },
    {
      id: 'wp_blue',
      name: 'Big Blue River',
      distance: 185,
      talkPool: OREGON_1848_TALK_POOLS.big_blue_river,
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
      talkPool: OREGON_1848_TALK_POOLS.fort_kearney,
      isCheckpoint: true,
    },
    {
      id: 'wp_chimney',
      name: 'Chimney Rock',
      distance: 554,
      landmark: true,
      talkPool: OREGON_1848_TALK_POOLS.chimney_rock,
    },
    {
      id: 'wp_laramie',
      name: 'Fort Laramie',
      distance: 640,
      landmark: true,
      tradingPost: true,
      hasStore: true,
      storeName: 'Fort Laramie Trading Co.',
      talkPool: OREGON_1848_TALK_POOLS.fort_laramie,
      isCheckpoint: true,
    },
    {
      id: 'wp_indep_rock',
      name: 'Independence Rock',
      distance: 830,
      landmark: true,
      talkPool: OREGON_1848_TALK_POOLS.independence_rock,
    },
    {
      id: 'wp_south_pass',
      name: 'South Pass (Continental Divide)',
      distance: 932,
      landmark: true,
      talkPool: OREGON_1848_TALK_POOLS.south_pass,
      isBranchPoint: true,
      branches: [
        {
          id: 'sublette',
          label: 'Take Sublette Cutoff (-50 mi, 1.5x hazards, skips Fort Bridger)',
          distanceDelta: -50,
          hazardMult: 1.5,
        },
        {
          id: 'bridger',
          label: 'Detour to Fort Bridger (+65 mi, 0.85x hazards, full Trading Post access)',
          distanceDelta: 65,
          hazardMult: 0.85,
        },
      ],
      isCheckpoint: true,
    },
    {
      id: 'wp_green',
      name: 'Green River Crossing',
      distance: 1080,
      talkPool: OREGON_1848_TALK_POOLS.green_river,
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
      talkPool: OREGON_1848_TALK_POOLS.fort_hall,
      isCheckpoint: true,
    },
    {
      id: 'wp_snake',
      name: 'Snake River Crossing',
      distance: 1534,
      talkPool: OREGON_1848_TALK_POOLS.snake_river_crossing,
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
      talkPool: OREGON_1848_TALK_POOLS.the_dalles,
      isBranchPoint: true,
      branches: [
        {
          id: 'barlow',
          label: 'Pay $8.00 Barlow Road Toll (Mud & mountain grade, safe from drowning)',
          distanceDelta: 0,
          hazardMult: 1.2,
        },
        {
          id: 'raft',
          label: 'Float Columbia River Rapids (Free, perilous rapids)',
          distanceDelta: -30,
          hazardMult: 1.8,
        },
      ],
      obstacle: {
        type: 'gorge',
        phi: 0.70,
        psi: 0.70,
        costCents: 800,
        label: 'Columbia River Gorge / $8.00 Barlow Road Toll',
        guideCost: { slot: 'food', qty: 30, label: 'Hire Local Portage Crew (30 lbs Food)' },
      },
      isCheckpoint: true,
    },
    {
      id: 'wp_willamette',
      name: 'Willamette Valley, Oregon',
      distance: 2000,
      landmark: true,
      goal: true,
      talkPool: OREGON_1848_TALK_POOLS.willamette,
      isCheckpoint: true,
    },
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
