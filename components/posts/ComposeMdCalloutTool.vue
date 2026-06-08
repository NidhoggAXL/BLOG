<script setup lang="ts">
import { getCalloutPickerItems } from '~/utils/markdownCallouts'
import type { CalloutType } from '~/utils/markdownCallouts'

const emit = defineEmits<{
  select: [type: CalloutType]
}>()

const items = getCalloutPickerItems()

function onCommand(type: CalloutType) {
  emit('select', type)
}
</script>

<template>
  <el-dropdown trigger="click" placement="bottom-start" @command="onCommand">
    <button
      type="button"
      class="compose-md-callout-tool"
      title="插入 Callout 块"
      aria-label="插入 Callout 块"
    >
      <PostsComposeMdToolIcon name="callout" />
    </button>
    <template #dropdown>
      <el-dropdown-menu class="compose-md-callout-tool__menu">
        <el-dropdown-item
          v-for="item in items"
          :key="item.type"
          :command="item.type"
          class="compose-md-callout-tool__item"
        >
          <span class="compose-md-callout-tool__emoji" aria-hidden="true">{{ item.emoji }}</span>
          <span class="compose-md-callout-tool__label">{{ item.label }}</span>
          <code class="compose-md-callout-tool__syntax">[!{{ item.type }}]</code>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped lang="less">
.compose-md-callout-tool {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--admin-text);
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;

  &:hover {
    background: var(--admin-nav-hover);
    color: var(--el-color-primary);
  }
}

.compose-md-callout-tool__item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 200px;
}

.compose-md-callout-tool__emoji {
  flex-shrink: 0;
  width: 1.25em;
  font-size: 16px;
  line-height: 1;
  text-align: center;
}

.compose-md-callout-tool__label {
  flex: 1;
  font-size: 13px;
  color: var(--admin-text);
}

.compose-md-callout-tool__syntax {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--admin-muted);
  background: var(--admin-nav-hover);
  border: none;
}
</style>
