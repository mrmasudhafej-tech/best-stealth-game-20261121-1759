// Lantern Wardens: patrol, suspicion, chase and investigation. A guard sees
// Wren only inside its vision cone with a clear line of sight; suspicion
// fills while Wren is seen and drains while hidden, so breaking sight and
// waiting behind cover is always a way back.
import { DETECTION, GUARD } from './config.js';
import { collidesWithSolids, inShadow, sightBlocked } from './level.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_CURIOUS = 'curious';
export const GUARD_CHASE = 'chase';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_RETURN = 'return';

/** Build a guard's live state from its level definition. */
export function createGuard(definition, index) {
  const first = definition.patrol[0];
  const second = definition.patrol[1] ?? first;
  return {
    name: definition.name,
    patrol: definition.patrol,
    x: first.x,
    y: first.y,
    facing: Math.atan2(second.y - first.y, second.x - first.x),
    waypointIndex: 1 % definition.patrol.length,
    pauseLeft: 0,
    state: GUARD_PATROL,
    suspicion: 0,
    lastSeen: null,
    unseenFor: 0,
    investigatePoint: null,
    lookLeft: 0,
    sweepFrom: 0,
    stepPhase: 0,
    moving: false,
    index,
  };
}

/** Angle difference wrapped to [-PI, PI]. */
export function angleDifference(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * True when the guard can currently see Wren: inside the cone's range and
 * angle, with no shelf (or crouch-cover) in the way.
 */
export function guardCanSee(guard, player, level) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance > GUARD.sightRange) return false;
  if (distance > 4) {
    const toPlayer = Math.atan2(dy, dx);
    if (Math.abs(angleDifference(toPlayer, guard.facing)) > GUARD.sightHalfAngle) return false;
  }
  return !sightBlocked(guard.x, guard.y, player.x, player.y, level, player.crouched);
}

/** How fast suspicion fills right now for a seen player. */
export function suspicionRate(player, level) {
  let rate = DETECTION.fillRate;
  if (inShadow(player.x, player.y, level)) rate *= DETECTION.shadowMultiplier;
  if (player.crouched) rate *= DETECTION.crouchMultiplier;
  return rate;
}

function moveToward(guard, target, speed, dt, level) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 2) return true;
  const step = Math.min(distance, speed * dt);
  const nx = guard.x + (dx / distance) * step;
  const ny = guard.y + (dy / distance) * step;
  // Guards slide along solids like the player does: try x, then y.
  if (!collidesWithSolids(nx, guard.y, 11, level)) guard.x = nx;
  if (!collidesWithSolids(guard.x, ny, 11, level)) guard.y = ny;
  guard.moving = true;
  return Math.hypot(target.x - guard.x, target.y - guard.y) < 3;
}

/**
 * Advance one guard by dt. `events` collects heard sounds for this frame:
 * [{x, y, radius}] from running footsteps and landed pebbles. Returns an
 * audio cue ('step' when the guard takes a footstep) for the caller.
 */
export function updateGuard(guard, dt, player, level, events, random) {
  guard.moving = false;
  const sees = guardCanSee(guard, player, level);
  if (sees) {
    guard.suspicion = Math.min(1, guard.suspicion + suspicionRate(player, level) * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenFor = 0;
    guard.facing = Math.atan2(player.y - guard.y, player.x - guard.x);
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - DETECTION.decayRate * dt);
    guard.unseenFor += dt;
  }

  if (guard.suspicion >= DETECTION.chaseAt) guard.state = GUARD_CHASE;
  else if (guard.state === GUARD_CHASE && guard.unseenFor > GUARD.chaseMemory) {
    guard.state = GUARD_INVESTIGATE;
    guard.investigatePoint = guard.lastSeen ? { ...guard.lastSeen } : { x: guard.x, y: guard.y };
    guard.lookLeft = 0;
  }

  // A nearby sound pulls a patrolling or curious guard to investigate it.
  if (guard.state === GUARD_PATROL || guard.state === GUARD_CURIOUS || guard.state === GUARD_RETURN) {
    for (const sound of events) {
      if (Math.hypot(sound.x - guard.x, sound.y - guard.y) <= sound.radius) {
        guard.state = GUARD_INVESTIGATE;
        guard.investigatePoint = { x: sound.x, y: sound.y };
        guard.lookLeft = 0;
        break;
      }
    }
  }

  let stepCue = false;
  const beforeX = guard.x;
  const beforeY = guard.y;

  if (guard.state === GUARD_CHASE) {
    const target = guard.lastSeen ?? { x: player.x, y: player.y };
    moveToward(guard, target, GUARD.chaseSpeed, dt, level);
    guard.facing = Math.atan2(target.y - guard.y, target.x - guard.x);
  } else if (guard.state === GUARD_INVESTIGATE && guard.investigatePoint) {
    const arrived = moveToward(guard, guard.investigatePoint, GUARD.investigateSpeed, dt, level);
    if (!arrived) {
      guard.facing = Math.atan2(guard.investigatePoint.y - guard.y, guard.investigatePoint.x - guard.x);
    } else if (guard.lookLeft <= 0) {
      guard.lookLeft = GUARD.lookAround;
      guard.sweepFrom = guard.facing;
    }
    if (guard.lookLeft > 0) {
      guard.lookLeft -= dt;
      guard.facing = guard.sweepFrom + Math.sin((GUARD.lookAround - guard.lookLeft) * 2.2) * 1.1;
      if (guard.lookLeft <= 0) {
        guard.state = GUARD_RETURN;
        guard.investigatePoint = null;
      }
    }
  } else if (guard.state === GUARD_RETURN) {
    // Head back to the nearest patrol waypoint, then resume the patrol.
    let nearest = 0;
    let nearestDistance = Infinity;
    guard.patrol.forEach((point, i) => {
      const d = Math.hypot(point.x - guard.x, point.y - guard.y);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = i;
      }
    });
    const arrived = moveToward(guard, guard.patrol[nearest], GUARD.patrolSpeed, dt, level);
    if (arrived) {
      guard.state = GUARD_PATROL;
      guard.waypointIndex = (nearest + 1) % guard.patrol.length;
    }
  } else {
    // Patrol: walk the loop, pausing and looking around at each waypoint.
    if (guard.pauseLeft > 0) {
      guard.pauseLeft -= dt;
      guard.facing += Math.sin(guard.pauseLeft * 3) * 0.012;
    } else {
      const target = guard.patrol[guard.waypointIndex];
      const arrived = moveToward(guard, target, GUARD.patrolSpeed, dt, level);
      if (arrived) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.patrol.length;
        guard.pauseLeft = GUARD.waypointPause * (0.7 + random() * 0.6);
      } else {
        guard.facing = Math.atan2(target.y - guard.y, target.x - guard.x);
      }
    }
    if (guard.suspicion >= DETECTION.curiousAt) {
      guard.state = GUARD_CURIOUS;
    }
  }

  if (guard.state === GUARD_CURIOUS) {
    // Curious: stop and stare at the last seen spot while suspicion lasts.
    if (guard.lastSeen) {
      guard.facing = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
    }
    if (guard.suspicion <= 0.05) guard.state = GUARD_PATROL;
  }

  // Footstep cue: roughly one step per 34 pixels walked, for the audio.
  if (guard.moving) {
    guard.stepPhase += Math.hypot(guard.x - beforeX, guard.y - beforeY);
    if (guard.stepPhase >= 34) {
      guard.stepPhase = 0;
      stepCue = true;
    }
  }
  return stepCue;
}
