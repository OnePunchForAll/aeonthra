import type { LearningBuildStage } from "@learning/content-engine";
import type { CaptureBundle, LearningBundle } from "@learning/schema";

type ProgressMessage = {
  id: string;
  type: "PROGRESS";
  stage: LearningBuildStage;
  progress: number;
};

type CompleteMessage = {
  id: string;
  type: "COMPLETE";
  result: LearningBundle;
};

type ErrorMessage = {
  id: string;
  type: "ERROR";
  error: string;
};

type WorkerMessage = ProgressMessage | CompleteMessage | ErrorMessage;

type PendingRequest = {
  resolve: (value: LearningBundle) => void;
  reject: (reason?: unknown) => void;
  onProgress: (stage: LearningBuildStage, progress: number) => void;
};

class TextbookProcessor {
  private worker: Worker;

  private pending = new Map<string, PendingRequest>();

  constructor() {
    this.worker = new Worker(new URL("../workers/content-engine.worker.ts", import.meta.url), {
      type: "module"
    });
    this.worker.addEventListener("message", this.handleMessage);
  }

  process(bundle: CaptureBundle, onProgress: (stage: LearningBuildStage, progress: number) => void): Promise<LearningBundle> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress });
      this.worker.postMessage({
        id,
        type: "PROCESS_BUNDLE",
        payload: { bundle }
      });
    });
  }

  private handleMessage = (event: MessageEvent<WorkerMessage>) => {
    const pending = this.pending.get(event.data.id);
    if (!pending) {
      return;
    }
    if (event.data.type === "PROGRESS") {
      pending.onProgress(event.data.stage, event.data.progress);
      return;
    }
    this.pending.delete(event.data.id);
    if (event.data.type === "COMPLETE") {
      pending.resolve(event.data.result);
      return;
    }
    pending.reject(new Error(event.data.error));
  };
}

let singleton: TextbookProcessor | null = null;

export function getTextbookProcessor(): TextbookProcessor {
  singleton ??= new TextbookProcessor();
  return singleton;
}
