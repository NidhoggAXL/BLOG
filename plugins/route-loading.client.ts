export default defineNuxtPlugin((nuxtApp) => {
  const { startRouteLoading, stopRouteLoading } = useRouteLoading();

  nuxtApp.hook("page:start", () => {
    startRouteLoading();
  });

  nuxtApp.hook("page:finish", () => {
    stopRouteLoading();
  });

  nuxtApp.hook("app:error", () => {
    stopRouteLoading();
  });
});
