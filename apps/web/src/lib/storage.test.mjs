/**
 * Storage round-trip smoke test — run with: node src/lib/storage.test.mjs
 * Tests that storeNotes/loadNotes and storeProgress/loadProgress survive
 * JSON serialization identically (using a DOM-compatible localStorage stub).
 */

// Minimal localStorage stub
const store = {};
const localStorage = {
  getItem: (k) => store[k] ?? null,
  setItem: (k, v) => { store[k] = v; },
  removeItem: (k) => { delete store[k]; },
};
globalThis.window = { localStorage };

// ── Inline the functions under test (no TS, no bundler) ──────────────────────
const notesKey = "learning-freedom:notes";
const progressKey = "learning-freedom:progress";

function scopedKey(baseKey, scope) {
  return scope ? `${baseKey}:${scope}` : baseKey;
}

function loadNotes() {
  return window.localStorage.getItem(notesKey) ?? "";
}
function storeNotes(value) {
  window.localStorage.setItem(notesKey, value);
}

function loadProgress(scope) {
  try {
    const raw = window.localStorage.getItem(scopedKey(progressKey, scope));
    if (!raw) return { conceptMastery: {}, chapterCompletion: {}, goalCompletion: {}, practiceMode: false };
    const parsed = JSON.parse(raw);
    return {
      conceptMastery: parsed.conceptMastery ?? {},
      chapterCompletion: parsed.chapterCompletion ?? {},
      goalCompletion: parsed.goalCompletion ?? {},
      practiceMode: Boolean(parsed.practiceMode),
    };
  } catch {
    return { conceptMastery: {}, chapterCompletion: {}, goalCompletion: {}, practiceMode: false };
  }
}
function storeProgress(progress, scope) {
  window.localStorage.setItem(scopedKey(progressKey, scope), JSON.stringify(progress));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    console.error(`    expected: ${JSON.stringify(expected)}`);
    console.error(`    actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// Notes round-trip
storeNotes("Hello, world!");
assert("notes: basic string round-trip", loadNotes(), "Hello, world!");

storeNotes("");
assert("notes: empty string survives", loadNotes(), "");

storeNotes("Emoji 🧠 & unicode ñ");
assert("notes: unicode survives", loadNotes(), "Emoji 🧠 & unicode ñ");

// Progress round-trip (unscoped)
const p1 = { conceptMastery: { "c1": 0.75, "c2": 1 }, chapterCompletion: { "ch1": 0.5 }, goalCompletion: { "g1": true }, practiceMode: false };
storeProgress(p1);
assert("progress: mastery values round-trip", loadProgress(), p1);

// Progress round-trip (scoped)
const p2 = { conceptMastery: { "c3": 0.25 }, chapterCompletion: {}, goalCompletion: {}, practiceMode: true };
storeProgress(p2, "scope-abc");
assert("progress: scoped write doesn't clobber global", loadProgress(), p1);
assert("progress: scoped read returns correct data", loadProgress("scope-abc"), p2);

// Missing key returns defaults
assert("progress: missing scope returns defaults", loadProgress("nonexistent"), { conceptMastery: {}, chapterCompletion: {}, goalCompletion: {}, practiceMode: false });

// Corrupt data returns defaults
window.localStorage.setItem(progressKey, "not-valid-json{{{");
assert("progress: corrupt JSON returns defaults", loadProgress(), { conceptMastery: {}, chapterCompletion: {}, goalCompletion: {}, practiceMode: false });

// practiceMode coerced to boolean
window.localStorage.setItem(progressKey, JSON.stringify({ conceptMastery: {}, chapterCompletion: {}, goalCompletion: {}, practiceMode: 1 }));
assert("progress: practiceMode coerced to true", loadProgress().practiceMode, true);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
