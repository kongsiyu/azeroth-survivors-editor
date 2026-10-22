# Azeroth Survivors Save Editor — v1.5.2 safety update

**[Open the editor](https://yssadora.github.io/azeroth-survivors-editor/)**

> **October 2026 game compatibility warning:** Players have reported edited saves reverting when a run starts or ends. We have **not verified** game-side persistence of editor changes with the latest game build. **Back up your save and avoid using this tool on progress you cannot afford to lose.**

## Critical: importing a save replaces all account progress

The game's **Import Save** replaces the entire account, including equipment, achievements and Codex discoveries. It **does not merge** with progress earned since the file was exported. Always begin from a fresh in-game export, retain that untouched original separately, and test in a separate browser profile if possible.

## Why we added safeguards

Some saves have no `hero|` or `talent|` record for a class the player hasn't initialized yet. For example, adding `talent|9|1000000|` and `beat|9|...` to a Rogue-only account does not also establish Warlock-specific hero, equipment and open-zone records. The newest build may initialize that class anew and overwrite the synthetic progress. v1.5.2 blocks these unsafe exports. Play the class once in-game and export a fresh save before editing that class.

Unchanged Codex (`seen|`), achievements, statistics, hero and equipped-item records are now explicitly verified in the generated save. **Passing these checks means only that our file was produced consistently; it does not prove the game will keep it.**

## Features

- Talent trees and XP for 9 classes.
- Equipment Armory (498 pieces), filtering and search.
- Zone completion management (12 zones).
- Perk reset recovery (experimental).
- Sticky Export Save bar, class navigation and change indicators.
- Offline processing in your browser and verified encrypted export.

## Reporting persistence problems

Please preserve and privately share (1) a *fresh untouched game export*, (2) the *editor-exported save*, and (3) the *game export after the revert*, plus your game version and whether you use browser or Windows. **Avoid publicly posting a save**, which may contain account or character details.

## Archive

- [Previous v1.5.1](https://yssadora.github.io/azeroth-survivors-editor/releases/v1.5.1.html)
- [v1.5](https://yssadora.github.io/azeroth-survivors-editor/releases/v1.5.html)
- [v1.4](https://yssadora.github.io/azeroth-survivors-editor/releases/v1.4.html)

## Credits

Original talent editor: unknown community creator. Armory, zone manager and integration/UI extensions: Shilen.

Unofficial community tool; not affiliated with the game's developers.
