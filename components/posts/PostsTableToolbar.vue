<script setup lang="ts">
import { Menu, Search } from '@element-plus/icons-vue'

const filterQuery = defineModel<string>('filterQuery', { default: '' })

withDefaults(
  defineProps<{
    showNavToggle?: boolean
    /** 与列表标题同一行展示 */
    inline?: boolean
  }>(),
  { inline: false },
)

const emit = defineEmits<{
  toggleNav: []
}>()
</script>

<template>
  <div
    class="posts-table-toolbar"
    :class="{ 'posts-table-toolbar--inline': inline }"
  >
    <el-button
      v-if="showNavToggle"
      class="posts-table-toolbar__nav-toggle"
      :icon="Menu"
      @click="emit('toggleNav')"
    >
      浏览范围
    </el-button>
    <el-input
      v-model="filterQuery"
      clearable
      placeholder="搜索标题、slug 或状态"
      class="posts-table-toolbar__search"
      :prefix-icon="Search"
    />
  </div>
</template>

<style scoped lang="less">
.posts-table-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.posts-table-toolbar__search {
  flex: 1;
  min-width: 160px;
  max-width: 360px;
}

.posts-table-toolbar--inline {
  flex: 1 1 280px;
  justify-content: flex-end;
  min-width: 0;
}

.posts-table-toolbar--inline .posts-table-toolbar__search {
  max-width: 280px;
}

@media (max-width: 900px) {
  .posts-table-toolbar--inline {
    flex: 1 1 100%;
    justify-content: flex-start;
  }

  .posts-table-toolbar--inline .posts-table-toolbar__search {
    max-width: none;
  }
}

@media (max-width: 600px) {
  .posts-table-toolbar__search {
    max-width: none;
    width: 100%;
  }

  .posts-table-toolbar {
    width: 100%;
  }
}
</style>
