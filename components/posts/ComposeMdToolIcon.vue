<script setup lang="ts">
import type { ComposeMdToolDirective } from '~/constants/compose-md-tools'

defineProps<{
  name: ComposeMdToolDirective
}>()
</script>

<template>
  <svg
    class="compose-md-tool-icon"
    viewBox="0 0 24 24"
    width="22"
    height="22"
    aria-hidden="true"
    focusable="false"
  >
    <!-- h1 -->
    <template v-if="name === 'h1'">
      <path
        fill="currentColor"
        d="M5 4v3h6.5v13h3V7H21V4H5zm14 0h3v16h-3V4z"
      />
    </template>
    <!-- h2 -->
    <template v-else-if="name === 'h2'">
      <path
        fill="currentColor"
        d="M5 4v3h5v13h3V7h6V4H5zm12 10h3v6h-3v-6z"
      />
    </template>
    <!-- h3 -->
    <template v-else-if="name === 'h3'">
      <path
        fill="currentColor"
        d="M5 4v3h4v13h3V7h5V4H5zm11 12h3v4h-3v-4z"
      />
    </template>
    <!-- hr -->
    <template v-else-if="name === 'hr'">
      <path fill="currentColor" d="M4 12h16v2H4v-2z" />
    </template>
    <!-- bold -->
    <template v-else-if="name === 'bold'">
      <path
        fill="currentColor"
        d="M8 5h5.5a3.5 3.5 0 0 1 2.45 6.05A4 4 0 0 1 14 19H6V5h2zm2 7h3a1.5 1.5 0 0 0 0-3H10v3zm0 2v3h4a2 2 0 0 0 0-4h-4z"
      />
    </template>
    <!-- italic -->
    <template v-else-if="name === 'italic'">
      <path fill="currentColor" d="M10 5h9v2h-3.2l-3 12H16v2H7v-2h3.2l3-12H10V5z" />
    </template>
    <!-- strikeThrough -->
    <template v-else-if="name === 'strikeThrough'">
      <path
        fill="currentColor"
        d="M8 5h8v2H8V5zm9.2 12H6v-2h12.2c.5-1.1.8-2.3.8-3.5 0-.5 0-1-.1-1.5H18c.1.5.1 1 .1 1.5a7 7 0 0 1-8.9 6.5zM4 13h16v2H4v-2z"
      />
    </template>
    <!-- quote -->
    <template v-else-if="name === 'quote'">
      <path
        fill="currentColor"
        d="M7 6h3v7H6l-1 3H4V9h3V6zm10 0h3v7h-4l-1 3h-2V9h3V6z"
      />
    </template>
    <!-- unorderedList -->
    <template v-else-if="name === 'unorderedList'">
      <path
        fill="currentColor"
        d="M8 6h13v2H8V6zm0 5h13v2H8v-2zm0 5h13v2H8v-2zM4 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
      />
    </template>
    <!-- orderedList -->
    <template v-else-if="name === 'orderedList'">
      <path
        fill="currentColor"
        d="M8 6h13v2H8V6zm0 5h13v2H8v-2zm0 5h13v2H8v-2zM5 5h1v4H4V6.5h1V5zm0 6h1.2l-1.2 1.2V11l2 2v1H4v-1h1.2L4 12.8V12l2-2v-1zm-.3 6.8L5 18h2v1H3v-1h1.2l1.5-1.5v-1.2z"
      />
    </template>
    <!-- task -->
    <template v-else-if="name === 'task'">
      <path
        fill="currentColor"
        d="M9 16.2 5.8 13l1.4-1.4 1.8 1.8 6-6L16.4 9 9 16.2zM19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"
      />
    </template>
    <!-- codeRow -->
    <template v-else-if="name === 'codeRow'">
      <path
        fill="currentColor"
        d="M8.8 7.4 7.4 8.8l3.6 3.6-3.6 3.6 1.4 1.4 5-5-5-5zm6.4 0-1.4 1.4 3.6 3.6-3.6 3.6 1.4 1.4 5-5-5-5z"
      />
    </template>
    <!-- code -->
    <template v-else-if="name === 'code'">
      <path
        fill="currentColor"
        d="M9 4h6v2H9V4zm0 14h6v2H9v-2zM7 6h2v12H7V6zm8 0h2v12h-2V6z"
      />
    </template>
    <!-- link -->
    <template v-else-if="name === 'link'">
      <path
        fill="currentColor"
        d="m8.5 13.5 1.4 1.4-2.8 2.8a2.12 2.12 0 0 0 3 3l2.8-2.8 1.4 1.4-2.8 2.8a4.12 4.12 0 0 1-5.8-5.8l2.8-2.8zm7-7 2.8 2.8-1.4 1.4-2.8-2.8a2.12 2.12 0 0 0-3 3l-2.8 2.8-1.4-1.4 2.8-2.8a4.12 4.12 0 0 1 5.8 5.8z"
      />
    </template>
    <!-- image -->
    <template v-else-if="name === 'image'">
      <path
        fill="currentColor"
        d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h14V7H5zm2 2h4l2 3 2-2.5L17 14H7l2-5zM9 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
      />
    </template>
    <!-- table -->
    <template v-else-if="name === 'table'">
      <path
        fill="currentColor"
        d="M4 5h16v2H4V5zm0 5h16v2H4v-2zm0 5h16v2H4v-2zM4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm4 2v4H5V6h3zm11 0v4h-3V6h3zM5 15h3v3H5v-3zm11 0v3h-3v-3z"
      />
    </template>
    <!-- katexInline -->
    <template v-else-if="name === 'katexInline'">
      <path
        fill="currentColor"
        d="M6 5h2l2.5 4L13 5h2l-3.2 5 3.2 5h-2l-2.5-4L8 15H6l3.2-5L6 5zm10 0h2v10h-2V5z"
      />
    </template>
    <!-- katexBlock -->
    <template v-else-if="name === 'katexBlock'">
      <path
        fill="currentColor"
        d="M5 4h3l3 5 3-5h3l-4.5 7 4.5 7h-3l-3-5-3 5H5l4.5-7L5 4zm12 0h2v14h-2V4z"
      />
    </template>
    <!-- callout -->
    <template v-else-if="name === 'callout'">
      <path
        fill="currentColor"
        d="M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm2 3v2h8V8H6zm0 4v2h5v-2H6zM12 8h4v6h-4V8z"
      />
      <circle cx="17" cy="9" r="1.5" fill="currentColor" />
    </template>
  </svg>
</template>

<style scoped>
.compose-md-tool-icon {
  display: block;
  flex-shrink: 0;
}
</style>
