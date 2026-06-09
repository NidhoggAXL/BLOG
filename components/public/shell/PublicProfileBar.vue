<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 首页落地页：签名完整换行显示 */
    expandBio?: boolean;
  }>(),
  { expandBio: false },
);

const auth = useAuthStore();
const { profile } = useSiteProfile();
const route = useRoute();

const isKgActive = computed(() => route.path === "/knowledge-graph");
const adminEntryTo = computed(() => (auth.user ? "/admin" : "/login"));
const adminEntryLabel = computed(() => (auth.user ? "管理" : "登录"));

onMounted(() => {
  void auth.fetchMe();
});

const githubHref = computed(() => profile.value.githubUrl?.trim() || "");
const giteeHref = computed(() => profile.value.giteeUrl?.trim() || "");
const displayEmail = computed(() => {
  const mail = profile.value.email?.trim();
  if (!mail) return "";
  return mail.replace(/^mailto:/i, "");
});
</script>

<template>
  <header
    class="profile-bar card"
    :class="{ 'profile-bar--landing': expandBio }"
    aria-label="站点信息"
  >
    <div class="profile-bar__identity">
      <img
        :src="profile.avatar"
        :alt="profile.name"
        class="profile-bar__avatar"
        width="40"
        height="40"
      >
      <div class="profile-bar__text">
        <span class="profile-bar__name">{{ profile.name }}</span>
        <span
          class="profile-bar__bio"
          :class="{ 'profile-bar__bio--full': expandBio }"
        >{{ profile.bio }}</span>
        <span v-if="displayEmail" class="profile-bar__email">{{ displayEmail }}</span>
      </div>
    </div>

    <nav class="profile-bar__center">
      <NuxtLink
        to="/knowledge-graph"
        class="profile-bar__kg-btn"
        :class="{ 'profile-bar__kg-btn--active': isKgActive }"
      >
        知识图谱星球
      </NuxtLink>
    </nav>

    <div class="profile-bar__actions" aria-label="社交与联系">
      <NuxtLink
        :to="adminEntryTo"
        class="profile-bar__action"
        :title="auth.user ? '进入后台管理' : '登录后台'"
      >
        <svg class="profile-bar__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          />
        </svg>
        <span class="profile-bar__action-label">{{ adminEntryLabel }}</span>
      </NuxtLink>

      <a
        :href="githubHref || '#'"
        class="profile-bar__action"
        :class="{ 'profile-bar__action--idle': !githubHref }"
        :target="githubHref ? '_blank' : undefined"
        :rel="githubHref ? 'noopener noreferrer' : undefined"
        :title="githubHref ? `GitHub @${profile.githubUsername}` : 'GitHub（未设置）'"
        @click="!githubHref && $event.preventDefault()"
      >
        <svg class="profile-bar__icon" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A8.203 8.203 0 0 0 24 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
        <span class="profile-bar__action-label">GitHub</span>
      </a>

      <a
        :href="giteeHref || '#'"
        class="profile-bar__action"
        :class="{ 'profile-bar__action--idle': !giteeHref }"
        :target="giteeHref ? '_blank' : undefined"
        :rel="giteeHref ? 'noopener noreferrer' : undefined"
        title="Gitee"
        @click="!giteeHref && $event.preventDefault()"
      >
        <span class="profile-bar__icon profile-bar__icon--gitee" aria-hidden="true">G</span>
        <span class="profile-bar__action-label">Gitee</span>
      </a>

    </div>
  </header>
</template>

<style scoped lang="less">
@import "~/assets/less/_tokens.less";

.profile-bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
  width: 100%;
  height: var(--topnav-height);
  margin: 0;
  padding: 0 1.25rem;
  border-radius: var(--card-radius);
}

.profile-bar__identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-self: start;
  min-width: 0;
}

.profile-bar__avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
  flex-shrink: 0;
}

.profile-bar__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.profile-bar__name {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text);
  line-height: 1.3;
}

.profile-bar__bio {
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

.profile-bar__bio--full {
  max-width: none;
  overflow: visible;
  text-overflow: unset;
  white-space: normal;
  font-size: 0.82rem;
  line-height: 1.6;
}

.profile-bar__email {
  margin-top: 0.15rem;
  font-size: 0.72rem;
  color: var(--text-secondary);
  line-height: 1.4;
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 900px) {
    max-width: 10rem;
  }
}

.profile-bar--landing .profile-bar__avatar {
  width: 56px;
  height: 56px;
}

.profile-bar--landing .profile-bar__name {
  margin-top: 0.35rem;
  font-size: 1.05rem;
}

.profile-bar--landing .profile-bar__email {
  max-width: none;
  overflow: visible;
  text-overflow: unset;
  white-space: normal;
  margin-top: 0.35rem;
  font-size: 0.85rem;
}

.profile-bar--landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.1rem;
  height: auto;
  min-height: 0;
  padding: 1.75rem 1.5rem 1.5rem;
  text-align: center;

  .profile-bar__identity {
    flex-direction: column;
    align-items: center;
    justify-self: auto;
    width: 100%;
    max-width: 28rem;
  }

  .profile-bar__text {
    align-items: center;
  }

  .profile-bar__center {
    justify-self: auto;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .profile-bar__actions {
    justify-self: auto;
    justify-content: center;
    flex-wrap: wrap;
    width: 100%;
    max-width: 24rem;
  }

  .profile-bar__action-label {
    display: inline;
  }
}

.profile-bar__center {
  justify-self: center;
}

.profile-bar__kg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1.25rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
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

  &--active {
    background: var(--accent-soft);
    border-color: var(--accent);
    color: var(--accent);
    box-shadow: var(--shadow);
  }
}

.profile-bar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.45rem;
  justify-self: end;
  flex-shrink: 0;
}

.profile-bar__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 2.25rem;
  min-height: 2.25rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-elevated);
  color: var(--text);
  text-decoration: none;
  font-size: 0.8125rem;
  font-weight: 500;
  transition:
    background 0.15s,
    border-color 0.15s,
    color 0.15s,
    opacity 0.15s;

  &:hover:not(.profile-bar__action--idle) {
    background: var(--bg-hover);
    border-color: var(--text-secondary);
    color: var(--accent);
  }
}

.profile-bar__action--idle {
  opacity: 0.72;
  cursor: default;
  color: var(--muted);
}

.profile-bar__icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
}

.profile-bar__icon--gitee {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1;
  color: #c71d23;
  font-family: system-ui, sans-serif;
}

.profile-bar__action-label {
  @media (max-width: 720px) {
    display: none;
  }
}

@media (max-width: 768px) {
  .profile-bar {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    height: auto;
    padding: 0.85rem 1rem;
  }

  .profile-bar__identity {
    grid-column: 1;
    grid-row: 1;
  }

  .profile-bar__actions {
    grid-column: 2;
    grid-row: 1;
  }

  .profile-bar__center {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: center;
    margin-top: 0.25rem;
  }
}
</style>
