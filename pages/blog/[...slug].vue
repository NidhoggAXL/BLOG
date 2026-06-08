<script setup lang="ts">
import type { PublicPostDetail } from "~/types/blog";

definePageMeta({ layout: "default" });

const route = useRoute();
const { posts: postIndex } = useBlogContent();

const slug = computed(() => {
  const param = route.params.slug;
  if (Array.isArray(param)) {
    return param.join("/");
  }
  return param ? String(param) : "";
});

const { data, status, refresh: refreshPostFetch } = useFetch<PublicPostDetail | null>(
  () => `/api/public/posts/${encodeURIComponent(slug.value)}`,
  {
    key: () => `public-post:${slug.value}`,
    default: () => null,
    watch: [slug],
    dedupe: "cancel",
  },
);

const { refreshing: catalogRefreshing } = usePublicContentRefresh();

watch(catalogRefreshing, async (busy, wasBusy) => {
  if (wasBusy && !busy && slug.value) {
    await refreshPostFetch();
  }
});

const post = computed(() => {
  const row = data.value;
  if (!row || row.slug !== slug.value) return null;
  return row;
});

const isStaleData = computed(() => {
  const row = data.value;
  return !!row && row.slug !== slug.value;
});

const isContentLoading = computed(() => {
  if (!slug.value) return false;
  if (status.value === "pending") return true;
  if (isStaleData.value) return true;
  if (post.value) return false;
  return status.value !== "success" && status.value !== "error";
});

const showNotFound = computed(
  () =>
    !isContentLoading.value &&
    !post.value &&
    (status.value === "success" || status.value === "error"),
);

const pendingTitle = computed(() => {
  const meta = postIndex.value.find((p) => p.slug === slug.value);
  return meta?.title?.trim() || slug.value || "文章";
});

const similarSlugHint = computed(() => {
  if (!slug.value.includes("分布")) return null;
  const candidate = slug.value.replace(/分布/g, "分区");
  if (candidate === slug.value) return null;
  return postIndex.value.some((p) => p.slug === candidate) ? candidate : null;
});

const similarTitle = computed(() => {
  if (!similarSlugHint.value) return "";
  const meta = postIndex.value.find((p) => p.slug === similarSlugHint.value);
  return meta?.title ?? similarSlugHint.value;
});

const { tocRailOpen } = useBlogReadPanels();

const headings = computed(() =>
  post.value?.body_html ? extractHeadingsFromHtml(post.value.body_html) : [],
);

function extractHeadingsFromHtml(html: string) {
  if (!import.meta.client && !html) return [];
  const matches = [...html.matchAll(/<h([1-6])[^>]*id="([^"]*)"[^>]*>(.*?)<\/h\1>/gi)];
  return matches.map((m) => ({
    level: Number(m[1]),
    id: m[2],
    text: m[3].replace(/<[^>]+>/g, "").trim(),
  }));
}

watch(slug, (next, prev) => {
  if (next === prev || !import.meta.client) return;
  document.querySelector<HTMLElement>(".post-scroll")?.scrollTo({ top: 0 });
});

useHead(() => ({
  title: isContentLoading.value
    ? pendingTitle.value
    : (post.value?.title ?? pendingTitle.value ?? "文章"),
}));

function scrollToRouteHash() {
  if (!import.meta.client) return;
  const hash = route.hash;
  if (!hash) return;
  const id = hash.replace(/^#/, "");
  nextTick(() => {
    document.getElementById(id)?.scrollIntoView({ block: "start" });
  });
}

watch(
  () => post.value,
  (p) => {
    if (p) scrollToRouteHash();
  },
);

onMounted(() => {
  if (post.value) scrollToRouteHash();
});
</script>

<template>
  <PublicMainShell class="blog-read-page">
    <div class="blog-read-page__workspace">
      <div
        class="blog-read-page__grid"
        :class="{ 'blog-read-page__grid--toc-open': tocRailOpen }"
      >
        <PublicArticleMain
          :post="post"
          :loading="isContentLoading"
          :show-not-found="showNotFound"
          :slug="slug"
          :pending-title="pendingTitle"
          :similar-slug-hint="similarSlugHint"
          :similar-title="similarTitle"
        />
        <PublicTocRail
          :headings="headings"
          :post="post"
          :loading="isContentLoading"
          :open="tocRailOpen"
        />
      </div>
    </div>
  </PublicMainShell>
</template>
