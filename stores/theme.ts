import { defineStore } from "pinia";

export type ThemePreference = import("~/composables/useAppTheme").SiteThemePreference;

/** @deprecated 请使用 useAppTheme；保留以兼容现有组件 */
export const useThemeStore = defineStore("theme", () => {
  const site = useAppTheme();

  return {
    preference: site.preference,
    resolvedTheme: site.resolvedTheme,
    htmlClass: computed(() => site.htmlAttrs.value.class),
    systemIsDark: site.systemIsDark,
    setPreference: site.setPreference,
    toggleLightDark: site.toggleLightDark,
    initClient: site.initClient,
    disposeClient: site.disposeClient,
  };
});
