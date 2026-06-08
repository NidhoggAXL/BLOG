import { defineStore } from 'pinia'
import type { ChatMessageItem } from '~/types/ai'

export const useAiChatStore = defineStore('aiChat', () => {
  const messages = ref<ChatMessageItem[]>([])
  const assistantHtmlById = ref<Record<string, string>>({})
  const sending = ref(false)

  const hasMessages = computed(() => messages.value.length > 0)

  const isStreaming = computed(() =>
    messages.value.some((m) => m.streaming === true),
  )

  function clearSession() {
    messages.value = []
    assistantHtmlById.value = {}
    sending.value = false
  }

  return {
    messages,
    assistantHtmlById,
    sending,
    hasMessages,
    isStreaming,
    clearSession,
  }
})
