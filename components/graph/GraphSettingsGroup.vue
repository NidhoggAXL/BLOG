<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    defaultOpen?: boolean
  }>(),
  { defaultOpen: true },
)

const open = ref(props.defaultOpen)

function toggle() {
  open.value = !open.value
}
</script>

<template>
  <section class="g-group" :class="{ 'g-group--collapsed': !open }">
    <div class="g-group__head">
      <button
        type="button"
        class="g-group__toggle"
        :aria-expanded="open"
        @click="toggle"
      >
        <span class="g-group__folder" aria-hidden="true" />
        <span class="g-group__title">{{ title }}</span>
      </button>
      <span v-if="$slots.actions" class="g-group__actions" @click.stop>
        <slot name="actions" />
      </span>
    </div>
    <div v-show="open" class="g-group__body">
      <slot />
    </div>
  </section>
</template>

<style scoped lang="less">
.g-group {
  margin-bottom: 4px;
  padding-bottom: 2px;
  border-bottom: 1px solid var(--graph-panel-border, var(--admin-border));

  &:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
}

.g-group__head {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-height: 32px;
}

.g-group__toggle {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 6px;
  min-width: 0;
  margin: 0;
  padding: 6px 0;
  border: none;
  background: none;
  color: var(--graph-panel-text, var(--admin-text));
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  border-radius: 6px;
  transition:
    color 0.15s ease,
    background 0.15s ease;

  &:hover {
    color: var(--graph-panel-text, var(--admin-text));
    background: var(--graph-panel-hover, var(--admin-nav-hover));
  }
}

.g-group--collapsed .g-group__toggle {
  margin-bottom: 2px;
}

.g-group__folder {
  display: inline-block;
  flex-shrink: 0;
  width: 14px;
  height: 11px;
  border: 1.5px solid var(--graph-panel-muted, var(--admin-muted));
  border-radius: 2px 2px 0 0;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--graph-panel-muted, var(--admin-muted)) 40%, transparent) 0%,
    transparent 100%
  );
  transition: border-color 0.15s ease;

  &::before {
    content: '';
    display: block;
    width: 7px;
    height: 3px;
    margin: -4px 0 0 -1px;
    border: 1.5px solid var(--graph-panel-muted, var(--admin-muted));
    border-bottom: none;
    border-radius: 2px 2px 0 0;
    background: var(--graph-panel-bg, var(--admin-toolbar-bg));
    transition: border-color 0.15s ease;
  }
}

.g-group--collapsed .g-group__folder::before {
  height: 0;
  margin-top: -2px;
  border-bottom: 1.5px solid var(--graph-panel-muted, var(--admin-muted));
}

.g-group__title {
  flex: 1;
  min-width: 0;
}

.g-group__actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  margin-left: auto;
}

.g-group__body {
  padding: 2px 0 10px;
}
</style>
