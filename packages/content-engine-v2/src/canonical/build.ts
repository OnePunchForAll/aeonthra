import type {
  CanonicalArtifact,
  CanonicalArtifactItem,
  CaptureStrategy,
  ProvenanceKind
} from "@learning/schema";
import type { SourceDocument, StructuralNode } from "../contracts/types.ts";
import {
  canonicalTextContextForNodeKind,
  normalizeCanonicalText,
  normalizeHeadingPath,
  semanticChannelKind
} from "./normalize.ts";
import { canonicalHash, defaultSyncHashProvider } from "./serialize.ts";
import type {
  CanonicalArtifactBuild,
  CanonicalProvenanceUnit,
  CanonicalSemanticUnit,
  CanonicalStructuralUnit,
  SyncHashProvider
} from "./types.ts";

const SEMANTIC_NODE_KINDS = new Set<StructuralNode["kind"]>([
  "structured-title",
  "structured-module",
  "structured-due-date",
  "heading",
  "paragraph",
  "list-item",
  "definition-term",
  "definition-detail",
  "quote",
  "caption",
  "table-cell",
  "excerpt"
]);

const FALLBACK_STRATEGY_BY_MODALITY: Record<string, CaptureStrategy> = {
  "cleaned-html": "html-fetch",
  "html-selector": "html-fetch",
  "plain-text-fallback": "manual-import",
  "imported-docx": "document-import",
  "imported-pdf": "document-import",
  "imported-text": "document-import",
  "structured-field": "api-only"
};

const FALLBACK_PROVENANCE_BY_ORIGIN: Record<string, ProvenanceKind> = {
  "canvas-extension": "HTML_FETCH",
  demo: "DEMO_SEED",
  "manual-import": "USER_GENERATED",
  "textbook-import": "DOCUMENT_INGEST",
  merged: "USER_GENERATED"
};

function safeSourceHost(url: string): string | undefined {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return undefined;
  }
}

function meaningfulNodeText(node: StructuralNode): string {
  return normalizeCanonicalText(
    node.text,
    canonicalTextContextForNodeKind(node.kind, node.tagName)
  );
}

function buildSemanticUnits(
  document: SourceDocument,
  nodes: StructuralNode[]
): CanonicalSemanticUnit[] {
  let position = 0;
  return nodes
    .filter((node) => SEMANTIC_NODE_KINDS.has(node.kind))
    .map((node) => {
      const text = meaningfulNodeText(node);
      if (!text) {
        return null;
      }
      return {
        sourceItemId: document.item.id,
        position: position++,
        channelKind: semanticChannelKind(node.kind),
        headingPath: normalizeHeadingPath(node.headingPath),
        text
      } satisfies CanonicalSemanticUnit;
    })
    .filter((entry): entry is CanonicalSemanticUnit => Boolean(entry));
}

function buildStructuralUnits(
  document: SourceDocument,
  nodes: StructuralNode[]
): CanonicalStructuralUnit[] {
  let position = 0;
  return nodes
    .map((node) => {
      const text = meaningfulNodeText(node);
      if (!text) {
        return null;
      }
      return {
        sourceItemId: document.item.id,
        position: position++,
        kind: node.kind,
        tagName: node.tagName,
        listContainerTag: node.listContainerTag ?? null,
        ordinalPath: node.ordinalPath,
        listDepth: node.listDepth,
        headingPath: normalizeHeadingPath(node.headingPath),
        text
      } satisfies CanonicalStructuralUnit;
    })
    .filter((entry): entry is CanonicalStructuralUnit => Boolean(entry));
}

