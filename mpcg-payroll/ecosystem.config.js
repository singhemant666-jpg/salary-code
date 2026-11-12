module.exports = {
  apps: [
    {
      name: 'mpcg-payroll',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -H 0.0.0.0 -p 3000',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '700M',
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
      exp_backoff_restart_delay: 2000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        AUTH_TRUST_HOST: 'true',
        NODE_OPTIONS: '--max-old-space-size=512',
      },
    },
  ],
};
