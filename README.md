# Azeroth Survivors — Save Editor v1.5.1

**[Use the editor online](https://yssadora.github.io/azeroth-survivors-editor/)**

Unofficial browser-based save editor for **Azeroth Survivors**. The app edits and encrypts saves locally in your browser; nothing is uploaded to this repository or a server.

## Features

- Talent editor for all **9 classes**, including talent XP and ranks.
- Equipment Armory with **498 pieces**, search and collected/missing filters.
- Zone progression manager for **12 zones**, including bulk prerequisite clearing.
- Experimental restoration of permanent perk resets.
- Unified `.sav` export, class synchronization and a sticky export bar.

## v1.5.1 — Compatibility update

The game introduced **dual talent specializations** in newer saves. These saves have both a `talent|...` record and a `spec|...` record; older versions of the editor only updated the talent record. **v1.5.1 updates the selected specialization's saved ranks when talents change**, while preserving the inactive spec, XP and unrelated records.

Zone handling now recognizes both legacy `unlock|class|number` and modern `open|class|zone` formats. It retains modern `open` records without rewriting them and updates legacy numeric unlock progress when zone completions change. Unchanged zone records are preserved.

The export still verifies equipment, talents, specialization synchronization and encryption round trips. The `spec` and legacy `unlock` fixes were tested in a browser against sample saves. **Game-side persistence after the newest game update has not yet been confirmed.** Please test with a backup.

## Instructions

1. Back up your original game save.
2. Open the [online editor](https://yssadora.github.io/azeroth-survivors-editor/).
3. Import your `.sav`, make changes and click **Export Save**.
4. Import the exported file in the game and verify it retained the changes.

The export downloads a modified save file; it does not directly modify the save stored in the game. Zone bulk progress and perk reset restoration are experimental.

## Previous versions

- [v1.5 archive](https://yssadora.github.io/azeroth-survivors-editor/releases/v1.5.html)
- [v1.4 archive](https://yssadora.github.io/azeroth-survivors-editor/releases/v1.4.html)

## Credits

Original Talent Editor: Unknown community creator.

Armory, Zone Manager, integrations and UI extensions: Shilen.

Not affiliated with the developers of Azeroth Survivors.
