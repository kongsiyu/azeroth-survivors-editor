#!/usr/bin/env node
'use strict';

// Read-only inspection of RSE1 saves using the codec bundled with this editor.
// Save contents are always data; only the repository's codec runs in the VM.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

function createCodec() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const core = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)][0]?.[1];
  const boundary = core?.indexOf('const C=') ?? -1;
  if (boundary < 0 || !core.slice(0, boundary).includes('function h(')) {
    throw new Error('Editor codec boundary changed; review the extractor before use.');
  }
  const context = vm.createContext({
    TextDecoder, TextEncoder, Uint8Array, DataView, Int32Array, atob, btoa,
    crypto: crypto.webcrypto,
  });
  vm.runInContext(core.slice(0, boundary), context, { timeout: 10000 });
  return raw => {
    context.input = raw;
    const plain = vm.runInContext('h(input)', context, { timeout: 10000 });
    context.plain = plain;
    if (!vm.runInContext('h(G(plain)) === plain', context, { timeout: 10000 })) {
      throw new Error('Codec round-trip verification failed.');
    }
    return plain;
  };
}

function entries(value, separator) {
  return (value || '').split(',').filter(Boolean).map(entry => {
    // IDs such as "legendary:fireball" and "class:mage" contain colons.
    const at = entry.lastIndexOf(separator);
    return at < 0 ? { id: entry, value: null }
      : { id: entry.slice(0, at), value: entry.slice(at + separator.length) };
  });
}

function inspect(filename, decode) {
  const raw = fs.readFileSync(filename);
  const plain = decode(raw.toString('utf8'));
  const lines = plain.split(/\r?\n/).filter(Boolean);
  const records = new Map();
  for (const line of lines) {
    const [kind, ...fields] = line.split('|');
    if (!records.has(kind)) records.set(kind, []);
    records.get(kind).push(fields);
  }
  const rows = kind => records.get(kind) || [];
  const lists = kind => rows(kind).flatMap(fields => (fields[0] || '').split(',').filter(Boolean));
  const pairs = (kind, separator) => rows(kind).flatMap(fields => entries(fields[0], separator));
  const achievements = lists('ach');
  const dates = pairs('achat', '=');
  const dated = new Set(dates.map(entry => entry.id));
  const byClass = kind => rows(kind).map(([classId, ...fields]) => ({ classId, fields }));
  const report = {
    file: path.basename(filename),
    sha256: crypto.createHash('sha256').update(raw).digest('hex'),
    format: 'RSE1',
    encryptedBytes: raw.length,
    plaintextBytes: Buffer.byteLength(plain),
    codecRoundTrip: true,
    recordCount: lines.length,
    recordTypes: Object.fromEntries([...records].map(([kind, values]) => [kind, values.length])),
    // Positional names deliberately avoid assigning unverified game semantics.
    picked: rows('pick').map(fields => ({
      classId: fields[0], field2: fields[1], field3: fields[2], mapId: fields[3],
      name: fields[4], appearance: fields[5], trailingFields: fields.slice(6),
    })),
    open: byClass('open'),
    beat: byClass('beat'),
    heroic: byClass('hbeat'),
    stars: rows('stars'),
    unlockedRaces: lists('races'),
    coopBeat: lists('coopbeat'),
    legacyUnlock: byClass('unlock'),
    items: lists('items'),
    equipped: byClass('equip'),
    looks: byClass('look'),
    talentXP: rows('talent').map(([classId, xp]) => ({ classId, xp })),
    specializations: rows('spec').map(([classId, activeIndex, ...builds]) => ({
      classId, activeIndex, slotCount: builds.length,
    })),
    seen: pairs('seen', '='),
    achievements,
    achievementDates: dates,
    achievementsWithoutDates: achievements.filter(id => !dated.has(id)),
    datesWithoutAchievements: dates.filter(entry => !achievements.includes(entry.id)),
    stats: pairs('stat', '='),
    perks: pairs('perk', ':'),
    pets: lists('pets'),
    heroes: byClass('hero'),
    marks: byClass('marks'),
    pity: pairs('pity', ':'),
    glow: byClass('glow'),
    resets: rows('resets'),
  };
  return { report, lines };
}

function compare(before, after) {
  // Compare complete record kinds so reordered class records are not paired
  // incorrectly, and repeated records remain visible rather than overwritten.
  const group = lines => {
    const result = new Map();
    for (const line of lines) {
      const kind = line.split('|', 1)[0];
      if (!result.has(kind)) result.set(kind, []);
      result.get(kind).push(line);
    }
    return result;
  };
  const a = group(before.lines), b = group(after.lines);
  return [...new Set([...a.keys(), ...b.keys()])].flatMap(kind => {
    const original = a.get(kind) || [], modified = b.get(kind) || [];
    return JSON.stringify(original) === JSON.stringify(modified)
      ? [] : [{ kind, before: original, after: modified }];
  });
}

if (require.main === module) {
  const filenames = process.argv.slice(2);
  if (filenames.length < 1 || filenames.length > 2) {
    console.error('Usage: node tools/analyze-save.cjs <save.sav> [comparison.sav]');
    process.exitCode = 1;
  } else {
    try {
      const decode = createCodec();
      const before = inspect(filenames[0], decode);
      const output = filenames.length === 1 ? before.report : (() => {
        const after = inspect(filenames[1], decode);
        return { before: before.report, after: after.report, changes: compare(before, after) };
      })();
      console.log(JSON.stringify(output, null, 2));
    } catch (error) {
      console.error('Save analysis failed: ' + error.message);
      process.exitCode = 1;
    }
  }
}

module.exports = { entries, inspect, compare, createCodec };
