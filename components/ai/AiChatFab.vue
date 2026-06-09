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
        size="min(400px, calc(100vw - 32px))"
        class="ai-chat-drawer"
        modal-class="ai-chat-drawer-overlay"
        append-to-body
        :close-on-click-modal="true"
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
  background: var(--accent, #145a82);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(14, 32, 48, 0.22);
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
/* 遮罩：露出站点壁纸 */
.ai-chat-drawer-overlay {
  background-color: rgba(8, 12, 18, 0.52) !important;
}

[data-theme='light'] .ai-chat-drawer-overlay,
html.theme-light .ai-chat-drawer-overlay {
  background-color: rgba(14, 32, 48, 0.28) !important;
}

/* 悬浮卡片弹窗（非贴边全屏抽屉） */
.ai-chat-drawer.el-drawer {
  --ai-drawer-gap: 16px;
  top: var(--ai-drawer-gap) !important;
  right: var(--ai-drawer-gap) !important;
  bottom: calc(var(--ai-drawer-gap) + 60px) !important;
  left: auto !important;
  width: min(400px, calc(100vw - 2 * var(--ai-drawer-gap))) !important;
  height: auto !important;
  max-height: calc(100dvh - 2 * var(--ai-drawer-gap) - 60px) !important;
  border-radius: 14px !important;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ai-chat-drawer .el-drawer__header {
  flex-shrink: 0;
  margin-bottom: 0;
  padding: 14px 16px 12px;
  border-bottom: 1px solid var(--ai-panel-card-border, rgba(255, 255, 255, 0.2));
}

.ai-chat-drawer .el-drawer__title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.ai-chat-drawer .el-drawer__body {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0 14px 14px;
  overflow: hidden;
}

.ai-chat-drawer .el-drawer__close-btn {
  font-size: 18px;
}

@media (max-width: 480px) {
  .ai-chat-drawer.el-drawer {
    --ai-drawer-gap: 10px;
    bottom: calc(var(--ai-drawer-gap) + 54px) !important;
    max-height: calc(100dvh - 2 * var(--ai-drawer-gap) - 54px) !important;
    border-radius: 12px !important;
  }

  .ai-chat-drawer .el-drawer__body {
    padding: 0 10px 10px;
  }
}

/* 抽屉挂到 body，需单独跟随站点亮/暗主题 */
[data-theme='light'] .ai-chat-drawer,
html.theme-light .ai-chat-drawer {
  --ai-panel-text: #000000;
  --ai-panel-muted: #333333;
  --ai-panel-accent: #145a82;
  --ai-panel-accent-hover: #0c4466;
  --ai-panel-border: rgba(255, 255, 255, 0.62);
  --ai-panel-msg-shadow: 0 0 0 1px rgba(14, 32, 48, 0.14);
  --ai-panel-msg-user-bg: rgba(20, 90, 130, 0.12);
  --ai-panel-msg-user-border: rgba(20, 90, 130, 0.42);
  --ai-panel-msg-assistant-bg: rgba(255, 255, 255, 0.58);
  --ai-panel-composer-bg: rgba(255, 255, 255, 0.72);
  --ai-panel-composer-border: rgba(14, 32, 48, 0.14);
  --ai-panel-composer-shadow: 0 0 0 1px rgba(14, 32, 48, 0.06);
  --ai-panel-input-bg: #ffffff;
  --ai-panel-input-border: rgba(14, 32, 48, 0.28);
  --ai-panel-input-shadow: inset 0 1px 2px rgba(14, 32, 48, 0.05);
  --ai-panel-input-focus-border: #145a82;
  --ai-panel-input-focus-shadow: 0 0 0 3px rgba(20, 90, 130, 0.22);
  --ai-panel-card-border: rgba(255, 255, 255, 0.58);
  --ai-panel-card-ring: rgba(14, 32, 48, 0.16);
  --ai-panel-card-shadow:
    0 0 0 1px var(--ai-panel-card-ring),
    0 16px 48px rgba(8, 20, 32, 0.2);
  --ai-panel-messages-bg: rgba(255, 255, 255, 0.42);

  &.el-drawer {
    background: rgba(255, 255, 255, 0.78);
    border: 1px solid var(--ai-panel-card-border);
    box-shadow: var(--ai-panel-card-shadow);
  }

  .el-drawer__header {
    color: #000;
  }

  .el-drawer__title {
    color: #000;
  }

  .el-drawer__close-btn {
    color: #333;
  }

  .ai-chat-panel__input.el-textarea .el-textarea__inner {
    min-height: 92px;
    padding: 12px 14px;
    font-size: 14px;
    line-height: 1.55;
    color: #000;
    background: var(--ai-panel-input-bg);
    border: 1.5px solid var(--ai-panel-input-border);
    border-radius: 10px;
    box-shadow: var(--ai-panel-input-shadow);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      background 0.15s ease;

    &::placeholder {
      color: #5c6b74;
    }

    &:hover {
      border-color: rgba(14, 32, 48, 0.38);
    }

    &:focus {
      border-color: var(--ai-panel-input-focus-border);
      box-shadow: var(--ai-panel-input-focus-shadow);
      outline: none;
    }

    &:disabled {
      color: #8a9499;
      background: rgba(245, 247, 248, 0.95);
      border-color: rgba(14, 32, 48, 0.14);
      cursor: not-allowed;
    }
  }

  .el-button--primary {
    --el-button-bg-color: #145a82;
    --el-button-border-color: #145a82;
    --el-button-hover-bg-color: #0c4466;
    --el-button-hover-border-color: #0c4466;
    --el-button-active-bg-color: #083550;
    --el-button-active-border-color: #083550;
  }
}

[data-theme='light'] .ai-chat-drawer .el-button--primary,
html.theme-light .ai-chat-drawer .el-button--primary {
  --el-button-bg-color: #145a82 !important;
  --el-button-border-color: #145a82 !important;
}

[data-theme='dark'] .ai-chat-drawer,
html.theme-dark .ai-chat-drawer {
  --ai-panel-text: #f0f3f6;
  --ai-panel-muted: #9aa6b2;
  --ai-panel-accent: #e63946;
  --ai-panel-accent-hover: #ff4d5a;
  --ai-panel-border: rgba(255, 255, 255, 0.22);
  --ai-panel-msg-shadow: 0 0 0 1px rgba(230, 57, 70, 0.2);
  --ai-panel-msg-user-bg: rgba(230, 57, 70, 0.16);
  --ai-panel-msg-user-border: rgba(230, 57, 70, 0.42);
  --ai-panel-msg-assistant-bg: rgba(12, 14, 18, 0.62);
  --ai-panel-composer-bg: rgba(8, 10, 14, 0.55);
  --ai-panel-composer-border: rgba(255, 255, 255, 0.16);
  --ai-panel-composer-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  --ai-panel-input-bg: rgba(12, 14, 18, 0.78);
  --ai-panel-input-border: rgba(255, 255, 255, 0.24);
  --ai-panel-input-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
  --ai-panel-input-focus-border: #e63946;
  --ai-panel-input-focus-shadow: 0 0 0 3px rgba(230, 57, 70, 0.28);
  --ai-panel-card-border: rgba(255, 255, 255, 0.22);
  --ai-panel-card-ring: rgba(230, 57, 70, 0.24);
  --ai-panel-card-shadow:
    0 0 0 1px var(--ai-panel-card-ring),
    0 16px 48px rgba(0, 0, 0, 0.45);
  --ai-panel-messages-bg: rgba(8, 10, 14, 0.48);

  &.el-drawer {
    background: rgba(10, 12, 16, 0.82);
    border: 1px solid var(--ai-panel-card-border);
    box-shadow: var(--ai-panel-card-shadow);
  }

  .el-drawer__header {
    color: #f0f3f6;
  }

  .el-drawer__title {
    color: #f0f3f6;
  }

  .el-drawer__close-btn {
    color: #c8d0d8;
  }

  .ai-chat-panel__input.el-textarea .el-textarea__inner {
    min-height: 92px;
    padding: 12px 14px;
    font-size: 14px;
    line-height: 1.55;
    color: #f0f3f6;
    background: var(--ai-panel-input-bg);
    border: 1.5px solid var(--ai-panel-input-border);
    border-radius: 10px;
    box-shadow: var(--ai-panel-input-shadow);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease,
      background 0.15s ease;

    &::placeholder {
      color: #7d8a96;
    }

    &:hover {
      border-color: rgba(255, 255, 255, 0.34);
    }

    &:focus {
      border-color: var(--ai-panel-input-focus-border);
      box-shadow: var(--ai-panel-input-focus-shadow);
      outline: none;
    }

    &:disabled {
      color: #7d8a96;
      background: rgba(12, 14, 18, 0.55);
      border-color: rgba(255, 255, 255, 0.14);
      cursor: not-allowed;
    }
  }

  .el-button--primary {
    --el-button-bg-color: #e63946;
    --el-button-border-color: #e63946;
    --el-button-hover-bg-color: #ff4d5a;
    --el-button-hover-border-color: #ff4d5a;
    --el-button-active-bg-color: #c42f3b;
    --el-button-active-border-color: #c42f3b;
  }
}

[data-theme='dark'] .ai-chat-drawer .el-button--primary,
html.theme-dark .ai-chat-drawer .el-button--primary {
  --el-button-bg-color: #e63946 !important;
  --el-button-border-color: #e63946 !important;
}
</style>
