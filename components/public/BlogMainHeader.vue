<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="main-header">
    <h1 class="main-title">{{ title }}</h1>
    <p v-if="subtitle" class="main-subtitle">{{ subtitle }}</p>
  </header>
</template>

<style scoped lang="less">
@import '~/assets/less/_tokens.less';

.main-header {
  margin-bottom: 1.5rem;
}

.main-title {
  margin: 0 0 0.35rem;
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--text);
}

.main-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
}
</style>
