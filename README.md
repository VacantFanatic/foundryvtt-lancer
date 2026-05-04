# Lancer System for FoundryVTT

A Foundry VTT system for the [Lancer RPG](https://massif-press.itch.io/corebook-pdf) by [Massif Press](https://massif-press.itch.io/).

## Attribution and Acknowledgements

This project incorporates several resources and open source software (either in part or in whole). Without these, this project would be much poorer, and might not even exist in the first place. A huge thank you to all those who use their time and skills to enrich the world with their creations!

- [Comp/Con](https://compcon.app), the incredible companion app for Lancer, created by beeftime and ari. ([Github](https://github.com/massif-press/compcon))
- Comp/Con icons, created by megane.
- Icons from the Lancer community, Font Awesome, and Game-icons.net - see [Icon Attributions](public/assets/icons/_ATTRIBUTION.md).
- [lancer-data](https://github.com/massif-press/lancer-data), a JSON library of Lancer content.
- [Foundry Project Creator](https://gitlab.com/foundry-projects/foundry-pc) by NickEast, without which this project would have taken much longer to find its feet!
- [Material Design Icons](https://materialdesignicons.com/), open source community-led iconography.

Additionally, a huge thank you and shout out to Animu36, Staubz, and Grygon for their help getting the alpha release brought up to speed and out the door!

## Setup and FAQ

Please see [our wiki](https://github.com/Eranziel/foundryvtt-lancer/wiki) for guides and commonly asked questions.

## System Installation

Simply search for Lancer in the Foundry system browser and install from there.

## Developer Resources

[Setting up a development environment](https://github.com/Eranziel/foundryvtt-lancer/wiki/Development-Setup)

How to use [Flows](docs/flow_api.md) to modify Lancer system automation.

### Build output and Foundry path

`npm run build` writes the runnable system into **`dist/`** in this repository, then **mirrors `dist/`** into **`F:/FoundryVTT/Data/systems/lancer`** by default so Foundry can load that folder directly. After each build, reload Foundry so it picks up `lancer.mjs` and `styles/lancer.css`.

- Override the mirror destination with **`FOUNDRY_SYSTEM_DIR`** or **`VITE_FOUNDRY_SYSTEM_DIR`** (absolute path; highest priority).
- Or set **`MIRROR_DIST_TO_FOUNDRY_DATA=1`** to copy into `Data/systems/lancer` under the `dataPath` from `fvttrc.yml` when `FOUNDRY_SYSTEM_DIR` is unset (see [vite.config.mts](vite.config.mts)).
- Set **`SKIP_FOUNDRY_DIST_MIRROR=1`** to build **only** into `dist/` (e.g. CI or when using a symlink from `Data/systems/lancer` to `<repo>/dist` and you do not want a second copy).

For a symlink-based setup without mirroring, see `npm install` / [scripts/symlink.mjs](scripts/symlink.mjs).

If actor or item sheets misbehave in-game, see **[docs/troubleshooting-sheets.md](docs/troubleshooting-sheets.md)** (console capture, viewport, module isolation, benign COMP/CON messages).

## Legal

"Lancer for FoundryVTT" is not an official _Lancer_ product; it is a third party work, and is not affiliated with Massif Press. "Lancer for FoundryVTT" is published via the _Lancer_ Third Party License.

_Lancer_ is copyright Massif Press.
