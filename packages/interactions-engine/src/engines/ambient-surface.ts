import type { AmbientItem, SurfaceConfig } from "../types";

export class AmbientSurfaceEngine {
  private items: AmbientItem[] = [];
  private activeItem: AmbientItem | null = null;
  private currentView = "";
  private timer: number | null = null;

  constructor(
    private readonly config: SurfaceConfig,
    items: AmbientItem[] = [],
    private readonly isGapConcept: (conceptId: string) => boolean = () => false
  ) {
    this.items = items;
  }

  setItems(items: AmbientItem[]): void {
    this.items = items;
  }

  setContext(view: string): void {
    this.currentView = view;
  }

  tick(): AmbientItem | null {
    const now = Date.now();
    const candidates = this.items
      .filter((item) => now - item.lastShownAt > 10000)
      .filter((item) => {
        if (this.config.contextBias === "view") {
          return item.contextTags.includes(this.currentView) || item.contextTags.length === 0;
        }
        if (this.config.contextBias === "gaps") {
          return item.concepts.some((concept) => this.isGapConcept(concept));
        }
        return true;
      });
    if (candidates.length === 0) return null;
    const weighted = candidates
      .map((item) => ({
        item,
        weight: 1 + 1 / (item.shownCount + 1) + (item.contextTags.includes(this.currentView) ? 0.6 : 0)
      }))
      .sort((left, right) => right.weight - left.weight || left.item.id.localeCompare(right.item.id));
    const selected = weighted[0]!.item;
    selected.shownCount += 1;
    selected.lastShownAt = now;
    this.activeItem = selected;
    return selected;
  }

  start(onSurface: (item: AmbientItem) => void): void {
    const interval = this.getIntervalForIntensity();
    if (!interval) return;
    this.stop();
    this.timer = window.setInterval(() => {
      const item = this.tick();
      if (item) onSurface(item);
    }, interval);
  }

  stop(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  getActive(): AmbientItem | null {
    return this.activeItem;
  }

  getFamiliarityStats(): { total: number; seen: number; familiar: number; percentFamiliar: number } {
    const total = this.items.length;
    const familiar = this.items.filter((item) => item.shownCount >= 3).length;
    const seen = this.items.filter((item) => item.shownCount >= 1).length;
    return {
      total,
      seen,
      familiar,
      percentFamiliar: total === 0 ? 0 : familiar / total
    };
  }

  private getIntervalForIntensity(): number {
    switch (this.config.intensity) {
      case "gentle": return 30000;
      case "steady": return 15000;
      case "immersive": return 8000;
      default: return 0;
    }
  }
}
