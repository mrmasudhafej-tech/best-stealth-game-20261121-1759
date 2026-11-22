# best-stealth-game-20261121-1759

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/mrmasudhafej-tech/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/mrmasudhafej-tech/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Wren in the Moonmoth Archive**: an original, offline top-down stealth game that runs in a desktop browser from static files. Wren, a night archivist, must pocket every star chart on each of three nights and reach the moonlit exit unseen. Lantern Wardens patrol fixed routes with visible vision cones; suspicion fills while Wren is seen and drains while hidden, so breaking sight behind tall shelves — or crouching behind low crates — is always a way back. Shadows slow detection, running is fast but loud, and a clicked pebble throw pulls a guard away to investigate. Synthesised WebAudio footsteps, alarms and chimes; no image, sound or font files, no network requests: everything is painted by the game's own canvas code.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Move with WASD or arrow keys, hold Shift to run, hold C to crouch, click to throw a pebble, P pauses, M mutes. Catch three times and the night ends; finish all three nights to win.

## Layout

- `game/` — the playable game: `index.html` plus `src/` modules with one job each (`config`, `level`, `guards`, `player`, `game`, `render`, `input`, `audio`, `shots`, `main`, `random`).
- `screenshots/` — 4 real renders of the game's own code, staged through its `?shot=` scenes.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## License

MIT — see [LICENSE](LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?ref=5867rntm&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
