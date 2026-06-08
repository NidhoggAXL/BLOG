<script setup lang="ts">
import type { DirectoryTreeNode } from '~/composables/buildDirectoryTreeSelect'

defineProps<{
  treeSelectData: DirectoryTreeNode[]
  linkOptions: { value: string; label: string; directoryPath?: string }[]
  /** 批量导入时由外层单独处理父目录 */
  hideParentDirectory?: boolean
}>()

const directoryId = defineModel<number>('directoryId', { default: 0 })
const wikilinkSlugs = defineModel<string[]>('wikilinkSlugs', { required: true })
const status = defineModel<'draft' | 'published' | 'archived'>('status', { required: true })
const autoParseWikilinks = defineModel<boolean>('autoParseWikilinks', { default: true })
</script>

<template>
  <el-form-item v-if="!hideParentDirectory" label="所属目录">
    <el-tree-select
      v-model="directoryId"
      :data="treeSelectData"
      check-strictly
      default-expand-all
      :render-after-expand="false"
      placeholder="选择文章所在文件夹；「未归类」表示不挂目录"
      style="width: 100%"
    />
  </el-form-item>

  <el-form-item label="文章状态">
    <el-radio-group v-model="status">
      <el-radio-button value="draft">草稿</el-radio-button>
      <el-radio-button value="published">已发布</el-radio-button>
      <el-radio-button value="archived">已归档</el-radio-button>
    </el-radio-group>
  </el-form-item>

  <el-form-item label="双链">
    <el-switch
      v-model="autoParseWikilinks"
      active-text="自动解析正文双链并命中库内文章（默认开启）"
    />
    <p class="post-import-fields__hint">
      导入时按<strong>文件名</strong>作为标题与 slug。每篇文章仅根据<strong>本篇正文</strong>中的
      <code>[[...]]</code> 写入边表；自动解析只填预览表，不会写入下方多选。若要给每篇追加相同双链，请手动多选目标。
    </p>
  </el-form-item>

  <el-form-item label="双链目标（可选）">
    <el-select
      v-model="wikilinkSlugs"
      multiple
      filterable
      collapse-tags
      collapse-tags-tooltip
      placeholder="多选后写入每篇正文（与新建文章相同）"
      style="width: 100%"
    >
      <el-option
        v-for="o in linkOptions"
        :key="o.value"
        :label="o.directoryPath ? `${o.label} · ${o.directoryPath}` : o.label"
        :value="o.value"
      />
    </el-select>
  </el-form-item>
</template>

<style scoped lang="less">
.post-import-fields__hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--admin-muted);
  line-height: 1.45;
}

.post-import-fields__hint code {
  font-size: 11px;
}
</style>
