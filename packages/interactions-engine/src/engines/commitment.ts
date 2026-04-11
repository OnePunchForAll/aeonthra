import type { Commitment, CommitmentType, Verifier } from "../types";
import { stableId } from "../utils";

type CommitmentPattern = {
  type: CommitmentType;
  regex: RegExp;
  extractTarget: (match: RegExpMatchArray) => Record<string, string | number | boolean>;
  buildVerifier: (target: Record<string, string | number | boolean>) => Verifier;
};

function citationVerifier(minCount: number): Verifier {
  return (submission) => {
    const count = submission.citations?.length ?? ((submission.text.match(/\([A-Z][a-z]+(?:\s*&\s*[A-Z][a-z]+)?,\s*\d{4}\)/g) ?? []).length);
    return { status: count >= minCount ? "kept" : count >= Math.max(1, minCount - 1) ? "partial" : "broken", detail: `${count}/${minCount} citations` };
  };
}

function containsVerifier(needle: string): Verifier {
  return (submission) => {
    const found = submission.text.toLowerCase().includes(needle.toLowerCase());
    return { status: found ? "kept" : "broken", detail: found ? "found" : "not found" };
  };
}

function absenceVerifier(needle: string): Verifier {
  return (submission) => {
    const matches = submission.text.match(new RegExp(`\\b${escapeRegex(needle)}\\b`, "gi")) ?? [];
    if (matches.length === 0) return { status: "kept", detail: "Phrase avoided" };
    if (matches.length <= 2) return { status: "partial", detail: `Found ${matches.length} uses` };
    return { status: "broken", detail: `Found ${matches.length} uses` };
  };
}

function wordCountVerifier(minCount: number): Verifier {
  return (submission) => {
    const count = submission.wordCount ?? submission.text.trim().split(/\s+/).filter(Boolean).length;
    return { status: count >= minCount ? "kept" : count >= minCount * 0.9 ? "partial" : "broken", detail: `${count}/${minCount} words` };
  };
}

function personVerifier(person: string): Verifier {
  return (submission) => {
    const firstPerson = (submission.text.match(/\b(I|me|my|mine|we|us|our)\b/gi) ?? []).length;
    if (person === "third") {
      return firstPerson === 0 ? { status: "kept", detail: "Third-person voice maintained" } : firstPerson <= 2 ? { status: "partial", detail: `Found ${firstPerson} first-person terms` } : { status: "broken", detail: `Found ${firstPerson} first-person terms` };
    }
    return { status: "kept", detail: `${person} person preference honored` };
  };
}

function prereqVerifier(target: string): Verifier {
  return (_submission, progress) => {
    const completed = Object.keys(progress.chapterCompletion).some((chapterId) => progress.chapterCompletion[chapterId]! >= 1 && chapterId.toLowerCase().includes(target.toLowerCase().replace(/\s+/g, "-")));
    return { status: completed ? "kept" : "broken", detail: completed ? "Forge completed" : "Forge not completed yet" };
  };
}

function deadlineVerifier(amount: number, unit: string): Verifier {
  return (submission) => {
    if (!submission.dueDate || !submission.draftCompletedAt) {
      return { status: "pending", detail: "Need due date and draft timestamp" };
    }
    const windowMs = unit.startsWith("day") ? amount * 24 * 60 * 60 * 1000 : amount * 60 * 60 * 1000;
    const delta = submission.dueDate - submission.draftCompletedAt;
    return { status: delta >= windowMs ? "kept" : delta >= windowMs * 0.75 ? "partial" : "broken", detail: `${Math.round(delta / (60 * 60 * 1000))}h before due` };
  };
}

