import type { CookieRef } from "#app";

export type BlogTheme = "light" | "dark";
export type SiteThemePreference = BlogTheme | "system";

const COOKIE_NAME = "blog-theme";
const LEGACY_COOKIE = "theme-pref";

export function useAppTheme() {
  const preference = useCookie<SiteThemePreference>(COOKIE_NAME, {
    default: () => "light",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  const systemIsDark = useState("site-theme-system-dark", () => false);

  let media: MediaQueryList | null = null;
  const onMediaChange = () => {
    if (!import.meta.client) return;
    systemIsDark.value = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
  };

  const resolvedTheme = computed<BlogTheme>(() => {
    const pref = preference.value ?? "light";
    if (pref === "light" || pref === "dark") return pref;
    if (import.meta.server) return "light";
    return systemIsDark.value ? "dark" : "light";
  });

  const isDark = computed(() => resolvedTheme.value === "dark");

  const htmlAttrs = computed(() => {
    const mode = resolvedTheme.value;
    return {
      "data-theme": mode,
      class: mode === "dark" ? "theme-dark dark" : "theme-light",
      lang: "zh-CN",
    };
  });

  function setPreference(next: SiteThemePreference) {
    preference.value = next;
  }

  function setTheme(next: BlogTheme) {
    preference.value = next;
  }

  function toggleTheme() {
    preference.value = isDark.value ? "light" : "dark";
  }

  function toggleLightDark() {
    toggleTheme();
  }

  function initClient() {
    if (!import.meta.client) return;
    migrateLegacyCookie();
    onMediaChange();
    media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", onMediaChange);
  }

  function disposeClient() {
    media?.removeEventListener("change", onMediaChange);
    media = null;
  }

  function migrateLegacyCookie() {
    const current = preference.value;
    if (current && current !== "system") return;
    const legacy = useCookie<SiteThemePreference | null>(LEGACY_COOKIE, {
      default: () => null,
    });
    if (!legacy.value) return;
    preference.value = legacy.value;
    legacy.value = null;
  }

  return {
    preference: preference as CookieRef<SiteThemePreference>,
    theme: preference as CookieRef<SiteThemePreference>,
    resolvedTheme,
    isDark,
    htmlAttrs,
    systemIsDark,
    setPreference,
    setTheme,
    toggleTheme,
    toggleLightDark,
    initClient,
    disposeClient,
  };
}
