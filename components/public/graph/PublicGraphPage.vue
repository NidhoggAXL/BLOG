<script setup lang="ts">
import { Setting } from "@element-plus/icons-vue";
import GraphCanvas from "~/components/graph/GraphCanvas.vue";
import GraphSettingsPanel from "~/components/graph/GraphSettingsPanel.vue";
import type { GraphData, GraphForceSettings, GraphSimNode } from "~/types/graph";

defineProps<{
  graphData: GraphData | null;
  loading: boolean;
  fetchError: string | null;
  settingsOpen: boolean;
  searchSuggestions: Array<{
    value: string;
    label: string;
    kind: "operator" | "path" | "file";
  }>;
}>();

const forces = defineModel<GraphForceSettings>("forces", { required: true });

const emit = defineEmits<{
  "node-click": [node: GraphSimNode];
  "open-settings": [];
  "close-settings": [];
  reset: [];
  animate: [];
  "drag-start": [];
  "drag-end": [];
}>();

const canvasRef = ref<InstanceType<typeof GraphCanvas> | null>(null);

defineExpose({
  canvasRef,
  endForceTuning: () => canvasRef.value?.endForceTuning(),
  beginForceTuning: () => canvasRef.value?.beginForceTuning(),
  reheat: () => canvasRef.value?.reheat(),
  playAnimation: () => canvasRef.value?.playAnimation(),
});
</script>

<template>
  <div class="graph-page">
    <section class="card graph-page__card">
      <ClientOnly>
        <div class="graph-page__canvas-wrap">
          <GraphCanvas
            ref="canvasRef"
            :data="graphData"
            :forces="forces"
            :loading="loading"
            @node-click="emit('node-click', $event)"
          />

          <p
            v-if="!loading && !fetchError && graphData && graphData.nodes.length === 0"
            class="graph-page__empty"
          >
            暂无已发布文章节点。若刚在后台改为草稿/归档，请刷新本页。
          </p>

          <button
            v-show="!settingsOpen"
            type="button"
            class="graph-settings-btn"
            aria-label="打开图谱设置"
            @click.stop="emit('open-settings')"
          >
            <el-icon :size="18"><Setting /></el-icon>
          </button>

          <Transition name="graph-settings-fade">
            <GraphSettingsPanel
              v-if="settingsOpen"
              v-model="forces"
              :fetch-error="fetchError"
              :search-suggestions="searchSuggestions"
              @close="emit('close-settings')"
              @reset="emit('reset')"
              @animate="emit('animate')"
              @drag-start="emit('drag-start')"
              @drag-end="emit('drag-end')"
            />
          </Transition>
        </div>
      </ClientOnly>
    </section>
  </div>
</template>

<style scoped lang="less">
.graph-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.graph-page__card {
  flex: 1;
  min-height: 0;
  padding: 0;
  border-radius: 12px;
  overflow: hidden;
}

.graph-page__canvas-wrap {
  position: relative;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.graph-page__empty {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 24px;
  text-align: center;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  pointer-events: none;
}

.graph-settings-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg-elevated) 92%, transparent);
  color: var(--muted);
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--bg-hover) 90%, transparent);
  }
}

.graph-settings-fade-enter-active,
.graph-settings-fade-leave-active {
  transition:
    opacity 0.16s ease,
    transform 0.16s ease;
}

.graph-settings-fade-enter-from,
.graph-settings-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
