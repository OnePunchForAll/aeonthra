/// <reference lib="webworker" />

import { buildLearningBundleWithProgress, type LearningBuildStage } from "@learning/content-engine";
import type { CaptureBundle } from "@learning/schema";

type WorkerRequest = {
  id: string;
  type: "PROCESS_BUNDLE";
  payload: {
    bundle: CaptureBundle;
  };
};

type WorkerProgress = {
  id: string;
  type: "PROGRESS";
  stage: LearningBuildStage;
  progress: number;
};

type WorkerComplete = {
  id: string;
  type: "COMPLETE";
  result: ReturnType<typeof buildLearningBundleWithProgress>;
};

type WorkerError = {
  id: string;
  type: "ERROR";
  error: string;
};

const post = (message: WorkerProgress | WorkerComplete | WorkerError) => {
  self.postMessage(message);
};

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
  const { id, type, payload } = event.data;
  if (type !== "PROCESS_BUNDLE") {
    return;
  }

  try {
    const result = buildLearningBundleWithProgress(payload.bundle, (stage, progress) => {
      post({ id, type: "PROGRESS", stage, progress });
    });
    post({ id, type: "COMPLETE", result });
  } catch (error) {
    post({
      id,
      type: "ERROR",
      error: error instanceof Error ? error.message : "Unknown processing error"
    });
  }
});

export {};
