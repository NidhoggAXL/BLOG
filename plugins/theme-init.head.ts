/** 首屏前根据 cookie 设置 data-theme，避免 hydration 前闪烁 */
export default defineNuxtPlugin(() => {
  useHead({
    script: [
      {
        key: "theme-init",
        tagPriority: "critical" as const,
        innerHTML: `(function(){try{var h=document.documentElement;var pref='light';var m=document.cookie.match(/(?:^|;\\s*)blog-theme=([^;]+)/);if(m)pref=decodeURIComponent(m[1].replace(/^"|"$/g,''));else{m=document.cookie.match(/(?:^|;\\s*)theme-pref=([^;]+)/);if(m)pref=decodeURIComponent(m[1].replace(/^"|"$/g,''));}var dark=pref==='dark'||(pref!=='light'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);h.setAttribute('data-theme',dark?'dark':'light');h.classList.remove('theme-light','theme-dark','dark');h.classList.add(dark?'theme-dark':'theme-light');if(dark)h.classList.add('dark');}catch(e){}})();`,
      },
    ],
  });
});
