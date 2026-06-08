export default defineNuxtPlugin(() => {
  const theme = useAppTheme();

  useHead(() => ({
    htmlAttrs: theme.htmlAttrs.value,
  }));

  if (import.meta.client) {
    theme.initClient();
  }
});
