<script setup lang="ts">
import { Close, RefreshLeft, Search } from '@element-plus/icons-vue'
import GraphSettingSlider from '~/components/graph/GraphSettingSlider.vue'
import GraphSettingSwitch from '~/components/graph/GraphSettingSwitch.vue'
import GraphSettingsGroup from '~/components/graph/GraphSettingsGroup.vue'
import type { GraphForceSettings } from '~/types/graph'
import { GRAPH_FORCE_SLIDER_RANGES } from '~/types/graph'

const forces = defineModel<GraphForceSettings>({ required: true })

type GraphSearchSuggestion = {
  value: string
  label: string
  kind: 'operator' | 'path' | 'file'
}

const props = withDefaults(defineProps<{
  fetchError?: string | null
  searchSuggestions?: GraphSearchSuggestion[]
}>(), {
  searchSuggestions: () => [],
})

const emit = defineEmits<{
  close: []
  reset: []
  animate: []
  dragStart: []
  dragEnd: []
}>()
const searchAutocompleteRef = ref<{
  focus?: () => void
  blur?: () => void
} | null>(null)

function onDragStart() {
  emit('dragStart')
}

function onDragEnd() {
  emit('dragEnd')
}

const searchInput = computed({
  get() {
    return forces.value.searchQuery
  },
  set(rawValue: string) {
    forces.value.searchQuery = rawValue
  },
})

function onClearSearch() {
  forces.value.searchQuery = ''
}

function onPickSuggestion(item: Record<string, unknown>) {
  const value = typeof item.value === 'string' ? item.value : ''
  const kind = item.kind === 'operator' ? 'operator' : 'other'
  if (!value) return
  forces.value.searchQuery = value
  if (kind === 'operator') {
    nextTick(() => {
      searchAutocompleteRef.value?.blur?.()
      requestAnimationFrame(() => {
        searchAutocompleteRef.value?.focus?.()
      })
    })
  }
}

function fetchSearchSuggestions(
  _queryString: string,
  cb: (results: GraphSearchSuggestion[]) => void,
) {
  cb(props.searchSuggestions)
}
</script>

<template>
  <aside class="graph-settings-panel" aria-label="图谱设置" @click.stop>
    <div class="graph-settings-panel__scroll">
      <p v-if="fetchError" class="graph-settings-panel__error">{{ fetchError }}</p>

      <GraphSettingsGroup title="筛选" :default-open="true">
      <template #actions>
        <div class="graph-settings-panel__head-actions">
          <button
            type="button"
            class="graph-settings-panel__head-action"
            aria-label="恢复默认"
            @click.stop="emit('reset')"
          >
            <el-icon :size="13"><RefreshLeft /></el-icon>
          </button>
          <button
            type="button"
            class="graph-settings-panel__head-action"
            aria-label="关闭设置"
            @click.stop="emit('close')"
          >
            <el-icon :size="13"><Close /></el-icon>
          </button>
        </div>
      </template>
      <div class="graph-settings-panel__filter-block">
        <GraphSettingSwitch v-model="forces.showOrphans" label="显示孤立文件" />
        <el-autocomplete
          ref="searchAutocompleteRef"
          v-model="searchInput"
          clearable
          size="small"
          :prefix-icon="Search"
          :trigger-on-focus="true"
          :fetch-suggestions="fetchSearchSuggestions"
          popper-class="graph-settings-panel__search-popper"
          placeholder="搜索文件（支持 path: / file:）"
          class="graph-settings-panel__search-input"
          @clear="onClearSearch"
          @select="onPickSuggestion"
        >
          <template #default="{ item }">
            <span class="graph-settings-panel__search-suggest-label">{{ item.label }}</span>
          </template>
        </el-autocomplete>
      </div>
    </GraphSettingsGroup>

    <GraphSettingsGroup title="外观" :default-open="true">
      <GraphSettingSwitch v-model="forces.showArrow" label="箭头" />
      <GraphSettingSlider
        v-model="forces.textFadeMultiplier"
        label="文本透明度"
        :show-input-on-hover="true"
        :min="-3"
        :max="3"
        :step="0.1"
        :format="(v) => v.toFixed(1)"
      />
      <GraphSettingSlider
        v-model="forces.nodeSizeMultiplier"
        label="节点大小"
        :show-input-on-hover="true"
        :min="0.25"
        :max="2"
        :step="0.05"
        :format="(v) => v.toFixed(2)"
      />
      <GraphSettingSlider
        v-model="forces.lineSizeMultiplier"
        label="连线粗细"
        :show-input-on-hover="true"
        :min="0.25"
        :max="2"
        :step="0.05"
        :format="(v) => v.toFixed(2)"
      />
      <button type="button" class="graph-settings-panel__animate" @click="emit('animate')">
        播放动画
      </button>
    </GraphSettingsGroup>

    <GraphSettingsGroup title="力度" :default-open="true">
      <GraphSettingSlider
        v-model="forces.centerStrength"
        label="图谱向心力"
        :show-input="false"
        :min="GRAPH_FORCE_SLIDER_RANGES.centerStrength.min"
        :max="GRAPH_FORCE_SLIDER_RANGES.centerStrength.max"
        :step="GRAPH_FORCE_SLIDER_RANGES.centerStrength.step"
        :format="(v) => v.toFixed(2)"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
      />
      <GraphSettingSlider
        v-model="forces.repelStrength"
        label="节点间的排斥力"
        :show-input="false"
        :min="GRAPH_FORCE_SLIDER_RANGES.repelStrength.min"
        :max="GRAPH_FORCE_SLIDER_RANGES.repelStrength.max"
        :step="GRAPH_FORCE_SLIDER_RANGES.repelStrength.step"
        :format="(v) => String(Math.round(v))"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
      />
      <GraphSettingSlider
        v-model="forces.linkStrength"
        label="相连节点间的吸引力"
        :show-input="false"
        :min="GRAPH_FORCE_SLIDER_RANGES.linkStrength.min"
        :max="GRAPH_FORCE_SLIDER_RANGES.linkStrength.max"
        :step="GRAPH_FORCE_SLIDER_RANGES.linkStrength.step"
        :format="(v) => v.toFixed(2)"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
      />
      <GraphSettingSlider
        v-model="forces.linkDistance"
        label="连线长度"
        :show-input="false"
        :min="GRAPH_FORCE_SLIDER_RANGES.linkDistance.min"
        :max="GRAPH_FORCE_SLIDER_RANGES.linkDistance.max"
        :step="GRAPH_FORCE_SLIDER_RANGES.linkDistance.step"
        :format="(v) => String(Math.round(v))"
        @drag-start="onDragStart"
        @drag-end="onDragEnd"
      />
    </GraphSettingsGroup>
    </div>
  </aside>
