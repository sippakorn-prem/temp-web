import * as React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDealEvents } from "./use-deals";

class FakeEventSource {
  static instances: FakeEventSource[] = [];
  listeners = new Map<string, Set<EventListener>>();
  close = vi.fn();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string) {
    for (const listener of this.listeners.get(type) ?? []) listener(new Event(type));
  }
}

describe("useDealEvents", () => {
  afterEach(() => {
    FakeEventSource.instances = [];
    vi.unstubAllGlobals();
  });

  it("invalidates authoritative deal data and closes the stream on cleanup", () => {
    vi.stubGlobal("EventSource", FakeEventSource);
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, "invalidateQueries").mockResolvedValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { unmount } = renderHook(() => useDealEvents("SD-ABC123"), { wrapper });
    const source = FakeEventSource.instances[0];
    expect(source.url).toBe("/api/deals/SD-ABC123/events");

    source.emit("deal.updated");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["deal", "SD-ABC123"] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["deals"] });

    unmount();
    expect(source.close).toHaveBeenCalledOnce();
  });
});
