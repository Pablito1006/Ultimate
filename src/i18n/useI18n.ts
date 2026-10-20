import { useEffect, useState } from "react";
import { settingsService } from "../services/storage/SettingsService";
import { i18n, type Locale } from "./I18nService";
import type { MessageKey } from "./locales/en";

export function useI18n(): {
  locale: Locale;
  t: (key: MessageKey, fallback?: string) => string;
  setLocale: (locale: Locale) => Promise<void>;
} {
  const [locale, setLocaleState] = useState<Locale>(i18n.getLocale());

  useEffect(() => {
    void settingsService.load().then((s) => {
      const loc = s.language === "fr" ? "fr" : "en";
      i18n.setLocale(loc);
      setLocaleState(loc);
    });
  }, []);

  return {
    locale,
    t: (key, fallback) => i18n.t(key, fallback),
    setLocale: async (next) => {
      i18n.setLocale(next);
      setLocaleState(next);
      await settingsService.update({ language: next });
    },
  };
}
