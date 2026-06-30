<script setup lang="ts">
import { ArrowDown } from '@element-plus/icons-vue'
import type { PostListItem } from '~/types/post'

const props = defineProps<{
  selectionCount: number
  directoryCount: number
  canApplyDirectory: boolean
  batchTargetStatus: PostListItem['status']
  statusOptions: { value: PostListItem['status']; label: string }[]
  statusLoading: boolean
  canDeleteDirectory: boolean
}>()

const emit = defineEmits<{
  'update:batchTargetStatus': [PostListItem['status']]
  applyStatusSelection: []
  applyStatusDirectory: []
  deleteSelection: []
  deleteDirectory: []
  clearSelection: []
}>()

const statusModel = computed({
  get: () => props.batchTargetStatus,
  set: (v: PostListItem['status']) => emit('update:batchTargetStatus', v),
})

type MoreCommand = 'applyStatusDirectory' | 'deleteDirectory'

function onMoreCommand(cmd: MoreCommand) {
  if (cmd === 'applyStatusDirectory') emit('applyStatusDirectory')
  else emit('deleteDirectory')
}
</script>

<template>
  <div class="posts-batch-toolbar">
    <div class="posts-batch-toolbar__left">
      <span class="posts-batch-toolbar__hint">已选 {{ selectionCount }} 篇</span>
      <el-button type="primary" link @click="emit('clearSelection')">取消选择</el-button>
    </div>

    <div class="posts-batch-toolbar__right">
      <el-radio-group v-model="statusModel" size="small" :disabled="statusLoading">
        <el-radio-button
          v-for="opt in statusOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </el-radio-button>
      </el-radio-group>

      <el-button
        type="primary"
        :loading="statusLoading"
        @click="emit('applyStatusSelection')"
      >
        应用
      </el-button>

      <el-button type="danger" plain @click="emit('deleteSelection')">删除</el-button>

      <el-dropdown trigger="click" @command="onMoreCommand">
        <el-button>
          更多
          <el-icon class="el-icon--right"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item
              command="applyStatusDirectory"
              :disabled="!canApplyDirectory || statusLoading"
            >
              应用到当前列表（{{ directoryCount }}）
            </el-dropdown-item>
            <el-dropdown-item
              command="deleteDirectory"
              :disabled="!canDeleteDirectory"
            >
              删除当前列表（{{ directoryCount }}）
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<style scoped lang="less">
.posts-batch-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
}

.posts-batch-toolbar__left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.posts-batch-toolbar__right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.posts-batch-toolbar__hint {
  font-size: 13px;
  font-weight: 600;
  color: var(--admin-text);
  white-space: nowrap;
}

@media (max-width: 600px) {
  .posts-batch-toolbar__right {
    width: 100%;
    margin-left: 0;
  }
}
</style>
