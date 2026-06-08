<script setup lang="ts">
/** @deprecated 请使用 PublicTopNav；保留以兼容旧引用 */
const route = useRoute();
const auth = useAuthStore();
const { profile } = useSiteProfile();

const isKgActive = computed(() => route.path === "/knowledge-graph");

const adminEntryTo = computed(() => (auth.user ? "/admin" : "/login"));
const adminEntryLabel = computed(() => (auth.user ? "管理" : "登录"));

onMounted(() => {
  void auth.fetchMe();
});

const githubHref = computed(() => profile.value.githubUrl?.trim() || "");
const giteeHref = computed(() => profile.value.giteeUrl?.trim() || "");
const emailHref = computed(() => {
  const mail = profile.value.email?.trim();
  if (!mail) return "";
  return mail.startsWith("mailto:") ? mail : `mailto:${mail}`;
});
</script>

<template>
  <header class="top-nav card">
    <div class="profile-card" aria-label="站点信息">
      <img
        :src="profile.avatar"
        :alt="profile.name"
        class="avatar"
        width="40"
        height="40"
      >
      <div class="profile-text">
        <span class="profile-name">{{ profile.name }}</span>
        <span class="profile-bio">{{ profile.bio }}</span>
      </div>
    </div>

    <nav class="top-nav-center">
      <NuxtLink
        to="/knowledge-graph"
        class="kg-planet-btn"
        :class="{ active: isKgActive }"
      >
        知识图谱星球
      </NuxtLink>
    </nav>

    <div class="social-links" aria-label="社交与联系">
      <NuxtLink
        :to="adminEntryTo"
        class="social-link admin-entry-link"
        :title="auth.user ? '进入后台管理' : '登录后台'"
      >
        <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
        <span class="social-label">{{ adminEntryLabel }}</span>
      </NuxtLink>

      <a
        :href="githubHref || '#'"
        class="social-link"
        :class="{ 'social-link--idle': !githubHref }"
        :target="githubHref ? '_blank' : undefined"
        :rel="githubHref ? 'noopener noreferrer' : undefined"
        :title="githubHref ? `GitHub @${profile.githubUsername}` : 'GitHub（未设置）'"
        @click="!githubHref && $event.preventDefault()"
      >
        <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A8.203 8.203 0 0 0 24 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
        <span class="social-label">GitHub</span>
      </a>

      <a
        :href="giteeHref || '#'"
        class="social-link"
        :class="{ 'social-link--idle': !giteeHref }"
        :target="giteeHref ? '_blank' : undefined"
        :rel="giteeHref ? 'noopener noreferrer' : undefined"
        title="Gitee"
        @click="!giteeHref && $event.preventDefault()"
      >
        <span class="social-icon social-icon--gitee" aria-hidden="true">G</span>
        <span class="social-label">Gitee</span>
      </a>

      <a
        :href="emailHref || '#'"
        class="social-link"
        :class="{ 'social-link--idle': !emailHref }"
        :title="emailHref ? profile.email! : '邮箱（未设置）'"
        @click="!emailHref && $event.preventDefault()"
      >
        <svg class="social-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 2v.35l-8 5.2-8-5.2V6h16zM4 18V8.94l7.4 4.81a1 1 0 0 0 1.2 0L20 8.94V18H4z"
          />
        </svg>
        <span class="social-label">邮箱</span>
      </a>
    </div>
  </header>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.top-nav {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  height: var(--topnav-height);
  margin: 0;
  padding: 0 1.25rem;
  flex-shrink: 0;
  border-radius: var(--card-radius);
}

.profile-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-self: start;
  min-width: 0;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
  flex-shrink: 0;
}

.profile-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.profile-name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text);
  line-height: 1.3;
}

.profile-bio {
  font-size: 0.72rem;
  color: var(--muted);
  line-height: 1.4;
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 900px) {
    max-width: 10rem;
  }
}

.top-nav-center {
  justify-self: center;
}

.kg-planet-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s,
    box-shadow 0.15s;

  &:hover {
    background: var(--bg-hover);
    border-color: var(--accent);
    color: var(--accent);
  }

  &.active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
    box-shadow: var(--shadow);
  }
}

.social-links {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  justify-self: end;
  flex-shrink: 0;
}

.social-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 2.25rem;
  min-height: 2.25rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s,
    opacity 0.15s;

  &:hover:not(.social-link--idle) {
    background: var(--bg-hover);
    border-color: var(--text-secondary);
    color: var(--accent);
  }
}

.social-link--idle {
  opacity: 0.72;
  cursor: default;
  color: var(--muted);
}

.social-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}

.social-icon--gitee {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
  color: #c71d23;
  font-family: system-ui, sans-serif;
}

.social-label {
  @media (max-width: 720px) {
    display: none;
  }
}

@media (max-width: 768px) {
  .top-nav {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    height: auto;
    padding: 0.85rem 1rem;
  }

  .profile-card {
    grid-column: 1;
    grid-row: 1;
  }

  .social-links {
    grid-column: 2;
    grid-row: 1;
  }

  .top-nav-center {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: center;
    margin-top: 0.25rem;
  }
}
</style>
