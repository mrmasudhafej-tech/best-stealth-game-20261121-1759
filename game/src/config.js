// Tuning and colours for Wren in the Moonmoth Archive. The playfield is a
// fixed 1280x720 logical area; the renderer scales it to the window, so no
// rule here depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Wall thickness around the playfield edge. */
export const BORDER = 24;

export const PLAYER = {
  radius: 11,
  walkSpeed: 150,
  runSpeed: 238,
  crouchSpeed: 92,
  /** Noise radius while running: guards inside it turn toward the sound. */
  runNoise: 175,
  walkNoise: 55,
};

export const GUARD = {
  patrolSpeed: 82,
  chaseSpeed: 208,
  investigateSpeed: 118,
  /** How far a guard can see, in pixels. */
  sightRange: 195,
  /** Half of the vision cone's angle, in radians. */
  sightHalfAngle: 0.56,
  /** Seconds a guard keeps chasing after losing sight before giving up. */
  chaseMemory: 2.2,
  /** Seconds a guard looks around at an investigated point. */
  lookAround: 2.0,
  /** Seconds a guard pauses at each patrol waypoint. */
  waypointPause: 0.7,
  /** Catch distance: a chasing guard this close catches Wren. */
  catchDistance: 22,
};

export const DETECTION = {
  /** Suspicion gained per second while fully seen, standing, in moonlight. */
  fillRate: 1.15,
  /** Suspicion drained per second while unseen. */
  decayRate: 0.45,
  /** Multiplier while Wren stands in a shadow patch. */
  shadowMultiplier: 0.5,
  /** Multiplier while crouched (and not already hidden by low cover). */
  crouchMultiplier: 0.62,
  /** Suspicion level at which a guard stops patrolling and investigates. */
  curiousAt: 0.45,
  /** Suspicion level at which a guard gives chase. */
  chaseAt: 1,
};

export const GAME = {
  lives: 3,
  pebbles: 5,
  /** Points per seal, plus a time bonus on finishing a night. */
  sealPoints: 150,
  winBonus: 400,
};

export const PALETTE = {
  floorA: '#3a2f28',
  floorB: '#352a23',
  rug: '#5a2e35',
  rugTrim: '#c9a35c',
  wall: '#241a16',
  wallTop: '#4a382c',
  shelf: '#2c211a',
  shelfTop: '#5d4632',
  crate: '#6b4e33',
  crateTop: '#8a6a45',
  shadow: 'rgba(16, 20, 44, 0.52)',
  moonPool: 'rgba(190, 205, 255, 0.13)',
  coneCalm: 'rgba(240, 190, 80, 0.20)',
  coneAlert: 'rgba(240, 80, 50, 0.30)',
  coneEdge: 'rgba(240, 200, 100, 0.55)',
  player: '#3ec9a7',
  playerDark: '#1f7a64',
  guard: '#c65a3d',
  guardDark: '#7e2f1e',
  lantern: '#ffd97a',
  seal: '#8fd8ff',
  exit: '#7be382',
  panel: 'rgba(18, 13, 11, 0.88)',
  text: '#f2ead9',
  muted: '#b8a98d',
  danger: '#ff6b52',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Best (fewest-caught) run kept in this browser only. */
export const BEST_KEY = 'moonmoth-archive.best';
