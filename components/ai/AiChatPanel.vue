<script setup lang="ts">
import { Delete, Promotion, VideoPause } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import type { ChatMessageItem } from '~/types/ai'
import { useAiChatStore } from '~/stores/aiChat'
import { parseMarkdownToHtml } from '~/utils/markedSetup'
import { confirmAction } from '~/utils/confirmDialog'
import {
  isRagFallbackOnlyAnswer,
  sanitizeRagAssistantAnswer,
} from '~/utils/ragAnswerSanitize'

export type { ChatMessageItem } from '~/types/ai'

const props = defineProps<{
  disabled?: boolean
}>()

const aiChat = useAiChatStore()
const { messages, assistantHtmlById, sending, hasMessages, isStreaming } =
  storeToRefs(aiChat)

const input = ref('')
const renderTimers = new Map<string, ReturnType<typeof setTimeout>>()
const activeAbort = ref<AbortController | null>(null)
let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null

const canStop = computed(() => sending.value || isStreaming.value)

const canSend = computed(
  () => !props.disabled && !sending.value && input.value.trim().length > 0,
)

const canClear = computed(
  () => hasMessages.value && !sending.value && !isStreaming.value,
)

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function clearRenderTimers() {
  for (const timer of renderTimers.values()) clearTimeout(timer)
  renderTimers.clear()
}

async function renderAssistantMessage(msg: ChatMessageItem) {
  if (msg.role !== 'assistant' || msg.error) {
    assistantHtmlById.value[msg.id] = ''
    return
  }
  const text = msg.content.trim()
  if (!text) {
    assistantHtmlById.value[msg.id] = ''
    return
  }
  try {
    assistantHtmlById.value[msg.id] = await parseMarkdownToHtml(text)
  } catch {
    assistantHtmlById.value[msg.id] = ''
  }
}

function scheduleAssistantRender(msg: ChatMessageItem) {
  if (msg.role !== 'assistant' || msg.error || msg.streaming) return
  const pending = renderTimers.get(msg.id)
  if (pending) clearTimeout(pending)
  renderTimers.set(
    msg.id,
    setTimeout(() => {
      renderTimers.delete(msg.id)
      void renderAssistantMessage(msg)
    }, 0),
  )
}

watch(
  messages,
  (list) => {
    for (const msg of list) scheduleAssistantRender(msg)
  },
  { deep: true, immediate: true },
)

onBeforeUnmount(() => {
  clearRenderTimers()
  activeAbort.value?.abort()
  void activeReader?.cancel()
})

function finalizeAssistantMessage(assistantId: string, opts?: { stopped?: boolean }) {
  const target = messages.value.find((m) => m.id === assistantId)
  if (!target) return
  target.streaming = false
  if (opts?.stopped) {
    target.stopped = true
    if (!target.content.trim()) {
      target.content = '（已停止生成）'
    }
    return
  }
  if (!target.error && target.content) {
    target.content = sanitizeRagAssistantAnswer(target.content, {
      hasRetrievedChunks: (target.sources?.length ?? 0) > 0,
    })
    if (isRagFallbackOnlyAnswer(target.content)) {
      target.sources = []
    }
  }
}

function processSseBlock(
  assistantId: string,
  eventName: string,
  dataLine: string,
) {
  const target = messages.value.find((m) => m.id === assistantId)
  if (!target) return

  if (eventName === 'chunk') {
    const payload = JSON.parse(dataLine) as { content?: string }
    target.content += payload.content ?? ''
  } else if (eventName === 'sources') {
    const payload = JSON.parse(dataLine) as {
      sources?: { slug: string; title: string }[]
    }
    target.sources = payload.sources ?? []
  } else if (eventName === 'error') {
    const payload = JSON.parse(dataLine) as { message?: string }
    target.content = payload.message || '问答失败'
    target.error = true
    target.streaming = false
  } else if (eventName === 'done') {
    finalizeAssistantMessage(assistantId)
  }
}

