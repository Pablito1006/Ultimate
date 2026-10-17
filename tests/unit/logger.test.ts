import { afterEach, describe, expect, it, vi } from "vitest";
import { Logger } from "../../src/core/logging/Logger";

describe("Logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Logger.configure({ environment: "development", minLevel: "debug" });
  });

  it("redacts sensitive keys", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    Logger.info("config", { apiKey: "secret-value", provider: "mock" });
    expect(spy).toHaveBeenCalled();
    const meta = spy.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(meta.apiKey).toBe("[REDACTED]");
    expect(meta.provider).toBe("mock");
  });

  it("suppresses debug in production", () => {
    Logger.configure({ environment: "production" });
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    Logger.debug("should not appear");
    expect(spy).not.toHaveBeenCalled();
  });
});
