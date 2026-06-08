<script setup lang="ts">
definePageMeta({
  layout: 'post-compose',
})
</script>

<template>
  <NuxtPage class="post-edit-route" />
</template>

<style scoped lang="less">
.post-edit-route {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}
</style>
