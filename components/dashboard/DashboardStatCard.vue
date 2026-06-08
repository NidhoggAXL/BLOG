<script setup lang="ts">
const props = defineProps<{
  label: string
  value: number
  hint?: string
  index?: number
}>()

const valueRef = computed(() => props.value)
const display = useCountUp(valueRef)
</script>

<template>
  <section
    class="admin-card admin-card--pad dashboard-stat dashboard-enter"
    :style="{ '--dashboard-i': index ?? 0 }"
  >
    <span class="dashboard-stat__label">{{ label }}</span>
    <span class="dashboard-stat__value">{{ display }}</span>
    <span v-if="hint" class="dashboard-stat__hint">{{ hint }}</span>
  </section>
</template>
