import type { Angle, Commitment } from "@learning/interactions-engine";
import type { ShadowSettings } from "./interactions-runtime";

export type EchoAnchor = {
  passageId: number;
  text: string;
  source: string;
  citation: string;
  conceptIds: string[];
  savedAt: number;
};

export type TimeCapsuleRecord = {
  taskId: string;
  letter: string;
  commitments: Commitment[];
  sealedAt: number;
  draftStartedAt?: number | null;
  draftCompletedAt?: number | null;
};

export type FailureSeenRecord = {
  taskId: string;
  failureMode: string;
  seenAt: number;
  sample: string;
};

export type OracleHistoryRecord = {
  question: string;
  thinker: string;
  response: string;
  askedAt: number;
};

const shadowKey = "aeonthra:shadow-settings";
const echoKey = "aeonthra:echo-anchors";
const capsuleKey = "aeonthra:time-capsules";
const prismKey = "aeonthra:prism-choice";
const failureKey = "aeonthra:failure-seen";
const oracleKey = "aeonthra:oracle-history";

export function loadShadowSettings(): ShadowSettings {
  try {
    const raw = window.localStorage.getItem(shadowKey);
    return raw
      ? JSON.parse(raw) as ShadowSettings
      : { intensity: "steady", contextBias: "view", display: "right-rail" };
  } catch {
    return { intensity: "steady", contextBias: "view", display: "right-rail" };
  }
}

export function storeShadowSettings(settings: ShadowSettings): void {
  window.localStorage.setItem(shadowKey, JSON.stringify(settings));
}

export function loadEchoAnchors(): Record<string, EchoAnchor[]> {
  try {
    return JSON.parse(window.localStorage.getItem(echoKey) ?? "{}") as Record<string, EchoAnchor[]>;
  } catch {
    return {};
  }
}

export function storeEchoAnchors(value: Record<string, EchoAnchor[]>): void {
  window.localStorage.setItem(echoKey, JSON.stringify(value));
}

export function loadTimeCapsules(): Record<string, TimeCapsuleRecord> {
  try {
    return JSON.parse(window.localStorage.getItem(capsuleKey) ?? "{}") as Record<string, TimeCapsuleRecord>;
  } catch {
    return {};
  }
}

export function storeTimeCapsules(value: Record<string, TimeCapsuleRecord>): void {
  window.localStorage.setItem(capsuleKey, JSON.stringify(value));
}

export function loadPrismChoices(): Record<string, Angle> {
  try {
    return JSON.parse(window.localStorage.getItem(prismKey) ?? "{}") as Record<string, Angle>;
  } catch {
    return {};
  }
}

export function storePrismChoices(value: Record<string, Angle>): void {
  window.localStorage.setItem(prismKey, JSON.stringify(value));
}

export function loadFailureSeen(): FailureSeenRecord[] {
  try {
    return JSON.parse(window.localStorage.getItem(failureKey) ?? "[]") as FailureSeenRecord[];
  } catch {
    return [];
  }
}

export function storeFailureSeen(value: FailureSeenRecord[]): void {
  window.localStorage.setItem(failureKey, JSON.stringify(value));
}

export function loadOracleHistory(): OracleHistoryRecord[] {
  try {
    return JSON.parse(window.localStorage.getItem(oracleKey) ?? "[]") as OracleHistoryRecord[];
  } catch {
    return [];
  }
}

export function storeOracleHistory(value: OracleHistoryRecord[]): void {
  window.localStorage.setItem(oracleKey, JSON.stringify(value));
}
