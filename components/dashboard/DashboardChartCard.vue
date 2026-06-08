<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  index?: number
}>()
</script>

<template>
  <section
    class="admin-card admin-card--pad dashboard-chart-card dashboard-enter"
    :style="{ '--dashboard-i': index ?? 0 }"
  >
    <header class="dashboard-chart-card__head">
      <h3 class="dashboard-chart-card__title">{{ title }}</h3>
      <p v-if="subtitle" class="dashboard-chart-card__subtitle">{{ subtitle }}</p>
    </header>
    <div class="dashboard-chart-card__body">
      <slot />
    </div>
  </section>
</template>