function onStop() {
  activeAbort.value?.abort()
  void activeReader?.cancel()
}

async function onClearSession() {
  if (!canClear.value) return
  try {
    await confirmAction(
      '确定清空本次访问的所有问答记录吗？此操作不可恢复。',
      '清空对话',
      {
        confirmButtonText: '清空',
        cancelButtonText: '取消',
      },
    )
    clearRenderTimers()
    activeAbort.value?.abort()
    void activeReader?.cancel()
    aiChat.clearSession()
    input.value = ''
    ElMessage.success('对话已清空')
  } catch {
    /* 用户取消 */
  }
}

async function onSend() {
  const text = input.value.trim()
  if (!text || sending.value || props.disabled) return

  const userMsg: ChatMessageItem = { id: uid(), role: 'user', content: text }
  const assistantId = uid()
  messages.value.push(userMsg, {
    id: assistantId,
    role: 'assistant',
    content: '',
    streaming: true,
  })
  input.value = ''
  sending.value = true

  activeAbort.value?.abort()
  const abort = new AbortController()
  activeAbort.value = abort

  try {
    const res = await fetch('/api/public/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
      signal: abort.signal,
    })

    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null
      throw new Error(err?.message || `请求失败 (${res.status})`)
    }

    const reader = res.body?.getReader()
    if (!reader) throw new Error('无法读取流式响应')
    activeReader = reader

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      if (abort.signal.aborted) break
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() ?? ''

      for (const block of blocks) {
        const lines = block.split('\n')
        let eventName = 'message'
        let dataLine = ''
        for (const line of lines) {
          if (line.startsWith('event:')) eventName = line.slice(6).trim()
          if (line.startsWith('data:')) dataLine = line.slice(5).trim()
        }
        if (!dataLine) continue
        processSseBlock(assistantId, eventName, dataLine)
      }
    }

    if (abort.signal.aborted) {
      finalizeAssistantMessage(assistantId, { stopped: true })
    } else {
      finalizeAssistantMessage(assistantId)
    }
  } catch (e: unknown) {
    const err = e as { name?: string; message?: string }
    if (err.name === 'AbortError' || abort.signal.aborted) {
      finalizeAssistantMessage(assistantId, { stopped: true })
      return
    }
    const target = messages.value.find((m) => m.id === assistantId)
    if (target) {
      target.content = err.message || 'AI 服务不可用，请确认 Ollama 已启动'
      target.error = true
      target.streaming = false
    }
  } finally {
    activeReader = null
    if (activeAbort.value === abort) {
      activeAbort.value = null
    }
    sending.value = false
    nextTick(() => scrollToBottom())
  }
}

const listRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  const el = listRef.value
  if (el) el.scrollTop = el.scrollHeight
}

watch(
  () => messages.value.map((m) => m.content).join(''),
  () => nextTick(() => scrollToBottom()),
)
</script>

