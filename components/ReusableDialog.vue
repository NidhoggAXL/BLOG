<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title: string
    width?: string
    destroyOnClose?: boolean
  }>(),
  { width: '520px', destroyOnClose: true },
)

const emit = defineEmits<{
  'update:modelValue': [boolean]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="title"
    :width="width"
    :destroy-on-close="destroyOnClose"
    append-to-body
    align-center
    class="reusable-dialog"
  >
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </el-dialog>
</template>

<style scoped lang="less">
@import '~/assets/styles/variables.less';

:deep(.el-dialog__body) {
  padding-top: 8px;
}
</style>
