import type { AnalyzeResult, Concept, CrossLink, EvidenceSpan, MemoryStage, PracticeQuestion, SourceDoc } from "./types";
import { stableHash } from "./storage";

// -------- Text utilities --------

const STOPWORDS = new Set<string>([
  "a","about","above","after","again","against","all","also","am","an","and","any","are","as","at",
  "be","because","been","before","being","below","between","both","but","by","can","could",
  "did","do","does","doing","down","during","each","few","for","from","further","had","has","have",
  "having","he","her","here","hers","herself","him","himself","his","how","i","if","in","into","is",
  "it","its","itself","just","like","may","me","might","more","most","much","my","myself","no","nor",
  "not","now","of","off","on","once","only","or","other","our","ours","ourselves","out","over","own",
  "same","she","should","so","some","such","than","that","the","their","theirs","them","themselves",
  "then","there","these","they","this","those","through","to","too","under","until","up","use","used",
  "using","very","was","we","were","what","when","where","which","while","who","whom","why","will",
  "with","would","you","your","yours","yourself","yourselves"
]);

const GENERIC_TITLE_HEADS = new Set<string>([
  "activity","announcement","assignment","background","chapter","discussion","example","foundations",
  "introduction","lecture","lesson","module","overview","page","principles","reading","reflection",
  "section","summary","topic","unit","week","quiz","syllabus","start","home","about"
]);