<template>
  <div class="ai-chat-panel">
    <div class="ai-chat-panel__body">
      <section class="ai-chat-panel__messages-card">
        <header class="ai-chat-panel__toolbar">
          <el-tooltip
            :disabled="canClear"
            content="回答生成中，请稍后再清空"
            placement="bottom"
          >
            <span class="ai-chat-panel__clear-wrap">
              <el-button
                text
                type="danger"
                :icon="Delete"
                :disabled="!canClear"
                @click="onClearSession"
              >
                清空对话
              </el-button>
            </span>
          </el-tooltip>
        </header>

        <div ref="listRef" class="ai-chat-panel__messages">
      <p v-if="!messages.length" class="ai-chat-panel__empty">
        向知识库提问，AI 将根据已发布笔记回答并附上来源链接。
      </p>
      <article
        v-for="msg in messages"
        :key="msg.id"
        class="ai-chat-panel__msg"
        :class="[
          `ai-chat-panel__msg--${msg.role}`,
          { 'ai-chat-panel__msg--error': msg.error },
        ]"
      >
        <p class="ai-chat-panel__msg-label">{{ msg.role === 'user' ? '你' : '知识库' }}</p>
        <p v-if="msg.role === 'user'" class="ai-chat-panel__msg-body">
          {{ msg.content }}
        </p>
        <div
          v-else-if="msg.error"
          class="ai-chat-panel__msg-body ai-chat-panel__msg-body--plain"
        >
          {{ msg.content }}
        </div>
        <p
          v-else-if="msg.streaming"
          class="ai-chat-panel__msg-body ai-chat-panel__msg-body--streaming"
        >
          <span class="ai-chat-panel__stream-text">{{ msg.content }}</span
          ><span class="ai-chat-panel__cursor" aria-hidden="true">▍</span>
        </p>
        <div
          v-else
          class="ai-chat-panel__msg-body markdown-body ai-chat-panel__markdown"
        >
          <!-- eslint-disable-next-line vue/no-v-html -->
          <div v-if="assistantHtmlById[msg.id]" v-html="assistantHtmlById[msg.id]" />
          <p v-else-if="msg.content.trim()" class="ai-chat-panel__msg-fallback">
            {{ msg.content }}
          </p>
        </div>
        <ul
          v-if="msg.sources?.length && !isRagFallbackOnlyAnswer(msg.content)"
          class="ai-chat-panel__sources"
        >
          <li v-for="src in msg.sources" :key="src.slug">
            <NuxtLink :to="`/blog/${src.slug}`">{{ src.title }}</NuxtLink>
          </li>
        </ul>
      </article>
        </div>
      </section>

      <form class="ai-chat-panel__composer" @submit.prevent="canStop ? onStop() : onSend()">
      <label class="ai-chat-panel__composer-label" for="ai-chat-input">
        输入问题
      </label>
      <el-input
        id="ai-chat-input"
        v-model="input"
        class="ai-chat-panel__input"
        type="textarea"
        :rows="3"
        resize="none"
        placeholder="例如：我写过哪些关于 Nuxt 的内容？"
        :disabled="disabled || sending"
        @keydown.enter.exact.prevent="!canStop && onSend()"
      />
      <el-button
        v-if="canStop"
        class="ai-chat-panel__stop-btn"
        type="danger"
        plain
        :icon="VideoPause"
        native-type="button"
        @click="onStop"
      >
        停止
      </el-button>
      <el-button
        v-else
        class="ai-chat-panel__send-btn"
        :type="canSend ? 'primary' : 'default'"
        :icon="Promotion"
        :disabled="!canSend"
        native-type="submit"
      >
        发送
      </el-button>
      </form>
    </div>
  </div>
</template>

<style scoped lang="less">
.ai-chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.ai-chat-panel__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ai-chat-panel__messages-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--ai-panel-card-border, var(--ai-panel-border, var(--border)));
  background: var(--ai-panel-messages-bg, var(--ai-panel-msg-assistant-bg, var(--bg-hover)));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.ai-chat-panel__toolbar {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  padding: 0 2px 6px;
  margin-bottom: 4px;
}

.ai-chat-panel__clear-wrap {
  display: inline-flex;
}

.ai-chat-panel__messages {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding: 4px 2px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
}

.ai-chat-panel__empty {
  margin: 0;
  padding: 24px 8px;
  text-align: center;
  font-size: 13px;
  line-height: 1.55;
  color: var(--ai-panel-muted, var(--muted));
}

.ai-chat-panel__msg {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--ai-panel-border, var(--border));
  background: var(--ai-panel-msg-bg, var(--bg));
  box-shadow: var(--ai-panel-msg-shadow, none);
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.ai-chat-panel__msg--user {
  background: var(--ai-panel-msg-user-bg, var(--accent-soft));
  border-color: var(--ai-panel-msg-user-border, var(--accent));
}

.ai-chat-panel__msg--assistant {
  background: var(--ai-panel-msg-assistant-bg, var(--bg-hover));
}

