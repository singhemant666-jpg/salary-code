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
      max_memory_restart: '850M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
        AUTH_TRUST_HOST: 'true',
      },
    },
  ],
};
