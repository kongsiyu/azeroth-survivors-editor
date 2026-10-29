# Azeroth Survivors Save Editor v1.6.1

**[Open the editor](https://yssadora.github.io/azeroth-survivors-editor/)** · [Source code](https://github.com/yssadora/azeroth-survivors-editor)

A free, unofficial browser-based save editor for **Azeroth Survivors**. Import a `.sav` file, edit your save, and download a modified `.sav` file. Processing happens locally in your browser.

## What changed in v1.6.1

- **English / 简体中文:** Use the language selector at the top right. The editor follows the browser language initially and remembers your choice.
- **Full interface coverage:** Navigation, imports, talents and descriptions, equipment, zones, achievements, marks, perks, dialogs, tooltips and dynamic status/error messages share one language system.
- **Drafts are preserved:** Switching languages changes displayed copy while retaining input values, pending edits, character names and save identifiers.
- **Offline translations:** All translations are embedded in `index.html`; the existing standalone workflow still works. See [localization maintenance](docs/localization.md).
- **Game feedback:** The user confirmed the achievement-point and marks tests passed before this localization update.

## What changed in v1.6.0

- **Achievement points and marks:** A new Chinese resource panel shows earned points, cumulative perk costs and calculated available points. Set a target available balance by adding/removing real achievements, or edit individual achievements.
- **Per-class marks:** Edit each class independently, including creating a missing marks record. Lifetime `stat.marks` stays independent.
- **Permanent perks:** Edit ranks using costs extracted from the official October 29 web client, or refund perks. Imported timestamps and unknown records are preserved.
- **Unified export:** Resource drafts participate in the verified encrypted export, dirty summary and restore controls. Invalid mark input blocks export. Reimporting the same file starts fresh drafts.
- **Experimental game compatibility:** The supplied sample calculates to **405 earned − 315 spent = 90 available points**, with **445 Mage marks**. The game must still confirm these values. Purchased tabards or unknown achievements/perks disable exact balance targeting rather than treating unknown costs/rewards as zero.

The editor remains a standalone HTML file. Open `index.html`, choose **成就点 / 印记**, import a save and export with the existing gold button. See [the testing guide](docs/testing-resources.md) for an isolated two-step game test.

Developer checks:

```text
node tools/build-resources.cjs
node --test tests/resources.test.cjs tests/i18n.test.cjs
node tests/resources.browser.cjs <sample.sav>
node tests/i18n.browser.cjs <sample.sav>
```

The build embeds `data/resource-catalog.json`, `data/i18n.json`, `src/resources*` and `src/i18n*` into `index.html`; no network access is required when using the editor. Browser integration tests require Playwright and Edge; set `PLAYWRIGHT_MODULE` to the installed Playwright module path if needed.

## What changed in v1.5.3

- **Third specialization slot supported:** Save files with an active talent-spec index of `2` (seen in an October 21 browser export) are now synchronized when ranks are edited. The inactive builds are preserved.
- **Safer zone editing:** If a class lacks `open|`, `beat|`, and `unlock|` progression records, its zone controls are disabled instead of fabricating progression that the game may ignore or reset. Play the class in-game and export a fresh save first.
- **Clearer browser-game guidance:** Updated the compatibility notice using a player's comparative test: the **same modified save worked in Chrome and the downloaded game but reverted after a run in Firefox**. This suggests browser-specific game persistence behavior; the underlying Firefox cause remains unconfirmed.
- **Existing protections retained:** Verification of the encrypted export, talent XP/ranks, specialization synchronization, equipment, and preservation of unrelated Codex/character/achievement records.

## Browser game vs. downloaded game

The reported Firefox problem happens **in the browser version of the game**, not necessarily in the web-based save editor itself. If your game resets imported progression in Firefox, try playing and importing in Chrome or in the downloaded version.

**Important:** We cannot change how Firefox or the game's browser version stores/autosaves progress. v1.5.3 addresses editor bugs and provides better safeguards, **not a proven fix to the Firefox game's persistence issue**. One player's Chrome and PC success does not guarantee every browser or game build behaves the same.

## Features

- Interactive talent editing and XP for **9 classes**
- Equipment Armory with **498 pieces**, rarity tracking, search, and missing/collected filters
- Progression editing for **12 zones**, including prerequisite clearing
- Experimental permanent perk-reset restoration
- Unified export with a sticky Export Save button
- Class navigation, change indicators, and dark/light appearance

## How to use safely

1. Export a **fresh save from the game** you plan to use.
2. Keep that original somewhere safe. This editor can also download an untouched backup.
3. Import the fresh file at the [online editor](https://yssadora.github.io/azeroth-survivors-editor/), make your changes, and click **Export Save**.
4. Import the modified file into the game. **An in-game import replaces the full account save, including Codex discoveries; it does not merge newer progress.**
5. In the browser game, check immediately after import, then again after a completed run. If the game reverts, stop and restore your backup.

The editor validates what it writes; it cannot guarantee the game will persist those changes.

## Previous releases

- [v1.5.2 archive](https://yssadora.github.io/azeroth-survivors-editor/releases/v1.5.2.html)
- [v1.5.1 archive](https://yssadora.github.io/azeroth-survivors-editor/releases/v1.5.1.html)
- [v1.5 archive](https://yssadora.github.io/azeroth-survivors-editor/releases/v1.5.html)
- [v1.4 archive](https://yssadora.github.io/azeroth-survivors-editor/releases/v1.4.html)

## Credits

**Original Talent Editor:** Unknown community creator — credit to the original author.

**Armory, Zone Manager, integrations, and UI extensions:** Shilen.

This is an unofficial community tool and is not affiliated with the game's developers.
