import type {
  CanonicalArtifact,
  CanonicalArtifactItem,
  CaptureStrategy,
  ProvenanceKind
} from "@learning/schema";
import type { SourceClassification, StructuralNode } from "../contracts/types.ts";

export type SyncHashProvider = {
  hash: (input: string) => string;
};

export type CanonicalSemanticUnit = {
  sourceItemId: string;
  position: number;
  channelKind: "text" | "date" | "module";
  headingPath: string[];
  text: string;
};

export type CanonicalStructuralUnit = {
  sourceItemId: string;
  position: number;
  kind: StructuralNode["kind"];
  tagName: string | null;
  listContainerTag: "ul" | "ol" | null;
  ordinalPath: number[];
  listDepth: number;
  headingPath: string[];
  text: string;
};

export type CanonicalProvenanceUnit = {
  sourceItemId: string;
  canonicalUrl: string;
  contentHash: string;
  originSystem: SourceClassification["originSystem"];
  sourceFamily: SourceClassification["sourceFamily"];
  captureModality: SourceClassification["captureModality"];
  titleSource: "structured" | "dom" | "inferred";
  captureStrategy?: CaptureStrategy;
  provenanceKind?: ProvenanceKind;
  sourceEndpoint?: string;
  sourceHost?: string;
  adapterVersion?: string;
};

export type CanonicalArtifactBuild = {
  artifact: CanonicalArtifact;
  items: CanonicalArtifactItem[];
  semanticUnits: CanonicalSemanticUnit[];
  structuralUnits: CanonicalStructuralUnit[];
  provenanceUnits: CanonicalProvenanceUnit[];
};
