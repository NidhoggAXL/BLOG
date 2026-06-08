<script setup lang="ts">
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div class="public-main-shell" v-bind="$attrs">
    <slot />
  </div>
</template>
