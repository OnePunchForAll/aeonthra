# AEONTHRA PERFORMANCE ARCHITECTURE — System-Level Optimization

## Making Every Frame, Every Interaction, Every Transition Feel Instant

**Codex: this document engineers the runtime performance of the entire app. Execute alongside or immediately after the Competition Edge pass. Every optimization below has a specific user-visible impact — nothing is theoretical. Together they transform the app from "works" to "feels like a native application built by a team of 50."**

**The target: every interaction responds in under 16ms (one frame). Every view renders in under 100ms. Every engine completes in under 200ms. The concept map runs at 60fps with 200 nodes. The timeline scrolls like butter. Neural Forge phase transitions feel weightless. Nothing janks. Nothing stutters. Nothing freezes. Ever.**

---

## 0. THE PERFORMANCE MENTAL MODEL

There are seven layers where performance is won or lost:

```
┌─────────────────────────────────────────┐
│  LAYER 7: PERCEIVED PERFORMANCE         │  ← Skeleton screens, optimistic UI, progressive disclosure
│  LAYER 6: ANIMATION PERFORMANCE         │  ← GPU compositing, will-change, RAF batching
│  LAYER 5: RENDER PERFORMANCE            │  ← Virtual lists, memoization, lazy components
│  LAYER 4: COMPUTATION PERFORMANCE       │  ← Web Workers, chunked processing, caching
│  LAYER 3: MEMORY PERFORMANCE            │  ← Object pooling, WeakRefs, garbage pressure
│  LAYER 2: STORAGE PERFORMANCE           │  ← IndexedDB batching, cache layers, read-ahead
│  LAYER 1: BUNDLE PERFORMANCE            │  ← Code splitting, tree shaking, lazy imports
└─────────────────────────────────────────┘
```

Every layer must be optimized. A fast engine means nothing if the renderer janks. A fast renderer means nothing if the bundle takes 4 seconds to load. This document works from the bottom up.

---

## 1. LAYER 1 — BUNDLE PERFORMANCE

### 1.1 Code Splitting Strategy

The app has 5+ major views and 9+ interaction modes. The student will only use 1-2 at any moment. Split aggressively.

```typescript
// apps/web/src/routes/index.tsx
import { lazy, Suspense } from 'react';
import { LoadingOrbital } from '../components/shared/LoadingOrbital';

// Every route is a lazy import — only loads when navigated to
const Dashboard = lazy(() => import('./Dashboard'));
const Timeline = lazy(() => import('./Timeline'));
const ConceptMap = lazy(() => import('./ConceptMap'));
const NeuralForge = lazy(() => import('./NeuralForge'));
const AssignmentDetail = lazy(() => import('./AssignmentDetail'));
const Settings = lazy(() => import('./Settings'));

// Novel interactions — even more aggressively lazy
const EchoChamber = lazy(() => import('../interactions/EchoChamber'));
const OraclePanel = lazy(() => import('../interactions/OraclePanel'));
const GravityField = lazy(() => import('../interactions/GravityField'));
const ShadowReader = lazy(() => import('../interactions/ShadowReader'));
const FailureAtlas = lazy(() => import('../interactions/FailureAtlas'));
const CollisionLab = lazy(() => import('../interactions/CollisionLab'));
const DuelArena = lazy(() => import('../interactions/DuelArena'));
const PromptPrism = lazy(() => import('../interactions/PromptPrism'));
const TimeCapsule = lazy(() => import('../interactions/TimeCapsule'));

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingOrbital />}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/concept-map" element={<ConceptMap />} />
        <Route path="/forge/*" element={<NeuralForge />} />
        <Route path="/assignment/:id" element={<AssignmentDetail />} />
        <Route path="/settings" element={<Settings />} />
        {/* Novel interactions */}
        <Route path="/echo-chamber" element={<EchoChamber />} />
        <Route path="/oracle" element={<OraclePanel />} />
        <Route path="/gravity" element={<GravityField />} />
        <Route path="/collision" element={<CollisionLab />} />
        <Route path="/duel" element={<DuelArena />} />
        <Route path="/prism/:id" element={<PromptPrism />} />
        <Route path="/capsule/:id" element={<TimeCapsule />} />
        <Route path="/failure-atlas/:id" element={<FailureAtlas />} />
      </Routes>
    </Suspense>
  );
}
```

### 1.2 Vite Configuration for Optimal Splitting

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,     // strip console.log in production
        drop_debugger: true,
        pure_funcs: ['console.debug', 'console.trace'],
        passes: 2,              // two compression passes
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core framework — always loaded
          'react-core': ['react', 'react-dom', 'react-router-dom'],
          
          // State management — always loaded
          'state': ['zustand', 'idb-keyval'],
          
          // Heavy libraries — loaded on demand
          'pdf': ['pdfjs-dist'],
          'docx': ['docx'],
          'physics': ['./src/engines/spring-physics'],
          
          // Dictionaries — loaded once when content engine runs
          'dictionaries': [
            './packages/content-engine/src/dictionaries/stopwords.json',
            './packages/content-engine/src/dictionaries/word-frequency.json',
            './packages/content-engine/src/dictionaries/synonyms.json',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 500, // warn if any chunk exceeds 500KB
    sourcemap: false,           // no sourcemaps in production
    cssCodeSplit: true,         // CSS per route
  },
  
  // Preload hints for critical chunks
  experimental: {
    renderBuiltUrl(filename) {
      // Add modulepreload for critical chunks
      return filename;
    },
  },
});
```

### 1.3 Bundle Size Budget

| Chunk | Max Size (gzipped) |
|-------|-------------------|
| Initial HTML + CSS + critical JS | 80 KB |
| React core | 45 KB |
| Dashboard route | 30 KB |
| Timeline route | 25 KB |
| Concept Map route | 35 KB |
| Neural Forge route | 40 KB |
| Assignment Detail route | 35 KB |
| Each novel interaction | 20-30 KB |
| pdf.js | 200 KB (loaded only when PDF uploaded) |
| docx library | 150 KB (loaded only when exporting) |
| Dictionary bundle | 120 KB (loaded only when engine runs) |
| **Total initial load** | **< 160 KB gzipped** |
| **Total all chunks** | **< 1.2 MB gzipped** |

### 1.4 Preloading Strategy

When the student is on the Dashboard, preload the routes they're likely to navigate to next:

```typescript
// apps/web/src/preload.ts
function preloadAdjacentRoutes(currentRoute: string) {
  const preloadMap: Record<string, string[]> = {
    '/': ['/timeline', '/forge', '/concept-map'],
    '/timeline': ['/', '/assignment'],
    '/forge': ['/concept-map', '/'],
    '/concept-map': ['/forge', '/'],
  };
  
  const routesToPreload = preloadMap[currentRoute] || [];
  
  for (const route of routesToPreload) {
    // Use requestIdleCallback so preloading doesn't compete with current render
    requestIdleCallback(() => {
      const link = document.createElement('link');
      link.rel = 'modulepreload';
      link.href = getChunkUrlForRoute(route);
      document.head.appendChild(link);
    });
  }
}
```

### 1.5 Font Loading Optimization

Fonts are one of the biggest render-blocking resources. Load them non-blocking:

```html
<!-- In index.html <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

