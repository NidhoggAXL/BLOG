<script setup lang="ts">
const model = defineModel<number>({ required: true })

const props = withDefaults(
  defineProps<{
    label: string
    /** 有界模式下的滑块/输入范围；unbounded 时忽略 */
    min?: number
    max?: number
    step?: number
    format?: (v: number) => string
    showInput?: boolean
    /** 仅在悬浮/拖动/编辑时显示右侧数值输入 */
    showInputOnHover?: boolean
    /** 测试模式：仅数字输入，不限制上下界、不显示滑块 */
    unbounded?: boolean
  }>(),
  { step: 0.01, showInput: true, showInputOnHover: false, unbounded: false, min: 0, max: 100 },
)

const emit = defineEmits<{
  dragStart: []
  dragEnd: []
}>()

const active = ref(false)
const inputText = ref('')
const editing = ref(false)

const bounded = computed(() => !props.unbounded)

function roundToStep(n: number): number {
  const s = props.step
  if (!s || s <= 0) return n
  const rounded = Math.round(n / s) * s
  const decimals = String(s).includes('.')
    ? (String(s).split('.')[1]?.length ?? 0)
    : 0
  return Number(rounded.toFixed(decimals))
}

function clamp(n: number): number {
  return roundToStep(Math.min(props.max!, Math.max(props.min!, n)))
}

function formatValue(v: number): string {
  if (props.format) return props.format(v)
  if (props.unbounded) return String(v)
  if (Number.isInteger(props.step) || props.step >= 1) return String(Math.round(v))
  return v.toFixed(2)
}

function syncInputFromModel() {
  if (!editing.value) inputText.value = formatValue(model.value)
}

watch(() => model.value, syncInputFromModel, { immediate: true })

const thumbPercent = computed(() => {
  if (!bounded.value) return 50
  const span = props.max! - props.min!
  if (span <= 0) return 50
  return ((model.value - props.min!) / span) * 100
})

function applyModel(n: number) {
  if (!Number.isFinite(n)) return
  const next = props.unbounded ? n : clamp(n)
  if (next !== model.value) model.value = next
  else syncInputFromModel()
}

function onSliderInput() {
  active.value = true
  syncInputFromModel()
}

function onPointerDown() {
  active.value = true
  emit('dragStart')
}

function onPointerUp() {
  active.value = false
  emit('dragEnd')
}

function onTrackLeave() {
  if (!editing.value) active.value = false
}

function onNumberFocus() {
  editing.value = true
  emit('dragStart')
}

function onNumberInput() {
  const raw = inputText.value.trim()
  if (raw === '' || raw === '-') return
  const n = Number(raw)
  if (!Number.isFinite(n)) return
  applyModel(n)
}

function commitNumberInput() {
  const raw = inputText.value.trim()
  if (raw === '' || raw === '-') {
    syncInputFromModel()
    emit('dragEnd')
    editing.value = false
    return
  }
  const n = Number(raw)
  if (!Number.isFinite(n)) {
    syncInputFromModel()
  } else {
    applyModel(n)
  }
  editing.value = false
  emit('dragEnd')
}

function onNumberKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    ;(e.target as HTMLInputElement).blur()
  }
}
</script>

<template>
  <div class="g-slider">
    <div class="g-slider__head">
      <p class="g-slider__label">{{ label }}</p>
      <input
        v-if="showInput"
        v-model="inputText"
        class="g-slider__number"
        :class="{
          'g-slider__number--hover-only': showInputOnHover,
          'g-slider__number--shown': !showInputOnHover || active || editing,
          'g-slider__number--wide': unbounded,
        }"
        type="text"
        inputmode="decimal"
        :aria-label="`${label} 数值`"
        :placeholder="unbounded ? '任意数值' : undefined"
        @focus="onNumberFocus"
        @input="onNumberInput"
        @blur="commitNumberInput"
        @keydown="onNumberKeydown"
      />
    </div>
    <div
      v-if="bounded"
      class="g-slider__track-wrap"
      :class="{ 'g-slider__track-wrap--hover-tip': !showInput }"
      @pointerenter="active = true"
      @pointerleave="onTrackLeave"
    >
      <span
        v-show="active && !showInput"
        class="g-slider__tip"
        :style="{ left: `${thumbPercent}%` }"
      >
        {{ formatValue(model) }}
      </span>
      <input
        v-model.number="model"
        class="g-slider__range"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        @input="onSliderInput"
        @pointerdown="onPointerDown"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
.g-slider {
  margin-bottom: 14px;

  &:hover .g-slider__number--hover-only,
  &:focus-within .g-slider__number--hover-only {
    opacity: 1;
    pointer-events: auto;
  }
}

.g-slider__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.g-slider:has(.g-slider__track-wrap) .g-slider__head {
  margin-bottom: 8px;
}

.g-slider:not(:has(.g-slider__track-wrap)) .g-slider__head {
  margin-bottom: 0;
}

.g-slider__label {
  margin: 0;
  flex: 1;
  min-width: 0;
  font-size: 12px;
  text-align: left;
  color: var(--graph-panel-text);
  line-height: 1.35;
}

.g-slider__number {
  flex-shrink: 0;
  width: 64px;
  padding: 4px 6px;
  border: 1px solid var(--graph-panel-border, rgba(255, 255, 255, 0.12));
  border-radius: 5px;
  background: color-mix(in srgb, var(--graph-panel-hover, rgba(255, 255, 255, 0.04)) 80%, transparent);
  color: var(--graph-panel-text);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  outline: none;
  transition: opacity 0.15s ease;

  &--wide {
    width: 88px;
  }

  &--hover-only {
    opacity: 0;
    pointer-events: none;
  }

  &--shown {
    opacity: 1;
    pointer-events: auto;
  }

  &:focus {
    border-color: color-mix(in srgb, var(--graph-panel-accent, #e8704f) 55%, transparent);
  }

  &::placeholder {
    font-size: 10px;
    color: var(--graph-panel-muted, rgba(232, 234, 239, 0.35));
  }
}

.g-slider__track-wrap {
  position: relative;
  padding-top: 0;

  &--hover-tip {
    padding-top: 22px;
    margin-top: -22px;
  }
}

.g-slider__tip {
  position: absolute;
  top: -20px;
  z-index: 2;
  transform: translateX(-50%);
  padding: 2px 6px;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--graph-panel-text);
  white-space: nowrap;
  pointer-events: none;
}

.g-slider__range {
  display: block;
  width: 100%;
  height: 4px;
  margin: 0;
  appearance: none;
  border-radius: 2px;
  background: color-mix(in srgb, var(--graph-panel-text) 18%, transparent);
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border: none;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    cursor: grab;
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border: none;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
    cursor: grab;
  }

  &:active::-webkit-slider-thumb {
    cursor: grabbing;
  }
}
</style>