function buildProvenanceUnit(document: SourceDocument): CanonicalProvenanceUnit {
  return {
    sourceItemId: document.item.id,
    canonicalUrl: document.item.canonicalUrl,
    contentHash: document.item.contentHash,
    originSystem: document.classification.originSystem,
    sourceFamily: document.classification.sourceFamily,
    captureModality: document.classification.captureModality,
    titleSource: document.item.titleSource,
    captureStrategy:
      document.item.captureStrategy
      ?? FALLBACK_STRATEGY_BY_MODALITY[document.classification.captureModality],
    provenanceKind:
      document.item.provenanceKind
      ?? FALLBACK_PROVENANCE_BY_ORIGIN[document.classification.originSystem],
    sourceEndpoint: document.item.sourceEndpoint,
    sourceHost: document.item.sourceHost ?? safeSourceHost(document.item.canonicalUrl),
    adapterVersion: document.item.adapterVersion
  };
}

function buildArtifactItem(
  document: SourceDocument,
  semanticUnits: CanonicalSemanticUnit[],
  structuralUnits: CanonicalStructuralUnit[],
  provenanceUnit: CanonicalProvenanceUnit,
  hashProvider: SyncHashProvider
): CanonicalArtifactItem {
  return {
    sourceItemId: document.item.id,
    title: document.item.title,
    canonicalUrl: document.item.canonicalUrl,
    contentHash: document.item.contentHash,
    semanticHash: canonicalHash(semanticUnits, hashProvider),
    structuralHash: canonicalHash(structuralUnits, hashProvider),
    provenanceHash: canonicalHash(provenanceUnit, hashProvider),
    semanticUnitCount: semanticUnits.length,
    structuralUnitCount: structuralUnits.length,
    captureStrategy: provenanceUnit.captureStrategy,
    provenanceKind: provenanceUnit.provenanceKind,
    sourceHost: provenanceUnit.sourceHost
  };
}

export function buildCanonicalArtifact(
  documents: SourceDocument[],
  nodes: StructuralNode[],
  hashProvider: SyncHashProvider = defaultSyncHashProvider
): CanonicalArtifactBuild {
  const nodesByItemId = new Map<string, StructuralNode[]>();
  nodes.forEach((node) => {
    const bucket = nodesByItemId.get(node.sourceItemId);
    if (bucket) {
      bucket.push(node);
      return;
    }
    nodesByItemId.set(node.sourceItemId, [node]);
  });

  const semanticUnits: CanonicalSemanticUnit[] = [];
  const structuralUnits: CanonicalStructuralUnit[] = [];
  const provenanceUnits: CanonicalProvenanceUnit[] = [];
  const items: CanonicalArtifactItem[] = [];
  let withExplicitProvenance = 0;

  documents.forEach((document) => {
    const documentNodes = nodesByItemId.get(document.item.id) ?? [];
    const itemSemanticUnits = buildSemanticUnits(document, documentNodes);
    const itemStructuralUnits = buildStructuralUnits(document, documentNodes);
    const provenanceUnit = buildProvenanceUnit(document);

    semanticUnits.push(...itemSemanticUnits);
    structuralUnits.push(...itemStructuralUnits);
    provenanceUnits.push(provenanceUnit);
    if (document.item.captureStrategy && document.item.provenanceKind) {
      withExplicitProvenance += 1;
    }
    items.push(
      buildArtifactItem(
        document,
        itemSemanticUnits,
        itemStructuralUnits,
        provenanceUnit,
        hashProvider
      )
    );
  });

  const artifact: CanonicalArtifact = {
    version: "osme-zero-hybrid-v1",
    semanticHash: canonicalHash(semanticUnits, hashProvider),
    structuralHash: canonicalHash(structuralUnits, hashProvider),
    provenanceHash: canonicalHash(provenanceUnits, hashProvider),
    sourceItemCount: documents.length,
    semanticUnitCount: semanticUnits.length,
    structuralUnitCount: structuralUnits.length,
    provenanceCoverage: {
      withExplicitProvenance,
      missingExplicitProvenance: Math.max(0, items.length - withExplicitProvenance)
    },
    preview: semanticUnits.slice(0, 6).map((unit) => unit.text),
    items
  };

  return {
    artifact,
    items,
    semanticUnits,
    structuralUnits,
    provenanceUnits
  };
}
