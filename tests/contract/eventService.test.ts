import { afterEach, describe, expect, it } from "vitest";
import { setPremiereModuleForTests } from "../../src/premiere/adapters/premiereModule";
import { eventService } from "../../src/premiere/events/EventService";
import { installFakePremiere, type InstalledFakePremiere } from "../../src/testing/fakePremiere";

describe("EventService coverage", () => {
  let fake: InstalledFakePremiere | undefined;

  afterEach(async () => {
    await eventService.clearAll();
    fake?.uninstall();
    fake = undefined;
  });

  it("reports unavailable without premiere module", () => {
    setPremiereModuleForTests(null);
    expect(eventService.isAvailable()).toBe(false);
    expect(eventService.subscribeGlobal("X", () => undefined)).toBeNull();
  });

  it("subscribeProject without project returns null", async () => {
    fake = installFakePremiere({ project: null });
    const id = await eventService.subscribeProject("OPENED", () => undefined);
    expect(id).toBeNull();
  });

  it("unsubscribe project and sequence paths", async () => {
    fake = installFakePremiere();
    const pid = await eventService.subscribeProject("DIRTY", () => undefined);
    const sid = await eventService.subscribeSequence("CLOSED", () => undefined);
    expect(pid && sid).toBeTruthy();
    expect(await eventService.unsubscribe(pid!)).toBe(true);
    expect(await eventService.unsubscribe(sid!)).toBe(true);
    expect(eventService.listSubscriptions()).toHaveLength(0);
  });

  it("subscribeSequence when available", async () => {
    fake = installFakePremiere();
    const id = await eventService.subscribeSequence("ACTIVATED", () => undefined);
    expect(id).toBeTruthy();
    await eventService.clearAll();
  });
});
