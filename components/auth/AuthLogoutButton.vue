<script setup lang="ts">
import { SwitchButton } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = withDefaults(
  defineProps<{
    /** element-plus 按钮类型（variant=default 时生效） */
    buttonType?: '' | 'default' | 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'text'
    /** 是否显示文字标签 */
    showLabel?: boolean
    /** 为 true 时先弹出确认框 */
    confirm?: boolean
    /** sidebar：侧栏轻量样式；default：Element Plus 按钮 */
    variant?: 'default' | 'sidebar'
  }>(),
  {
    buttonType: 'default',
    showLabel: true,
    confirm: false,
    variant: 'default',
  },
)

const auth = useAuthStore()
const loggingOut = ref(false)

async function onLogout() {
  if (loggingOut.value) return
  if (props.confirm) {
    try {
      await ElMessageBox.confirm('确定要退出当前帐号吗？', '退出登录', {
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      return
    }
  }

  loggingOut.value = true
  try {
    await auth.logout()
    ElMessage.success('已退出登录')
  } catch {
    ElMessage.error('退出失败，请重试')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <button
    v-if="variant === 'sidebar'"
    type="button"
    class="auth-logout-btn auth-logout-btn--sidebar"
    :disabled="loggingOut"
    :aria-busy="loggingOut"
    @click="onLogout"
  >
    <span class="auth-logout-btn__icon" aria-hidden="true">
      <el-icon :class="{ 'is-loading': loggingOut }">
        <SwitchButton />
      </el-icon>
    </span>
    <span v-if="showLabel" class="auth-logout-btn__label">退出登录</span>
  </button>

  <el-button
    v-else
    class="auth-logout-btn"
    :type="buttonType"
    :icon="SwitchButton"
    :loading="loggingOut"
    :text="buttonType === 'text'"
    @click="onLogout"
  >
    <span v-if="showLabel">退出登录</span>
  </el-button>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

.auth-logout-btn--sidebar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  margin: 0;
  padding: 10px 14px;
  border: none;
  border-radius: @radius-lg;
  background: transparent;
  color: var(--admin-muted);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.35;
  cursor: pointer;
  transition:
    background @transition-fast,
    color @transition-fast,
    box-shadow @transition-fast;

  &:hover:not(:disabled) {
    color: var(--admin-text);
    background: color-mix(in srgb, var(--accent) 10%, var(--admin-nav-hover));
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 22%, transparent);
  }

  &:hover:not(:disabled) .auth-logout-btn__icon {
    color: var(--accent);
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
}

.auth-logout-btn__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  flex-shrink: 0;
  font-size: 16px;
  color: var(--admin-muted);
  transition: color @transition-fast;
}

.auth-logout-btn__label {
  flex: 0 1 auto;
  text-align: center;
}
</style>
