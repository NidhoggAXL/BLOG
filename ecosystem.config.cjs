module.exports = {
  apps: [
    {
      name: 'blog',
      cwd: '/root/blog',
      script: '.output/server/index.mjs',
      interpreter: 'node',
      interpreter_args: '--env-file=/root/blog/.env',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3000',
        NITRO_TRUST_PROXY: 'true',
        NUXT_PROJECT_ROOT: '/root/blog',
      },
      max_memory_restart: '400M',
    },
  ],
}
