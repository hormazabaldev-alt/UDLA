"use client";

const CHANNEL_NAME = "powerbi-web:dataset-sync";
const STORAGE_KEY = "powerbi-web:dataset-updated-at";

type UpdateHandler = () => void;

export function broadcastDatasetUpdated() {
  if (typeof window === "undefined") return;

  const timestamp = String(Date.now());
  window.localStorage.setItem(STORAGE_KEY, timestamp);

  if ("BroadcastChannel" in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage({ type: "dataset-updated", timestamp });
    channel.close();
  }
}

export function subscribeDatasetUpdates(handler: UpdateHandler) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  let channel: BroadcastChannel | null = null;

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    handler();
  };

  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.addEventListener("message", (event) => {
      if (event.data?.type === "dataset-updated") {
        handler();
      }
    });
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    channel?.close();
  };
}
