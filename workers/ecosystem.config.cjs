module.exports = {
  apps: [
    {
      name: 'worker-clothing-analysis',
      script: './dist/workers/src/index.js',
      args: '--type clothing_analysis',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'worker-scene-planning',
      script: './dist/workers/src/index.js',
      args: '--type scene_planning',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'worker-scene-render',
      script: './dist/workers/src/index.js',
      args: '--type scene_render',
      instances: 2,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'worker-recovery',
      script: './dist/workers/src/index.js',
      args: '--type recovery',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
