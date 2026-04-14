import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export type SubmissionIssue = {
  id: string;
  severity: "green" | "yellow" | "red";
  title: string;
  detail: string;
};

export type SubmissionResult = {
  score: number;
  issues: SubmissionIssue[];
  wordCount: number;
  citationCount: number;
  grade: "GREEN" | "YELLOW" | "RED";
};

export function analyzeSubmission(text: string, requirements: string[], options?: {
  failureSeen?: Array<{ failureMode: string; seenAt: number; sample: string }>;
}): SubmissionResult {
  const normalized = text.trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const citationCount = (normalized.match(/\(([A-Z][a-z]+(?:\s*&\s*[A-Z][a-z]+)?,\s*\d{4}\))/g) ?? []).length;
  const issues: SubmissionIssue[] = [];

  if (wordCount < 180) {
    issues.push({
      id: "word-count",
      severity: "red",
      title: "Response is still thin",
      detail: `Only ${wordCount} words are present. Build at least one more developed paragraph before export.`
    });
  } else if (wordCount < 320) {
    issues.push({
      id: "word-count",
      severity: "yellow",
      title: "Response could be fuller",
      detail: `You have ${wordCount} words. A little more development would make the argument feel safer.`
    });
  } else {
    issues.push({
      id: "word-count",
      severity: "green",
      title: "Enough material to work with",
      detail: `The response currently holds ${wordCount} words.`
    });
  }

  if (!/\([A-Z][a-z]+(?:\s*&\s*[A-Z][a-z]+)?,\s*\d{4}\)/.test(normalized)) {
    issues.push({
      id: "citations",
      severity: "yellow",
      title: "APA evidence is missing",
      detail: "No in-text APA-style citations were detected yet."
    });
  } else {
    issues.push({
      id: "citations",
      severity: "green",
      title: "APA-style support detected",
      detail: `Detected ${citationCount} in-text citation${citationCount === 1 ? "" : "s"}.`
    });
  }

  for (const requirement of requirements.slice(0, 4)) {
    const tokens = requirement.toLowerCase().match(/[a-z]{5,}/g) ?? [];
    const hits = tokens.filter((token) => normalized.toLowerCase().includes(token)).length;
    if (tokens.length === 0) {
      continue;
    }
    if (hits === 0) {
      issues.push({
        id: `req-${tokenKey(requirement)}`,
        severity: "red",
        title: "Requirement not visible yet",
        detail: `The draft does not clearly reflect this requirement: ${requirement}`
      });
    } else if (hits < Math.min(2, tokens.length)) {
      issues.push({
        id: `req-${tokenKey(requirement)}`,
        severity: "yellow",
        title: "Requirement only partly covered",
        detail: `The draft touches this requirement, but it still feels light: ${requirement}`
      });
    } else {
      issues.push({
        id: `req-${tokenKey(requirement)}`,
        severity: "green",
        title: "Requirement shows up in the draft",
        detail: requirement
      });
    }
  }

  const sentenceLengths = normalized
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim().split(/\s+/).filter(Boolean).length)
    .filter(Boolean);
  const averageSentenceLength = sentenceLengths.length
    ? sentenceLengths.reduce((sum, value) => sum + value, 0) / sentenceLengths.length
    : 0;

  if (averageSentenceLength > 32) {
    issues.push({
      id: "clarity",
      severity: "yellow",
      title: "Sentence load is heavy",
      detail: "Average sentence length is high. Splitting one or two long sentences will improve clarity."
    });
  }

  for (const failure of options?.failureSeen ?? []) {
    const anchors = failure.sample
      .toLowerCase()
      .match(/[a-z]{5,}/g)
      ?.filter((token) => !["paper", "reader", "course", "topic", "would", "could", "there", "about"].includes(token))
      .slice(0, 4) ?? [];
    if (anchors.length === 0) continue;
    const hits = anchors.filter((token) => normalized.toLowerCase().includes(token)).length;
    if (hits < Math.min(2, anchors.length)) continue;
    issues.push({
      id: `atlas-${tokenKey(failure.failureMode)}`,
      severity: "yellow",
      title: "Failure Atlas echo detected",
      detail: `You already saw the ${failure.failureMode} pattern on ${new Date(failure.seenAt).toLocaleDateString()}. Parts of that same failure shape are showing up again in this draft.`
    });
  }

  const redCount = issues.filter((issue) => issue.severity === "red").length;
  const yellowCount = issues.filter((issue) => issue.severity === "yellow").length;
  const score = Math.max(0, Math.min(100, 92 - redCount * 18 - yellowCount * 8 + citationCount * 3 + Math.min(10, Math.floor(wordCount / 120))));
  const grade = redCount > 0 ? "RED" : yellowCount > 1 ? "YELLOW" : "GREEN";

  return {
    score,
    issues,
    wordCount,
    citationCount,
    grade
  };
}

function tokenKey(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function exportSubmissionDocx(input: {
  assignmentTitle: string;
  courseTitle: string;
  professorName: string;
  studentName: string;
  universityName: string;
  text: string;
  result: SubmissionResult;
}): Promise<void> {
  const today = new Intl.DateTimeFormat(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date());

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ text: input.universityName, heading: HeadingLevel.TITLE, spacing: { after: 320 } }),
          new Paragraph({ text: input.assignmentTitle, spacing: { after: 200 } }),
          new Paragraph({ text: input.studentName }),
          new Paragraph({ text: input.professorName }),
          new Paragraph({ text: input.courseTitle }),
          new Paragraph({ text: today, spacing: { after: 360 } }),
          new Paragraph({
            children: [new TextRun({ text: "AEONTHRA PRE-SUBMISSION REPORT", bold: true })]
          }),
          ...input.result.issues.map((issue) => new Paragraph({
            children: [new TextRun({
              text: `${issue.severity.toUpperCase()} | ${issue.title}: ${issue.detail}`,
              color: issue.severity === "green" ? "00FF88" : issue.severity === "yellow" ? "FFD700" : "FF4466"
            })]
          })),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          ...input.text.split(/\n+/).map((line) => new Paragraph({ text: line.trim() || " " }))
        ]
      }
    ]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${tokenKey(input.assignmentTitle)}.docx`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
