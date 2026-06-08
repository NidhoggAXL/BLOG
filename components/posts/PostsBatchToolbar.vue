<script setup lang="ts">
import { ArrowDown } from "@element-plus/icons-vue";
import type { PostListItem } from "~/types/post";

const props = defineProps<{
  selectionCount: number;
  directoryCount: number;
  canApplyDirectory: boolean;
  batchTargetStatus: PostListItem["status"];
  statusOptions: { value: PostListItem["status"]; label: string }[];
  statusLoading: boolean;
  canDeleteSelection: boolean;
  canDeleteDirectory: boolean;
}>();

const emit = defineEmits<{
  "update:batchTargetStatus": [PostListItem["status"]];
  applyStatusSelection: [];
  applyStatusDirectory: [];
  deleteSelection: [];
  deleteDirectory: [];
}>();

const statusModel = computed({
  get: () => props.batchTargetStatus,
  set: (v: PostListItem["status"]) => emit("update:batchTargetStatus", v),
});

type StatusCommand = "applyStatusSelection" | "applyStatusDirectory";
type DeleteCommand = "deleteSelection" | "deleteDirectory";

function onStatusCommand(cmd: StatusCommand) {
  if (cmd === "applyStatusSelection") emit("applyStatusSelection");
  else emit("applyStatusDirectory");
}

function onDeleteCommand(cmd: DeleteCommand) {
  if (cmd === "deleteSelection") emit("deleteSelection");
  else emit("deleteDirectory");
}
</script>

<template>
  <div class="posts-batch-toolbar">
    <span v-if="selectionCount > 0" class="posts-batch-toolbar__hint">
      已选 {{ selectionCount }} 篇
    </span>
    <span v-else class="posts-batch-toolbar__hint posts-batch-toolbar__hint--muted">
      勾选表格行后可批量操作
    </span>

    <el-divider direction="vertical" />

    <el-select
      v-model="statusModel"
      size="default"
      class="posts-batch-toolbar__select"
      :disabled="statusLoading"
    >
      <el-option
        v-for="opt in statusOptions"
        :key="opt.value"
        :label="opt.label"
        :value="opt.value"
      />
    </el-select>

    <el-dropdown trigger="click" @command="onStatusCommand">
      <el-button type="primary" plain :loading="statusLoading">
        修改状态
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            command="applyStatusSelection"
            :disabled="!selectionCount || statusLoading"
          >
            应用到选中（{{ selectionCount }}）
          </el-dropdown-item>
          <el-dropdown-item
            command="applyStatusDirectory"
            :disabled="!canApplyDirectory || statusLoading"
          >
            应用到当前列表（{{ directoryCount }}）
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <el-dropdown trigger="click" @command="onDeleteCommand">
      <el-button type="danger" plain>
        删除
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item
            command="deleteSelection"
            :disabled="!canDeleteSelection"
          >
            删除选中（{{ selectionCount }}）
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
</template>

<style scoped lang="less">
.posts-batch-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.posts-batch-toolbar__hint {
  font-size: 13px;
  font-weight: 600;
  color: var(--admin-text);
  white-space: nowrap;
}

.posts-batch-toolbar__hint--muted {
  font-weight: 500;
  color: var(--admin-muted);
}

.posts-batch-toolbar__select {
  width: 108px;
}

.posts-batch-toolbar :deep(.el-divider--vertical) {
  height: 1.2em;
  margin: 0 2px;
}
</style>
