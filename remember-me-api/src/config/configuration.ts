export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  app: {
    apiUrl: process.env.API_URL || 'http://localhost:3000',
    mobileScheme: process.env.MOBILE_APP_SCHEME || 'rememberme://',
  },
  database: {
    uri: process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    from: process.env.SMTP_FROM || 'noreply@remember-me.local',
  },
});