export function normalizeWhitespace(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\u200b/g, "").replace(/[\t\f\v ]+/g, " ").replace(/\s*\n\s*/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function normalizeForCompare(value: string): string {
  return normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function slugify(value: string): string {
  return normalizeForCompare(value).replace(/\s+/g, "-").slice(0, 80) || "concept";
}

export function tokens(value: string): string[] {
  return normalizeForCompare(value).split(" ").filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

const ABBREVIATIONS = ["e.g.", "i.e.", "mr.", "mrs.", "ms.", "dr.", "prof.", "vs.", "etc.", "st.", "jr."];
function protectAbbreviations(value: string): string {
  let next = value;
  for (const abbr of ABBREVIATIONS) {
    next = next.replace(new RegExp(abbr.replace(/\./g, "\\."), "gi"), (match) => match.replace(/\./g, "∯"));
  }
  return next;
}
export function splitSentences(value: string): string[] {
  return protectAbbreviations(normalizeWhitespace(value))
    .split(/(?<=[.!?])\s+(?=[A-Z"'\u201C])/)
    .map((entry) => entry.replace(/∯/g, ".").trim())
    .filter((entry) => entry.length >= 20 && entry.length <= 600);
}

// -------- Noise / label gates --------

const HARD_NOISE = [
  /\byou need to have javascript enabled\b/i,
  /\bthis tool needs to be loaded in a new browser window\b/i,
  /\bskip to (content|main)\b/i,
  /\bcourse navigation\b/i,
  /\bbreadcrumbs?\b/i,
  /\ballowed attempts\b/i,
  /\bpoints possible\b/i,
  /\bmark as done\b/i,
  /\bsearch entries\b/i,
  /\bnot for resale or redistribution\b/i,
  /\ball rights reserved\b/i,
  /©\s*\d{4}/,
  /\bistock\s*\/?\s*getty\s*images\b/i,
  /\bhakinmhan\b/i,
  /\bpowered by\b/i
];

export function isHardNoise(value: string): boolean {
  return HARD_NOISE.some((pattern) => pattern.test(value));
}

// Detects OCR/PDF-extraction artifacts and low-signal fragments that survived sentence splitting.
// Catches things like "rst GOAl rst rtAN I rst ACTION L fi 0 IL" that pass the noun-phrase gate
// but would be surfaced as junk definitions/evidence.
export function isSentenceLowQuality(sentence: string): boolean {
  const trimmed = sentence.trim();
  if (trimmed.length < 24) return true;
  if (isHardNoise(trimmed)) return true;

  // Reject orphan-punctuation fragments: "Section 5.3 Brain-Based Learning be declared )."
  // The tell is that after stripping a section prefix the remainder is under 24 chars,
  // or it starts with a lowercase function word plus a lone closing bracket.
  const afterPrefix = stripSectionPrefix(trimmed);
  if (afterPrefix === trimmed && /^(?:Section\s+)?\d+(?:\.\d+)?\s+[A-Z]/.test(trimmed)) {
    // Section prefix didn't strip — meaning what followed was too short to keep.
    const matches = trimmed.match(SECTION_PREFIX);
    if (matches) {
      const rest = trimmed.slice(matches[0].length).trim();
      if (rest.length < 24) return true;
      if (/^[a-z][^.!?]*[\):;]\s*\.?$/.test(rest)) return true;
    }
  } else if (afterPrefix !== trimmed && afterPrefix.length < 24) {
    return true;
  }
  // Sentences that are only a section header with a trailing number/punctuation:
  // "Section 10.1 Resilience and Grit 2.", "Section 14.3 Strategies for Professional Networking 3."
  if (/^(?:Section\s+)?\d+(?:\.\d+)?\s+[A-Z][A-Za-z' -]+\s*\d*[.)]\s*$/.test(trimmed)) return true;
  // Sentences ending in an orphan parenthesis/colon with no substantive clause before:
  if (/^[^a-z]{0,40}[a-z][^.!?]{0,30}[\):;]\s*\.?$/.test(trimmed)) return true;
  // Figure/Table caption tails: "Section 9.2 Taking Notes Figure 9.1 The Cornell method Reprinted from…"
  // These aren't real content — they're illustration captions that got glued onto section headings.
  if (/(?:Figure|Table|Box)\s+\d+(?:\.\d+)?\s+[A-Z][A-Za-z' -]+(?:Reprinted|Flickr|Attribution|Photo|Stock|Getty|Image)/i.test(trimmed)) return true;
  // Pure caption sentences: "Figure 2: Sarah's revised Tuesday night schedule • Tech Tips: …"
  // These are directory-like bullets joined into one sentence — low signal.
  if (/^(?:Figure|Table|Box)\s+\d+/.test(trimmed) && trimmed.split("•").length >= 3) return true;
  // Bullet-catalog sentences: "4: Sarah's revised … • Tech Tips • Avoiding …" — joined TOC fragments.
  if (BULLET_CATALOG_PREFIX.test(trimmed) || trimmed.split("•").length >= 4) return true;

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 6) return true;

  // After stripping a section prefix, require at least 8 tokens of real prose.
  const proseTokens = afterPrefix.split(/\s+/).filter(Boolean);
  if (proseTokens.length < 8 && afterPrefix !== trimmed) return true;

  // Copyright / attribution-heavy lines often survive because the sentence splitter missed a period.
  if (/\b(copyright|publisher|all rights reserved|stock\s*\/?\s*getty|illustration by)\b/i.test(trimmed)) return true;

  // OCR/PDF fragmentation signature: many very-short tokens clustered together.
  let shortRun = 0;
  let maxShortRun = 0;
  let shortTokens = 0;
  for (const token of tokens) {
    const stripped = token.replace(/[^a-z0-9]/gi, "");
    if (stripped.length <= 3) {
      shortRun += 1;
      shortTokens += 1;
      maxShortRun = Math.max(maxShortRun, shortRun);
    } else {
      shortRun = 0;
    }
  }
  // 4+ consecutive short tokens is almost always broken OCR ("rst GOAl rst rtAN I rst").
  if (maxShortRun >= 4) return true;
  // Very high density of short tokens (≥ 65%) combined with no complex multi-syllable tokens.
  // Normal English has lots of short function words (the, of, is, in, to) and routinely hits 40%+,
  // so the threshold has to be much higher OR require concurrent absence of substantive words.
  if (tokens.length >= 10 && shortTokens / tokens.length > 0.65) return true;

  // Mixed-case fragment words ("GOAl", "rtAN", "ACTION") — capital letters in non-leading positions
  // that are not acronyms, clustered together.
  let mixedCase = 0;
  for (const token of tokens) {
    if (token.length >= 3 && /[A-Z]/.test(token.slice(1)) && /[a-z]/.test(token)) {
      mixedCase += 1;
    }
  }
  if (mixedCase >= 3) return true;

  // Alphanumeric gibberish ("fi 0 IL", "L fi 0 IL"): standalone tokens of length 1–2 that are
  // UPPERCASE-only or digit-only. Previously included lowercase function words ("is/a/of/at"),
  // which false-flagged normal English prose — "Spaced repetition is a learning technique..." hit 4.
  const tinyGibberish = tokens.filter((token) => /^[A-Z]{1,2}$/.test(token) || /^\d{1,2}$/.test(token)).length;
  if (tokens.length >= 8 && tinyGibberish >= 4) return true;

  return false;
}

const GENERIC_WRAPPERS = [
  /^(week|module|chapter|unit|lesson)\s+\d+(\s*[-:].*)?$/i,
  /^(discussion|quiz|assignment|page|topic|reflection(?:\s+activity)?)$/i,
  /^(start here|course modules?|introduction)$/i,
  /^(initial post|reply to classmates|respond to classmates)$/i
];

export function isGenericWrapper(label: string): boolean {
  const normalized = normalizeWhitespace(label);
  return GENERIC_WRAPPERS.some((pattern) => pattern.test(normalized));
}

// Head tokens that make sense to block even in compound phrases: pronouns,
// connectors, sentence-starters. These always disqualify a phrase head.
const LABEL_HEAD_BLOCKLIST = new Set([
  "he","she","it","they","them","their","this","that","these","those","there","here",
  "when","where","while","who","whom","what","which","why","how",
  "if","unless","until","whether","you","your",
  // Possessive pronouns and articles — "My goal", "My husband", "The article",
  // "An essay", "Our plan" are personal fragments, never real concepts.
  "my","our","ours","his","her","hers","its","the","a","an",
  "another","also","although","always","sometimes","often","because","however","therefore",
  "thus","consequently","moreover","furthermore","instead","additionally","nonetheless",
  "nevertheless","otherwise","similarly","likewise","finally","ultimately","meanwhile",
  "first","second","third","fourth","fifth","next","then","after","before",
  "recent","recently","today","now","current","currently",
  "many","most","some","several","all","any","each","every","few","no",
  "yes","true","false","overall","together","rather","just","still","even","yet",
  "one","two","three","four","five","six","seven","eight","nine","ten",
  "according","typically","generally","usually","often","occasionally",
  "try","get","use","make","take","find","keep","ask","tell","show","give","go","come",
  "do","does","did","doing","done","be","being","been","have","has","had","having",
  "plus","post","posts","want","wants"
]);

// Plural/mass nouns that make two-word labels read like directory section
// headers ("Learning Activities", "Course Materials", "Key Resources") rather
// than true concepts. Applied only to 2-token labels — a 3+ token phrase like
// "Classroom Management Strategies" is probably a legitimate concept.
const GENERIC_TAIL_BLOCKLIST = new Set([
  "activities","materials","resources","items","things","stuff","notes",
  "information","details","guidelines","instructions","directions",
  "basics","fundamentals","essentials","foundations","requirements","expectations",
  "tips","tricks","hints","suggestions","recommendations"
]);

// Soft blocklist: UI-chrome / structural words that are valid when part of a
// multi-token concept ("Active recall", "Access token", "Check in") but not
// as a single-word label ("Active", "Check").
const SOFT_HEAD_BLOCKLIST = new Set([
  "return","select","access","active","available","check","choose","click","continue","enter","submit",
  "help","others",
  "conclusion","introduction","background","overview","summary","preface",
  "map","figure","table","chart","diagram","example","chapter","section","part"
]);

const SINGLE_TOKEN_BLOCKLIST = new Set([
  "help","others","people","students","teachers","parents","adults","children","men","women","husband","wife","partner","friend","friends","family","mother","father","brother","sister","son","daughter","child","baby","classmate","classmates","professor","instructor","advisor",
  "everyone","someone","something","anyone","anything","everything","nothing","nobody","everybody",
  "career","careers","school","schools","college","colleges","university","universities",
  "life","time","work","job","task","tasks","job","goal","goals","idea","ideas","plan","plans","note","notes","question","questions","answer","answers","reason","reasons","way","ways","thing","things","person","persons",
  "motivation","inspiration","feelings","feeling","emotion","emotions","experience","experiences","journey","path","road","trip","story","stories",
  "journal","diary","log","paper","essay","report","article","articles","post","posts",
  "activity","activities","assignment","assignments","exercise","exercises","project","projects","lesson","lessons","unit","units",
  "reprinted","shared","licensed","attributions","attribution","citations","copyright","rights","licenses",
  "chapter","section","part","page","figure","table","appendix","index","contents","glossary",
  "overview","introduction","conclusion","summary","preface","foreword","acknowledgment","acknowledgements"
]);

const BOILERPLATE_LABEL_PATTERNS = [
  /^all rights reserved/i,
  /^copyright\b/i,
  /^isbn\b/i,
  /^published by\b/i,
  /\bpress(?:\s+\w+)?$/i,
  /\bllc$/i,
  /\binc\.?$/i,
  /^chapter\s+\d+/i,
  /^section\s+\d+/i,
  /^part\s+\d+/i,
  /^figure\s+\d+/i,
  /^table\s+\d+/i,
  /^©/,
  /getty\s+images/i,
  /istock/i,
  /shutterstock/i,
  /^reserved$/i,
  /^rights reserved$/i,
  /\b(education|statistics|university|college|bureau|department|institute|foundation|ministry|board|commission|council|agency|services|enterprises|solutions|partners|associates|holdings|group|consulting)\b$/i,
  /^reprinted from\b/i,
  /^shared previously\b/i,
  /^licensed content\b/i,
  /^cc licensed\b/i,
  /^licenses and attributions\b/i,
  /\battributions?\b$/i,
  /\bbibliography$/i,
  /\backnowledg(e)?ments$/i,
  /^(the )?(author|editor|contributor)s?\b/i
];

const ATTRIBUTION_SENTENCE_PATTERNS = [
  /\bcc\s+licensed\s+content\b/i,
  /\blicensed\s+content,?\s+shared\s+previously\b/i,
  /\bshared\s+previously\b/i,
  /\blicenses\s+and\s+attributions\b/i,
  /\bauthored\s+by\b/i,
  /\bcreative\s+commons\b/i,
  /©\s*\d{4}/,
  /\bcopyright\s+©?\s*\d{4}/i,
  /\ball\s+rights\s+reserved\b/i,
  /\bisbn[\s:\-]/i,
  /\breprinted\s+from\b/i,
  /\bedits\s+and\s+additions\b/i,
  /\bwww\.[a-z0-9.-]+\.(com|org|gov|edu)/i
];

function isAttributionHeavy(sentences: string[]): boolean {
  if (sentences.length === 0) return false;
  const hits = sentences.filter((sentence) => ATTRIBUTION_SENTENCE_PATTERNS.some((pattern) => pattern.test(sentence))).length;
  return hits / sentences.length >= 0.6;
}

function matchesBoilerplate(value: string): boolean {
  return BOILERPLATE_LABEL_PATTERNS.some((pattern) => pattern.test(value));
}

const TAIL_STRUCTURAL_WORDS = /(\s+(?:Chapter|Section|Part|Figure|Table|Box|Chart|Quiz|Exercise|Appendix|Page|Unit))+(?:\s+\d+)?$/gi;

// Sentence-starter words that sometimes get glued onto the end of a captured heading.
// Example: "Reasons Behind Procrastination There are several..." → strip the trailing "There".
const TAIL_SENTENCE_STARTERS = /\s+(?:There|After|Before|Since|Consider|Let|Let's|Several|Few|Plus|Additionally|Moreover|Furthermore|However|Therefore|Consequently|First|Next|Then|Finally)\s*$/i;

function stripTailStarters(value: string): string {
  let next = value;
  for (let i = 0; i < 3; i += 1) {
    const stripped = next.replace(TAIL_SENTENCE_STARTERS, "").trim();
    if (stripped === next) break;
    next = stripped;
  }
  return next;
}

// Labels that are canonically part of a Canvas LMS layout, not substantive course content.
const CANVAS_CHROME_LABELS = new Set([
  "course home","final grade","final project","looking ahead","post your introduction",
  "live learning session","criteria ratings pts description","course modules","course navigation",
  "assignment week","quiz week","checklist week","resources week","module week",
  "discussion week","weekly checklist","weekly resources","announcements","inbox","dashboard",
  "course menu","sidebar","course info","course information","rubric"
]);

// Geographic-map noise: labels produced by scanning a map figure full of place names.
function looksLikeGeographyMapNoise(label: string, _keywords: string[]): boolean {
  const words = label.split(/\s+/);
  if (words.length < 2) return false;
  const allCapsCount = words.filter((word) => /^[A-Z]{2,}$/.test(word)).length;
  const properNounCount = words.filter((word) => /^[A-Z][a-z]/.test(word) || /^[A-Z]{2,}$/.test(word)).length;
  const GEO_CUE = /^(?:ocean|sea|gulf|strait|peninsula|continent|mountain|mountains|river|rivers|bay|cape|isle|island|islands|desert|plateau|plain)$/i;
  const geoHits = words.filter((word) => GEO_CUE.test(word)).length;

  // Two or more all-caps tokens in one label (e.g., "ATLANTIC OCEAN", "MESOPOTAMIA Babylon"): almost always map labels.
  if (allCapsCount >= 2) return true;
  // Geography cue plus at least one proper noun: "Black Sea" / "Atlantic Ocean" / "Persian Gulf" / "Caspian Sea …".
  if (geoHits >= 1 && properNounCount >= 2) return true;
  // Long list of proper nouns with no common content words looks like a map legend.
  if (words.length >= 4 && properNounCount === words.length) return true;
  return false;
}

// Hand-curated blocklist of bigrams that are phrase-bone-dry and never carry concept meaning.
const GENERIC_PHRASE_BLOCKLIST = new Set<string>([
  "real world","best practices","broad range","wide range","long term","short term",
  "at best","at worst","for free","out there","in general","in particular","in short",
  "for example","for instance","over time","up front","up close","on track","on time",
  "first time","last time","next step","next steps","full marks","first step","big deal"
]);

// Section-heading prefixes like "Section 1.2 Identifying Your Values" or
// "1.2 Identifying Your Values" often survive the sentence splitter attached
// to the start of the following prose. Strip them so display sentences read
// cleanly, while the label itself stays visible in the concept card's title.
// Widened lookahead: allow running prose, bullets, digits, or structural
// tails like "Figure N.M" / "Table N.M" / "Box N.M" to follow the prefix.
const SECTION_PREFIX = /^(?:Section\s+)?\d+(?:\.\d+)?\s+[A-Z][A-Za-z' -]{2,80}?(?=\s+(?:[a-z•·●–—-]|\d|Figure\s|Table\s|Box\s|Tech\s))/;

// Figure/Table captions glue to substantive prose during PDF extraction:
// "Figure 9.3 Visual note-taking ArtistIvanChew / Flickr / Attribution 2.0
// Generic (CC-BY 2.0) Take the time to play with different types…"
// The first half is credit metadata; the second half is the real sentence.
// We strip the caption prefix whenever an imperative/substantive clause follows.
const FIGURE_CAPTION_PREFIX = /^(?:Figure|Table|Box|Photo|Image)\s+\d+(?:\.\d+)?[\s\S]*?(?:Reprinted|Flickr|Attribution|Getty|iStock|Stock|Photo(?:graph)?|Image|\(CC-?BY[^)]*\))[^.]{0,60}?\s+(?=[A-Z][a-z])/;

// "4: Sarah's revised Tuesday night schedule • Tech Tips: …" — sentences that
// open with a bare "N: Title" or "N." then devolve into bullet-separated list items.
const BULLET_CATALOG_PREFIX = /^\d+[.:]\s+[A-Z][^•]*?(?:•[^•]*){2,}/;

// Leftover Creative-Commons / attribution clutter that survives the main
// caption strip: "Attribution 2.0 Generic (CC-BY 2.0) " or "(CC-BY 2.0) " at
// the start of what's now prose. Strip if substantive sentence follows.
const ATTRIBUTION_LEFTOVER = /^(?:Attribution\s+\d+(?:\.\d+)?\s+Generic\s*)?\(CC[-\s]?BY[^)]*\)\s+(?=[A-Z][a-z])/i;

function stripCaptionPrefix(value: string): string {
  // Figure/Table captions: strip when a substantive "[Capital][lowercase]…" sentence follows.
  let result = value;
  const figureMatch = result.match(FIGURE_CAPTION_PREFIX);
  if (figureMatch) {
    const rest = result.slice(figureMatch[0].length).trim();
    if (rest.length >= 24 && /[a-z]/.test(rest)) result = rest;
  }
  const attrMatch = result.match(ATTRIBUTION_LEFTOVER);
  if (attrMatch) {
    const rest = result.slice(attrMatch[0].length).trim();
    if (rest.length >= 24 && /[a-z]/.test(rest)) result = rest;
  }
  return result;
}

function stripSectionPrefix(value: string): string {
  let result = value;
  // Iterate up to 3 times to handle repeated prefixes ("Section 2.3 Pitfalls 2.3 Pitfalls Even…").
  for (let pass = 0; pass < 3; pass += 1) {
    const match = result.match(SECTION_PREFIX);
    if (!match) break;
    const rest = result.slice(match[0].length).trim();
    if (rest.length < 24 || !/[a-z]/.test(rest)) break;
    result = rest;
  }
  return stripCaptionPrefix(result);
}

function cleanEvidenceSentence(sentence: string): string {
  // Strip leading concept-label duplication: "Fabrication Fabrication is…" → "Fabrication is…"
  const trimmed = sentence.replace(/\s+/g, " ").trim();
  const deduped = (() => {
    const doubled = trimmed.match(/^(\S+)\s+\1\b\s*(.*)$/);
    if (doubled && doubled[1] && doubled[2]) return `${doubled[1]} ${doubled[2]}`;
    return trimmed;
  })();
  const stripped = stripSectionPrefix(deduped);
  // After stripping a prefix the remainder may start with a lowercase function
  // word ("paragraph you write…", "with the best laid plans…"). Capitalize the
  // first letter so it reads cleanly as a standalone sentence.
  if (stripped.length >= 2 && /^[a-z]/.test(stripped) && stripped !== deduped) {
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  }
  return stripped;
}

function stripTailStructural(value: string): string {
  let next = value;
  // Repeat to handle stacked tails like "... Chapter Figure".
  for (let i = 0; i < 3; i += 1) {
    const stripped = next.replace(TAIL_STRUCTURAL_WORDS, "").trim();
    if (stripped === next) break;
    next = stripped;
  }
  return next;
}

function collapseRepeatedPhrase(value: string): string {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2) return value;
  // Adjacent single-token repeat: "Plagiarism Plagiarism" → "Plagiarism"
  const compressed: string[] = [];
  for (const word of words) {
    if (compressed[compressed.length - 1] && compressed[compressed.length - 1]!.toLowerCase() === word.toLowerCase()) continue;
    compressed.push(word);
  }
  // Full-phrase double: "Values are great Values are great" → "Values are great"
  if (compressed.length >= 2 && compressed.length % 2 === 0) {
    const half = compressed.length / 2;
    const left = compressed.slice(0, half).join(" ").toLowerCase();
    const right = compressed.slice(half).join(" ").toLowerCase();
    if (left === right) {
      return compressed.slice(0, half).join(" ");
    }
  }
  return compressed.join(" ");
}

export function evaluateLabel(label: string, options: { allowSingleToken?: boolean } = {}): { ok: boolean; cleaned: string; reasons: string[]; keywords: string[] } {
  const cleaned = collapseRepeatedPhrase(stripTailStarters(stripTailStructural(normalizeWhitespace(label).replace(/[.,;:!?]+$/, ""))));
  const reasons: string[] = [];
  if (!cleaned) reasons.push("label-empty");
  if (cleaned.length < 4 || cleaned.length > 90) reasons.push("label-length-out-of-range");
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length > 8) reasons.push("label-too-many-tokens");
  if (!options.allowSingleToken && words.length < 2) reasons.push("label-single-token");
  if (isHardNoise(cleaned)) reasons.push("label-hard-noise");
  if (isGenericWrapper(cleaned)) reasons.push("label-generic-wrapper");
  if (matchesBoilerplate(cleaned)) reasons.push("label-boilerplate");
  const headToken = words[0]?.toLowerCase() ?? "";
  const tailToken = words[words.length - 1]?.toLowerCase() ?? "";
  if (LABEL_HEAD_BLOCKLIST.has(headToken)) reasons.push("label-bad-head-token");
  // Soft blocklist only rejects single-token labels: "Active" bad, "Active recall" fine.
  if (SOFT_HEAD_BLOCKLIST.has(headToken) && words.length === 1) reasons.push("label-soft-head-single");
  // Single-token generic-noun blocklist applied here too (not just in explicitDefinitions)
  // so "Journal", "Motivation", "Husband" can't sneak in via heading-support or mention-count.
  if (words.length === 1 && SINGLE_TOKEN_BLOCKLIST.has(headToken)) reasons.push("label-generic-single");
  // Generic plural/mass last-token rejection: "Learning Activities", "Course Materials",
  // "Key Resources" — these read like directory section headers, not admit-worthy concepts.
  if (words.length === 2 && GENERIC_TAIL_BLOCKLIST.has(tailToken)) reasons.push("label-generic-tail");
  if (GENERIC_TITLE_HEADS.has(headToken) && words.length === 1) reasons.push("label-generic-head");
  const kw = tokens(cleaned);
  if (kw.length === 0) reasons.push("label-no-meaningful-keywords");
  const connectorTail = /\b(and|or|to|for|of|in|on|at|by|with|from|the|a|an|as)$/i;
  if (connectorTail.test(cleaned)) reasons.push("label-connector-tail");
  // All-caps shout words like "PRIORITIES" or "SUCCESS" — admit only multi-token
  if (words.length === 1 && /^[A-Z]{3,}$/.test(cleaned)) reasons.push("label-single-shout");
  if (CANVAS_CHROME_LABELS.has(cleaned.toLowerCase())) reasons.push("label-canvas-chrome");
  if (GENERIC_PHRASE_BLOCKLIST.has(cleaned.toLowerCase())) reasons.push("label-generic-phrase");
  if (looksLikeGeographyMapNoise(cleaned, kw)) reasons.push("label-geography-map-noise");
  // Fragments like "I want", "Want to know", "Fit Your", "Time It"
  const lastLower = words[words.length - 1]?.toLowerCase() ?? "";
  const FRAGMENT_TAILS = new Set(["you","your","yours","me","my","mine","it","its","we","they","their","them","know","knows","want","wants","like","likes","use","uses","do","see","ahead","out","up","down","off","deep","well","through","away","along"]);
  if (words.length <= 3 && FRAGMENT_TAILS.has(lastLower)) reasons.push("label-fragment-tail");
  return { ok: reasons.length === 0, cleaned, reasons, keywords: kw };
}

// -------- Signals --------

const DEF_SIGNAL = /\b(?:is|are|refers to|means|describes|explains|is defined as|occurs when|happens when)\b/i;
const CONTRAST_SIGNAL = /\b(?:while|whereas|unlike|differs from|contrasts? with|in contrast)\b/i;
const APPLICATION_SIGNAL = /\b(?:apply|applies|use(?:s|d)?|in practice|for example|for instance|e\.g\.)\b/i;

// -------- Explicit definition extraction --------

// First token must be capitalized; subsequent tokens can be lowercase so compound
// concepts like "Active recall", "Spaced repetition", "Positive reinforcement",
// "Growth mindset" can be recognized (only proper nouns capitalize every word).
// Label capped at 5 tokens by explicitDefinitions() to avoid matching a whole clause.
const DEFINITION_PATTERNS = [
  /^([A-Z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,4})\s+(?:is|are)\s+(.{10,400})$/,
  /^([A-Z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,4})\s+(?:refers to|means|describes|explains|involves)\s+(.{10,400})$/,
  /^([A-Z][A-Za-z0-9'/-]*(?:\s+[A-Za-z][A-Za-z0-9'/-]*){0,4})\s+(?:occurs when|happens when)\s+(.{10,400})$/
];

const DEFINITION_STOP_WORDS = new Set([
  "humans","people","students","children","adults","others","someone","everyone","questions"
]);

function explicitDefinitions(sentence: string): Array<{ label: string; body: string }> {
  const results: Array<{ label: string; body: string }> = [];
  for (const pattern of DEFINITION_PATTERNS) {
    const match = sentence.match(pattern);
    if (match && match[1] && match[2]) {
      let label = match[1].trim().replace(/[.,;:!?]+$/, "");
      const body = match[2].trim();
      if (body.length < 24) continue;
      // Cut the label at the first token that is a common noun-then-sentence-starter
      // ("Asking Questions Humans" → "Asking Questions" for "Humans are …")
      const parts = label.split(/\s+/);
      const stopIdx = parts.findIndex((token) => DEFINITION_STOP_WORDS.has(token.toLowerCase()));
      if (stopIdx > 0) {
        label = parts.slice(0, stopIdx).join(" ");
      }
      // Cap to 5 tokens max — real subjects in def sentences are almost never longer.
      const capped = label.split(/\s+/).slice(0, 5).join(" ");
      label = capped;

      const tokensArr = label.split(/\s+/).filter(Boolean);
      if (tokensArr.length === 0) continue;
      const head = tokensArr[0]?.toLowerCase() ?? "";
      if (LABEL_HEAD_BLOCKLIST.has(head)) continue;
      // Soft head blocklist only rejects single-token labels.
      if (tokensArr.length === 1 && SOFT_HEAD_BLOCKLIST.has(head)) continue;
      if (tokensArr.length === 1 && SINGLE_TOKEN_BLOCKLIST.has(head)) continue;
      const gate = evaluateLabel(label, { allowSingleToken: true });
      if (!gate.ok) continue;
      if (tokensArr.length === 1) {
        // Short labels (≤7 chars) need a longer body to earn single-token admission —
        // prevents noise words like "Summary" or "Section" slipping through.
        // Specialized vocabulary (≥ 8 chars) can be admitted with a shorter definition,
        // since long labels are intrinsically more distinctive.
        const minBody = label.length >= 8 ? 36 : 80;
        if (body.length < minBody) continue;
        // DEFINITION_PATTERNS already require a verb ("is", "refers to", etc.) between
        // label and body; no need to re-check. Earlier check was buggy because the verb
        // is *consumed* by the regex and thus absent from the concatenation.
      }
      results.push({ label, body });
    }
  }
  return results;
}

// -------- Noun-phrase candidates (TF-IDF-like ranking) --------

const CAPITAL_PHRASE_PATTERN = /\b([A-Z][A-Za-z][A-Za-z0-9'/-]*(?:\s+(?:of|and|or|in|on|for|to|the|a|an|as|with|by|from|vs\.?))*(?:\s+[A-Z][A-Za-z][A-Za-z0-9'/-]*){0,4})\b/g;
const QUOTED_PATTERN = /"([^"\n]{4,80})"|\u201C([^\u201D\n]{4,80})\u201D/g;

const CONNECTOR_EDGE = new Set(["of","and","or","in","on","for","to","the","a","an","as","with","by","from","vs","vs."]);

function trimEdges(phrase: string): string {
  const parts = phrase.split(/\s+/).filter(Boolean);
  while (parts.length && CONNECTOR_EDGE.has(parts[0]!.toLowerCase())) parts.shift();
  while (parts.length && CONNECTOR_EDGE.has(parts[parts.length - 1]!.toLowerCase())) parts.pop();
  return parts.join(" ");
}

function extractPhrases(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (candidate: string) => {
    const phrase = trimEdges(candidate.replace(/\s+/g, " ").trim().replace(/[.,;:!?]+$/, ""));
    const key = normalizeForCompare(phrase);
    if (!key || seen.has(key)) return;
    const gate = evaluateLabel(phrase);
    if (!gate.ok) return;
    seen.add(key);
    out.push(gate.cleaned);
  };
  let match: RegExpExecArray | null;
  while ((match = CAPITAL_PHRASE_PATTERN.exec(text)) !== null) {
    if (match[1]) push(match[1]);
  }
  CAPITAL_PHRASE_PATTERN.lastIndex = 0;
  while ((match = QUOTED_PATTERN.exec(text)) !== null) {
    const content = match[1] ?? match[2];
    if (content) push(content);
  }
  QUOTED_PATTERN.lastIndex = 0;
  return out;
}

// -------- Main analyze --------

type CandidateBucket = {
  label: string;
  normalizedLabel: string;
  keywords: string[];
  sourceIds: Set<string>;
  sentences: Array<{ sourceId: string; sentence: string; headingTrail: string[]; offset: number }>;
  definitionSentences: Array<{ sourceId: string; sentence: string; headingTrail: string[]; body: string; offset: number }>;
  headingSupport: boolean;
  regions: Map<string, Set<number>>;
};

function bucketKey(label: string): string {
  return normalizeForCompare(label)
    .replace(/^(overview|introduction|principles|foundations)\s+(?:of|to|for)\s+/i, "")
    .replace(/\s+(overview|introduction|principles|foundations)$/i, "")
    .trim();
}

function ensureBucket(map: Map<string, CandidateBucket>, label: string, allowSingleToken = false): CandidateBucket {
  const gate = evaluateLabel(label, { allowSingleToken });
  const key = bucketKey(gate.cleaned);
  const existing = map.get(key);
  if (existing) return existing;
  const bucket: CandidateBucket = {
    label: gate.cleaned,
    normalizedLabel: key,
    keywords: gate.keywords,
    sourceIds: new Set<string>(),
    sentences: [],
    definitionSentences: [],
    headingSupport: false,
    regions: new Map<string, Set<number>>()
  };
  map.set(key, bucket);
  return bucket;
}

function regionIndex(offset: number, textLength: number, buckets = 4): number {
  if (textLength <= 0) return 0;
  return Math.min(buckets - 1, Math.floor((offset / textLength) * buckets));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ScanResult = {
  sourceId: string;
  offset: number;
  sentence: string;
  headingTrail: string[];
  region: number;
};

function countCaseInsensitiveMentions(label: string, sources: SourceDoc[]): ScanResult[] {
  const needle = label.trim();
  if (needle.length < 3) return [];
  const pattern = new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(needle)}(?![A-Za-z0-9])`, "gi");
  const results: ScanResult[] = [];
  for (const source of sources) {
    const text = source.text;
    if (!text) continue;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const region = regionIndex(start, text.length);
      const sentenceStart = Math.max(0, text.lastIndexOf(".", start) + 1, text.lastIndexOf("\n", start) + 1);
      const sentenceEnd = Math.min(text.length, text.indexOf("\n", start) === -1 ? text.length : text.indexOf("\n", start));
      const sentence = text.slice(sentenceStart, sentenceEnd).replace(/\s+/g, " ").trim().slice(0, 300);
      results.push({ sourceId: source.id, offset: start, sentence, headingTrail: source.headings.slice(0, 3), region });
    }
    pattern.lastIndex = 0;
  }
  return results;
}

export function analyze(sources: SourceDoc[]): AnalyzeResult {
  const buckets = new Map<string, CandidateBucket>();
  const rejections: AnalyzeResult["rejections"] = [];

  // Pass 1: seed candidates from headings + explicit definitions + capitalized/quoted phrases
  for (const source of sources) {
    const sentences = splitSentences(source.text);
    const headingsLower = new Set(source.headings.map((heading) => normalizeForCompare(heading)));

    for (const heading of source.headings) {
      const gate = evaluateLabel(heading);
      if (!gate.ok) continue;
      const bucket = ensureBucket(buckets, gate.cleaned);
      bucket.sourceIds.add(source.id);
      bucket.headingSupport = true;
    }

    for (const sentence of sentences) {
      if (isHardNoise(sentence)) continue;
      if (isSentenceLowQuality(sentence)) continue;
      const offsetIndex = source.text.indexOf(sentence.slice(0, Math.min(60, sentence.length)));
      const offset = offsetIndex >= 0 ? offsetIndex : 0;
      const region = regionIndex(offset, source.text.length);
      const trail = source.headings.slice(0, 3);

      const definitions = explicitDefinitions(sentence);
      for (const definition of definitions) {
        const bucket = ensureBucket(buckets, definition.label, true);
        bucket.sourceIds.add(source.id);
        bucket.definitionSentences.push({ sourceId: source.id, sentence, headingTrail: trail, body: definition.body, offset });
        const regionSet = bucket.regions.get(source.id) ?? new Set<number>();
        regionSet.add(region);
        bucket.regions.set(source.id, regionSet);
      }
      const phrases = extractPhrases(sentence);
      for (const phrase of phrases) {
        const bucket = ensureBucket(buckets, phrase);
        bucket.sourceIds.add(source.id);
        bucket.sentences.push({ sourceId: source.id, sentence, headingTrail: trail, offset });
        const regionSet = bucket.regions.get(source.id) ?? new Set<number>();
        regionSet.add(region);
        bucket.regions.set(source.id, regionSet);
        if (headingsLower.has(normalizeForCompare(phrase))) {
          bucket.headingSupport = true;
        }
      }
    }
  }

  // Pass 2: case-insensitive re-count across all sources for every seeded candidate.
  // This catches prose mentions in lowercase that wouldn't match CAPITAL_PHRASE_PATTERN.
  const candidateBuckets = [...buckets.values()].filter((bucket) => bucket.label.split(/\s+/).length >= 2 || bucket.definitionSentences.length > 0 || bucket.headingSupport);
  for (const bucket of candidateBuckets) {
    const scans = countCaseInsensitiveMentions(bucket.label, sources);
    const seenOffsets = new Set(bucket.sentences.map((entry) => `${entry.sourceId}:${entry.offset}`));
    for (const scan of scans) {
      const key = `${scan.sourceId}:${scan.offset}`;
      if (seenOffsets.has(key)) continue;
      seenOffsets.add(key);
      bucket.sourceIds.add(scan.sourceId);
      bucket.sentences.push({ sourceId: scan.sourceId, sentence: scan.sentence, headingTrail: scan.headingTrail, offset: scan.offset });
      const regionSet = bucket.regions.get(scan.sourceId) ?? new Set<number>();
      regionSet.add(scan.region);
      bucket.regions.set(scan.sourceId, regionSet);
    }
  }

  // Pass 3: admit concepts
  const concepts: Concept[] = [];
  const totalSources = Math.max(1, sources.length);
  for (const bucket of buckets.values()) {
    const mentions = bucket.sentences.length + bucket.definitionSentences.length;
    const documentFrequency = Math.max(1, bucket.sourceIds.size);
    const hasDefinition = bucket.definitionSentences.length > 0;
    const hasHeadingSupport = bucket.headingSupport;
    const isMultiToken = bucket.label.split(/\s+/).length >= 2;
    const regionSpread = [...bucket.regions.values()].reduce((max, set) => Math.max(max, set.size), 0);
    const multiSource = documentFrequency >= 2;

    // Admission rules (fail-closed):
    // 1. Explicit definition (single-token allowed): always admit.
    // 2. Heading support + multi-token + ≥ 2 mentions: admit.
    // 3. Multi-token + ≥ 3 mentions with (region spread ≥ 2 OR multi-source): admit.
    // 4. Multi-token + ≥ 6 mentions (repeated-mentions floor).
    let admitReason: string | null = null;
    if (hasDefinition) {
      admitReason = "explicit-definition";
    } else if (isMultiToken && hasHeadingSupport && mentions >= 2) {
      admitReason = "heading-support-plus-mentions";
    } else if (isMultiToken && mentions >= 3 && (regionSpread >= 2 || multiSource)) {
      admitReason = "distributed-mentions";
    } else if (isMultiToken && mentions >= 6) {
      admitReason = "high-frequency";
    }
    if (!admitReason) {
      let code = "noun-phrase-insufficient-support";
      if (!isMultiToken) code = "label-single-token";
      rejections.push({
        code,
        detail: `Rejected ${bucket.label}: mentions=${mentions} spread=${regionSpread} sources=${documentFrequency} heading=${hasHeadingSupport} def=${hasDefinition}`,
        candidate: bucket.label
      });
      continue;
    }

    // Attribution/boilerplate evidence filter: if most of the supporting sentences look
    // like copyright or license-attribution text, drop the concept.
    const allSentences = [
      ...bucket.definitionSentences.map((entry) => entry.sentence),
      ...bucket.sentences.map((entry) => entry.sentence)
    ];
    if (isAttributionHeavy(allSentences)) {
      rejections.push({
        code: "attribution-heavy",
        detail: `Rejected ${bucket.label}: evidence is mostly copyright / attribution text`,
        candidate: bucket.label
      });
      continue;
    }

    const cleanDefinitionEntry = bucket.definitionSentences.find((entry) => !isSentenceLowQuality(entry.sentence));
    const definitionSpan: EvidenceSpan | null = cleanDefinitionEntry
      ? {
          sourceId: cleanDefinitionEntry.sourceId,
          sentence: cleanEvidenceSentence(cleanDefinitionEntry.sentence),
          headingTrail: cleanDefinitionEntry.headingTrail,
          role: "definition"
        }
      : null;

    const summarySpan: EvidenceSpan | null = (() => {
      const remaining = bucket.sentences
        .filter((entry) => !isSentenceLowQuality(entry.sentence))
        .filter((entry) => cleanEvidenceSentence(entry.sentence) !== definitionSpan?.sentence);
      const best = remaining.find((entry) => /\b(is|are|defines|defined|explain|explains|example|for example)\b/i.test(entry.sentence)) ?? remaining[0];
      return best ? {
        sourceId: best.sourceId,
        sentence: cleanEvidenceSentence(best.sentence),
        headingTrail: best.headingTrail,
        role: "explanation"
      } : null;
    })();

    if (!definitionSpan && !summarySpan && !hasHeadingSupport) {
      rejections.push({ code: "no-evidence-span", detail: `Rejected ${bucket.label}: no surviving evidence`, candidate: bucket.label });
      continue;
    }

    const evidence: EvidenceSpan[] = [];
    const evidenceSeen = new Set<string>();
    const pushEvidence = (span: EvidenceSpan) => {
      const key = `${span.sourceId}:${span.sentence.slice(0, 80)}`;
      if (evidenceSeen.has(key)) return;
      evidenceSeen.add(key);
      evidence.push(span);
    };
    if (definitionSpan) pushEvidence(definitionSpan);
    if (summarySpan && summarySpan.sentence !== definitionSpan?.sentence) pushEvidence(summarySpan);
    for (const entry of bucket.sentences) {
      if (evidence.length >= 6) break;
      if (isSentenceLowQuality(entry.sentence)) continue;
      const cleaned = cleanEvidenceSentence(entry.sentence);
      if (cleaned === definitionSpan?.sentence || cleaned === summarySpan?.sentence) continue;
      const role: EvidenceSpan["role"] = CONTRAST_SIGNAL.test(cleaned) ? "contrast" : APPLICATION_SIGNAL.test(cleaned) ? "example" : "explanation";
      pushEvidence({ sourceId: entry.sourceId, sentence: cleaned, headingTrail: entry.headingTrail, role });
    }

    // Calibrated scoring: distribute from ~25 to 100 so ranking is meaningful.
    const idf = Math.log(1 + totalSources / documentFrequency);
    const mentionBonus = Math.min(28, Math.round(Math.log2(1 + mentions) * 9));
    const defBonus = hasDefinition ? 25 : 0;
    const headBonus = hasHeadingSupport ? 15 : 0;
    const spreadBonus = Math.min(15, Math.max(0, (regionSpread - 1) * 6));
    const sourceBonus = multiSource ? 10 : 0;
    const idfBonus = Math.min(10, Math.round(idf * 5));
    const score = Math.max(20, Math.min(100, 12 + mentionBonus + defBonus + headBonus + spreadBonus + sourceBonus + idfBonus));

    const admissionReasons: string[] = [admitReason];
    if (hasHeadingSupport && !admissionReasons.includes("heading-support-plus-mentions")) admissionReasons.push("heading-support");
    if (multiSource) admissionReasons.push("multi-source");
    if (regionSpread >= 2) admissionReasons.push(`spread-${regionSpread}`);

    const finalDefinition = definitionSpan?.sentence ?? "";
    const finalSummary = summarySpan?.sentence ?? "";
    // Drop concepts where ALL sentence-level content was rejected by the
    // quality gates — they were admitted by heading-support only but have
    // no displayable evidence, which just clutters the concept list.
    if (!finalDefinition && !finalSummary && evidence.length === 0) {
      rejections.push({
        code: "no-surviving-evidence",
        detail: `Rejected ${bucket.label}: heading appeared but every candidate sentence failed the quality gates`,
        candidate: bucket.label
      });
      continue;
    }
    concepts.push({
      id: slugify(bucket.label) + ":" + stableHash(bucket.normalizedLabel).slice(0, 6),
      label: bucket.label,
      normalizedLabel: bucket.normalizedLabel,
      keywords: bucket.keywords,
      definition: finalDefinition,
      summary: finalSummary,
      evidence,
      sourceIds: [...bucket.sourceIds].sort(),
      score,
      admissionReasons
    });
  }

  concepts.sort((left, right) => right.score - left.score || left.label.localeCompare(right.label));

  // Prefix-dedup: "Setting Goals In Table" is almost certainly a leakage variant of "Setting Goals".
  // If a shorter concept A is a whitespace-bounded prefix of a longer concept B, drop B and fold
  // its mentions and evidence into A.
  const dedupedConcepts: Concept[] = [];
  const dropped = new Set<string>();
  const normalizedLabels = concepts.map((concept) => ({ concept, lower: concept.label.toLowerCase() }));
  for (let i = 0; i < normalizedLabels.length; i += 1) {
    const longer = normalizedLabels[i]!;
    if (dropped.has(longer.concept.id)) continue;
    for (let j = 0; j < normalizedLabels.length; j += 1) {
      if (i === j) continue;
      const shorter = normalizedLabels[j]!;
      if (dropped.has(shorter.concept.id)) continue;
      if (shorter.lower.length >= longer.lower.length) continue;
      const prefix = `${shorter.lower} `;
      if (!longer.lower.startsWith(prefix)) continue;
      // Fold longer into shorter — augment evidence but keep shorter's definition/summary.
      const shorterConcept = shorter.concept;
      const seenIds = new Set(shorterConcept.evidence.map((entry) => `${entry.sourceId}:${entry.sentence}`));
      for (const span of longer.concept.evidence) {
        const key = `${span.sourceId}:${span.sentence}`;
        if (seenIds.has(key)) continue;
        if (shorterConcept.evidence.length >= 8) break;
        seenIds.add(key);
        shorterConcept.evidence.push(span);
      }
      shorterConcept.sourceIds = Array.from(new Set([...shorterConcept.sourceIds, ...longer.concept.sourceIds])).sort();
      shorterConcept.score = Math.min(100, shorterConcept.score + 2);
      dropped.add(longer.concept.id);
      rejections.push({
        code: "prefix-duplicate",
        detail: `Folded "${longer.concept.label}" into "${shorterConcept.label}"`,
        candidate: longer.concept.label
      });
      break;
    }
  }
  for (const entry of normalizedLabels) {
    if (!dropped.has(entry.concept.id)) dedupedConcepts.push(entry.concept);
  }

  const crossLinks = buildCrossLinks(sources);

  const deterministicHash = stableHash(JSON.stringify({
    concepts: dedupedConcepts.map((concept) => [concept.id, concept.label, concept.score, concept.sourceIds]),
    crossLinks: crossLinks.map((link) => [link.fromSourceId, link.toSourceId, link.overlap]),
    rejections: rejections.map((rejection) => [rejection.code, rejection.candidate ?? ""])
  }));

  return {
    concepts: dedupedConcepts,
    crossLinks,
    rejections,
    deterministicHash
  };
}

function buildCrossLinks(sources: SourceDoc[]): CrossLink[] {
  if (sources.length < 2) return [];
  const tokenSets = sources.map((source) => ({ id: source.id, set: new Set(tokens(`${source.title} ${source.text}`)) }));
  const out: CrossLink[] = [];
  for (let i = 0; i < tokenSets.length; i += 1) {
    for (let j = i + 1; j < tokenSets.length; j += 1) {
      const left = tokenSets[i]!;
      const right = tokenSets[j]!;
      const shared: string[] = [];
      for (const token of left.set) if (right.set.has(token)) shared.push(token);
      if (shared.length < 4) continue;
      const overlap = shared.length / Math.max(1, Math.min(left.set.size, right.set.size));
      out.push({ fromSourceId: left.id, toSourceId: right.id, sharedTokens: shared.slice(0, 10), overlap });
    }
  }
  out.sort((left, right) => right.overlap - left.overlap);
  return out.slice(0, 50);
}

// -------- Practice question generation --------

function keywordOverlap(left: Concept, right: Concept): number {
  const leftSet = new Set(left.keywords.map((keyword) => keyword.toLowerCase()));
  let matches = 0;
  for (const keyword of right.keywords) {
    if (leftSet.has(keyword.toLowerCase())) matches += 1;
  }
  return matches;
}

function pickNearConcepts(target: Concept, concepts: Concept[], limit: number): Concept[] {
  return concepts
    .filter((entry) => entry.id !== target.id)
    .map((entry) => ({ entry, score: keywordOverlap(target, entry) }))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.entry);
}

export function generateQuestions(concepts: Concept[], perConcept = 1, count = 10): PracticeQuestion[] {
  if (concepts.length === 0) return [];
  const questions: PracticeQuestion[] = [];
  const kinds: Array<PracticeQuestion["kind"]> = ["define", "pick-trap", "recall"];
  for (const concept of concepts) {
    if (questions.length >= count) break;
    const allOtherLabels = concepts.filter((entry) => entry.id !== concept.id).map((entry) => entry.label);
    if (allOtherLabels.length < 1) continue;
    const nearLabels = pickNearConcepts(concept, concepts, 6).map((entry) => entry.label);
    const sourceOfDistractors = nearLabels.length >= 3 ? nearLabels : allOtherLabels;
    const cleanDefinition = concept.definition && !isSentenceLowQuality(concept.definition) ? concept.definition : "";
    const cleanSummary = concept.summary && !isSentenceLowQuality(concept.summary) ? concept.summary : "";
    const cleanEvidence = concept.evidence.find((span) => !isSentenceLowQuality(span.sentence));
    if (!cleanDefinition && !cleanSummary && !cleanEvidence) continue;
    for (let k = 0; k < perConcept; k += 1) {
      const kindIndex = Number.parseInt(stableHash(`${concept.id}:${k}:kind`).slice(0, 4), 16) % kinds.length;
      let kind = kinds[kindIndex];
      let prompt: string | null = null;
      if (kind === "define" && cleanDefinition) {
        prompt = cleanDefinition.replace(new RegExp(`\\b${escapeRegex(concept.label)}\\b`, "i"), "______");
      } else if (kind === "pick-trap" && cleanDefinition) {
        const nearest = nearLabels[0] ?? allOtherLabels[0];
        prompt = `The following describes a concept that is commonly confused with "${nearest}". Which concept does it actually define?\n\n${cleanDefinition.replace(new RegExp(`\\b${escapeRegex(concept.label)}\\b`, "i"), "______")}`;
      } else if (kind === "recall" && cleanEvidence) {
        prompt = `Recall the concept from this supporting passage:\n\n"${cleanEvidence.sentence.replace(new RegExp(`\\b${escapeRegex(concept.label)}\\b`, "gi"), "______")}"`;
      }
      // Fallback chain when the preferred kind's material is missing or noisy.
      if (!prompt) {
        if (cleanDefinition) {
          kind = "define";
          prompt = cleanDefinition.replace(new RegExp(`\\b${escapeRegex(concept.label)}\\b`, "i"), "______");
        } else if (cleanSummary) {
          kind = "define";
          prompt = cleanSummary.replace(new RegExp(`\\b${escapeRegex(concept.label)}\\b`, "i"), "______");
        } else if (cleanEvidence) {
          kind = "recall";
          prompt = `Recall the concept from this supporting passage:\n\n"${cleanEvidence.sentence.replace(new RegExp(`\\b${escapeRegex(concept.label)}\\b`, "gi"), "______")}"`;
        } else {
          continue;
        }
      }
      const distractorPool = shuffleStable(sourceOfDistractors.slice(0, 6), `${concept.id}:${k}:d`);
      questions.push({
        id: `${concept.id}:q${k}`,
        conceptId: concept.id,
        kind,
        prompt,
        correct: concept.label,
        distractors: distractorPool.slice(0, 3)
      });
      if (questions.length >= count) break;
    }
  }
  return questions.slice(0, count);
}

export type DistinctionPair = {
  id: string;
  left: Concept;
  right: Concept;
  evidence: EvidenceSpan;
  correctId: string;
};

export function conceptDescribingText(concept: Concept): string {
  if (concept.definition.trim().length > 0 && !isSentenceLowQuality(concept.definition)) return concept.definition;
  if (concept.summary.trim().length > 0 && !isSentenceLowQuality(concept.summary)) return concept.summary;
  const cleanSpan = concept.evidence.find((span) => !isSentenceLowQuality(span.sentence));
  return cleanSpan?.sentence ?? "";
}

export function generateDistinctionPairs(concepts: Concept[], count = 20): DistinctionPair[] {
  if (concepts.length < 2) return [];
  const pairs: DistinctionPair[] = [];
  const seen = new Set<string>();
  const hasCleanDefinition = (concept: Concept) => conceptDescribingText(concept).trim().length > 0;
  for (const concept of concepts) {
    if (concept.evidence.length === 0) continue;
    if (!hasCleanDefinition(concept)) continue;
    const evidence = concept.evidence.find((span) =>
      !isSentenceLowQuality(span.sentence) && (span.role === "example" || span.role === "explanation")
    ) ?? concept.evidence.find((span) => !isSentenceLowQuality(span.sentence));
    if (!evidence) continue;
    // Mask any literal mention of the concept label so the gym isn't trivial.
    // We still allow the rival's label to appear — it's part of what makes the test interesting.
    const labelPattern = new RegExp(`\\b${escapeRegex(concept.label)}\\b`, "gi");
    const maskedSentence = evidence.sentence.replace(labelPattern, "______");
    // Any top-ranked neighbor with a clean definition is a valid distinction partner.
    // Ranking comes from keyword-overlap inside pickNearConcepts — if there's no lexical
    // overlap available, the concept still has nearest neighbors by shuffle ordering,
    // which is fine for distinction training.
    const rivals = pickNearConcepts(concept, concepts, 3).filter(hasCleanDefinition);
    for (const rival of rivals) {
      const pairKey = [concept.id, rival.id].sort().join("::");
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);
      pairs.push({
        id: `dist-${stableHash(`${pairKey}:${evidence.sentence}`).slice(0, 10)}`,
        left: concept,
        right: rival,
        evidence: { ...evidence, sentence: maskedSentence },
        correctId: concept.id
      });
      if (pairs.length >= count) break;
    }
    if (pairs.length >= count) break;
  }
  return pairs;
}

export function searchConcepts(concepts: Concept[], query: string): Concept[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return concepts;
  return concepts.filter((concept) => {
    if (concept.label.toLowerCase().includes(trimmed)) return true;
    if (concept.definition.toLowerCase().includes(trimmed)) return true;
    if (concept.summary.toLowerCase().includes(trimmed)) return true;
    if (concept.keywords.some((keyword) => keyword.toLowerCase().includes(trimmed))) return true;
    if (concept.evidence.some((span) => span.sentence.toLowerCase().includes(trimmed))) return true;
    return false;
  });
}

export function dueConcepts(concepts: Concept[], mastery: Record<string, { nextDueAt?: number; lastSeen: number }>, now = Date.now()): Concept[] {
  return concepts.filter((concept) => {
    const record = mastery[concept.id];
    if (!record) return false;
    if (!record.nextDueAt) return false;
    return record.nextDueAt <= now;
  });
}

export function practicedToday(mastery: Record<string, { lastSeen: number }>, now = Date.now()): number {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startMs = startOfDay.getTime();
  return Object.values(mastery).filter((entry) => entry.lastSeen >= startMs).length;
}

// A light, localStorage-backed streak counter: increments when the user has
// practiced at least one concept on a new calendar day; breaks when a gap > 1 day.
export function computeStreak(mastery: Record<string, { lastSeen: number }>): number {
  const days = new Set<number>();
  for (const record of Object.values(mastery)) {
    const day = Math.floor(record.lastSeen / 86_400_000);
    days.add(day);
  }
  if (days.size === 0) return 0;
  const todayDay = Math.floor(Date.now() / 86_400_000);
  let streak = 0;
  for (let day = todayDay; day >= 0; day -= 1) {
    if (days.has(day)) streak += 1;
    else if (streak === 0 && day === todayDay) continue; // allow today-empty without breaking prior streak
    else break;
  }
  return streak;
}

// -------- Additional practice modes (deterministic, no AI) --------

// Flashcards — front/back pairs keyed by concept id. Stable ordering (by score desc).
// The SRS scheduler is what produces spaced repetition; this just makes the cards.
export type Flashcard = {
  conceptId: string;
  front: string;       // concept label
  back: string;        // definition (or first evidence span if no explicit def)
  hints: string[];     // top 4 keywords, shown on request
};

export function generateFlashcards(concepts: Concept[]): Flashcard[] {
  return concepts
    .filter((concept) => (concept.definition || concept.summary || concept.evidence[0]?.sentence))
    .map((concept) => ({
      conceptId: concept.id,
      front: concept.label,
      back: concept.definition || concept.summary || concept.evidence[0]?.sentence || "",
      hints: concept.keywords.slice(0, 4)
    }));
}

// Teach-back — user writes their own explanation, we score keyword coverage.
// Deterministic: count distinct keyword lemmas that appear in the user's text
// (case- and punctuation-normalized). Also reward length in the 60–240 word band
// where explanations usually live.
export type TeachbackScore = {
  coverage: number;        // 0–1: fraction of concept.keywords that appear in user text
  hitKeywords: string[];
  missedKeywords: string[];
  words: number;
  lengthScore: number;     // 0–1: 0 until 40 words, 1 at 120, tapers after 240
  overall: number;         // 0–100
  message: string;
};

export function scoreTeachback(concept: Concept, userText: string): TeachbackScore {
  const normalized = normalizeForCompare(userText);
  const words = (userText.trim().match(/\S+/g) ?? []).length;
  const keywords = concept.keywords.slice(0, 8);
  const hits: string[] = [];
  const misses: string[] = [];
  for (const keyword of keywords) {
    const kw = normalizeForCompare(keyword);
    if (kw && new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`).test(normalized)) hits.push(keyword);
    else misses.push(keyword);
  }
  const coverage = keywords.length > 0 ? hits.length / keywords.length : 0;
  // Length sweet-spot: 60-240 words = full credit; 40→60 ramp; 240→360 taper.
  const lengthScore = words < 40 ? words / 40 : words > 360 ? Math.max(0, 1 - (words - 360) / 240) : words < 60 ? 0.6 + ((words - 40) / 20) * 0.4 : words > 240 ? Math.max(0.6, 1 - (words - 240) / 120 * 0.4) : 1;
  const overall = Math.round((coverage * 0.7 + lengthScore * 0.3) * 100);
  const message = overall >= 80 ? "🔥 Comprehensive explanation — this would stand up in a class discussion." :
    overall >= 60 ? "🟢 Solid. A couple of missing terms — try to weave them in naturally." :
    overall >= 40 ? "🔵 You have the shape. Connect more of the key terms to each other." :
    "🟠 Not enough anchor vocabulary yet. Re-read the definition, then try again.";
  return { coverage, hitKeywords: hits, missedKeywords: misses, words, lengthScore, overall, message };
}

