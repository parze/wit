const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

module.exports = pino({
  level: process.env.LOG_LEVEL || 'debug',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  }),
});