<!-- Preload only the weights we need most critically -->
<link
  rel="preload"
  as="style"
  href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Sora:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap"
  onload="this.onload=null;this.rel='stylesheet'"
/>

<!-- Fallback for no-JS -->
<noscript>
  <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Sora:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
</noscript>
```

Also set `font-display: swap` in the CSS so text renders immediately with system fonts, then swaps to the custom fonts when loaded:

```css
/* Override Google Fonts default if needed */
@font-face {
  font-family: 'Orbitron';
  font-display: swap;
}
@font-face {
  font-family: 'Sora';
  font-display: swap;
}
@font-face {
  font-family: 'JetBrains Mono';
  font-display: swap;
}
```

### 1.6 Acceptance test

Run `pnpm build && npx serve dist`. Open Chrome DevTools → Network. Initial page load should transfer < 160 KB. Navigating to a new route should load only that route's chunk (< 40 KB). pdf.js should NOT load until a PDF is dragged onto the upload zone.

---

## 2. LAYER 2 — STORAGE PERFORMANCE

### 2.1 Tiered Storage Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        IN-MEMORY                         │
│  Zustand stores (hot state)                              │
│  Currently-viewed concepts, active quiz state,           │
│  current progress, UI state                              │
│  Access time: < 0.01ms                                   │
├─────────────────────────────────────────────────────────┤
│                      LRU CACHE                           │
│  Recently-accessed ForgeBundle chunks,                   │
│  passage retrieval results, collision reports            │
│  Access time: < 0.1ms                                   │
│  Size limit: 50 MB                                       │
├─────────────────────────────────────────────────────────┤
│                      IndexedDB                           │
│  Full course data, textbooks, forge bundles,             │
│  concept graphs, progress history, SRS deck             │
│  Access time: 1-10ms                                    │
├─────────────────────────────────────────────────────────┤
│                    localStorage                          │
│  Settings, active course ID, UI preferences              │
│  Access time: < 0.5ms                                   │
│  Size limit: 5 MB                                        │
└─────────────────────────────────────────────────────────┘
```

### 2.2 LRU Cache Implementation

```typescript
// apps/web/src/persistence/lru-cache.ts
class LRUCache<K, V> {
  private map = new Map<K, V>();
  private maxSize: number;
  private currentSizeBytes: number = 0;
  private maxSizeBytes: number;
  
  constructor(maxEntries: number, maxMB: number = 50) {
    this.maxSize = maxEntries;
    this.maxSizeBytes = maxMB * 1024 * 1024;
  }
  
  get(key: K): V | undefined {
    const value = this.map.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.map.delete(key);
      this.map.set(key, value);
    }
    return value;
  }
  
  set(key: K, value: V, sizeBytes?: number): void {
    // If key exists, remove it first (will re-add at end)
    if (this.map.has(key)) {
      this.map.delete(key);
    }
    
    // Evict oldest entries until we have room
    while (this.map.size >= this.maxSize || 
           (sizeBytes && this.currentSizeBytes + sizeBytes > this.maxSizeBytes)) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey === undefined) break;
      this.map.delete(oldestKey);
    }
    
    this.map.set(key, value);
    if (sizeBytes) this.currentSizeBytes += sizeBytes;
  }
  
  has(key: K): boolean {
    return this.map.has(key);
  }
  
  clear(): void {
    this.map.clear();
    this.currentSizeBytes = 0;
  }
}

// Global caches
export const passageCache = new LRUCache<string, PassageResult[]>(200, 10);
export const bundleCache = new LRUCache<string, ForgeBundle>(20, 30);
export const collisionCache = new LRUCache<string, CollisionReport>(50, 5);
```

### 2.3 IndexedDB Read-Ahead

When the student navigates to a view, prefetch the data it will need:

```typescript
// apps/web/src/persistence/read-ahead.ts
const READ_AHEAD_MAP: Record<string, string[]> = {
  '/dashboard': ['canvas_captures', 'progress', 'concept_graphs'],
  '/timeline': ['canvas_captures', 'progress'],
  '/concept-map': ['concept_graphs', 'progress'],
  '/forge': ['forge_bundles', 'progress'],
  '/assignment': ['canvas_captures', 'forge_bundles', 'progress'],
};

function prefetchForRoute(route: string) {
  const stores = READ_AHEAD_MAP[route] || [];
  
  for (const store of stores) {
    requestIdleCallback(async () => {
      // Only fetch if not already in memory
      if (!memoryStore.has(store)) {
        const data = await db.getAll(store);
        memoryStore.set(store, data);
      }
    });
  }
}

// Call on every route change
useEffect(() => {
  prefetchForRoute(location.pathname);
}, [location.pathname]);
```

### 2.4 IndexedDB Transaction Batching

Multiple writes to IndexedDB should be batched into single transactions:

```typescript
// apps/web/src/persistence/batch-writer.ts
class BatchWriter {
  private queue: Array<{ store: string; key: string; value: any }> = [];
  private flushTimer: number | null = null;
  private flushIntervalMs: number = 100; // batch writes every 100ms
  
  write(store: string, key: string, value: any) {
    this.queue.push({ store, key, value });
    
    if (!this.flushTimer) {
      this.flushTimer = window.setTimeout(() => this.flush(), this.flushIntervalMs);
    }
  }
  
  private async flush() {
    this.flushTimer = null;
    if (this.queue.length === 0) return;
    
    const batch = [...this.queue];
    this.queue = [];
    
    // Group by store
    const grouped = new Map<string, Array<{ key: string; value: any }>>();
    for (const item of batch) {
      const list = grouped.get(item.store) || [];
      list.push({ key: item.key, value: item.value });
      grouped.set(item.store, list);
    }
    
    // One transaction per store
    const dbInstance = await openDB();
    for (const [storeName, items] of grouped) {
      const tx = dbInstance.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        store.put(item.value, item.key);
      }
      await tx.done;
    }
  }
  
  // Force immediate flush (e.g., before page unload)
  async flushNow() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }
}

export const batchWriter = new BatchWriter();

// Ensure data is saved before the page unloads
window.addEventListener('beforeunload', () => {
  batchWriter.flushNow();
});
```

### 2.5 Acceptance test

Open DevTools → Application → IndexedDB. Rapidly answer 10 Neural Forge questions. Verify that writes are batched (not 10 separate transactions, but 2-3 batched ones). Verify that navigating between views shows data instantly (from LRU cache) without waiting for IndexedDB reads.

---

## 3. LAYER 3 — MEMORY PERFORMANCE

### 3.1 Object Pooling for Physics Simulation

The Gravity Field and spring physics create thousands of temporary `Vec2` objects per second. Pooling eliminates garbage collection pressure:

```typescript
// packages/motion/src/pool.ts
class Vec2Pool {
  private pool: Vec2[] = [];
  private index: number = 0;
  
  constructor(initialSize: number = 500) {
    for (let i = 0; i < initialSize; i++) {
      this.pool.push({ x: 0, y: 0 });
    }
  }
  
  acquire(): Vec2 {
    if (this.index < this.pool.length) {
      const v = this.pool[this.index++];
      v.x = 0;
      v.y = 0;
      return v;
    }
    // Pool exhausted — grow
    const v = { x: 0, y: 0 };
    this.pool.push(v);
    this.index++;
    return v;
  }
  
  releaseAll() {
    this.index = 0; // just reset the index — objects are reused next frame
  }
}

export const vec2Pool = new Vec2Pool(1000);

// Usage in physics loop:
function physicsStep(dt: number) {
  vec2Pool.releaseAll(); // start of frame
  
  for (const body of bodies) {
    const force = vec2Pool.acquire();
    force.x = /* ... */;
    force.y = /* ... */;
    // force is reused next frame, no GC needed
  }
}
```

### 3.2 WeakRef for Passage Index

The passage index for a large textbook can be 10-50 MB in memory. Use `WeakRef` to allow garbage collection when memory is tight:

```typescript
class PassageIndexManager {
  private indices = new Map<string, WeakRef<PassageIndex>>();
  private finalizationRegistry = new FinalizationRegistry((textbookId: string) => {
    console.debug(`Passage index for ${textbookId} garbage collected`);
    this.indices.delete(textbookId);
  });
  
  async getIndex(textbookId: string): Promise<PassageIndex> {
    const weakRef = this.indices.get(textbookId);
    if (weakRef) {
      const index = weakRef.deref();
      if (index) return index; // still alive
    }
    
    // Rebuild from IndexedDB
    const index = await this.buildIndex(textbookId);
    this.indices.set(textbookId, new WeakRef(index));
    this.finalizationRegistry.register(index, textbookId);
    return index;
  }
  
  private async buildIndex(textbookId: string): Promise<PassageIndex> {
    const textbook = await db.get('textbooks', textbookId);
    return new PassageRetrievalEngine(textbook).getIndex();
  }
}
```

### 3.3 Concept Graph Structural Sharing

When updating mastery scores, don't clone the entire concept graph. Use structural sharing (immutable update) so React's memoization detects only the changed nodes:

```typescript
// state/progress-store.ts
function updateConceptMastery(conceptId: string, delta: number) {
  set((state) => ({
    ...state,
    conceptMastery: {
      ...state.conceptMastery,
      [conceptId]: Math.min(1, Math.max(0, (state.conceptMastery[conceptId] || 0) + delta)),
    },
  }));
  // Only the specific conceptMastery entry changes.
  // React.memo components subscribed to other concepts don't re-render.
}
```

### 3.4 Acceptance test

Open DevTools → Memory → Take heap snapshot. Use the app heavily for 5 minutes (play Neural Forge, browse concept map, open Gravity Field). Take another snapshot. Heap growth should be < 20 MB. No "detached DOM nodes" leak. GC pauses should be < 5ms (check Performance timeline).

---

## 4. LAYER 4 — COMPUTATION PERFORMANCE

### 4.1 Web Worker Architecture

Three dedicated workers for the three heaviest computation paths:

```
┌─────────────────────────────────────────────────────────┐
│                    MAIN THREAD                           │
│  React rendering, user interaction, animation            │
│  NEVER runs content engine, TF-IDF, or PDF extraction   │
├──────────┬──────────────────┬───────────────────────────┤
│          │                  │                           │
│   Worker A:           Worker B:             Worker C:   │
│   CONTENT ENGINE      PASSAGE RETRIEVAL     PDF ENGINE  │
│                                                         │
│   - Text normalization  - TF-IDF search    - Page extraction │
│   - Block segmentation  - Cosine similarity - Text reconstruction │
│   - Concept extraction  - Echo Chamber      - Chapter detection │
│   - Question generation   matching                      │
│   - Bundle assembly     - Shadow Reader                 │
│                           selection                     │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Worker Communication Protocol

Use `Transferable` objects where possible to avoid copying:

```typescript
// shared/worker-protocol.ts
interface WorkerMessage {
  id: string;
  type: string;
  payload: any;
  transfer?: Transferable[]; // for ArrayBuffers
}

interface WorkerResponse {
  id: string;
  type: 'RESULT' | 'PROGRESS' | 'ERROR';
  payload: any;
}