const PATTERNS: CommitmentPattern[] = [
  { type: "citation-count", regex: /(?:cite|reference|use) (?:at least |a minimum of |minimum )?(\d+) (?:textbook |scholarly |academic )?(?:sources?|references?|citations?)/i, extractTarget: (m) => ({ minCount: Number(m[1]) }), buildVerifier: (t) => citationVerifier(Number(t.minCount)) },
  { type: "citation-count", regex: /(\d+) (?:textbook |scholarly |academic )?(?:sources?|references?|citations?) minimum/i, extractTarget: (m) => ({ minCount: Number(m[1]) }), buildVerifier: (t) => citationVerifier(Number(t.minCount)) },
  { type: "specific-content", regex: /include (?:the )?(.+?)(?:\.|,|;|$)/i, extractTarget: (m) => ({ content: m[1]!.trim() }), buildVerifier: (t) => containsVerifier(String(t.content)) },
  { type: "specific-content", regex: /mention (?:the )?(.+?)(?:\.|,|;|$)/i, extractTarget: (m) => ({ content: m[1]!.trim() }), buildVerifier: (t) => containsVerifier(String(t.content)) },
  { type: "specific-content", regex: /discuss (?:the )?(.+?)(?:\.|,|;|$)/i, extractTarget: (m) => ({ content: m[1]!.trim() }), buildVerifier: (t) => containsVerifier(String(t.content)) },
  { type: "specific-content", regex: /address (?:the )?(.+?)(?:\.|,|;|$)/i, extractTarget: (m) => ({ content: m[1]!.trim() }), buildVerifier: (t) => containsVerifier(String(t.content)) },
  { type: "style-person", regex: /write (?:in )?(first|second|third) person/i, extractTarget: (m) => ({ person: m[1]!.toLowerCase() }), buildVerifier: (t) => personVerifier(String(t.person)) },
  { type: "style-person", regex: /stay in (first|second|third) person/i, extractTarget: (m) => ({ person: m[1]!.toLowerCase() }), buildVerifier: (t) => personVerifier(String(t.person)) },
  { type: "avoidance", regex: /avoid "([^"]+)"/i, extractTarget: (m) => ({ phrase: m[1]!.trim() }), buildVerifier: (t) => absenceVerifier(String(t.phrase)) },
  { type: "avoidance", regex: /don't use "([^"]+)"/i, extractTarget: (m) => ({ phrase: m[1]!.trim() }), buildVerifier: (t) => absenceVerifier(String(t.phrase)) },
  { type: "avoidance", regex: /no ([^.]+)/i, extractTarget: (m) => ({ phrase: m[1]!.trim() }), buildVerifier: (t) => absenceVerifier(String(t.phrase)) },
  { type: "timeline", regex: /finish (?:a )?(?:complete )?draft (\d+) (hours?|days?) before/i, extractTarget: (m) => ({ amount: Number(m[1]), unit: m[2]!.toLowerCase() }), buildVerifier: (t) => deadlineVerifier(Number(t.amount), String(t.unit)) },
  { type: "timeline", regex: /complete .*? (\d+) (hours?|days?) before/i, extractTarget: (m) => ({ amount: Number(m[1]), unit: m[2]!.toLowerCase() }), buildVerifier: (t) => deadlineVerifier(Number(t.amount), String(t.unit)) },
  { type: "timeline", regex: /submit .*? (\d+) (hours?|days?) early/i, extractTarget: (m) => ({ amount: Number(m[1]), unit: m[2]!.toLowerCase() }), buildVerifier: (t) => deadlineVerifier(Number(t.amount), String(t.unit)) },
  { type: "prerequisite", regex: /(?:do|complete|finish) (?:neural forge|forge|practice|review) (?:on )?(.+?) before/i, extractTarget: (m) => ({ target: m[1]!.trim() }), buildVerifier: (t) => prereqVerifier(String(t.target)) },
  { type: "prerequisite", regex: /before writing.*?(chapter \d+)/i, extractTarget: (m) => ({ target: m[1]!.trim() }), buildVerifier: (t) => prereqVerifier(String(t.target)) },
  { type: "word-count", regex: /write (?:at least )?(\d+)\s*(words?|pages?)/i, extractTarget: (m) => ({ minCount: Number(m[1]), unit: m[2]!.toLowerCase() }), buildVerifier: (t) => wordCountVerifier(Number(t.minCount)) },
  { type: "word-count", regex: /reach (\d+)\s*(words?|pages?)/i, extractTarget: (m) => ({ minCount: Number(m[1]), unit: m[2]!.toLowerCase() }), buildVerifier: (t) => wordCountVerifier(Number(t.minCount)) },
  { type: "word-count", regex: /hit (\d+)\s*(words?|pages?)/i, extractTarget: (m) => ({ minCount: Number(m[1]), unit: m[2]!.toLowerCase() }), buildVerifier: (t) => wordCountVerifier(Number(t.minCount)) },
  { type: "revision", regex: /revise (?:the )?draft/i, extractTarget: () => ({ action: "revise" }), buildVerifier: () => () => ({ status: "pending", detail: "Revision tracking is advisory until a second draft exists." }) },
  { type: "revision", regex: /leave time to revise/i, extractTarget: () => ({ action: "revise" }), buildVerifier: () => () => ({ status: "pending", detail: "Revision time remains advisory until multiple drafts are saved." }) },
  { type: "structure", regex: /write (?:a )?clear thesis/i, extractTarget: () => ({ structure: "thesis" }), buildVerifier: () => (submission) => ({ status: /\b(argue|claim|contend|suggest)\b/i.test(submission.text) ? "kept" : "partial", detail: "Checked for explicit claim language" }) },
  { type: "structure", regex: /include (?:an )?introduction/i, extractTarget: () => ({ structure: "introduction" }), buildVerifier: () => (submission) => ({ status: submission.text.split(/\n+/).length >= 3 ? "kept" : "partial", detail: "Checked paragraph structure" }) },
  { type: "structure", regex: /include (?:a )?conclusion/i, extractTarget: () => ({ structure: "conclusion" }), buildVerifier: () => (submission) => ({ status: /\b(in conclusion|overall|in summary)\b/i.test(submission.text) ? "kept" : "partial", detail: "Checked closing signals" }) },
  { type: "comparison", regex: /compare (.+?) and (.+?)(?:\.|,|;|$)/i, extractTarget: (m) => ({ left: m[1]!.trim(), right: m[2]!.trim() }), buildVerifier: (t) => (submission) => {
    const left = String(t.left).toLowerCase();
    const right = String(t.right).toLowerCase();
    const found = submission.text.toLowerCase().includes(left) && submission.text.toLowerCase().includes(right);
    return { status: found ? "kept" : "broken", detail: found ? "Both comparison terms found" : "Comparison pair missing" };
  } },
  { type: "counterargument", regex: /address (?:a )?counter(?: |-)?argument/i, extractTarget: () => ({ action: "counterargument" }), buildVerifier: () => (submission) => ({ status: /\bhowever|although|critics|objection\b/i.test(submission.text) ? "kept" : "partial", detail: "Looked for objection language" }) },
  { type: "thesis", regex: /take (?:a )?clear position/i, extractTarget: () => ({ action: "position" }), buildVerifier: () => (submission) => ({ status: /\b(argue|claim|contend|my position)\b/i.test(submission.text) ? "kept" : "partial", detail: "Looked for position language" }) },
  { type: "source-type", regex: /use textbook sources/i, extractTarget: () => ({ sourceType: "textbook" }), buildVerifier: () => (submission) => ({ status: /\((?:[A-Z][a-z]+,\s*\d{4})\)/.test(submission.text) ? "kept" : "partial", detail: "Checked for in-text citation pattern" }) },
  { type: "tone", regex: /keep (?:the )?tone formal/i, extractTarget: () => ({ tone: "formal" }), buildVerifier: () => (submission) => ({ status: /\b(a lot|kind of|sort of|basically)\b/i.test(submission.text) ? "partial" : "kept", detail: "Checked for informal filler" }) },
  { type: "tone", regex: /sound more confident/i, extractTarget: () => ({ tone: "confident" }), buildVerifier: () => (submission) => ({ status: /\bmaybe|perhaps|kind of\b/i.test(submission.text) ? "partial" : "kept", detail: "Checked for heavy hedging" }) },
  { type: "reading", regex: /read (?:chapter|the chapter) (.+?) before/i, extractTarget: (m) => ({ target: m[1]!.trim() }), buildVerifier: () => (_submission, progress) => ({ status: Object.keys(progress.chapterCompletion).length > 0 ? "kept" : "pending", detail: "Approximated through completed study chapters" }) }
];

