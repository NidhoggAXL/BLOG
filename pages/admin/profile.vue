<script setup lang="ts">
import type {
  AuthProfile,
  UpdateAuthPasswordPayload,
  UpdateAuthProfilePayload,
} from '~/types/auth'

definePageMeta({
  layout: 'admin',
})

const auth = useAuthStore()
const savingProfile = ref(false)
const savingPassword = ref(false)
const editingProfile = ref(false)
const editingPassword = ref(false)

const profileForm = reactive({
  displayName: '',
  email: '',
  bio: '',
  avatarUrl: '',
  githubUrl: '',
  giteeUrl: '',
  websiteUrl: '',
})

const passwordForm = reactive<UpdateAuthPasswordPayload>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const { data, pending, error } = await useFetch<AuthProfile>('/api/auth/profile', {
  credentials: 'include',
  ...(import.meta.server ? { headers: useRequestHeaders(['cookie']) } : {}),
})

function applyProfile(profile: AuthProfile | null) {
  profileForm.displayName = profile?.displayName ?? ''
  profileForm.email = profile?.email ?? ''
  profileForm.bio = profile?.bio ?? ''
  profileForm.avatarUrl = profile?.avatarUrl ?? ''
  profileForm.githubUrl = profile?.githubUrl ?? ''
  profileForm.giteeUrl = profile?.giteeUrl ?? ''
  profileForm.websiteUrl = profile?.websiteUrl ?? ''
}

watch(
  () => data.value,
  (profile) => applyProfile(profile ?? null),
  { immediate: true },
)

function trimToNull(v: string): string | null {
  const s = v.trim()
  return s ? s : null
}

function displayText(v: string | null | undefined): string {
  const s = String(v ?? '').trim()
  return s || '未设置'
}

function openLink(url: string | null | undefined): string | null {
  const u = String(url ?? '').trim()
  if (!u) return null
  return u
}

function onEditProfile() {
  applyProfile(data.value ?? null)
  editingProfile.value = true
}

function onCancelEditProfile() {
  applyProfile(data.value ?? null)
  editingProfile.value = false
}

async function onSaveProfile() {
  savingProfile.value = true
  try {
    const payload: UpdateAuthProfilePayload = {
      displayName: trimToNull(profileForm.displayName),
      email: trimToNull(profileForm.email),
      bio: trimToNull(profileForm.bio),
      avatarUrl: trimToNull(profileForm.avatarUrl),
      githubUrl: trimToNull(profileForm.githubUrl),
      giteeUrl: trimToNull(profileForm.giteeUrl),
      websiteUrl: trimToNull(profileForm.websiteUrl),
    }
    const res = await $fetch<{ ok: boolean; profile: AuthProfile }>(
      '/api/auth/profile',
      {
        method: 'PUT',
        credentials: 'include',
        body: payload,
      },
    )
    data.value = res.profile
    applyProfile(res.profile)
    await auth.fetchMe()
    editingProfile.value = false
    ElMessage.success('个人信息已保存')
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    ElMessage.error(err?.data?.statusMessage || err?.message || '保存失败')
  } finally {
    savingProfile.value = false
  }
}

async function onChangePassword() {
  if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    ElMessage.warning('请完整填写旧密码与新密码')
    return
  }
  savingPassword.value = true
  try {
    await $fetch('/api/auth/password', {
      method: 'PUT',
      credentials: 'include',
      body: passwordForm,
    })
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    editingPassword.value = false
    await $fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    auth.user = null
    auth.checked = true
    await navigateTo(
      { path: '/login', query: { relogin: '1' } },
      { replace: true },
    )
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    ElMessage.error(err?.data?.statusMessage || err?.message || '修改密码失败')
  } finally {
    savingPassword.value = false
  }
}

function onEditPassword() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  editingPassword.value = true
}

function onCancelEditPassword() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  editingPassword.value = false
}

</script>

