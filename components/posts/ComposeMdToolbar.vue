<script setup lang="ts">
import {
  COMPOSE_MD_TOOLBAR_GROUPS,
  getComposeMdToolTitle,
  type ComposeMdToolDirective,
} from '~/constants/compose-md-tools'

withDefaults(
  defineProps<{
    charCount?: number
    orientation?: 'horizontal' | 'vertical'
    variant?: 'default' | 'chrome'
  }>(),
  {
    orientation: 'horizontal',
    variant: 'default',
  },
)

const emit = defineEmits<{
  tool: [directive: ComposeMdToolDirective]
  callout: [type: string]
}>()

function onTool(directive: ComposeMdToolDirective) {
  emit('tool', directive)
}

function onCallout(type: string) {
  emit('callout', type)
}
</script>

<template>
  <div
    class="compose-md-toolbar"
    :class="{
      'compose-md-toolbar--vertical': orientation === 'vertical',
      'compose-md-toolbar--chrome': variant === 'chrome',
    }"
    role="toolbar"
    aria-label="Markdown 格式"
  >
    <div class="compose-md-toolbar__tools">
      <template v-for="(group, gi) in COMPOSE_MD_TOOLBAR_GROUPS" :key="gi">
        <span v-if="gi > 0" class="compose-md-toolbar__sep" aria-hidden="true" />
        <div class="compose-md-toolbar__group">
          <template v-for="directive in group" :key="directive">
            <PostsComposeMdCalloutTool
              v-if="directive === 'callout'"
              @select="onCallout"
            />
            <button
              v-else
              type="button"
              class="compose-md-toolbar__btn"
              :title="getComposeMdToolTitle(directive)"
              :aria-label="getComposeMdToolTitle(directive)"
              @click="onTool(directive)"
            >
              <PostsComposeMdToolIcon :name="directive" />
            </button>
          </template>
        </div>
      </template>
    </div>
    <span v-if="charCount != null" class="compose-md-toolbar__counter">
      {{ charCount }} 字
    </span>
  </div>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.compose-md-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  min-height: 40px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--post-read-border, var(--admin-border));
  background: var(--post-read-surface-muted, var(--admin-toolbar-bg));
}

.compose-md-toolbar__tools {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 4px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
    height: 0;
  }
}

.compose-md-toolbar__group {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.compose-md-toolbar__sep {
  flex-shrink: 0;
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: var(--post-read-border, var(--admin-border));
}

.compose-md-toolbar__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--admin-text);
  background: transparent;
  border: none;
  border-radius: @radius-md;
  cursor: pointer;
  transition:
    background @transition-fast,
    color @transition-fast;

  &:hover {
    background: var(--admin-nav-hover);
    color: var(--el-color-primary);
  }
}

.compose-md-toolbar__counter {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--admin-muted);
  white-space: nowrap;
}

.compose-md-toolbar--vertical {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  width: 100%;
  min-height: 0;
  height: 100%;
  padding: 10px 6px;
  border-bottom: none;
  border-left: 1px solid var(--post-read-border, var(--admin-border));
  border-right: 1px solid var(--post-read-border, var(--admin-border));
  background: var(--post-read-surface, var(--el-fill-color-blank));
}

.compose-md-toolbar--vertical .compose-md-toolbar__tools {
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  gap: 6px;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
  }
}

.compose-md-toolbar--vertical .compose-md-toolbar__group {
  flex-direction: column;
  gap: 4px;
}

.compose-md-toolbar--vertical .compose-md-toolbar__sep {
  width: 24px;
  height: 1px;
  margin: 2px 0;
}

.compose-md-toolbar--vertical .compose-md-toolbar__counter {
  margin-top: 8px;
  text-align: center;
}

.compose-md-toolbar--chrome {
  flex: 1;
  min-width: 0;
  min-height: 0;
  padding: 0 4px;
  border-bottom: none;
  background: transparent;
}

.compose-md-toolbar--chrome .compose-md-toolbar__tools {
  justify-content: flex-start;
}
</style>