</template>

<style scoped lang="less">
.graph-settings-panel {
  --graph-panel-bg: var(--admin-toolbar-bg, rgba(18, 21, 31, 0.94));
  --graph-panel-text: var(--admin-text, #e8eaef);
  --graph-panel-muted: var(--admin-muted, rgba(232, 234, 239, 0.45));
  --graph-panel-accent: var(--accent, #e8704f);
  --graph-panel-border: var(--admin-border, rgba(255, 255, 255, 0.1));
  --graph-panel-hover: var(--admin-nav-hover, rgba(255, 255, 255, 0.04));

  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  width: 248px;
  max-height: min(88dvh, calc(100dvh - 80px));
  border-radius: 10px;
  border: 1px solid var(--graph-panel-border);
  background: var(--graph-panel-bg);
  color: var(--graph-panel-text);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.graph-settings-panel__scroll {
  flex: 1;
  min-height: 0;
  padding: 12px 14px 14px;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
}

.graph-settings-panel__error {
  margin: 0 0 10px;
  padding-right: 4px;
  font-size: 11px;
  color: #e85d5d;
}

.graph-settings-panel__hint {
  margin: 0 0 10px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--graph-panel-muted);

  &--compact {
    margin-bottom: 8px;
  }

  kbd {
    display: inline-block;
    padding: 1px 5px;
    border-radius: 4px;
    border: 1px solid var(--graph-panel-border);
    font-size: 10px;
    font-family: inherit;
    background: var(--graph-panel-hover);
  }
}

.graph-settings-panel__head-actions {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.graph-settings-panel__head-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--graph-panel-muted);
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: var(--graph-panel-text);
    background: var(--graph-panel-hover);
  }
}

.graph-settings-panel__animate {
  display: block;
  width: 100%;
  margin: 4px 0 4px;
  padding: 10px 12px;
  border: none;
  border-radius: 6px;
  background: var(--graph-panel-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: filter 0.15s ease;

  &:hover {
    filter: brightness(1.06);
  }
}

.graph-settings-panel__filter-block {
  display: grid;
  gap: 10px;
  margin-top: 6px;
}

.graph-settings-panel__search-input {
  width: 100%;
}

.graph-settings-panel__search-suggest-label {
  display: block;
  width: 100%;
  font-size: 12px;
  line-height: 1.45;
  word-break: break-all;
}

:deep(.graph-settings-panel__search-popper.el-popper) {
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--graph-panel-border) 92%, #fff 8%);
  background: color-mix(in srgb, var(--graph-panel-bg) 96%, #000 4%);
  box-shadow:
    0 14px 36px rgba(0, 0, 0, 0.42),
    0 1px 0 rgba(255, 255, 255, 0.05) inset;
  backdrop-filter: blur(10px);
}

:deep(.graph-settings-panel__search-popper .el-popper__arrow::before) {
  background: color-mix(in srgb, var(--graph-panel-bg) 96%, #000 4%);
  border-color: color-mix(in srgb, var(--graph-panel-border) 92%, #fff 8%);
}

:deep(.graph-settings-panel__search-popper .el-autocomplete-suggestion__wrap) {
  padding: 6px;
  max-height: 260px;
}

:deep(.graph-settings-panel__search-popper .el-autocomplete-suggestion__list) {
  display: grid;
  gap: 6px;
}

:deep(.graph-settings-panel__search-popper .el-autocomplete-suggestion__list li) {
  margin: 0;
  min-height: 48px;
  padding: 13px 14px;
  border-radius: 8px;
  color: var(--graph-panel-text);
  line-height: 1.7;
  transition:
    background-color 0.14s ease,
    color 0.14s ease;
}

:deep(.graph-settings-panel__search-popper .el-autocomplete-suggestion__list li:hover),
:deep(.graph-settings-panel__search-popper .el-autocomplete-suggestion__list li.highlighted) {
  background: color-mix(in srgb, var(--graph-panel-hover) 70%, #fff 6%);
  color: #fff;
}
</style>
