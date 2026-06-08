<script setup lang="ts">
const model = defineModel<boolean>({ required: true })

const props = defineProps<{
  label: string
}>()
</script>

<template>
  <label class="g-switch">
    <span class="g-switch__label">{{ props.label }}</span>
    <button
      type="button"
      class="g-switch__track"
      :class="{ 'g-switch__track--on': model }"
      role="switch"
      :aria-checked="model"
      @click="model = !model"
    >
      <span class="g-switch__thumb" />
    </button>
  </label>
</template>

<style scoped lang="less">
.g-switch {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.g-switch__label {
  font-size: 13px;
  color: var(--graph-panel-text);
  line-height: 1.4;
}

.g-switch__track {
  position: relative;
  flex-shrink: 0;
  width: 40px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 11px;
  background: color-mix(in srgb, var(--graph-panel-text) 22%, transparent);
  cursor: pointer;
  transition: background 0.2s ease;

  &--on {
    background: color-mix(in srgb, var(--graph-panel-accent) 85%, #000);
  }
}

.g-switch__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease;

  .g-switch__track--on & {
    transform: translateX(18px);
  }
}
</style>
