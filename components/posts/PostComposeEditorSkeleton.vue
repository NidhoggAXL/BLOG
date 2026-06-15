<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string;
  }>(),
  {
    label: "正在加载编辑器…",
  },
);
</script>

<template>
  <div class="post-compose-page__main post-compose-page__main--boot">
    <div class="post-compose-page__stage post-compose-page__stage--boot">
      <div class="post-compose-editor-boot" role="status" aria-live="polite">
        <div
          class="route-loading-spinner post-compose-editor-boot__spinner"
          aria-hidden="true"
        />
        <p class="post-compose-editor-boot__label">{{ label }}</p>
      </div>
    </div>
  </div>
</template>
