# PvP / Legendary row correction (v1.7.1)

The armory originally used each display row's index as the saved equipment tier digit:

```text
0 Common, 1 Uncommon, 2 Rare, 3 Epic, 4 PvP, 5 Legendary
```

This was incorrect. The official client accepts tier digits 0–6, uses 4 for Legendary, and uses 5 and 6 for Alliance and Horde PvP variants. The UI now displays:

```text
Common(0), Uncommon(1), Rare(2), Epic(3), PvP (Alliance)(5), PvP (Horde)(6), Legendary(4)
```

`src/equipment.js` explicitly separates row order, display name, color and saved tier code. Single-item toggles, class unlock, account unlock, restore, dirty tracking, export verification and count displays use the same catalog. The two PvP rows represent Alliance and Horde appearances, not two rarity ranks. Seven rows yield 581 known IDs (including both faction variants) with the existing supported class/slot matrix (previously 498).

For Mage head-slot IDs:

| Saved ID | Correct row |
| --- | --- |
| 108040 | Legendary |
| 108050 | PvP (Alliance) |
| 108060 | PvP (Horde) |

Existing saved IDs are preserved. The editor cannot infer which tier a user intended when clicking an incorrectly labeled row in an earlier release, so it does not migrate or swap imported IDs automatically.

## Evidence

The previously downloaded official 2026-10-29 WASM client (SHA-256 `d3db2a367b8abc9a5e6fb8a4786edf99767e31ec156cff5b9c414aae16d476f7`) contains:

- Equipment decoding in code-section body 1102 / function index 1980 (878 imported functions). The decoder accepts tier digits below 7, normalizes digit 6 to quality enum 5 and keeps a separate flag to select the other PvP set.
- The quality-name table `Common, Uncommon, Rare, Epic, Legendary, PvP` with a display-order table `0,1,2,3,5,4`. Quality enum order, saved tier digit and display position must not be treated as interchangeable.
- The PvP set-name row includes Alliance `Field Marshal’s` and Horde `Warlord’s` names. The client switches saved tier 5 to 6 for Horde race IDs 2, 5, 6 and 8, confirming the faction split.
- The item ID formula `100000 + class × 1000 + slot × 100 + tier × 10`.

This is a static inspection of the official client. No game executable is run by the editor or tests.

## Validation

```text
node tools/build-resources.cjs
node --test tests/equipment.test.cjs tests/resources.test.cjs tests/zones.test.cjs tests/i18n.test.cjs
node tests/equipment.browser.cjs <sample.sav>
```

The browser fixture imports a Legendary item, a PvP (Horde) item and an unknown ID; it checks exact row highlights, independent toggles and actual encrypted export/reimport. Class and account bulk unlocks include the missing tier-6 items and preserve the unknown ID. Search, translations and narrow-screen layout are also checked.
