export type SlotDef = {
  name: string;
  required: boolean;
  type: "noun" | "verb" | "phrase" | "sentence" | "clause";
  constraints?: {
    minLength?: number;
    maxLength?: number;
    mustEndWith?: string;
    mustNotContain?: string[];
  };
  fallbacks?: string[];
};

export type SynthesisTemplate = {
  id: string;
  template: string;
  slots: SlotDef[];
  postProcess?: (filled: string) => string;
  validate?: (filled: string) => boolean;
};

export class TemplateSynthesisEngine {
  fill(template: SynthesisTemplate, data: Record<string, unknown>): string | null {
    let filled = template.template;
    for (const slot of template.slots) {
      const raw = data[slot.name];
      const processed = this.processSlotValue(raw, slot);
      if (!processed) {
        const fallback = (slot.fallbacks ?? []).find((entry) => this.validateSlot(entry, slot));
        if (!fallback && slot.required) {
          return null;
        }
        filled = filled.replaceAll(`{${slot.name}}`, fallback ?? "");
        continue;
      }
      if (!this.validateSlot(processed, slot)) {
        const fallback = (slot.fallbacks ?? []).find((entry) => this.validateSlot(entry, slot));
        if (!fallback) {
          return null;
        }
        filled = filled.replaceAll(`{${slot.name}}`, fallback);
      } else {
        filled = filled.replaceAll(`{${slot.name}}`, processed);
      }
    }
    const normalized = template.postProcess ? template.postProcess(filled) : filled.replace(/\s+/g, " ").trim();
    if (!this.validateGrammar(normalized)) return null;
    if (template.validate && !template.validate(normalized)) return null;
    return normalized;
  }

  private processSlotValue(value: unknown, slot: SlotDef): string | null {
    if (value === null || value === undefined) return null;
    const stringValue = String(value).replace(/\s+/g, " ").trim();
    if (stringValue.length === 0) return null;
    if (slot.type === "sentence" && !/[.!?]$/.test(stringValue)) {
      return `${stringValue}.`;
    }
    return stringValue;
  }

  private validateSlot(value: string, slot: SlotDef): boolean {
    const trimmed = value.trim();
    if (slot.constraints?.minLength && trimmed.length < slot.constraints.minLength) return false;
    if (slot.constraints?.maxLength && trimmed.length > slot.constraints.maxLength) return false;
    if (slot.constraints?.mustEndWith && !trimmed.endsWith(slot.constraints.mustEndWith)) return false;
    if (slot.constraints?.mustNotContain?.some((needle) => trimmed.toLowerCase().includes(needle.toLowerCase()))) return false;
    if (/[{}]/.test(trimmed)) return false;
    return true;
  }

  private validateGrammar(text: string): boolean {
    if (!/^[A-Z"[]/.test(text)) return false;
    if (!/[.!?"'\]]$/.test(text.trim())) return false;
    if (/\b(the|a|an)\s*$/i.test(text.trim())) return false;
    if (text.includes("{") || text.includes("}")) return false;
    if (/  /.test(text)) return false;
    return true;
  }
}
