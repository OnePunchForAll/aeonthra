import type {
  CanonicalArtifact,
  CanonicalArtifactItem,
  CaptureBundle,
  CaptureItem,
  CaptureResource,
  CaptureStrategy,
  LearningBundle,
  ProvenanceKind
} from "@learning/schema";

export type DiagnosticsStatus = "complete" | "partial";

export type DiagnosticsLane = {
  id: string;
  label: string;
  stance: string;
  itemCount: number;
  resourceCount: number;
};

export type DiagnosticsItemSample = {
  sourceItemId: string;
  title: string;
  canonicalUrl: string;
  kind: string;
  contentHash: string;
  semanticHash: string | null;
  structuralHash: string | null;
  provenanceHash: string | null;
  captureStrategy?: CaptureStrategy;
  provenanceKind?: ProvenanceKind;
  sourceHost?: string;
};

export type DiagnosticsResourceSample = {
  id: string;
  title: string;
  url: string;
  kind: string;
  sourceItemId: string;
  captureStrategy?: CaptureStrategy;
  provenanceKind?: ProvenanceKind;
  sourceHost?: string;
};

export type WorkspaceDiagnostics = {
  generatedAt: string;
  bundleTitle: string;
  bundleSource: CaptureBundle["source"];
  status: DiagnosticsStatus;
  partialReasons: string[];
  captureSummary: {
    itemCount: number;
    resourceCount: number;
    warningCount: number;
    failedCount: number;
    skippedCount: number;
    totalVisited: number;
    courseId: string;
    courseName: string;
    sourceHost: string;
    capturedAt: string;
  };
  hashes: {
    semantic: string;
    structural: string;
    provenance: string;
    synthesis: string;
  };
  canonicalArtifact: CanonicalArtifact | null;
  preview: string[];
  provenanceCoverage: {
    withExplicitProvenance: number;
    missingExplicitProvenance: number;
    percent: number;
  };
  provenanceLanes: DiagnosticsLane[];
  captureStrategyLanes: DiagnosticsLane[];
  itemSamples: DiagnosticsItemSample[];
  resourceSamples: DiagnosticsResourceSample[];
};

type Counter = {
  itemCount: number;
  resourceCount: number;
};

const PROVENANCE_LABELS: Record<string, { label: string; stance: string }> = {
  FIRST_PARTY_API: { label: "First-party API", stance: "canonical source" },
  HTML_FETCH: { label: "HTML fetch", stance: "fallback evidence" },
  DOM_CAPTURE: { label: "DOM capture", stance: "fallback evidence" },
  DOCUMENT_INGEST: { label: "Document ingest", stance: "canonical source" },
  USER_GENERATED: { label: "User generated", stance: "user authored" },
  DEMO_SEED: { label: "Demo seed", stance: "demo seed" },
  UNSPECIFIED: { label: "Unspecified", stance: "adapter gap" }
};

const STRATEGY_LABELS: Record<string, { label: string; stance: string }> = {
  "api-only": { label: "API only", stance: "preferred capture" },
  "html-fetch": { label: "HTML fetch", stance: "fallback capture" },
  "session-dom": { label: "Session DOM", stance: "fallback capture" },
  "manual-import": { label: "Manual import", stance: "manual source" },
  "demo-seed": { label: "Demo seed", stance: "demo seed" },
  "document-import": { label: "Document import", stance: "document source" },
  UNSPECIFIED: { label: "Unspecified", stance: "adapter gap" }
};

function summarizeLanes<T extends string | undefined>(
  items: Array<{ key: T; isResource: boolean }>,
  labels: Record<string, { label: string; stance: string }>
): DiagnosticsLane[] {
  const counts = new Map<string, Counter>();
  for (const item of items) {
    const id = item.key ?? "UNSPECIFIED";
    const current = counts.get(id) ?? { itemCount: 0, resourceCount: 0 };
    if (item.isResource) {
      current.resourceCount += 1;
    } else {
      current.itemCount += 1;
    }
    counts.set(id, current);
  }

  return [...counts.entries()]
    .map(([id, counter]) => ({
      id,
      label: labels[id]?.label ?? id,
      stance: labels[id]?.stance ?? "unclassified",
      itemCount: counter.itemCount,
      resourceCount: counter.resourceCount
    }))
    .sort((left, right) =>
      (right.itemCount + right.resourceCount) - (left.itemCount + left.resourceCount)
      || left.label.localeCompare(right.label)
    );
}

function artifactItemSample(
  item: CanonicalArtifactItem,
  captureItem: CaptureItem | undefined
): DiagnosticsItemSample {
  return {
    sourceItemId: item.sourceItemId,
    title: item.title,
    canonicalUrl: item.canonicalUrl,
    kind: captureItem?.kind ?? "unknown",
    contentHash: captureItem?.contentHash ?? item.contentHash,
    semanticHash: item.semanticHash,
    structuralHash: item.structuralHash,
    provenanceHash: item.provenanceHash,
    captureStrategy: item.captureStrategy ?? captureItem?.captureStrategy,
    provenanceKind: item.provenanceKind ?? captureItem?.provenanceKind,
    sourceHost: item.sourceHost ?? captureItem?.sourceHost
  };
}