// Generic worker RPC wrapper
class WorkerRPC {
  private worker: Worker;
  private pending = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    onProgress?: (p: any) => void;
  }>();
  
  constructor(workerUrl: URL) {
    this.worker = new Worker(workerUrl, { type: 'module' });
    this.worker.addEventListener('message', this.handleMessage.bind(this));
  }
  
  async call<T>(
    type: string,
    payload: any,
    options?: { onProgress?: (p: any) => void; transfer?: Transferable[] }
  ): Promise<T> {
    const id = crypto.randomUUID();
    
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onProgress: options?.onProgress });
      
      const message: WorkerMessage = { id, type, payload };
      
      if (options?.transfer) {
        this.worker.postMessage(message, options.transfer);
      } else {
        this.worker.postMessage(message);
      }
    });
  }
  
  private handleMessage(event: MessageEvent<WorkerResponse>) {
    const { id, type, payload } = event.data;
    const handler = this.pending.get(id);
    if (!handler) return;
    
    if (type === 'PROGRESS') {
      handler.onProgress?.(payload);
    } else if (type === 'RESULT') {
      this.pending.delete(id);
      handler.resolve(payload);
    } else if (type === 'ERROR') {
      this.pending.delete(id);
      handler.reject(new Error(payload));
    }
  }
  
  terminate() {
    this.worker.terminate();
    for (const handler of this.pending.values()) {
      handler.reject(new Error('Worker terminated'));
    }
    this.pending.clear();
  }
}

// Instantiate workers lazily (only when first needed)
let contentWorker: WorkerRPC | null = null;
let passageWorker: WorkerRPC | null = null;
let pdfWorker: WorkerRPC | null = null;

export function getContentWorker(): WorkerRPC {
  if (!contentWorker) {
    contentWorker = new WorkerRPC(
      new URL('../workers/content-engine.worker.ts', import.meta.url)
    );
  }
  return contentWorker;
}

export function getPassageWorker(): WorkerRPC {
  if (!passageWorker) {
    passageWorker = new WorkerRPC(
      new URL('../workers/passage-retrieval.worker.ts', import.meta.url)
    );
  }
  return passageWorker;
}

export function getPDFWorker(): WorkerRPC {
  if (!pdfWorker) {
    pdfWorker = new WorkerRPC(
      new URL('../workers/pdf-engine.worker.ts', import.meta.url)
    );
  }
  return pdfWorker;
}
```

### 4.3 Chunked Processing with Yield

For any computation that takes > 50ms, chunk it and yield between chunks:

```typescript
// packages/content-engine/src/utils/chunked.ts
async function processChunked<T, R>(
  items: T[],
  processor: (item: T) => R,
  chunkSize: number = 100,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    for (const item of chunk) {
      results.push(processor(item));
    }
    
    if (onProgress) {
      onProgress(Math.min(i + chunkSize, items.length), items.length);
    }
    
    // Yield to allow message processing and progress reports
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  return results;
}
```

### 4.4 Memoized Expensive Computations

```typescript
// packages/content-engine/src/utils/memoize.ts
function memoize<K, V>(
  fn: (key: K) => V,
  options: { maxSize?: number; ttlMs?: number } = {}
): (key: K) => V {
  const cache = new Map<string, { value: V; timestamp: number }>();
  const maxSize = options.maxSize || 500;
  const ttl = options.ttlMs || Infinity;
  
  return (key: K): V => {
    const cacheKey = JSON.stringify(key);
    const cached = cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp < ttl)) {
      return cached.value;
    }
    
    const value = fn(key);
    
    // Evict oldest if over max size
    if (cache.size >= maxSize) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    
    cache.set(cacheKey, { value, timestamp: Date.now() });
    return value;
  };
}

// Usage examples:
export const memoizedStemmer = memoize(stem, { maxSize: 10000 });
export const memoizedTokenize = memoize(tokenize, { maxSize: 5000 });
export const memoizedJaccard = memoize(
  ({ a, b }: { a: string[]; b: string[] }) => jaccardSimilarity(a, b),
  { maxSize: 2000 }
);
```

### 4.5 Pre-computed Inverted Index

Build the passage retrieval index once during textbook ingestion, persist it to IndexedDB, and load it instantly on subsequent sessions:

```typescript
interface PersistedIndex {
  version: number;
  textbookHash: string; // if textbook hasn't changed, reuse index
  tokenIndex: Record<string, number[]>;   // token → passage IDs
  conceptIndex: Record<string, number[]>; // concept → passage IDs
  tfidfVectors: Float32Array;             // compact binary representation
  passages: CompactPassage[];             // text + metadata
}

