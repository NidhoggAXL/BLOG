<script setup lang="ts">
import { ArrowLeft, Delete, Edit } from '@element-plus/icons-vue'
import PostDeleteDialog from '~/components/posts/PostDeleteDialog.vue'
import type { PostDeleteResult, PostDetail } from '~/types/post'
import type { CatalogHeading } from '~/utils/compose-md-cm-commands'

definePageMeta({
  layout: 'post-compose',
})

const route = useRoute()
const router = useRouter()
const postCache = usePostCacheStore()
const { onMarkdownContentClick } = useSpaMarkdownLinkClick()

const slug = computed(() => {
  const s = route.params.slug
  return String(Array.isArray(s) ? s[0] : s ?? '')
})

const { data: post, status, error: fetchError } = await useFetch<PostDetail>(
  () => `/api/posts/${encodeURIComponent(slug.value)}`,
  {
    key: () => `admin-post-detail:${slug.value}`,
    watch: [slug],
  },
)

watch(
  post,
  (p) => {
    if (p) postCache.setDetail(p)
  },
  { immediate: true },
)

const loadError = computed(() => {
  if (!fetchError.value) return null
  const e = fetchError.value as { data?: { statusMessage?: string }; message?: string }
  return e?.data?.statusMessage || e?.message || '加载失败'
})

const initialLoading = computed(() => status.value === 'pending' && !post.value)
const deleteOpen = ref(false)
/** 左侧：文章元信息 */
const metaOpen = ref(true)
/** 右侧：大纲 + 双链 */
const railOpen = ref(true)
const articleRootRef = ref<HTMLElement | null>(null)

const catalogMarkdown = computed(() => post.value?.body ?? '')

function openEdit() {
  if (!post.value) return
  navigateTo(`/admin/posts/edit/${encodeURIComponent(post.value.slug)}`)
}

function onPostDeleted(res: PostDeleteResult) {
  postCache.removeDetail(res.slug)
  navigateTo('/admin/posts')
}

