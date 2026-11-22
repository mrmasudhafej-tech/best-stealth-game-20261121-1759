// Painting the archive: floor, moonlight and shadow, vision cones, cover,
// characters and every screen. The canvas is letterboxed onto the window
// at the logical 1280x720 size, so screenshots at 1280x720 are 1:1.
import { FIELD, FONT, PALETTE } from './config.js';
import { GUARD } from './config.js';
import { SCREEN_CAUGHT, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './game.js';
import { GUARD_CHASE, GUARD_CURIOUS } from './guards.js';

// Deterministic floor speckles, fixed once so the floor never shimmers.
const SPECKLES = [];
{
  let seed = 1234567;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 130; i += 1) {
    SPECKLES.push({ x: 40 + next() * 1200, y: 40 + next() * 640, r: 1 + next() * 2.2 });
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, offsetX: 0, offsetY: 0, width: FIELD.width, height: FIELD.height };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    view.scale = Math.min(w / FIELD.width, h / FIELD.height) * dpr;
    view.width = w * dpr;
    view.height = h * dpr;
    view.offsetX = (view.width - FIELD.width * view.scale) / 2;
    view.offsetY = (view.height - FIELD.height * view.scale) / 2;
  }

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const px = (clientX - rect.left) * dpr;
    const py = (clientY - rect.top) * dpr;
    return {
      x: Math.max(0, Math.min(FIELD.width, (px - view.offsetX) / view.scale)),
      y: Math.max(0, Math.min(FIELD.height, (py - view.offsetY) / view.scale)),
    };
  }

  function drawFloor(level) {
    ctx.fillStyle = PALETTE.floorA;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const tile = 80;
    for (let y = 0; y < FIELD.height; y += tile) {
      for (let x = 0; x < FIELD.width; x += tile) {
        if (((x + y) / tile) % 2 === 0) {
          ctx.fillStyle = PALETTE.floorB;
          ctx.fillRect(x, y, tile, tile);
        }
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= FIELD.width; x += tile) {
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, FIELD.height);
      ctx.stroke();
    }
    for (const speck of SPECKLES) {
      ctx.fillStyle = 'rgba(255, 230, 180, 0.10)';
      ctx.beginPath();
      ctx.arc(speck.x, speck.y, speck.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // The great rug of the reading room, centred on each night's floor.
    ctx.fillStyle = PALETTE.rug;
    ctx.fillRect(520, 300, 240, 120);
    ctx.strokeStyle = PALETTE.rugTrim;
    ctx.lineWidth = 3;
    ctx.strokeRect(528, 308, 224, 104);
    ctx.strokeStyle = 'rgba(201, 163, 92, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(544, 324, 192, 72);
    void level;
  }

  function drawShadows(level) {
    for (const patch of level.shadows) {
      ctx.fillStyle = PALETTE.shadow;
      ctx.fillRect(patch.x, patch.y, patch.w, patch.h);
      ctx.fillStyle = 'rgba(190, 205, 255, 0.10)';
      ctx.fillRect(patch.x, patch.y, patch.w, 4);
    }
    // Moonlight pools: bright floor where detection runs at full speed.
    ctx.fillStyle = PALETTE.moonPool;
    ctx.beginPath();
    ctx.ellipse(640, 360, 210, 120, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCone(guard) {
    const alert = guard.suspicion >= 0.45;
    const gradient = ctx.createRadialGradient(
      guard.x, guard.y, 10,
      guard.x, guard.y, GUARD.sightRange,
    );
    gradient.addColorStop(0, alert ? 'rgba(240, 80, 50, 0.42)' : 'rgba(240, 190, 80, 0.34)');
    gradient.addColorStop(1, alert ? 'rgba(240, 80, 50, 0.05)' : 'rgba(240, 190, 80, 0.04)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.arc(guard.x, guard.y, GUARD.sightRange, guard.facing - GUARD.sightHalfAngle, guard.facing + GUARD.sightHalfAngle);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = alert ? 'rgba(255, 110, 80, 0.7)' : PALETTE.coneEdge;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(
      guard.x + Math.cos(guard.facing - GUARD.sightHalfAngle) * GUARD.sightRange,
      guard.y + Math.sin(guard.facing - GUARD.sightHalfAngle) * GUARD.sightRange,
    );
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(
      guard.x + Math.cos(guard.facing + GUARD.sightHalfAngle) * GUARD.sightRange,
      guard.y + Math.sin(guard.facing + GUARD.sightHalfAngle) * GUARD.sightRange,
    );
    ctx.stroke();
  }

  function drawSolids(level) {
    for (const wall of level.walls) {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = PALETTE.wallTop;
      ctx.fillRect(wall.x, wall.y, wall.w, Math.min(6, wall.h));
    }
    for (const shelf of level.walls.slice(4)) {
      ctx.fillStyle = PALETTE.shelfTop;
      ctx.fillRect(shelf.x + 3, shelf.y + 3, shelf.w - 6, shelf.h - 6);
      ctx.strokeStyle = 'rgba(0,0,0,0.45)';
      ctx.lineWidth = 1;
      for (let y = shelf.y + 18; y < shelf.y + shelf.h - 6; y += 22) {
        if (shelf.w >= shelf.h) {
          ctx.beginPath();
          ctx.moveTo(shelf.x + 18, y);
          ctx.lineTo(shelf.x + shelf.w - 6, y);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(shelf.x + 18, shelf.y + 6);
          ctx.lineTo(shelf.x + 18, shelf.y + shelf.h - 6);
          ctx.stroke();
          break;
        }
      }
      // Book spines along a tall shelf.
      ctx.fillStyle = 'rgba(200, 120, 80, 0.55)';
      const along = shelf.w >= shelf.h ? shelf.w : shelf.h;
      for (let d = 8; d < along - 8; d += 16) {
        if (shelf.w >= shelf.h) ctx.fillRect(shelf.x + d, shelf.y + 8, 7, shelf.h - 16);
        else ctx.fillRect(shelf.x + 8, shelf.y + d, shelf.w - 16, 7);
      }
    }
    for (const crate of level.lowCover) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(crate.x + 3, crate.y + 4, crate.w, crate.h);
      ctx.fillStyle = PALETTE.crate;
      ctx.fillRect(crate.x, crate.y, crate.w, crate.h);
      ctx.fillStyle = PALETTE.crateTop;
      ctx.fillRect(crate.x + 4, crate.y + 4, crate.w - 8, crate.h - 8);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(crate.x + crate.w / 2, crate.y + 4);
      ctx.lineTo(crate.x + crate.w / 2, crate.y + crate.h - 4);
      ctx.stroke();
    }
  }

  function drawSeals(game) {
    for (const seal of game.seals) {
      if (seal.got) continue;
      const pulse = 1 + Math.sin(game.time * 3 + seal.x) * 0.12;
      ctx.save();
      ctx.translate(seal.x, seal.y);
      ctx.fillStyle = 'rgba(143, 216, 255, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, 20 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.seal;
      ctx.beginPath();
      for (let i = 0; i < 4; i += 1) {
        const angle = -Math.PI / 2 + (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(angle) * 13, Math.sin(angle) * 13);
        const mid = angle + Math.PI / 4;
        ctx.lineTo(Math.cos(mid) * 5, Math.sin(mid) * 5);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0e2a3a';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawExit(game) {
    const exit = game.level.exit;
    const open = game.exitOpen;
    ctx.fillStyle = open ? 'rgba(123, 227, 130, 0.30)' : 'rgba(90, 90, 90, 0.30)';
    ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
    ctx.strokeStyle = open ? PALETTE.exit : '#8a8578';
    ctx.lineWidth = 3;
    ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
    ctx.fillStyle = open ? '#dfffe2' : PALETTE.muted;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT OPEN' : 'EXIT', exit.x + exit.w / 2, exit.y + exit.h / 2 - 4);
    // Seal slots: filled as charts are found.
    for (let i = 0; i < game.seals.length; i += 1) {
      ctx.fillStyle = i < game.sealsGot ? PALETTE.seal : 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(exit.x + 16 + i * 16, exit.y + exit.h / 2 + 14, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (!open) {
      ctx.strokeStyle = '#c9a35c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(exit.x + 8, exit.y + 8);
      ctx.lineTo(exit.x + exit.w - 8, exit.y + exit.h - 8);
      ctx.moveTo(exit.x + exit.w - 8, exit.y + 8);
      ctx.lineTo(exit.x + 8, exit.y + exit.h - 8);
      ctx.stroke();
    }
  }

  function drawPebbles(game) {
    for (const pebble of game.pebbles) {
      if (!pebble.landed) {
        const lift = Math.sin(pebble.flight * Math.PI) * 14;
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(pebble.x, pebble.y + 3, 5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#d8d2c4';
        ctx.beginPath();
        ctx.arc(pebble.x, pebble.y - lift, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (pebble.ring > 0) {
        ctx.strokeStyle = `rgba(255, 217, 122, ${pebble.ring})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pebble.x, pebble.y, (1 - pebble.ring) * 46 + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#d8d2c4';
        ctx.beginPath();
        ctx.arc(pebble.x, pebble.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawGuard(guard) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 10, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guardDark;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 10, 0, Math.PI * 2);
    ctx.fill();
    // Facing wedge and lantern.
    const fx = guard.x + Math.cos(guard.facing) * 9;
    const fy = guard.y + Math.sin(guard.facing) * 9;
    ctx.fillStyle = '#f2ead9';
    ctx.beginPath();
    ctx.arc(fx, fy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.lantern;
    ctx.beginPath();
    ctx.arc(guard.x + Math.cos(guard.facing + 0.7) * 12, guard.y + Math.sin(guard.facing + 0.7) * 12, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion ring and state mark.
    if (guard.suspicion > 0.03) {
      ctx.strokeStyle = guard.suspicion >= 1 ? PALETTE.danger : PALETTE.lantern;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 18, -Math.PI / 2, -Math.PI / 2 + guard.suspicion * Math.PI * 2);
      ctx.stroke();
    }
    ctx.font = `bold 20px ${FONT}`;
    ctx.textAlign = 'center';
    if (guard.state === GUARD_CHASE) {
      ctx.fillStyle = PALETTE.danger;
      ctx.fillText('!', guard.x, guard.y - 20);
    } else if (guard.state === GUARD_CURIOUS) {
      ctx.fillStyle = PALETTE.lantern;
      ctx.fillText('?', guard.x, guard.y - 20);
    }
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = 'rgba(242, 234, 217, 0.75)';
    ctx.fillText(guard.name, guard.x, guard.y + 28);
  }

  function drawPlayer(game) {
    const player = game.player;
    if (player.noisePulse > 0 && player.running) {
      ctx.strokeStyle = `rgba(242, 234, 217, ${player.noisePulse * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 20 + (1 - player.noisePulse) * 26, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 9, 12, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    const radius = player.crouched ? 9 : 11;
    ctx.fillStyle = PALETTE.playerDark;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = player.crouched ? '#2a8a72' : PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.fill();
    const fx = player.x + Math.cos(player.facing) * (radius - 2);
    const fy = player.y + Math.sin(player.facing) * (radius - 2);
    ctx.fillStyle = '#0f2a22';
    ctx.beginPath();
    ctx.arc(fx, fy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(242, 234, 217, 0.85)';
    ctx.fillText(player.crouched ? 'Wren (hidden low)' : 'Wren', player.x, player.y + 26);
  }

  function drawHud(game) {
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, FIELD.width, 40);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(game.level.name, 16, 26);
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.seal;
    ctx.fillText(
      `Charts ${game.sealsGot}/${game.seals.length}   Pebbles ${game.pebblesLeft}`,
      640, 26,
    );
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.lantern;
    ctx.fillText(`Lanterns ${'●'.repeat(Math.max(0, game.lives))}${'○'.repeat(Math.max(0, 3 - game.lives))}`, 1030, 26);
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(`Score ${game.score}`, 1264, 26);
    // Alarm eye: fills as any guard grows suspicious.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(1050, 46, 120, 8);
    ctx.fillStyle = game.alarm >= 1 ? PALETTE.danger : PALETTE.lantern;
    ctx.fillRect(1050, 46, 120 * game.alarm, 8);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(game.alarm >= 1 ? 'SPOTTED!' : game.alarm >= 0.45 ? 'SUSPICIOUS…' : 'Unseen', 1180, 54);
    // Footer: message and controls.
    ctx.fillStyle = 'rgba(18, 13, 11, 0.75)';
    ctx.fillRect(0, FIELD.height - 30, FIELD.width, 30);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(game.messageLeft > 0 ? game.message : game.level.hint, 16, FIELD.height - 11);
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('WASD move · Shift run · C crouch · Click throw pebble · P pause · M mute', 1264, FIELD.height - 11);
    // Mouse aim marker.
    if (game.mouseAim) {
      ctx.strokeStyle = 'rgba(255, 217, 122, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(game.mouseAim.x, game.mouseAim.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(game.mouseAim.x - 13, game.mouseAim.y);
      ctx.lineTo(game.mouseAim.x - 5, game.mouseAim.y);
      ctx.moveTo(game.mouseAim.x + 5, game.mouseAim.y);
      ctx.lineTo(game.mouseAim.x + 13, game.mouseAim.y);
      ctx.moveTo(game.mouseAim.x, game.mouseAim.y - 13);
      ctx.lineTo(game.mouseAim.x, game.mouseAim.y - 5);
      ctx.moveTo(game.mouseAim.x, game.mouseAim.y + 5);
      ctx.lineTo(game.mouseAim.x, game.mouseAim.y + 13);
      ctx.stroke();
    }
  }

  function drawOverlay(title, lines, footnote) {
    ctx.fillStyle = 'rgba(10, 8, 14, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    const w = 720;
    const h = 120 + lines.length * 30;
    ctx.fillRect((FIELD.width - w) / 2, (FIELD.height - h) / 2, w, h);
    ctx.strokeStyle = PALETTE.rugTrim;
    ctx.lineWidth = 2;
    ctx.strokeRect((FIELD.width - w) / 2, (FIELD.height - h) / 2, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.lantern;
    ctx.font = `bold 34px ${FONT}`;
    ctx.fillText(title, FIELD.width / 2, (FIELD.height - h) / 2 + 52);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `16px ${FONT}`;
    lines.forEach((line, i) => {
      ctx.fillText(line, FIELD.width / 2, (FIELD.height - h) / 2 + 92 + i * 30);
    });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `14px ${FONT}`;
    ctx.fillText(footnote, FIELD.width / 2, (FIELD.height - h) / 2 + h - 18);
  }

  function draw(game) {
    resize();
    ctx.setTransform(view.scale, 0, 0, view.scale, view.offsetX, view.offsetY);
    ctx.fillStyle = '#0c0910';
    ctx.fillRect(-view.offsetX / view.scale, -view.offsetY / view.scale, view.width / view.scale, view.height / view.scale);
    drawFloor(game.level);
    drawShadows(game.level);
    for (const guard of game.guards) drawCone(guard);
    drawSolids(game.level);
    drawSeals(game);
    drawExit(game);
    drawPebbles(game);
    for (const guard of game.guards) drawGuard(guard);
    drawPlayer(game);
    // Vignette: dark corners, moonlit centre.
    const vignette = ctx.createRadialGradient(640, 360, 300, 640, 360, 780);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(5,4,12,0.42)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawHud(game);
    if (game.screen === SCREEN_TITLE) {
      drawOverlay('WREN IN THE MOONMOTH ARCHIVE', [
        'Three nights. Three star charts a night. One moonlit exit.',
        'Wardens patrol with lanterns and vision cones.',
        'Shadows slow their eyes, low crates hide you only while crouched,',
        'and a thrown pebble pulls a guard away.',
        'Reach the exit unseen, with every chart, to finish the night.',
        game.best > 0 ? `Best escape: caught only ${game.best} time${game.best === 1 ? '' : 's'}.` : 'No escape yet — the archive waits.',
      ], 'Press Enter or click to begin · WASD move · Shift run · C crouch · Click throws a pebble');
    } else if (game.screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', ['The wardens hold their patrol. Breathe.'], 'Press P or Enter to carry on');
    } else if (game.screen === SCREEN_CAUGHT) {
      drawOverlay('CAUGHT!', [
        'A lantern found Wren. The wardens escort her back to the doorway.',
        `${game.lives} lantern${game.lives === 1 ? '' : 's'} left · Score ${game.score}`,
      ], 'Press Enter or click to slip back in');
    } else if (game.screen === SCREEN_WIN) {
      drawOverlay('THE ARCHIVE SLEEPS', [
        'Every chart is safe. Wren vanishes into the moonlight.',
        `Final score ${game.score} · Caught ${game.caughtCount} time${game.caughtCount === 1 ? '' : 's'}`,
      ], 'Press Enter or click to play again');
    } else if (game.screen === SCREEN_OVER) {
      drawOverlay('THE LANTERNS WIN', [
        'Three catches, and the archive doors close for the night.',
        `Score ${game.score} · Best escape: caught ${game.best} time${game.best === 1 ? '' : 's'}`,
      ], 'Press Enter or click to try again');
    }
    void SCREEN_PLAY;
  }

  return { draw, resize, toLogical, view };
}
