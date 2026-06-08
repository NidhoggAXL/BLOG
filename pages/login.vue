<script setup lang="ts">
import { Hide, View } from '@element-plus/icons-vue'
import { encryptPasswordRsaOaep, fetchAuthPublicKey } from '~/utils/authClientCrypto'

definePageMeta({
  layout: false,
})

useHead({
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const route = useRoute()
const auth = useAuthStore()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberPassword = ref(false)
const submitting = ref(false)
const errorMsg = ref('')

const STORAGE_REMEMBER = 'blog-cms.auth.remember-password'
const STORAGE_USERNAME = 'blog-cms.auth.username'
const STORAGE_PASSWORD = 'blog-cms.auth.password'

onMounted(() => {
  if (!import.meta.client) return
  rememberPassword.value = localStorage.getItem(STORAGE_REMEMBER) === '1'
  username.value = localStorage.getItem(STORAGE_USERNAME) || ''
  if (rememberPassword.value) {
    password.value = localStorage.getItem(STORAGE_PASSWORD) || ''
  }
})

async function onSubmit() {
  errorMsg.value = ''
  const u = username.value.trim()
  const p = password.value
  if (!u) {
    errorMsg.value = '请输入用户名'
    return
  }
  if (!p) {
    errorMsg.value = '请输入密码'
    return
  }

  submitting.value = true
  try {
    const publicKey = await fetchAuthPublicKey()
    const passwordCipher = await encryptPasswordRsaOaep(publicKey, p)
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { username: u, passwordCipher },
    })
    if (import.meta.client) {
      localStorage.setItem(STORAGE_REMEMBER, rememberPassword.value ? '1' : '0')
      localStorage.setItem(STORAGE_USERNAME, u)
      if (rememberPassword.value) {
        localStorage.setItem(STORAGE_PASSWORD, p)
      } else {
        localStorage.removeItem(STORAGE_PASSWORD)
      }
    }
    await auth.fetchMe()
    const redirect =
      typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
        ? route.query.redirect
        : '/admin'
    await navigateTo(redirect)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value =
      err?.data?.message || err?.message || '登录失败，请检查用户名和密码'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-page__backdrop" aria-hidden="true">
      <div class="login-page__bg" />
    </div>

    <div class="login-shell">
      <div class="login-panel">
        <div class="login-panel__avatar" aria-hidden="true">
          <span class="login-panel__avatar-inner">博</span>
        </div>

        <h1 class="login-panel__title">博客后台</h1>
        <p class="login-panel__subtitle">欢迎回来，请登录您的帐号</p>

        <form class="login-panel__form" @submit.prevent="onSubmit">
          <p v-if="errorMsg" class="login-panel__error" role="alert">{{ errorMsg }}</p>

          <div class="login-panel__field">
            <input
              id="login-username"
              v-model="username"
              class="login-panel__input"
              type="text"
              name="username"
              autocomplete="username"
              placeholder="用户名"
              :disabled="submitting"
            />
          </div>

          <div class="login-panel__field login-panel__field--password">
            <input
              id="login-password"
              v-model="password"
              class="login-panel__input login-panel__input--password"
              :type="showPassword ? 'text' : 'password'"
              name="password"
              autocomplete="current-password"
              placeholder="密码"
              maxlength="200"
              :disabled="submitting"
            />
            <button
              type="button"
              class="login-panel__password-toggle"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              :title="showPassword ? '隐藏密码' : '显示密码'"
              tabindex="-1"
              :disabled="submitting"
              @click="showPassword = !showPassword"
            >
              <el-icon :size="18">
                <Hide v-if="showPassword" />
                <View v-else />
              </el-icon>
            </button>
          </div>

          <label class="login-panel__remember">
            <input
              v-model="rememberPassword"
              class="login-panel__remember-input"
              type="checkbox"
              :disabled="submitting"
            />
            <span>记住密码</span>
          </label>

          <button class="login-panel__submit" type="submit" :disabled="submitting">
            {{ submitting ? '登录中…' : '登 录' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style lang="less">
@import "~/assets/styles/login.less";
</style>
