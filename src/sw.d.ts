/// <reference lib="webworker" />

// Extend ServiceWorkerGlobalScope with Workbox types
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

// Sync event (Background Sync API)
interface SyncEvent extends ExtendableEvent {
  tag: string;
  lastChance: boolean;
}

// Extend ServiceWorkerGlobalScopeEventMap
declare global {
  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
  }
}

export {};
