/** 全站路由切换与手动任务加载状态（驱动遮罩层） */

const routeLoading = ref(false);
const taskLoadingCount = ref(0);

export function useRouteLoading() {
  const isLoading = computed(
    () => routeLoading.value || taskLoadingCount.value > 0,
  );

  function startRouteLoading() {
    routeLoading.value = true;
  }

  function stopRouteLoading() {
    routeLoading.value = false;
  }

  function startTask() {
    taskLoadingCount.value += 1;
  }

  function stopTask() {
    taskLoadingCount.value = Math.max(0, taskLoadingCount.value - 1);
  }

  async function withTask<T>(fn: () => Promise<T>): Promise<T> {
    startTask();
    try {
      return await fn();
    } finally {
      stopTask();
    }
  }

  return {
    isLoading,
    routeLoading: readonly(routeLoading),
    taskLoadingCount: readonly(taskLoadingCount),
    startRouteLoading,
    stopRouteLoading,
    startTask,
    stopTask,
    withTask,
  };
}
