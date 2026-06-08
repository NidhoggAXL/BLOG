<script setup lang="ts">
import { SwitchButton } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = withDefaults(
  defineProps<{
    /** element-plus 按钮类型 */
    buttonType?: '' | 'default' | 'primary' | 'success' | 'warning' | 'info' | 'danger' | 'text'
    /** 是否显示文字标签 */
    showLabel?: boolean
    /** 为 true 时先弹出确认框 */
    confirm?: boolean
  }>(),
  {
    buttonType: 'default',
    showLabel: true,
    confirm: false,
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
  <el-button
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