function onCatalogHeading(item: CatalogHeading) {
  const root = articleRootRef.value
  if (!root || !item.anchor) return
  const el = root.querySelector(`#${CSS.escape(item.anchor)}`) as HTMLElement | null
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function statusLabel(status: string) {
  if (status === 'published') return '已发布'
  if (status === 'archived') return '已归档'
  return '草稿'
}

function statusTagType(status: string) {
  if (status === 'published') return 'success'
  if (status === 'archived') return 'info'
  return 'warning'
}

useHead(() => ({
  title: post.value ? `${post.value.title} · 文章` : '文章',
}))
</script>

<template>
  <div class="post-view">
    <header class="post-view__chrome">
      <div class="post-view__chrome-start">
        <el-button :icon="ArrowLeft" text @click="router.push('/admin/posts')">返回</el-button>
      </div>
      <h1 class="post-view__chrome-center">
        {{ post?.title ?? (initialLoading ? '加载中…' : '文章') }}
      </h1>
      <div class="post-view__chrome-end">
        <ThemeToggle />
        <template v-if="post">
          <span class="post-view__chrome-divider" aria-hidden="true" />
          <el-button type="primary" :icon="Edit" @click="openEdit">编辑</el-button>
          <el-button type="danger" plain :icon="Delete" @click="deleteOpen = true">删除</el-button>
        </template>
      </div>
    </header>

    <PostDeleteDialog
      v-if="post"
      v-model="deleteOpen"
      :slug="post.slug"
      @deleted="onPostDeleted"
    />

    <main class="post-view__main">
      <div v-if="initialLoading" class="post-view__stage post-view__stage--solo">
        <div class="compose-panel-card post-view__read-card post-view__sheet--loading">
          <el-skeleton :rows="10" animated />
        </div>
      </div>

      <el-alert
        v-else-if="loadError && !post"
        type="error"
        :closable="false"
        :title="loadError"
        class="post-view__alert post-view__stage"
      />

      <template v-else-if="post">
        <button
          type="button"
          class="post-view__edge post-view__edge--left"
          :aria-label="metaOpen ? '隐藏文章信息' : '显示文章信息'"
          :aria-expanded="metaOpen"
          @click="metaOpen = !metaOpen"
        >
          <span class="post-view__edge-glyph" aria-hidden="true">{{ metaOpen ? '《' : '》' }}</span>
        </button>
        <button
          type="button"
          class="post-view__edge post-view__edge--right"
          :aria-label="railOpen ? '隐藏大纲与双链' : '显示大纲与双链'"
          :aria-expanded="railOpen"
          @click="railOpen = !railOpen"
        >
          <span class="post-view__edge-glyph" aria-hidden="true">{{ railOpen ? '》' : '《' }}</span>
        </button>

        <div class="post-view__workspace">
        <div
          class="post-view__body"
          :class="{
            'post-view--outline-open': metaOpen,
            'post-view--info-open': railOpen,
          }"
        >
          <aside
            class="post-view__panel post-view__panel--left"
            :aria-hidden="!metaOpen"
          >
            <div class="post-view__panel-surface">
              <div class="compose-panel-card post-view__info-card">
                <header class="compose-panel-card__head">
                  <p class="compose-panel-card__title">文章信息</p>
                </header>
                <div class="compose-panel-card__content">
                  <ul class="post-view__info-list">
                    <li class="post-view__info-row">
                      <span class="post-view__info-label">状态</span>
                      <el-tag
                        class="post-view__status-tag"
                        :type="statusTagType(post.status)"
                        effect="plain"
                      >
                        {{ statusLabel(post.status) }}
                      </el-tag>
                    </li>
                    <li class="post-view__info-row">
                      <span class="post-view__info-label">Slug</span>
                      <span class="post-view__info-value"><code>{{ post.slug }}</code></span>
                    </li>
                    <li v-if="post.published_at" class="post-view__info-row">
                      <span class="post-view__info-label">发布时间</span>
                      <span class="post-view__info-value">{{ formatDateTimeZh24(post.published_at) }}</span>
                    </li>
                    <li class="post-view__info-row">
                      <span class="post-view__info-label">更新时间</span>
                      <span class="post-view__info-value">{{ formatDateTimeZh24(post.updated_at) }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </aside>

          <section class="post-view__center">
            <div class="compose-panel-card post-view__read-card">
              <header class="compose-panel-card__head">
                <p class="compose-panel-card__title">正文</p>
              </header>
              <div class="compose-panel-card__content">
                <div class="post-view__article-scroll">
                  <div ref="articleRootRef" class="post-read-body">
                    <article
                      v-if="post.body_html?.trim()"
                      :key="post.slug"
                      class="post-read markdown-body"
                      v-html="post.body_html"
                      @click="onMarkdownContentClick"
                    />
                    <PostMarkdownBody
                      v-else
                      :key="`${post.slug}-${post.updated_at}`"
                      :markdown="post.body ?? ''"
                      article-class="post-read markdown-body"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside
            class="post-view__panel post-view__panel--right"
            :aria-hidden="!railOpen"
          >
            <div class="post-view__panel-surface post-view__rail-stack">
              <div
                class="compose-panel-card compose-panel-card--catalog post-view__rail-card post-view__rail-card--outline"
              >
                <header class="compose-panel-card__head">
                  <p class="compose-panel-card__title">文档大纲</p>
                </header>
                <div class="compose-panel-card__content">
                  <PostsComposeMdCatalog
                    :model-value="catalogMarkdown"
                    @heading-click="onCatalogHeading"
                  />
                </div>
              </div>
              <div
                class="compose-panel-card post-view__rail-card post-view__rail-card--links"
              >
                <header class="compose-panel-card__head">
                  <p class="compose-panel-card__title">双链</p>
                </header>
                <div class="compose-panel-card__content">
                  <PostWikilinkLinksPanel
                    :inbound="post.inbound_links ?? []"
                    :outbound="post.outbound_links ?? []"
                    base-path="/admin/posts/"
                    variant="admin"
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
        </div>
      </template>
    </main>
  </div>
</template>