<template>
  <div class="profile-page">
    <section class="profile-page__panel">
      <header class="profile-page__card-head">
        <h3>基础信息</h3>
        <div class="profile-page__head-actions">
          <el-button
            v-if="!editingProfile"
            size="small"
            type="primary"
            plain
            :disabled="pending"
            @click="onEditProfile"
          >
            修改信息
          </el-button>
          <el-button
            v-else
            size="small"
            :disabled="savingProfile"
            @click="onCancelEditProfile"
          >
            返回展示
          </el-button>
        </div>
      </header>

      <p v-if="error" class="profile-page__error">
        加载失败：{{ error.message }}
      </p>

      <Transition name="profile-switch" mode="out-in">
        <div v-if="editingProfile" key="profile-edit" class="profile-edit-card">
          <el-form
            label-position="top"
            class="profile-page__form"
            :disabled="pending || savingProfile"
          >
            <el-form-item label="用户名">
              <el-input :model-value="data?.username ?? auth.user?.username ?? ''" disabled />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="profileForm.displayName" placeholder="例如：张三 / coder-neo" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="profileForm.email" placeholder="name@example.com" />
            </el-form-item>
            <el-form-item label="个人简介">
              <el-input
                v-model="profileForm.bio"
                type="textarea"
                :rows="3"
                placeholder="介绍你的技术方向、擅长领域、当前研究内容"
              />
            </el-form-item>
            <el-form-item label="头像 URL">
              <el-input v-model="profileForm.avatarUrl" placeholder="https://..." />
            </el-form-item>
            <el-form-item label="GitHub">
              <el-input v-model="profileForm.githubUrl" placeholder="https://github.com/yourname" />
            </el-form-item>
            <el-form-item label="Gitee">
              <el-input v-model="profileForm.giteeUrl" placeholder="https://gitee.com/yourname" />
            </el-form-item>
            <el-form-item label="个人网站">
              <el-input v-model="profileForm.websiteUrl" placeholder="https://yourdomain.com" />
            </el-form-item>
          </el-form>

          <div class="profile-page__actions">
            <el-button :disabled="savingProfile" @click="onCancelEditProfile">
              取消
            </el-button>
            <el-button type="primary" :loading="savingProfile" @click="onSaveProfile">
              保存信息
            </el-button>
          </div>
        </div>
        <div v-else key="profile-view" class="profile-view">
          <div class="profile-view__top">
            <el-avatar
              :size="64"
              :src="openLink(data?.avatarUrl)"
            >
              {{ (data?.displayName || data?.username || '?').slice(0, 1).toUpperCase() }}
            </el-avatar>
            <div class="profile-view__title">
              <p class="profile-view__name">{{ displayText(data?.displayName) }}</p>
              <p class="profile-view__username">@{{ data?.username ?? auth.user?.username ?? 'unknown' }}</p>
            </div>
          </div>
          <div class="profile-view__grid">
            <div class="profile-view__item">
              <p class="profile-view__label">邮箱</p>
              <p class="profile-view__value">{{ displayText(data?.email) }}</p>
            </div>
            <div class="profile-view__item">
              <p class="profile-view__label">GitHub</p>
              <a
                v-if="openLink(data?.githubUrl)"
                class="profile-view__link"
                :href="openLink(data?.githubUrl)!"
                target="_blank"
                rel="noopener noreferrer"
              >{{ openLink(data?.githubUrl) }}</a>
              <p v-else class="profile-view__value">未设置</p>
            </div>
            <div class="profile-view__item">
              <p class="profile-view__label">Gitee</p>
              <a
                v-if="openLink(data?.giteeUrl)"
                class="profile-view__link"
                :href="openLink(data?.giteeUrl)!"
                target="_blank"
                rel="noopener noreferrer"
              >{{ openLink(data?.giteeUrl) }}</a>
              <p v-else class="profile-view__value">未设置</p>
            </div>
            <div class="profile-view__item">
              <p class="profile-view__label">个人网站</p>
              <a
                v-if="openLink(data?.websiteUrl)"
                class="profile-view__link"
                :href="openLink(data?.websiteUrl)!"
                target="_blank"
                rel="noopener noreferrer"
              >{{ openLink(data?.websiteUrl) }}</a>
              <p v-else class="profile-view__value">未设置</p>
            </div>
            <div class="profile-view__item profile-view__item--wide">
              <p class="profile-view__label">个人简介</p>
              <p class="profile-view__value profile-view__bio">{{ displayText(data?.bio) }}</p>
            </div>
          </div>
        </div>
      </Transition>

      <div class="profile-page__divider" />

      <header class="profile-page__card-head profile-page__card-head--sub">
        <h3>密码设置</h3>
        <el-button
          v-if="!editingPassword"
          size="small"
          type="warning"
          plain
          :disabled="savingPassword"
          @click="onEditPassword"
        >
          修改密码
        </el-button>
        <el-button
          v-else
          size="small"
          :disabled="savingPassword"
          @click="onCancelEditPassword"
        >
          返回展示
        </el-button>
      </header>

      <Transition name="profile-switch-sub" mode="out-in">
        <div v-if="editingPassword" key="password-edit" class="profile-edit-card">
          <el-form label-position="top" class="profile-page__form" :disabled="savingPassword">
            <el-form-item label="旧密码">
              <el-input
                v-model="passwordForm.currentPassword"
                type="password"
                show-password
                autocomplete="current-password"
              />
            </el-form-item>
            <el-form-item label="新密码（至少 8 位）">
              <el-input
                v-model="passwordForm.newPassword"
                type="password"
                show-password
                autocomplete="new-password"
              />
            </el-form-item>
            <el-form-item label="确认新密码">
              <el-input
                v-model="passwordForm.confirmPassword"
                type="password"
                show-password
                autocomplete="new-password"
                @keyup.enter="onChangePassword"
              />
            </el-form-item>
          </el-form>

          <div class="profile-page__actions">
            <el-button :disabled="savingPassword" @click="onCancelEditPassword">
              取消
            </el-button>
            <el-button type="warning" :loading="savingPassword" @click="onChangePassword">
              提交修改
            </el-button>
          </div>
        </div>
        <div v-else key="password-view" class="profile-page__password-wrap">
          <p class="profile-page__password-tip">
            为了账号安全，修改密码前需要输入旧密码并进行二次确认。
          </p>
        </div>
      </Transition>
    </section>
  </div>