.ai-chat-panel__msg--error {
  border-color: var(--el-color-danger-light-5, #fab6b6);
}

.ai-chat-panel__msg-body--streaming {
  white-space: pre-wrap;
}

.ai-chat-panel__stream-text {
  color: var(--ai-panel-text, var(--text));
}

.ai-chat-panel__msg-label {
  margin: 0 0 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--ai-panel-muted, var(--muted));
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.ai-chat-panel__msg-body {
  margin: 0;
  font-size: 14px;
  line-height: 1.55;
  word-break: break-word;
  color: var(--ai-panel-text, var(--text));
}

.ai-chat-panel__msg--assistant .ai-chat-panel__msg-body {
  color: var(--ai-panel-text, var(--text));
}

.ai-chat-panel__msg-body--plain {
  white-space: pre-wrap;
}

.ai-chat-panel__markdown {
  padding: 0;
  font-size: 14px;
  background: transparent !important;
  color: var(--text);

  :deep(p),
  :deep(ul),
  :deep(ol),
  :deep(blockquote),
  :deep(li),
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6),
  :deep(strong),
  :deep(em),
  :deep(code) {
    color: inherit;
  }

  :deep(a) {
    color: var(--ai-panel-accent, var(--accent));
  }

  :deep(p),
  :deep(ul),
  :deep(ol),
  :deep(blockquote) {
    margin-top: 0;
    margin-bottom: 0.65em;
  }

  :deep(p:last-child),
  :deep(ul:last-child),
  :deep(ol:last-child) {
    margin-bottom: 0;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 1.25em;
  }
}

.ai-chat-panel__msg-fallback {
  margin: 0;
  white-space: pre-wrap;
  color: var(--text);
}

.ai-chat-panel__cursor {
  display: inline-block;
  margin-left: 1px;
  color: var(--ai-panel-accent, var(--accent));
  animation: ai-blink 1s step-end infinite;
}

@keyframes ai-blink {
  50% {
    opacity: 0;
  }
}

.ai-chat-panel__sources {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;

  a {
    color: var(--ai-panel-accent, var(--accent));
    font-weight: 500;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

.ai-chat-panel__composer {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--ai-panel-card-border, var(--ai-panel-composer-border, var(--border)));
  background: var(--ai-panel-composer-bg, var(--bg-hover));
  box-shadow: var(--ai-panel-composer-shadow, none);
}

.ai-chat-panel__composer-label {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ai-panel-muted, var(--muted));
}
</style>

<style lang="less">
/** 跟随站点 data-theme，避免 github-markdown 仅按 OS prefers-color-scheme 把正文染成白字 */
[data-theme='light'] .ai-chat-panel__markdown.markdown-body,
html.theme-light .ai-chat-panel__markdown.markdown-body {
  color-scheme: light;
  color: var(--ai-panel-text, #000);
  background-color: transparent !important;
  --fgColor-default: var(--ai-panel-text, #000);
  --fgColor-muted: var(--ai-panel-muted, #333);
  --fgColor-accent: var(--ai-panel-accent, #145a82);
  --bgColor-default: transparent;
  --bgColor-muted: var(--bg-hover);
  --borderColor-default: var(--border);
}

[data-theme='dark'] .ai-chat-panel__markdown.markdown-body,
html.theme-dark .ai-chat-panel__markdown.markdown-body,
html.dark .ai-chat-panel__markdown.markdown-body {
  color-scheme: dark;
  color: var(--ai-panel-text, #f0f3f6);
  background-color: transparent !important;
  --fgColor-default: var(--ai-panel-text, #f0f3f6);
  --fgColor-muted: var(--ai-panel-muted, #9aa6b2);
  --fgColor-accent: var(--ai-panel-accent, #e63946);
  --bgColor-default: transparent;
  --bgColor-muted: var(--bg-hover);
  --borderColor-default: var(--border);
}
</style>
