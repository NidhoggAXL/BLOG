<script setup lang="ts">
/** @deprecated 请使用 PublicAiFab；保留以兼容旧引用 */
import { ChatDotRound } from '@element-plus/icons-vue'

const config = useRuntimeConfig()
const aiEnabled = computed(() => config.public.aiEnabled !== false)

const drawerOpen = ref(false)
</script>

<template>
  <ClientOnly>
    <template v-if="aiEnabled">
      <button
        type="button"
        class="ai-chat-fab"
        aria-label="问知识库"
        @click="drawerOpen = true"
      >
        <el-icon :size="22"><ChatDotRound /></el-icon>
        <span class="ai-chat-fab__label">问知识库</span>
      </button>

      <el-drawer
        v-model="drawerOpen"
        title="知识库问答"
        direction="rtl"
        size="min(420px, 100vw)"
        class="ai-chat-drawer"
        append-to-body
      >
        <AiChatPanel />
      </el-drawer>
    </template>
  </ClientOnly>
</template>

<style scoped lang="less">
.ai-chat-fab {
  position: fixed;
  right: calc(var(--layout-gap, 12px) + 8px);
  bottom: calc(var(--layout-gap, 12px) + 8px);
  z-index: 1200;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 999px;
  background: var(--accent, #409eff);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22);
  }
}

.ai-chat-fab__label {
  @media (max-width: 480px) {
    display: none;
  }
}
</style>

<style lang="less">
.ai-chat-drawer .el-drawer__body {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-top: 8px;
}
</style>
