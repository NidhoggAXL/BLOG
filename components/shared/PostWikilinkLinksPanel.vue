<script setup lang="ts">
import type { PostWikilinkRef } from "~/types/post";

const props = withDefaults(
  defineProps<{
    inbound?: PostWikilinkRef[];
    outbound?: PostWikilinkRef[];
    /** 文章详情路径前缀，如 /blog/ 或 /admin/posts/ */
    basePath?: string;
    variant?: "public" | "admin";
  }>(),
  {
    inbound: () => [],
    outbound: () => [],
    basePath: "/blog/",
    variant: "public",
  },
);

type WikilinkTab = "inbound" | "outbound";

const activeTab = ref<WikilinkTab>("inbound");

const tabs = computed(() => [
  {
    id: "inbound" as const,
    label: "入链",
    hint: "引用本文的文章",
    count: props.inbound.length,
    items: props.inbound,
    empty: "暂无入链",
  },
  {
    id: "outbound" as const,
    label: "出链",
    hint: "本文引用的文章",
    count: props.outbound.length,
    items: props.outbound,
    empty: "暂无出链",
  },
]);

const activePanel = computed(
  () => tabs.value.find((t) => t.id === activeTab.value) ?? tabs.value[0]!,
);

function postHref(slug: string) {
  const base = props.basePath.endsWith("/") ? props.basePath : `${props.basePath}/`;
  return `${base}${encodeURIComponent(slug)}`;
}

function linkLabel(ref: PostWikilinkRef) {
  const title = ref.title?.trim();
  return title || ref.slug;
}

function selectTab(id: WikilinkTab) {
  activeTab.value = id;
}
</script>

<template>
  <div
    class="wikilink-panel"
    :class="variant === 'admin' ? 'wikilink-panel--admin' : 'wikilink-panel--public'"
  >
    <div class="wikilink-panel__tabs" role="tablist" aria-label="双链类型">
      <button
        v-for="tab in tabs"
        :id="`wikilink-tab-${tab.id}`"
        :key="tab.id"
        type="button"
        role="tab"
        class="wikilink-panel__tab"
        :class="{ 'wikilink-panel__tab--active': activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        @click="selectTab(tab.id)"
      >
        <span class="wikilink-panel__tab-label">{{ tab.label }}</span>
        <span v-if="tab.count > 0" class="wikilink-panel__tab-count">{{ tab.count }}</span>
      </button>
    </div>

    <section
      class="wikilink-panel__section"
      role="tabpanel"
      :aria-labelledby="`wikilink-tab-${activePanel.id}`"
    >
      <p class="wikilink-panel__hint">{{ activePanel.hint }}</p>
      <ul v-if="activePanel.items.length" class="wikilink-panel__list">
        <li
          v-for="item in activePanel.items"
          :key="`${activePanel.id}-${item.slug}`"
          class="wikilink-panel__item"
        >
          <NuxtLink :to="postHref(item.slug)" class="wikilink-panel__link">
            {{ linkLabel(item) }}
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="wikilink-panel__empty">{{ activePanel.empty }}</p>
    </section>
  </div>
</template>

<style scoped lang="less">
@import "~/assets/styles/variables.less";

.wikilink-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.wikilink-panel__tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: @radius-md;
  flex-shrink: 0;
}

.wikilink-panel__tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex: 1;
  min-height: 32px;
  padding: 6px 10px;
  border: none;
  border-radius: @radius-sm;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background @transition-fast,
    color @transition-fast,
    box-shadow @transition-fast;
}

.wikilink-panel__tab-label {
  line-height: 1.2;
}

.wikilink-panel__tab-count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.wikilink-panel__section {
  min-height: 0;
}

.wikilink-panel__hint {
  margin: 0 0 8px;
  font-size: 11px;
  line-height: 1.4;
}

.wikilink-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.wikilink-panel__item {
  margin-bottom: 4px;
}

.wikilink-panel__link {
  display: block;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.45;
  text-decoration: none;
  word-break: break-word;
  transition:
    background 0.12s,
    color 0.12s;
}

.wikilink-panel__empty {
  margin: 0;
  font-size: 12px;
}

.wikilink-panel--public {
  .wikilink-panel__tabs {
    background: var(--bg-subtle, color-mix(in srgb, var(--text) 6%, transparent));
  }

  .wikilink-panel__tab {
    color: var(--muted);

    &:hover:not(.wikilink-panel__tab--active) {
      color: var(--text-secondary);
      background: var(--bg-hover);
    }
  }

  .wikilink-panel__tab--active {
    color: var(--text);
    background: var(--card-bg, var(--bg));
    box-shadow: 0 1px 2px color-mix(in srgb, var(--text) 8%, transparent);
  }

  .wikilink-panel__tab-count {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
  }

  .wikilink-panel__tab:not(.wikilink-panel__tab--active) .wikilink-panel__tab-count {
    background: var(--bg-hover);
    color: var(--muted);
  }

  .wikilink-panel__hint,
  .wikilink-panel__empty {
    color: var(--muted);
  }

  .wikilink-panel__link {
    color: var(--text-secondary);

    &:hover {
      background: var(--bg-hover);
      color: var(--accent);
    }
  }
}

.wikilink-panel--admin {
  .wikilink-panel__tabs {
    background: var(--admin-nav-hover, color-mix(in srgb, var(--admin-text) 6%, transparent));
    border: 1px solid var(--admin-border);
  }

  .wikilink-panel__tab {
    color: var(--admin-muted, var(--muted));

    &:hover:not(.wikilink-panel__tab--active) {
      color: var(--admin-text, var(--text));
      background: color-mix(in srgb, var(--admin-text) 6%, transparent);
    }
  }

  .wikilink-panel__tab--active {
    color: var(--admin-text, var(--text));
    background: var(--admin-toolbar-bg, var(--card-bg));
    box-shadow: 0 1px 2px color-mix(in srgb, var(--admin-text) 10%, transparent);
  }

  .wikilink-panel__tab-count {
    background: color-mix(in srgb, var(--el-color-primary, #409eff) 18%, transparent);
    color: var(--el-color-primary, var(--accent));
  }

  .wikilink-panel__tab:not(.wikilink-panel__tab--active) .wikilink-panel__tab-count {
    background: var(--admin-border);
    color: var(--admin-muted, var(--muted));
  }

  .wikilink-panel__hint,
  .wikilink-panel__empty {
    color: var(--admin-muted, var(--muted));
  }

  .wikilink-panel__link {
    color: var(--admin-text, var(--text));

    &:hover {
      background: var(--admin-nav-hover, var(--bg-hover));
      color: var(--el-color-primary, var(--accent));
    }
  }
}
</style>