function captureItemSample(item: CaptureItem): DiagnosticsItemSample {
  return {
    sourceItemId: item.id,
    title: item.title,
    canonicalUrl: item.canonicalUrl,
    kind: item.kind,
    contentHash: item.contentHash,
    semanticHash: null,
    structuralHash: null,
    provenanceHash: null,
    captureStrategy: item.captureStrategy,
    provenanceKind: item.provenanceKind,
    sourceHost: item.sourceHost
  };
}

function resourceSample(resource: CaptureResource): DiagnosticsResourceSample {
  return {
    id: resource.id,
    title: resource.title,
    url: resource.url,
    kind: resource.kind,
    sourceItemId: resource.sourceItemId,
    captureStrategy: resource.captureStrategy,
    provenanceKind: resource.provenanceKind,
    sourceHost: resource.sourceHost
  };
}

function partialReasons(bundle: CaptureBundle): string[] {
  const reasons: string[] = [];
  const stats = bundle.captureMeta?.stats;
  if ((stats?.totalItemsFailed ?? 0) > 0) {
    reasons.push(`${stats?.totalItemsFailed ?? 0} item(s) failed during capture.`);
  }
  if ((stats?.totalItemsSkipped ?? 0) > 0) {
    reasons.push(`${stats?.totalItemsSkipped ?? 0} item(s) were skipped during traversal.`);
  }
  if ((bundle.captureMeta?.warnings?.length ?? 0) > 0) {
    reasons.push(`${bundle.captureMeta?.warnings?.length ?? 0} warning(s) were recorded during capture.`);
  }
  return reasons;
}

export function buildWorkspaceDiagnostics(
  bundle: CaptureBundle,
  learning: LearningBundle
): WorkspaceDiagnostics {
  const canonicalArtifact = learning.synthesis.canonicalArtifact ?? null;
  const stats = bundle.captureMeta?.stats;
  const itemById = new Map(bundle.items.map((item) => [item.id, item] as const));
  const status: DiagnosticsStatus = partialReasons(bundle).length > 0 ? "partial" : "complete";
  const provenanceLanes = summarizeLanes(
    [
      ...bundle.items.map((item) => ({ key: item.provenanceKind, isResource: false })),
      ...bundle.resources.map((resource) => ({ key: resource.provenanceKind, isResource: true }))
    ],
    PROVENANCE_LABELS
  );
  const captureStrategyLanes = summarizeLanes(
    [
      ...bundle.items.map((item) => ({ key: item.captureStrategy, isResource: false })),
      ...bundle.resources.map((resource) => ({ key: resource.captureStrategy, isResource: true }))
    ],
    STRATEGY_LABELS
  );
  const provenanceCoverage = canonicalArtifact
    ? {
        withExplicitProvenance: canonicalArtifact.provenanceCoverage.withExplicitProvenance,
        missingExplicitProvenance: canonicalArtifact.provenanceCoverage.missingExplicitProvenance,
        percent: canonicalArtifact.sourceItemCount > 0
          ? Math.round((canonicalArtifact.provenanceCoverage.withExplicitProvenance / canonicalArtifact.sourceItemCount) * 100)
          : 100
      }
    : {
        withExplicitProvenance: bundle.items.filter((item) => Boolean(item.provenanceKind || item.captureStrategy)).length,
        missingExplicitProvenance: bundle.items.filter((item) => !item.provenanceKind && !item.captureStrategy).length,
        percent: bundle.items.length > 0
          ? Math.round((bundle.items.filter((item) => Boolean(item.provenanceKind || item.captureStrategy)).length / bundle.items.length) * 100)
          : 100
      };

  return {
    generatedAt: learning.generatedAt,
    bundleTitle: bundle.title,
    bundleSource: bundle.source,
    status,
    partialReasons: partialReasons(bundle),
    captureSummary: {
      itemCount: bundle.items.length,
      resourceCount: bundle.resources.length,
      warningCount: bundle.captureMeta?.warnings?.length ?? 0,
      failedCount: stats?.totalItemsFailed ?? 0,
      skippedCount: stats?.totalItemsSkipped ?? 0,
      totalVisited: stats?.totalItemsVisited ?? bundle.items.length,
      courseId: bundle.captureMeta?.courseId ?? "",
      courseName: bundle.captureMeta?.courseName ?? "",
      sourceHost: bundle.captureMeta?.sourceHost ?? "",
      capturedAt: bundle.capturedAt
    },
    hashes: {
      semantic: canonicalArtifact?.semanticHash ?? "",
      structural: canonicalArtifact?.structuralHash ?? "",
      provenance: canonicalArtifact?.provenanceHash ?? "",
      synthesis: learning.synthesis.synthesisHash ?? learning.synthesis.deterministicHash
    },
    canonicalArtifact,
    preview: canonicalArtifact?.preview ?? [],
    provenanceCoverage,
    provenanceLanes,
    captureStrategyLanes,
    itemSamples: canonicalArtifact
      ? canonicalArtifact.items.slice(0, 8).map((item) => artifactItemSample(item, itemById.get(item.sourceItemId)))
      : bundle.items.slice(0, 8).map(captureItemSample),
    resourceSamples: bundle.resources.slice(0, 8).map(resourceSample)
  };
}
