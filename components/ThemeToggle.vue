<script setup lang="ts">
import { Moon, Sunny } from '@element-plus/icons-vue'

const theme = useAppTheme()

const isDark = computed(() => theme.isDark.value)
const followSystem = computed(() => theme.preference.value === 'system')

const tooltip = computed(() => {
  const mode = isDark.value ? '深色' : '浅色'
  if (followSystem.value) {
    return `当前为${mode}（跟随系统）\n单击：切换浅色/深色\nShift+单击：保持跟随系统`
  }
  return `当前为${mode}\n单击：切换浅色/深色\nShift+单击：恢复跟随系统`
})

const ariaLabel = computed(() =>
  isDark.value ? '切换到浅色模式' : '切换到深色模式',
)

function onClick(e: MouseEvent) {
  if (e.shiftKey) {
    theme.setPreference('system')
    return
  }
  theme.toggleTheme()
}
</script>

<template>
  <button
    type="button"
    class="theme-toggle-btn"
    :class="{ 'theme-toggle-btn--system': followSystem }"
    :title="tooltip"
    :aria-label="ariaLabel"
    @click="onClick"
  >
    <el-icon :size="20" class="theme-toggle-btn__icon">
      <Sunny v-if="!isDark" />
      <Moon v-else />
    </el-icon>
  </button>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.theme-toggle-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: @radius-lg;
  cursor: pointer;
  color: var(--text);
  background: var(--bg-hover);
  transition:
    background @transition-fast,
    border-color @transition-fast,
    color @transition-fast,
    transform @transition-fast;

  &:hover {
    background: var(--bg-elevated);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
  }

  &:active {
    transform: scale(0.96);
  }

  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
    outline-offset: 2px;
  }
}

.theme-toggle-btn--system::after {
  content: '';
  position: absolute;
  right: 4px;
  bottom: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 1px var(--bg-elevated);
}

.theme-toggle-btn__icon {
  display: block;
}
</style>