async function getOrBuildIndex(textbookId: string, textbookHash: string): Promise<PassageIndex> {
  // Check for persisted index
  const cached = await db.get('passage_indices', textbookId);
  if (cached && cached.textbookHash === textbookHash) {
    return deserializeIndex(cached); // < 50ms to deserialize
  }
  
  // Build new index in worker
  const index = await getPassageWorker().call('BUILD_INDEX', { textbookId });
  
  // Persist for next session
  await db.put('passage_indices', serializeIndex(index), textbookId);
  
  return index;
}
```

### 4.6 Echo Chamber Debouncing

The Echo Chamber monitors typing and queries the passage index. Without debouncing, every keystroke triggers a search:

```typescript
// interactions/EchoChamber/useEchoSearch.ts
function useEchoSearch(editorText: string) {
  const [echo, setEcho] = useState<PassageResult | null>(null);
  const lastQueryRef = useRef('');
  
  useEffect(() => {
    // Debounce: only search every 3 seconds after last keystroke
    const timer = setTimeout(async () => {
      // Extract last 40 words
      const words = editorText.split(/\s+/).slice(-40).join(' ');
      
      // Skip if the query hasn't changed meaningfully
      const queryFingerprint = words.split(/\s+/).filter(w => !STOPWORDS.has(w.toLowerCase())).sort().join(' ');
      if (queryFingerprint === lastQueryRef.current) return;
      lastQueryRef.current = queryFingerprint;
      
      // Search in passage worker (off main thread)
      const results = await getPassageWorker().call<PassageResult[]>('SEARCH', {
        query: words,
        limit: 1,
        minScore: 0.3,
      });
      
      if (results.length > 0) {
        setEcho(results[0]);
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [editorText]);
  
  return echo;
}
```

### 4.7 Acceptance test

Open DevTools → Performance. Start a Neural Forge session. Record for 30 seconds while answering questions. The main thread should have zero long tasks (> 50ms). All content engine work should appear in worker threads. The frame rate should stay at 60fps during phase transitions.

---

## 5. LAYER 5 — RENDER PERFORMANCE

### 5.1 Virtual Scrolling for Long Lists

The Timeline can have 100+ events. The Active Work list can have 50+ items. Virtual scrolling renders only visible items:

```typescript
// components/shared/VirtualList.tsx
import { useRef, useState, useCallback, useMemo } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number; // fixed height per item
  overscan?: number;  // extra items to render above/below viewport
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
}

function VirtualList<T>({ items, itemHeight, overscan = 5, renderItem, className }: VirtualListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);
  
  const { startIndex, endIndex, totalHeight, offsetY } = useMemo(() => {
    const containerHeight = containerRef.current?.clientHeight || 600;
    const totalHeight = items.length * itemHeight;
    
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    const offsetY = startIndex * itemHeight;
    
    return { startIndex, endIndex, totalHeight, offsetY };
  }, [items.length, itemHeight, scrollTop, overscan]);
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className={className}
      style={{ overflow: 'auto', position: 'relative' }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, i) => renderItem(item, startIndex + i))}
        </div>
      </div>
    </div>
  );
}
```

Use for: Active Work list, history views, quiz question banks, concept lists, file lists, discussion reply threads.

### 5.2 React.memo and Selector Optimization

Every component that receives data from a Zustand store must use narrow selectors:

```typescript
// BAD — re-renders on ANY store change
function ConceptNode({ conceptId }: { conceptId: string }) {
  const store = useProgressStore(); // subscribes to entire store
  const mastery = store.conceptMastery[conceptId];
  // ...
}

// GOOD — re-renders only when this specific mastery changes
function ConceptNode({ conceptId }: { conceptId: string }) {
  const mastery = useProgressStore(
    useCallback((s) => s.conceptMastery[conceptId], [conceptId])
  );
  // ...
}

