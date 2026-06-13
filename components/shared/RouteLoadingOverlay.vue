<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    show?: boolean;
    label?: string;
  }>(),
  {
    show: false,
    label: "正在加载",
  },
);

const { isLoading } = useRouteLoading();
const visible = computed(() => props.show || isLoading.value);
</script>

<template>
  <Transition name="route-loading-fade">
    <div
      v-if="visible"
      class="route-loading-overlay"
      role="status"
      aria-live="polite"
      aria-busy="true"
      :aria-label="label"
    >
      <div class="route-loading-overlay__panel">
        <div
          class="route-loading-spinner route-loading-overlay__spinner"
          aria-hidden="true"
        />
        <p class="route-loading-overlay__label">{{ label }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.route-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--bg) 55%, transparent);
  backdrop-filter: blur(2px);
  pointer-events: all;
}

.route-loading-overlay__panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  min-width: 120px;
  padding: 20px 24px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  box-shadow: var(--card-shadow);
}

.route-loading-overlay__spinner {
  width: 28px;
  height: 28px;
  border-width: 3px;
}

.route-loading-overlay__label {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

.route-loading-fade-enter-active,
.route-loading-fade-leave-active {
  transition: opacity 0.18s ease;
}

.route-loading-fade-enter-from,
.route-loading-fade-leave-to {
  opacity: 0;
}
</style>
