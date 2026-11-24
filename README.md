# Solmar Bay — Open-World Crime Game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/whale99999/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/whale99999/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** is a fully original top-down 2D open-world crime game, built for the
[make.fun "Make GTA 6" bounty](https://make.fun/c/gta6-01). Explore a sun-soaked coastal
city on foot and by car, steal vehicles, outrun the police, and work your way up from
street nobody to city legend under your fixer, **Marco Vane**.

No Rockstar IP: the city, districts, characters, vehicles, story and sounds are all original.

## The city

Nine districts to explore: **Harbor, Old Town, Market District, Casino Strip, Downtown,
Airport, Stadium, Hills** and the **Pier**. Traffic flows through the streets, pedestrians
walk the sidewalks, and the Solmar Bay PD responds to everything you do.

## How to play

| Key | Action |
| --- | --- |
| WASD / Arrows | Move on foot, drive a car |
| Shift | Run |
| E | Enter a car / steal a parked or traffic car |
| Space | Handbrake |
| Mouse | Aim |
| Click | Shoot |
| L | Save game |
| P | Pause |
| M | Mute |

## Missions — the Marco Vane story

1. **M1 · The Pickup** — drive to the Harbor dock and collect Marco's package.
2. **M2 · Market Run** — collect 3 supply crates across the Market District.
3. **M3 · The Getaway** — lose your wanted level, then reach the Stadium clean.
4. **M4 · Casino Royale** — storm the casino, take down 4 guards, crack the vault.

Complete all four and Solmar Bay is yours.

## Systems

- **Wanted level 1–5** — stealing cars, shooting, and hitting pedestrians raise your heat;
  police chases escalate with it, and at wanted 3+ the cops open fire. Break line of sight
  to cool off.
- **Combat** — mouse-aimed shooting with WebAudio gunfire, health pickups, and armed
  casino guards.
- **Economy** — earn cash from missions, pickups and takedowns; your score tracks it all.
- **Save game** — press L any time; progress is stored in your browser.
- **HUD + minimap** — cash, health, score, wanted stars, mission objective, and a live
  minimap with the objective beacon, police blips and your position.
- **Sound** — procedural WebAudio (engine hum, gunfire, sirens, pickups). Audio starts only
  after your first key press or click, so the game loads silent and error-free.

## Play it

Serve the `game/` folder with any static HTTP server and open `index.html` in desktop
Chrome — it plays fully offline, with zero dependencies and zero network requests:

```sh
cd game && python3 -m http.server 8080
# open http://localhost:8080
```

## Built with

Plain HTML + Canvas 2D + inline WebAudio. One self-contained `game/index.html`, no build step.

## License

MIT — see [LICENSE](LICENSE).
