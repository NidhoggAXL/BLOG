<script setup lang="ts">
import { Upload } from "@element-plus/icons-vue";
import { extractMarkdownFilesFromZip } from "~/composables/parseImportArchive";

defineOptions({ name: "PostImportFolderDialog" });

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [boolean];
}>();

const visible = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit("update:modelValue", v),
});

const router = useRouter();
const { stashCreateSave } = usePostComposeDraft();
const { stashBatchImport } = usePostBatchImportStash();

const fileInputRef = ref<HTMLInputElement | null>(null);
const reading = ref(false);

function openPicker() {
  fileInputRef.value?.click();
}

function isZipFile(file: File) {
  return (
    /\.zip$/i.test(file.name) ||
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed"
  );
}

function isMdFile(file: File) {
  return (
    /\.(md|markdown|mdown|mkd)$/i.test(file.name) ||
    file.type === "text/markdown"
  );
}

async function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  reading.value = true;
  try {
    if (isMdFile(file) && !isZipFile(file)) {
      const text = await file.text();
      const payload = buildMdImportPayload(file.name, text);
      stashCreateSave({
        title: payload.title,
        body: payload.body,
        slug: payload.slug,
        directory_id: 0,
        status: "draft",
        wikilink_slugs: [],
      });
      visible.value = false;
      ElMessage.success(`已载入「${file.name}」，请在保存页确认目录与双链。`);
      await router.push("/admin/posts/new/save");
      return;
    }

    if (isZipFile(file)) {
      const files = await extractMarkdownFilesFromZip(file);
      if (!files.length) {
        ElMessage.warning("压缩包内未找到 .md / .markdown 文件");
        return;
      }
      stashBatchImport({
        sourceName: file.name,
        files,
      });
      visible.value = false;
      ElMessage.success(
        `已读取 ${files.length} 个 Markdown 文件，请在批量导入页确认选项`,
      );
      await router.push("/admin/posts/import/batch");
      return;
    }

    ElMessage.warning("请选择 .md 文件或 .zip 压缩包");
  } catch {
    ElMessage.error("读取文件失败，请确认编码为 UTF-8 且压缩包未损坏");
  } finally {
    reading.value = false;
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="导入文件夹 / 压缩包"
    width="520px"
    align-center
    destroy-on-close
    class="post-import-folder-dlg"
  >
    <p class="post-import-folder-dlg__lead">
      选择单个 <strong>.md</strong> 将跳转「保存文章」页；选择
      <strong>.zip</strong> 将跳转「批量导入」页，确认目录层级与双链后再写入文库。
    </p>
    <button
      type="button"
      class="pick-card"
      :disabled="reading"
      @click="openPicker"
    >
      <el-icon :size="32"><Upload /></el-icon>
      <span class="pick-card__title">{{
        reading ? "正在读取…" : "选择文件"
      }}</span>
      <span class="pick-card__desc">.md / .markdown / .zip</span>
    </button>

    <input
      ref="fileInputRef"
      type="file"
      class="post-import-folder-dlg__file"
      accept=".md,.markdown,.mdown,.mkd,.zip,text/markdown,application/zip"
      @change="onFileChange"
    />

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button
        type="primary"
        :icon="Upload"
        :loading="reading"
        @click="openPicker"
      >
        选择文件
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped lang="less">
@import "~/assets/styles/variables.less";

.post-import-folder-dlg__lead {
  margin: 0 0 16px;
  font-size: 14px;
  line-height: 1.55;
  color: var(--admin-muted);
}

.pick-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 28px 16px;
  border: 1px dashed var(--admin-border);
  border-radius: @radius-lg;
  background: var(--admin-toolbar-bg);
  color: var(--admin-text);
  cursor: pointer;
  font: inherit;
  transition: border-color @transition-fast;

  &:disabled {
    opacity: 0.7;
    cursor: wait;
  }
}

.pick-card:hover:not(:disabled) {
  border-color: var(--el-color-primary);
}

.pick-card__title {
  font-weight: 700;
  font-size: 16px;
}

.pick-card__desc {
  font-size: 13px;
  color: var(--admin-muted);
}

.post-import-folder-dlg__file {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