// Source Sleuth — deterministic provenance quiz. Pick an evidence span,
// show it with the concept label masked, give 4 source options (one correct,
// three distractors from the same corpus so the choice isn't trivial).
export type SleuthPrompt = {
  id: string;
  evidence: string;       // masked sentence
  correctSourceId: string;
  sourceIds: string[];    // 4 shuffled options including the correct one
  conceptLabel: string;
};

export function generateSleuthPrompts(concepts: Concept[], sources: SourceDoc[], count = 10): SleuthPrompt[] {
  if (sources.length < 4) return [];
  const prompts: SleuthPrompt[] = [];
  const seen = new Set<string>();
  for (const concept of concepts) {
    if (prompts.length >= count) break;
    const evidence = concept.evidence.find((span) => span.sentence.length >= 40 && !isSentenceLowQuality(span.sentence));
    if (!evidence) continue;
    const key = `${concept.id}:${evidence.sourceId}:${evidence.sentence.slice(0, 40)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const labelPattern = new RegExp(`\\b${escapeRegex(concept.label)}\\b`, "gi");
    const masked = evidence.sentence.replace(labelPattern, "______");
    const distractors = shuffleStable(sources.filter((s) => s.id !== evidence.sourceId), `sleuth:${concept.id}`)
      .slice(0, 3)
      .map((s) => s.id);
    const options = shuffleStable([evidence.sourceId, ...distractors], `sleuth-opts:${concept.id}`);
    prompts.push({
      id: `sleuth-${stableHash(`${concept.id}:${evidence.sourceId}`).slice(0, 10)}`,
      evidence: masked,
      correctSourceId: evidence.sourceId,
      sourceIds: options,
      conceptLabel: concept.label
    });
  }
  return prompts;
}

export function findInText(text: string, query: string): Array<{ start: number; end: number }> {
  if (!query.trim() || !text) return [];
  const needle = query.trim().toLowerCase();
  const haystack = text.toLowerCase();
  const matches: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  while (cursor < haystack.length) {
    const hit = haystack.indexOf(needle, cursor);
    if (hit < 0) break;
    matches.push({ start: hit, end: hit + needle.length });
    cursor = hit + Math.max(1, needle.length);
    if (matches.length > 500) break;
  }
  return matches;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function shuffleStable<T>(values: T[], seed: string): T[] {
  return values
    .map((value, index) => ({ value, key: stableHash(`${seed}:${index}:${JSON.stringify(value)}`) }))
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((entry) => entry.value);
}

export function memoryStage(record: { correct: number; missed: number; lastSeen: number } | undefined): MemoryStage {
  if (!record || (record.correct === 0 && record.missed === 0)) return "unseen";
  const net = record.correct - record.missed;
  if (net <= -1) return "fragile";
  if (net < 1) return "forming";
  if (net < 3) return "stable";
  return "crystallized";
}

export function memoryStageLabel(stage: MemoryStage): { icon: string; label: string } {
  switch (stage) {
    case "crystallized": return { icon: "💎", label: "Crystallized" };
    case "stable": return { icon: "🟢", label: "Stable" };
    case "forming": return { icon: "🔵", label: "Forming" };
    case "fragile": return { icon: "🟠", label: "Fragile" };
    case "unseen": return { icon: "⚪", label: "Unseen" };
  }
}

const THESIS_PATTERNS = [
  /^(i\s+argue|i\s+will\s+argue|i\s+claim|i\s+contend|i\s+defend|i\s+propose|in\s+this\s+(essay|paper|response)|this\s+(essay|paper|response)\s+(argues|will\s+argue|claims|defends|proposes|examines|shows|demonstrates))/i,
  /^(the\s+(purpose|aim|goal|thesis)\s+of\s+this\s+(essay|paper|response|piece))/i
];

export function detectThesis(notes: string): { thesis: string | null; confidence: "strong" | "weak" | "none"; reason: string } {
  const trimmed = notes.replace(/^#.*\n?/gm, "").trim();
  if (!trimmed) return { thesis: null, confidence: "none", reason: "No notes yet." };
  const sentences = splitSentences(trimmed);
  if (sentences.length === 0) return { thesis: null, confidence: "none", reason: "No complete sentences yet." };
  const firstFew = sentences.slice(0, 4);
  const strong = firstFew.find((sentence) => THESIS_PATTERNS.some((pattern) => pattern.test(sentence)));
  if (strong) return { thesis: strong, confidence: "strong", reason: "Explicit thesis marker detected." };
  const candidate = firstFew.find((sentence) => sentence.split(/\s+/).length >= 12 && sentence.split(/\s+/).length <= 50);
  if (candidate) return { thesis: candidate, confidence: "weak", reason: "First substantive sentence — consider stating your argument more directly (e.g., \"I argue …\", \"This essay claims …\")." };
  return { thesis: null, confidence: "none", reason: "Early sentences are too short — a thesis usually runs 15–40 words." };
}

const REQUIREMENT_SPLIT = /\n/;
const REQUIREMENT_MARKERS = [
  /^\s*[-*•]\s+/,
  /^\s*\d+[.)]\s+/,
  /^\s*[a-z][.)]\s+/i,
  /^\s*(?:you\s+(?:must|should|will|need\s+to)|your\s+(?:essay|response|paper)\s+(?:must|should|will))\b/i,
  /^\s*(?:discuss|explain|describe|analyze|compare|contrast|evaluate|define|identify|argue|defend|demonstrate|show|prove|apply|connect|include|provide|address|consider|reflect\s+on)\b/i
];

export function extractRequirements(assignmentPrompt: string): string[] {
  if (!assignmentPrompt || !assignmentPrompt.trim()) return [];
  const lines = assignmentPrompt.split(REQUIREMENT_SPLIT).map((line) => line.trim()).filter(Boolean);
  const collected: string[] = [];
  for (const line of lines) {
    if (line.length < 12 || line.length > 280) continue;
    if (REQUIREMENT_MARKERS.some((pattern) => pattern.test(line))) {
      const cleaned = line.replace(/^\s*([-*•]|\d+[.)]|[a-z][.)])\s+/i, "").trim();
      if (cleaned.length >= 12 && !collected.includes(cleaned)) collected.push(cleaned);
    }
  }
  if (collected.length === 0) {
    const sentences = splitSentences(assignmentPrompt);
    for (const sentence of sentences) {
      if (REQUIREMENT_MARKERS.some((pattern) => pattern.test(sentence))) {
        if (!collected.includes(sentence)) collected.push(sentence);
      }
    }
  }
  return collected.slice(0, 12);
}

// Average silent reading speed for college-level prose ~ 225 WPM (research consensus spans 200-250).
// We round minutes up so a 60-word passage doesn't show "0 min".
export function readingStats(text: string): { words: number; minutes: number; chars: number } {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { words: 0, minutes: 0, chars: 0 };
  const words = trimmed.split(/\s+/).length;
  return { words, minutes: Math.max(1, Math.round(words / 225)), chars: trimmed.length };
}

export function thesisHint(confidence: "strong" | "weak" | "none"): string | null {
  if (confidence === "strong") return null;
  if (confidence === "weak") return "Try opening with an explicit claim — e.g. \"I argue that…\", \"This essay claims…\", or \"This paper will demonstrate…\". That tells the reader what you're proving before you prove it.";
  return "Thesis patterns the engine recognizes: \"I argue…\", \"This paper/essay claims/defends/examines…\", \"The purpose of this essay is…\". A thesis usually runs 15–40 words and states your position up front.";
}

export function isConceptSupported(conceptId: string, notes: string, concepts: Concept[]): boolean {
  const concept = concepts.find((entry) => entry.id === conceptId);
  if (!concept) return false;
  const normalizedNotes = normalizeForCompare(notes);
  if (normalizedNotes.includes(normalizeForCompare(concept.label))) return true;
  return concept.keywords.some((keyword) => normalizedNotes.includes(normalizeForCompare(keyword)));
}