</template>

<style scoped lang="less">
.profile-page {
  display: block;
}

.profile-page__panel {
  min-height: 0;
  padding: 4px 2px;
}

.profile-page__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.profile-page__head-actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.profile-page__card-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.profile-page__card-head--sub {
  margin-top: 0;
  margin-bottom: 10px;
}

.profile-page__error {
  margin: 0 0 8px;
  color: #e85d5d;
  font-size: 12px;
}

.profile-page__form :deep(.el-form-item) {
  margin-bottom: 10px;
}

.profile-page__form {
  width: 100%;
  max-width: 640px;
}

.profile-page__form :deep(.el-input),
.profile-page__form :deep(.el-textarea) {
  max-width: 640px;
}

.profile-page__form :deep(.el-input__wrapper),
.profile-page__form :deep(.el-textarea__inner) {
  border-radius: 8px;
}

.profile-page__actions {
  display: flex;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 8px;
}

.profile-edit-card {
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--admin-border);
  background: color-mix(in srgb, var(--admin-nav-hover) 50%, transparent);
}

.profile-page__password-wrap {
  min-height: 24px;
}

.profile-switch-enter-active,
.profile-switch-leave-active,
.profile-switch-sub-enter-active,
.profile-switch-sub-leave-active {
  transition:
    opacity 0.26s cubic-bezier(0.22, 0.61, 0.36, 1),
    transform 0.26s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.profile-switch-enter-from,
.profile-switch-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

.profile-switch-sub-enter-from,
.profile-switch-sub-leave-to {
  opacity: 0;
  transform: translateY(3px);
}

.profile-page__password-tip {
  margin: 0;
  color: var(--admin-muted);
  font-size: 13px;
  line-height: 1.65;
}

.profile-page__divider {
  height: 1px;
  margin: 14px 0 12px;
  background: var(--admin-border);
}

.profile-view {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.profile-view__top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.profile-view__title {
  min-width: 0;
}

.profile-view__name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.profile-view__username {
  margin: 3px 0 0;
  color: var(--admin-muted);
  font-size: 12px;
}

.profile-view__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.profile-view__item {
  padding: 10px;
  border-radius: 8px;
  border: 1px solid var(--admin-border);
  background: color-mix(in srgb, var(--admin-nav-hover) 60%, transparent);
  min-width: 0;
}

/* 第二行：个人网站占 1 列，简介占 2 列，避免中间留空 */
.profile-view__item--wide {
  grid-column: span 2;
}

.profile-view__label {
  margin: 0 0 6px;
  color: var(--admin-muted);
  font-size: 12px;
}

.profile-view__value {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.profile-view__bio {
  white-space: pre-wrap;
  word-break: break-word;
}

.profile-view__link {
  color: var(--admin-text);
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 2px;
  word-break: break-all;
}

@media (max-width: 960px) {
  .profile-view__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-view__item--wide {
    grid-column: 1 / -1;
  }
}

@media (max-width: 1120px) {
  .profile-page__form {
    max-width: 100%;
  }

  .profile-page__form :deep(.el-input),
  .profile-page__form :deep(.el-textarea) {
    max-width: 100%;
  }
}

@media (max-width: 640px) {
  .profile-view__grid {
    grid-template-columns: 1fr;
  }

  .profile-view__item--wide {
    grid-column: auto;
  }
}
</style>
