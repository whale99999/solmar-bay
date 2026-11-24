# solmar-bay

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/whale99999/solmar-bay/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/whale99999/solmar-bay/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Solmar Bay** is an original top-down 2D open-world crime game, built for the
make.fun **gta6-01 "Make GTA 6"** bounty. No Rockstar IP anywhere: the city,
its people, its story and its sound are all original.

You are a driver for fixer Carmen Sol in the bay city of Solmar. Explore the
city on foot and by car, steal cars, outrun the Solmar Bay PD as your wanted
level climbs from 1 to 5 stars, and run four story missions — a marina pickup,
three drops across town, a hot-wheels chop-shop delivery, and a dockside
showdown with the Marlin crew. Traffic, pedestrians, combat, a HUD with a
live minimap, and a save game are all in.

## Run

```sh
node serve.ts
# open http://localhost:8080
```

Plain static files, zero dependencies, plays offline in desktop Chrome.

Controls: **WASD / Arrows** move & drive · **E** enter / steal car ·
**Mouse + Click / Space** shoot · **Shift** run · **Esc** pause.

## Tech

Canvas 2D + WebAudio (all sound synthesized, no audio assets), ES modules,
seeded city generation (`?seed=N` replays the same city). Screenshots are
staged with `?shot=start|drive|mission|chase&seed=1`.

Entered on [make.fun](https://make.fun/?ref=881py9z1&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards
