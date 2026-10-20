import { describe, expect, it } from "vitest";
import { I18nService } from "../../src/i18n/I18nService";
import { en } from "../../src/i18n/locales/en";
import { fr } from "../../src/i18n/locales/fr";

describe("i18n", () => {
  it("FR catalog has every EN key", () => {
    const enKeys = Object.keys(en).sort();
    const frKeys = Object.keys(fr).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("switches locale and translates", () => {
    const svc = new I18nService();
    svc.setLocale("en");
    expect(svc.t("nav.settings")).toBe("Settings");
    svc.setLocale("fr");
    expect(svc.t("nav.settings")).toBe("Paramètres");
    expect(svc.t("dashboard.limitsTitle")).toContain("MasterMotion");
  });

  it("falls back to English for unknown locale coercion", () => {
    const svc = new I18nService();
    svc.setLocale("fr");
    svc.setLocale("en");
    expect(svc.getLocale()).toBe("en");
    expect(svc.t("app.name")).toBe("MasterMotion");
  });
});
