import { stableHash } from "@learning/schema";
import type { SyncHashProvider } from "./types.ts";

function serializeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeValue(entry)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${serializeValue(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

export const defaultSyncHashProvider: SyncHashProvider = {
  hash: stableHash
};

export function canonicalSerialize(value: unknown): string {
  return serializeValue(value);
}

export function canonicalHash(
  value: unknown,
  hashProvider: SyncHashProvider = defaultSyncHashProvider
): string {
  return hashProvider.hash(canonicalSerialize(value));
}
