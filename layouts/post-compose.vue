<template>
  <div class="post-compose-shell">
    <slot />
  </div>
</template>

<style lang="less">
@import '~/assets/styles/post-compose-shared.less';
</style>

<style scoped lang="less">
.post-compose-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  background: var(--admin-body-bg);
  color: var(--admin-text);
}
</style>
