import arkos from 'arkos';

arkos.init({
  port: 8000,
  authentication: {
    mode: 'static',
    usernameField: 'email'
  },
  validation: {
    resolver: 'zod'
  },
});
