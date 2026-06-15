<script setup lang="ts">
import type { WikilinkResolution } from '~/types/wikilink'
import {
  allAmbiguousWikilinksResolved,
  buildWikilinkResolutionsFromChoices,
  collectAmbiguousWikilinkRows,
  wikilinkAmbiguityRowKey,
} from '~/utils/wikilinkAmbiguity'
import {
  wikilinkLinkKindLabel,
  type WikilinkParseTableRow,
} from '~/utils/wikilinkParseDisplay'

const props = defineProps<{
  rows: WikilinkParseTableRow[]
}>()

const emit = defineEmits<{
  confirm: [WikilinkResolution[]]
  cancel: []
}>()

const visible = defineModel<boolean>('visible', { default: false })

const ambiguousRows = computed(() => collectAmbiguousWikilinkRows(props.rows))

const choices = ref<Record<string, number>>({})

watch(
  () => [visible.value, ambiguousRows.value] as const,
  ([open, rows]) => {
    if (!open) return
    const next: Record<string, number> = {}
    for (const row of rows) {
      const key = wikilinkAmbiguityRowKey(row)
      const first = row.ambiguous_candidates?.[0]?.id
      if (first != null) next[key] = first
    }
    choices.value = next
  },
  { immediate: true },
)

const canConfirm = computed(() =>
  allAmbiguousWikilinksResolved(ambiguousRows.value, choices.value),
)

function onConfirm() {
  if (!canConfirm.value) return
  emit(
    'confirm',
    buildWikilinkResolutionsFromChoices(ambiguousRows.value, choices.value),
  )
  visible.value = false
}

function onCancel() {
  visible.value = false
  emit('cancel')
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="双链歧义消歧"
    width="min(720px, 96vw)"
    :close-on-click-modal="false"
    destroy-on-close
    @close="onCancel"
  >
    <p class="wikilink-ambiguity-dlg__lead">
      以下双链匹配到多篇目标文章，请为每条选择唯一目标后再继续保存或导入。
    </p>

    <div v-if="ambiguousRows.length" class="wikilink-ambiguity-dlg__list">
      <section
        v-for="row in ambiguousRows"
        :key="wikilinkAmbiguityRowKey(row)"
        class="wikilink-ambiguity-dlg__item"
      >
        <header class="wikilink-ambiguity-dlg__item-head">
          <code class="wikilink-ambiguity-dlg__raw">{{ row.raw_target }}</code>
          <el-tag size="small" type="danger">歧义</el-tag>
          <el-tag size="small" type="info">{{ wikilinkLinkKindLabel(row.link_kind) }}</el-tag>
          <span v-if="row.source_path" class="wikilink-ambiguity-dlg__path">
            {{ row.source_path }}
          </span>
        </header>
        <el-radio-group
          v-model="choices[wikilinkAmbiguityRowKey(row)]"
          class="wikilink-ambiguity-dlg__options"
        >
          <el-radio
            v-for="c in row.ambiguous_candidates"
            :key="c.id"
            :value="c.id"
            class="wikilink-ambiguity-dlg__option"
          >
            <span class="wikilink-ambiguity-dlg__option-title">{{ c.title }}</span>
            <span class="wikilink-ambiguity-dlg__option-slug">{{ c.slug }}</span>
          </el-radio>
        </el-radio-group>
      </section>
    </div>

    <template #footer>
      <el-button @click="onCancel">取消</el-button>
      <el-button type="primary" :disabled="!canConfirm" @click="onConfirm">
        确认选择
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="less">
.wikilink-ambiguity-dlg__lead {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--admin-muted);
}

.wikilink-ambiguity-dlg__list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 50vh;
  overflow-y: auto;
}

.wikilink-ambiguity-dlg__item {
  padding: 12px;
  border: 1px solid var(--admin-border);
  border-radius: 8px;
  background: var(--admin-toolbar-bg, var(--card-bg));
}

.wikilink-ambiguity-dlg__item-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.wikilink-ambiguity-dlg__raw {
  font-size: 13px;
}

.wikilink-ambiguity-dlg__path {
  font-size: 12px;
  color: var(--admin-muted);
}

.wikilink-ambiguity-dlg__options {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.wikilink-ambiguity-dlg__option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  height: auto;
  margin-right: 0;
  white-space: normal;
}

.wikilink-ambiguity-dlg__option-title {
  font-weight: 600;
  font-size: 13px;
}

.wikilink-ambiguity-dlg__option-slug {
  font-size: 12px;
  color: var(--admin-muted);
}
</style>
