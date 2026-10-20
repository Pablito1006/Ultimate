import { en, type MessageKey } from "./locales/en";
import { fr } from "./locales/fr";

export type Locale = "en" | "fr";

const catalogs: Record<Locale, Record<MessageKey, string>> = {
  en: { ...en },
  fr: { ...fr },
};

/**
 * Lightweight i18n — FR/EN catalogs (WP13).
 * Missing keys fall back to English.
 */
export class I18nService {
  private locale: Locale = "en";

  setLocale(locale: Locale): void {
    this.locale = locale === "fr" ? "fr" : "en";
  }

  getLocale(): Locale {
    return this.locale;
  }

  t(key: MessageKey, fallback?: string): string {
    const catalog = catalogs[this.locale];
    return catalog[key] ?? catalogs.en[key] ?? fallback ?? key;
  }

  /** All keys present in both catalogs (for tests). */
  keys(): MessageKey[] {
    return Object.keys(en) as MessageKey[];
  }
}

export const i18n = new I18nService();
