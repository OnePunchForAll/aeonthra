import { stableHash } from "@learning/schema";

function serializeValue(value: unknown): string {
  if (value === null) {
    return "null";
  }
  if (value === undefined) {
    return "\"__undefined__\"";
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
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${serializeValue(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(String(value));
}

export function stableSerialize(value: unknown): string {
  return serializeValue(value);
}

export function deterministicHash(value: unknown): string {
  return stableHash(stableSerialize(value));
}
