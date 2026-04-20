import {
  CaptureBundleSchema,
  isTextbookCaptureItem,
  type CaptureBundle,
  type CaptureItem
} from "./capture.ts";
import { normalizeCourseIdPart, normalizeSourceHostPart } from "./identity.ts";

export const canvasCourseKnowledgePackIssueCodes = [
  "invalid-bundle",
  "wrong-source",
  "empty-bundle",
  "textbook-only",
  "missing-course-id",
  "missing-source-host",
  "missing-course-url",
  "ambiguous-course-identity",
  "host-mismatch",
  "course-identity-mismatch"
] as const;

type SchemaCaptureBundle = CaptureBundle;
type SchemaCaptureItem = CaptureItem;

export type CanvasCourseKnowledgePackIssueCode =
  (typeof canvasCourseKnowledgePackIssueCodes)[number];

export type CanvasCourseIdentityCandidate = {
  courseId: string;
  sourceHost: string;
  url: string;
};

export type CanvasCourseKnowledgePackTrace = {
  parsed: boolean;
  code: CanvasCourseKnowledgePackIssueCode | null;
  bundle: SchemaCaptureBundle | null;
  totalItemCount: number;
  canvasItemCount: number;
  textbookItemCount: number;
  expectedCourseId: string;
  expectedSourceHost: string;
  identityCandidates: CanvasCourseIdentityCandidate[];
  distinctIdentities: Array<{ courseId: string; sourceHost: string }>;
};

export type CanvasCourseKnowledgePackInspection =
  | {
      ok: true;
      bundle: SchemaCaptureBundle;
      canvasItemCount: number;
      courseId: string;
      sourceHost: string;
    }
  | {
      ok: false;
      code: CanvasCourseKnowledgePackIssueCode;
      bundle: SchemaCaptureBundle | null;
    };

function parseCanvasCourseIdentityFromUrl(
  value: string
): { courseId: string; sourceHost: string } | null {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/courses\/([^/?#]+)/i);
    const courseId = normalizeCourseIdPart(match?.[1]);
    const sourceHost = normalizeSourceHostPart(url.host);
    if (!courseId || !sourceHost) {
      return null;
    }
    return {
      courseId,
      sourceHost
    };
  } catch {
    return null;
  }
}

function collectCanvasCourseIdentityCandidates(
  bundle: SchemaCaptureBundle
): CanvasCourseIdentityCandidate[] {
  const itemUrls = bundle.items
    .filter((item: SchemaCaptureItem) => !isTextbookCaptureItem(item))
    .map((item) => item.canonicalUrl);
  const manifestUrls = bundle.manifest.sourceUrls;
  const candidates = [...itemUrls, ...manifestUrls]
    .map((value) => {
      const parsed = parseCanvasCourseIdentityFromUrl(value);
      return parsed ? { ...parsed, url: value } : null;
    })
    .filter((value): value is CanvasCourseIdentityCandidate => value !== null);

  return Array.from(
    new Map(
      candidates.map((candidate) => [
        `${candidate.sourceHost}::${candidate.courseId}::${candidate.url}`,
        candidate
      ])
    ).values()
  );
}

function distinctCanvasCourseIdentities(
  candidates: CanvasCourseIdentityCandidate[]
): Array<{ courseId: string; sourceHost: string }> {
  return Array.from(
    new Map(
      candidates.map((candidate) => [
        `${candidate.sourceHost}::${candidate.courseId}`,
        {
          courseId: candidate.courseId,
          sourceHost: candidate.sourceHost
        }
      ])
    ).values()
  );
}

function traceParsedCanvasCourseKnowledgePack(
  bundle: SchemaCaptureBundle
): CanvasCourseKnowledgePackTrace {
  const totalItemCount = bundle.items.length;
  const canvasItemCount = bundle.items.filter(
    (item: SchemaCaptureItem) => !isTextbookCaptureItem(item)
  ).length;
  const textbookItemCount = totalItemCount - canvasItemCount;
  const expectedCourseId = normalizeCourseIdPart(bundle.captureMeta?.courseId);
  const expectedSourceHost = normalizeSourceHostPart(bundle.captureMeta?.sourceHost);
  const identityCandidates = collectCanvasCourseIdentityCandidates(bundle);
  const distinctIdentities = distinctCanvasCourseIdentities(identityCandidates);

  let code: CanvasCourseKnowledgePackIssueCode | null = null;
  if (bundle.source !== "extension-capture") {
    code = "wrong-source";
  } else if (totalItemCount === 0) {
    code = "empty-bundle";
  } else if (canvasItemCount === 0) {
    code = "textbook-only";
  } else if (!expectedCourseId) {
    code = "missing-course-id";
  } else if (!expectedSourceHost) {
    code = "missing-source-host";
  } else if (identityCandidates.length === 0) {
    code = "missing-course-url";
  } else if (distinctIdentities.length > 1) {
    code = "ambiguous-course-identity";
  } else {
    const [resolvedIdentity] = distinctIdentities;
    if (!resolvedIdentity || resolvedIdentity.sourceHost !== expectedSourceHost) {
      code = "host-mismatch";
    } else if (resolvedIdentity.courseId !== expectedCourseId) {
      code = "course-identity-mismatch";
    }
  }

  return {
    parsed: true,
    code,
    bundle,
    totalItemCount,
    canvasItemCount,
    textbookItemCount,
    expectedCourseId,
    expectedSourceHost,
    identityCandidates,
    distinctIdentities
  };
}

function inspectParsedCanvasCourseKnowledgePack(
  bundle: SchemaCaptureBundle
): CanvasCourseKnowledgePackInspection {
  const trace = traceParsedCanvasCourseKnowledgePack(bundle);
  if (trace.code) {
    return {
      ok: false,
      code: trace.code,
      bundle
    };
  }

  return {
    ok: true,
    bundle,
    canvasItemCount: trace.canvasItemCount,
    courseId: trace.expectedCourseId,
    sourceHost: trace.expectedSourceHost
  };
}

export function inspectCanvasCourseKnowledgePack(
  input: unknown
): CanvasCourseKnowledgePackInspection {
  const parsed = CaptureBundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid-bundle",
      bundle: null
    };
  }

  return inspectParsedCanvasCourseKnowledgePack(parsed.data);
}

export function traceCanvasCourseKnowledgePack(
  input: unknown
): CanvasCourseKnowledgePackTrace {
  const parsed = CaptureBundleSchema.safeParse(input);
  if (!parsed.success) {
    return {
      parsed: false,
      code: "invalid-bundle",
      bundle: null,
      totalItemCount: 0,
      canvasItemCount: 0,
      textbookItemCount: 0,
      expectedCourseId: "",
      expectedSourceHost: "",
      identityCandidates: [],
      distinctIdentities: []
    };
  }

  return traceParsedCanvasCourseKnowledgePack(parsed.data);
}

export function isCanvasCourseKnowledgePack(
  input: unknown
): input is SchemaCaptureBundle {
  return inspectCanvasCourseKnowledgePack(input).ok;
}