// Wrap in React.memo to prevent parent re-renders from cascading
const ConceptNode = React.memo(function ConceptNode({ conceptId }: { conceptId: string }) {
  const mastery = useProgressStore(
    useCallback((s) => s.conceptMastery[conceptId], [conceptId])
  );
  // ...
});
```

**Rule: every component that renders inside a list, a grid, or a map must be `React.memo` with narrow Zustand selectors.**

### 5.3 Canvas Rendering for Concept Map and Gravity Field

For visualizations with 50+ moving elements, DOM rendering is too slow. Use `<canvas>` with a retained-mode render loop:

```typescript
// components/concept-map/CanvasRenderer.ts
class ConceptMapRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr: number;
  private nodes: RenderNode[] = [];
  private edges: RenderEdge[] = [];
  private dirty: boolean = true;
  private rafId: number | null = null;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
  }
  
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.scale(this.dpr, this.dpr);
    this.dirty = true;
  }
  
  setData(nodes: RenderNode[], edges: RenderEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.dirty = true;
  }
  
  markDirty() {
    this.dirty = true;
  }
  
  start() {
    const loop = () => {
      if (this.dirty) {
        this.render();
        this.dirty = false;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }
  
  stop() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
  
  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width / this.dpr;
    const h = this.canvas.height / this.dpr;
    
    // Clear with background
    ctx.fillStyle = '#020208';
    ctx.fillRect(0, 0, w, h);
    
    // Draw edges first (underneath)
    for (const edge of this.edges) {
      ctx.beginPath();
      ctx.moveTo(edge.x1, edge.y1);
      ctx.lineTo(edge.x2, edge.y2);
      ctx.strokeStyle = edge.active
        ? 'rgba(0, 240, 255, 0.6)'
        : 'rgba(26, 26, 58, 0.4)';
      ctx.lineWidth = edge.weight;
      ctx.stroke();
    }
    
    // Draw nodes
    for (const node of this.nodes) {
      // Glow effect (using shadow)
      if (node.glow) {
        ctx.shadowColor = node.color;
        ctx.shadowBlur = node.glowRadius;
      }
      
      // Node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      
      // Border
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.strokeStyle = node.borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Label
      ctx.font = `${Math.max(9, node.radius * 0.5)}px Sora`;
      ctx.fillStyle = node.dimmed ? 'rgba(224, 224, 255, 0.3)' : '#e0e0ff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        node.label.length > 24 ? node.label.substring(0, 23) + '…' : node.label,
        node.x,
        node.y + node.radius + 6
      );
    }
  }
  
  // Hit testing for click/hover
  hitTest(x: number, y: number): RenderNode | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy <= node.radius * node.radius) {
        return node;
      }
    }
    return null;
  }
}
```

**When to use Canvas vs DOM:**
- Concept Map: Canvas (50-200 nodes, continuous interaction)
- Gravity Field: Canvas (30-100 bodies in physics simulation)
- Timeline: DOM (mostly static, needs text accessibility)
- Neural Forge: DOM (form elements, text, buttons)
- Dashboard: DOM (standard cards and lists)

### 5.4 Image and Asset Lazy Loading

Any images, icons, or heavy SVGs load lazily:

```tsx
function LazyImage({ src, alt, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={src} alt={alt} loading="lazy" decoding="async" {...props} />;
}
```

### 5.5 Acceptance test

Open the Concept Map with 50+ nodes. Pan and zoom. Frame rate should stay at 60fps (check DevTools → Rendering → FPS meter). Open the Active Work list with 50 items. Scroll rapidly. No jank, no blank frames. Navigate between Dashboard and Timeline 10 times rapidly. Each transition should complete in < 100ms.

---

## 6. LAYER 6 — ANIMATION PERFORMANCE

### 6.1 GPU Compositing for All Animated Elements

Force the browser to composite animated elements on the GPU:

```css
/* Elements that will animate */
.card,
.timeline-event,
.concept-node,
.phase-card,
.modal,
.echo-drift,
.shadow-passage {
  will-change: transform, opacity;
  transform: translateZ(0); /* force GPU layer */
}

/* Remove will-change after animation completes to free GPU memory */
.card:not(:hover):not(.card--focused) {
  will-change: auto;
}
```

### 6.2 Batch DOM Reads and Writes

Never interleave DOM reads and writes in the same frame — this causes forced reflows:

```typescript
// BAD — forces reflow on every iteration
for (const node of nodes) {
  const height = node.getBoundingClientRect().height; // READ
  node.style.top = `${height * 2}px`; // WRITE → forces reflow for next read
}

// GOOD — batch all reads, then all writes
const heights = nodes.map(node => node.getBoundingClientRect().height); // ALL READS
nodes.forEach((node, i) => {
  node.style.top = `${heights[i] * 2}px`; // ALL WRITES
});
```

### 6.3 RequestAnimationFrame Batching

All animations must synchronize to the same RAF loop to avoid multiple repaints per frame:

```typescript
// engines/animation-scheduler.ts
class AnimationScheduler {
  private callbacks: Map<string, (timestamp: number) => void> = new Map();
  private rafId: number | null = null;
  private running: boolean = false;
  
  register(id: string, callback: (timestamp: number) => void) {
    this.callbacks.set(id, callback);
    if (!this.running) this.start();
  }
  
  unregister(id: string) {
    this.callbacks.delete(id);
    if (this.callbacks.size === 0) this.stop();
  }
  
  private start() {
    this.running = true;
    const loop = (timestamp: number) => {
      for (const callback of this.callbacks.values()) {
        callback(timestamp);
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }
  
  private stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export const animationScheduler = new AnimationScheduler();

// Usage:
// Breath engine registers its callback
animationScheduler.register('breath', (ts) => {
  const value = computeBreath(ts);
  document.documentElement.style.setProperty('--breath', String(value));
});

// Spring physics registers its callback
animationScheduler.register('springs', (ts) => {
  springEngine.step(ts);
  springEngine.applyToDOM();
});

// Gravity field registers its callback
animationScheduler.register('gravity', (ts) => {
  gravitySimulation.step(ts);
  canvasRenderer.markDirty();
});
```

This ensures all three animation systems (breath, springs, gravity) share a single RAF loop and produce exactly one repaint per frame.

### 6.4 CSS Containment

Tell the browser that certain regions are independent and don't affect each other's layout:

```css
/* Timeline event cards don't affect each other's layout */
.timeline-event {
  contain: layout style paint;
}

/* Concept map doesn't affect the rest of the page */
.concept-map-canvas {
  contain: strict;
}

/* Modal content doesn't affect the page behind it */
.modal-content {
  contain: layout style;
}

/* Sidebar content doesn't affect main content */
.side-panel {
  contain: layout style paint;
}
```

### 6.5 Acceptance test

Open DevTools → Performance. Record a 10-second trace while hovering cards, scrolling the timeline, and watching the breath animation. Verify:
- No "Forced reflow" warnings
- No layout thrashing (read-write interleaving)
- All animations hit 60fps
- Paint regions are isolated (check "Paint flashing" overlay — only hovered cards should repaint)

---

## 7. LAYER 7 — PERCEIVED PERFORMANCE

This layer is about making the app FEEL fast, even when actual operations take time.

### 7.1 Skeleton Screens

Every view has a skeleton screen that renders within 1ms while real data loads:

```tsx
// components/shared/Skeleton.tsx
function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-card">
      <div className="skeleton-bar skeleton-bar--title" />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-bar"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="grid-2">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={2} />
      </div>
      <div className="grid-3">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </div>
    </div>
  );
}
```

```css
.skeleton-bar {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    var(--bg-card) 25%,
    var(--bg-card-raised) 50%,
    var(--bg-card) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  margin-bottom: var(--space-2);
}

.skeleton-bar--title {
  height: 20px;
  width: 60%;
  margin-bottom: var(--space-3);
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### 7.2 Optimistic UI Updates

When the student answers a quiz question, don't wait for IndexedDB to confirm the write before showing the result:

```typescript
function handleAnswerSelect(questionId: string, selectedIndex: number) {
  // 1. IMMEDIATELY update UI (optimistic)
  setShowResult(true);
  setSelectedAnswer(selectedIndex);
  
  const isCorrect = selectedIndex === question.correctIndex;
  setScore(s => ({
    correct: s.correct + (isCorrect ? 1 : 0),
    wrong: s.wrong + (isCorrect ? 0 : 1),
  }));
  
  // 2. Persist in background (non-blocking)
  batchWriter.write('progress', `forge_${sessionId}_${questionId}`, {
    questionId,
    selectedIndex,
    correct: isCorrect,
    timestamp: Date.now(),
  });
  
  // 3. Update mastery in background (non-blocking)
  if (isCorrect) {
    updateConceptMastery(question.conceptId, 0.1);
  }
}
```

The student sees the green/red result within 1 frame. The persist and mastery update happen asynchronously.

### 7.3 Progressive Content Loading

When loading a large ForgeBundle, don't wait for the entire bundle to load before showing anything. Load concepts first (they're small), show the concept scan immediately, then load questions in the background:

```typescript
async function loadForgeSession(chapterId: string) {
  // Phase 1: Load concepts (fast, small)
  const concepts = await db.get('concepts', chapterId);
  setConceptsReady(true); // UI can show Genesis immediately
  
  // Phase 2: Load questions in background
  requestIdleCallback(async () => {
    const questions = await db.get('questions', chapterId);
    setQuestionsReady(true); // Forge phase unlocks
  });
  
  // Phase 3: Load dilemmas, corruptions, etc.
  requestIdleCallback(async () => {
    const extras = await db.get('extras', chapterId);
    setExtrasReady(true); // Crucible, Architect, Transcend unlock
  });
}
```

The student can start Genesis (concept scan) while questions are still loading for Forge. By the time they finish Genesis, Forge is ready.

### 7.4 Instant View Transitions

Use the View Transitions API (available in Chrome) for silky route changes:

```typescript
// apps/web/src/navigation.ts
function navigateWithTransition(to: string) {
  if (document.startViewTransition) {
    document.startViewTransition(() => {
      navigate(to);
    });
  } else {
    navigate(to);
  }
}
```

```css
/* Define transition animations */
::view-transition-old(root) {
  animation: fadeOut 200ms ease-out;
}

::view-transition-new(root) {
  animation: fadeIn 300ms ease-out;
}

@keyframes fadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-4px); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 7.5 Prefetch on Hover

When the student hovers over a navigation pill, prefetch that route's data:

```typescript
function NavPill({ to, label }: { to: string; label: string }) {
  const prefetched = useRef(false);
  
  const handleHover = () => {
    if (!prefetched.current) {
      prefetched.current = true;
      prefetchForRoute(to);
      // Also trigger the lazy component import
      const routeImport = ROUTE_IMPORTS[to];
      if (routeImport) routeImport(); // starts loading the JS chunk
    }
  };
  
  return (
    <Link
      to={to}
      className="nav-pill"
      onMouseEnter={handleHover}
      onFocus={handleHover}
    >
      {label}
    </Link>
  );
}

const ROUTE_IMPORTS: Record<string, () => Promise<any>> = {
  '/timeline': () => import('./routes/Timeline'),
  '/concept-map': () => import('./routes/ConceptMap'),
  '/forge': () => import('./routes/NeuralForge'),
};
```

By the time they click, the route's JS chunk is already loaded and the data is already in the LRU cache.

### 7.6 Acceptance test

Navigate between all 5 main views. Each transition should feel instant (< 100ms from click to first content paint). During Neural Forge, answer 10 questions rapidly (< 1 second between answers). Results should appear within 1 frame of clicking an option. Loading a large textbook shows a skeleton immediately, then progressively fills in content.

---

## 8. PERFORMANCE MONITORING

### 8.1 Runtime Performance Metrics

Build a lightweight performance monitor that collects real metrics during use:

```typescript
// apps/web/src/perf/monitor.ts
interface PerfMetric {
  name: string;
  value: number;
  unit: 'ms' | 'fps' | 'bytes' | 'count';
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerfMetric[] = [];
  private frameTimestamps: number[] = [];
  
  // Track frame rate
  startFPSTracking() {
    let lastTimestamp = performance.now();
    
    const tick = (timestamp: number) => {
      this.frameTimestamps.push(timestamp - lastTimestamp);
      if (this.frameTimestamps.length > 120) this.frameTimestamps.shift(); // keep last 2 seconds
      lastTimestamp = timestamp;
      requestAnimationFrame(tick);
    };
    
    requestAnimationFrame(tick);
  }
  
  getCurrentFPS(): number {
    if (this.frameTimestamps.length === 0) return 60;
    const avg = this.frameTimestamps.reduce((a, b) => a + b, 0) / this.frameTimestamps.length;
    return Math.round(1000 / avg);
  }
  
  // Track operation durations
  time(name: string, fn: () => void) {
    const start = performance.now();
    fn();
    const duration = performance.now() - start;
    this.record(name, duration, 'ms');
  }
  
  async timeAsync(name: string, fn: () => Promise<void>) {
    const start = performance.now();
    await fn();
    const duration = performance.now() - start;
    this.record(name, duration, 'ms');
  }
  
  record(name: string, value: number, unit: PerfMetric['unit']) {
    this.metrics.push({ name, value, unit, timestamp: Date.now() });
    
    // Keep last 500 metrics
    if (this.metrics.length > 500) this.metrics.shift();
  }
  
  // Get summary for the performance panel
  getSummary(): Record<string, { avg: number; p95: number; max: number; unit: string }> {
    const grouped = new Map<string, PerfMetric[]>();
    for (const m of this.metrics) {
      const list = grouped.get(m.name) || [];
      list.push(m);
      grouped.set(m.name, list);
    }
    
    const summary: Record<string, any> = {};
    for (const [name, metrics] of grouped) {
      const values = metrics.map(m => m.value).sort((a, b) => a - b);
      summary[name] = {
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length * 100) / 100,
        p95: values[Math.floor(values.length * 0.95)] || 0,
        max: values[values.length - 1] || 0,
        unit: metrics[0].unit,
      };
    }
    
    return summary;
  }
}

export const perfMonitor = new PerformanceMonitor();
```

### 8.2 Performance Panel in Settings

Extend the performance benchmarks from the Competition Edge with live runtime metrics:

```
┌─────────────────────────────────────────────────────────────────┐
│  PERFORMANCE · LIVE RUNTIME                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  FRAME RATE                                                     │
│  Current: 60 fps  ·  Min (last 10s): 58 fps                    │
│  ████████████████████████████████████████████████  60fps         │
│                                                                 │
│  ROUTE TRANSITIONS                           avg    p95    max  │
│  Dashboard → Timeline .................... 42ms   67ms   89ms  │
│  Timeline → Concept Map ................. 38ms   55ms   72ms  │
│  Dashboard → Forge ...................... 51ms   78ms  104ms  │
│                                                                 │
│  ENGINE OPERATIONS                           avg    p95    max  │
│  Passage search ......................... 12ms   28ms   45ms  │
│  Echo Chamber match ..................... 8ms    18ms   31ms  │
│  Collision computation .................. 24ms   42ms   67ms  │
│  Mnemonic generation .................... 3ms     6ms   11ms  │
│  Question generation (per q) ............ 7ms    14ms   22ms  │
│                                                                 │
│  STORAGE                                     avg    p95    max  │
│  IndexedDB read ........................ 2ms     5ms    12ms  │
│  IndexedDB write (batched) ............. 8ms    15ms    23ms  │
│  LRU cache hit rate .................... 87%                    │
│                                                                 │
│  MEMORY                                                         │
│  JS Heap: 42 MB / 512 MB                                       │
│  DOM nodes: 847                                                 │
│  Event listeners: 234                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Performance Regression Detection

Add a CI step that runs the benchmark suite and fails if any metric regresses by more than 20%:

```typescript
// tests/perf.test.ts
import { describe, it, expect } from 'vitest';
import { processTextbook } from '../packages/content-engine/src';
import { sampleChapter } from '../fixtures/textbooks/ethics-utilitarianism-chapter';

describe('Performance benchmarks', () => {
  it('processes a textbook chapter in under 500ms', () => {
    const start = performance.now();
    const result = processTextbook(sampleChapter);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(500);
    expect(result.concepts.length).toBeGreaterThanOrEqual(8);
  });
  
  it('generates questions in under 200ms', () => {
    const bundle = processTextbook(sampleChapter);
    
    const start = performance.now();
    const questions = generateAllQuestions(bundle.concepts, bundle.sections);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(200);
    expect(questions.length).toBeGreaterThanOrEqual(20);
  });
  
  it('passage search returns in under 50ms', () => {
    const index = buildPassageIndex(sampleChapter);
    
    const start = performance.now();
    const results = index.search('utilitarianism objections', { limit: 5 });
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(50);
    expect(results.length).toBeGreaterThan(0);
  });
  
  it('SM-2 computes next interval in under 1ms', () => {
    const card = { interval: 6, easeFactor: 2.5, repetitions: 3 };
    
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      sm2(card, Math.floor(Math.random() * 6));
    }
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(10); // 1000 iterations < 10ms = < 0.01ms each
  });
});
```

---

## 9. STARTUP OPTIMIZATION

### 9.1 Critical Rendering Path

The first paint must happen in under 200ms. This means:

1. **Inline critical CSS** — the tokens and global styles are inlined in `<style>` in `index.html` so no CSS request blocks rendering
2. **Defer non-critical JS** — the main React bundle uses `<script type="module" async>`
3. **Preconnect to font CDN** — already in place from Section 1.5
4. **Service Worker caching** — cache static assets so return visits are instant

### 9.2 Service Worker for Offline + Instant Reload

```typescript
// apps/web/public/sw.js
const CACHE_NAME = 'aeonthra-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // Font preloads are handled by the browser
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', (event) => {
  // Cache-first for static assets
  if (event.request.url.includes('/assets/') || event.request.url.endsWith('.js') || event.request.url.endsWith('.css')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }
  
  // Network-first for HTML (in case of updates)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
```

Register in the app:

```typescript
// apps/web/src/main.tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}
```

### 9.3 Acceptance test

Open the app. First Contentful Paint should be < 500ms (check Lighthouse). Return visit should be < 200ms (cached by service worker). Disconnect network (DevTools → Network → Offline). Reload the page. The app should load from service worker cache and function fully (all data is in IndexedDB).

---

## 10. ACCEPTANCE CHECKLIST

Before declaring the performance pass complete, verify every item:

### Bundle
- [ ] Initial load < 160 KB gzipped
- [ ] Each route chunk < 40 KB gzipped
- [ ] pdf.js loads only when PDF is uploaded
- [ ] docx library loads only when exporting .docx
- [ ] Dictionary bundle loads only when content engine runs
- [ ] Fonts load non-blocking with `font-display: swap`
- [ ] Adjacent routes preload on hover

### Storage
- [ ] LRU cache serves repeated queries in < 0.1ms
- [ ] IndexedDB writes are batched (< 5 transactions per second under rapid interaction)
- [ ] Data prefetches on route navigation via `requestIdleCallback`
- [ ] No redundant IndexedDB reads (data stays in memory once loaded)

### Memory
- [ ] Heap growth < 20 MB over 5 minutes of heavy use
- [ ] No detached DOM node leaks
- [ ] Physics simulation uses object pooling (zero GC allocations per frame)
- [ ] Large indices use WeakRef for auto-cleanup under memory pressure

### Computation
- [ ] All content engine work runs in Web Workers (never on main thread)
- [ ] Worker communication uses the RPC protocol
- [ ] Long computations yield every 100 iterations
- [ ] Expensive functions are memoized (stemmer, tokenizer, Jaccard)
- [ ] Passage index is persisted and reused across sessions

### Rendering
- [ ] Lists with 50+ items use virtual scrolling
- [ ] Every list/grid component is `React.memo` with narrow selectors
- [ ] Concept Map and Gravity Field use `<canvas>` rendering
- [ ] Images load lazily with `loading="lazy"`
- [ ] No component re-renders without relevant data changes (verify with React DevTools Profiler)

### Animation
- [ ] All animations use GPU compositing (`transform`, `opacity` only)
- [ ] No layout-triggering properties animated (`width`, `height`, `top`, `left`, `margin`)
- [ ] Single RAF loop shared by all animation systems
- [ ] CSS containment applied to independent regions
- [ ] No forced reflows in any animation path

### Perceived Performance
- [ ] Every view has a skeleton screen that renders in < 1ms
- [ ] Quiz answers show results optimistically (before persist)
- [ ] ForgeBundle loads progressively (concepts first, then questions)
- [ ] View Transitions API used for route changes (Chrome)
- [ ] Route data prefetches on nav pill hover

### Metrics
- [ ] Frame rate stays at 60fps during all interactions
- [ ] Route transitions complete in < 100ms
- [ ] Passage search returns in < 50ms
- [ ] Content engine processes one chapter in < 500ms
- [ ] Total question generation < 200ms per chapter
- [ ] SM-2 computation < 0.01ms per card

### Startup
- [ ] First Contentful Paint < 500ms
- [ ] Service worker caches static assets
- [ ] Return visits load in < 200ms
- [ ] App works offline after first visit
- [ ] Critical CSS is inlined

---

## 11. THE PERFORMANCE PROMISE

When this pass is complete, AEONTHRA will feel like a native application. Not "good for a web app" — genuinely indistinguishable from a native desktop tool in responsiveness.

Every frame renders in 16ms. Every interaction responds in one frame. Every route loads before the student's finger leaves the trackpad. Every engine completes before the student notices it started. The concept map runs at 60fps with 200 nodes. The timeline scrolls like glass. Neural Forge phase transitions feel weightless.

The student never waits. The student never sees a spinner (only skeletons that dissolve into content). The student never feels lag between thought and action. The interface responds at the speed of intention.

That's the performance bar. Build to it. Measure against it. Ship when you hit it.
