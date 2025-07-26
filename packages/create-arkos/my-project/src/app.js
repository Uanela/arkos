import arkos from 'arkos';

arkos.init({
  cors: {
    allowedOrigins: process.env.NODE_ENV !== "production" ? "*" : "your-production-url"
  },
  validation: {
    resolver: 'zod'
  },
  swagger: {
    mode: 'zod'
  }
});
