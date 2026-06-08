<script setup lang="ts">
import { Check } from '@element-plus/icons-vue'
import { buildDirectoryTreeSelectData, type DirectoryTreeNode } from '~/composables/buildDirectoryTreeSelect'
import { collectDescendantIdsIncludingSelfClient } from '~/composables/directoryDescendants'
import type { DirectoryRow } from '~/types/directory'

const props = defineProps<{
  modelValue: boolean
  /** 非空时为编辑模式 */
  editing: DirectoryRow | null
  /** 新建时默认父级（0 表示顶级） */
  defaultParentId?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
})

const isEdit = computed(() => props.editing != null)

const dialogTitle = computed(() => (isEdit.value ? '编辑目录' : '新建目录'))

/** 0 表示顶级（写入 API 时转为 parent_id = null） */
const form = reactive({
  parent_id: 0 as number,
  name: '',
  sort_order: 0,
})

const flatList = ref<DirectoryRow[]>([])

const forbiddenForParentPick = computed(() => {
  if (!props.editing) return new Set<number>()
  return collectDescendantIdsIncludingSelfClient(flatList.value, props.editing.id)
})

const treeData = computed<DirectoryTreeNode[]>(() => {
  const filtered = flatList.value.filter((r) => !forbiddenForParentPick.value.has(r.id))
  return [
    { value: 0, label: '（顶级目录）', children: [] },
    ...buildDirectoryTreeSelectData(filtered),
  ]
})

const loadingTree = ref(false)
const submitting = ref(false)

async function loadTree() {
  loadingTree.value = true
  try {
    const { list } = await $fetch<{ list: DirectoryRow[] }>('/api/directories/tree')
    flatList.value = list
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    ElMessage.error(err?.data?.message || err?.message || '加载目录树失败')
    flatList.value = []
  } finally {
    loadingTree.value = false
  }
}

watch(
  [() => props.modelValue, () => props.editing?.id ?? null],
  async ([open]) => {
    if (!open) return
    await loadTree()
    const ed = props.editing
    if (ed) {
      Object.assign(form, {
        parent_id: ed.parent_id ?? 0,
        name: ed.name,
        sort_order: ed.sort_order,
      })
    } else {
      Object.assign(form, {
        parent_id: props.defaultParentId ?? 0,
        name: '',
        sort_order: 0,
      })
    }
  },
)

async function onSubmit() {
  if (!form.name.trim()) {
    ElMessage.warning('请填写目录名称')
    return
  }
  submitting.value = true
  try {
    const body = {
      name: form.name.trim(),
      parent_id: form.parent_id === 0 ? null : form.parent_id,
      sort_order: form.sort_order,
    }
    if (isEdit.value && props.editing) {
      await $fetch(`/api/directories/${props.editing.id}`, {
        method: 'PATCH',
        body,
      })
      ElMessage.success('已保存')
    } else {
      await $fetch('/api/directories', {
        method: 'POST',
        body,
      })
      ElMessage.success('目录已创建')
    }
    visible.value = false
    emit('success')
  } catch (e: unknown) {
    const err = e as {
      data?: { statusMessage?: string; message?: string }
      statusMessage?: string
      message?: string
    }
    const msg =
      err?.data?.statusMessage ||
      err?.data?.message ||
      err?.statusMessage ||
      err?.message ||
      '操作失败'
    ElMessage.error(msg)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <ReusableDialog v-model="visible" :title="dialogTitle" :width="'520px'">
    <el-skeleton v-if="loadingTree" :rows="4" animated />
    <el-form v-else label-position="top" @submit.prevent>
      <el-form-item label="父级目录">
        <el-tree-select
          v-model="form.parent_id"
          :data="treeData"
          check-strictly
          default-expand-all
          :render-after-expand="false"
          placeholder="选择父级；「顶级」表示一级目录（无父级）"
          style="width: 100%"
        />
      </el-form-item>
      <el-form-item label="目录名称" required>
        <el-input
          v-model="form.name"
          maxlength="191"
          show-word-limit
          placeholder="名称与 slug 相同，如：01_(占位) 或 读书笔记"
        />
      </el-form-item>
      <el-form-item label="排序（同级）">
        <el-input-number v-model="form.sort_order" :min="0" :max="999999" controls-position="right" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :icon="Check" @click="onSubmit">
        {{ isEdit ? '保存' : '创建' }}
      </el-button>
    </template>
  </ReusableDialog>
</template>