export class CommitmentEngine {
  parseLetter(letter: string): Commitment[] {
    const commitments: Commitment[] = [];
    PATTERNS.forEach((pattern) => {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags.includes("g") ? pattern.regex.flags : `${pattern.regex.flags}g`);
      for (const match of letter.matchAll(regex)) {
        const target = pattern.extractTarget(match);
        commitments.push({
          id: stableId(`${pattern.type}:${match[0]}:${commitments.length}`),
          type: pattern.type,
          text: match[0],
          target,
          status: "pending",
          verifier: pattern.buildVerifier(target)
        });
      }
    });
    return dedupeCommitments(commitments);
  }

  verify(commitments: Commitment[], submission: { text: string; citations?: string[]; wordCount?: number; dueDate?: number | null; draftCompletedAt?: number | null }, progress: { conceptMastery: Record<string, number>; chapterCompletion: Record<string, number>; forgeHistory?: Array<{ chapterId: string; completedAt: number }> }): Commitment[] {
    return commitments.map((commitment) => {
      const result = commitment.verifier(submission, progress);
      return {
        ...commitment,
        status: result.status,
        detail: result.detail
      };
    });
  }
}

function dedupeCommitments(commitments: Commitment[]): Commitment[] {
  const seen = new Set<string>();
  return commitments.filter((commitment) => {
    const key = `${commitment.type}:${commitment.text.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
