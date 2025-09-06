---
sidebar_position: 4
---

# Deployment

When you're ready to deploy your Arkos.js application to production, there are important steps to ensure your application runs efficiently and securely. This guide covers the deployment process for Arkos.js applications.

## Prerequisites

Before deploying your Arkos.js application, ensure you have:

- Node.js 20.19+ installed on your production environment
- A working Arkos.js application ready for deployment
- All necessary environment variables configured
- Database and any required services set up and accessible

## Building Your Application

To prepare your Arkos.js application for production:

```bash
# Install dependencies
pnpm install

# Build the application
pnpm run build
```

The build process compiles TypeScript code and prepares the application for production. The output is generated in the `.build/` directory.

## Production Environment Variables

Ensure your production environment has the necessary variables:

```bash
# Required
DATABASE_URL="your-production-database-url"
JWT_SECRET="your-production-jwt-secret"

# Optional but recommended
NODE_ENV="production"
PORT="3000"
HOST="0.0.0.0"

# Additional production-specific variables
JWT_COOKIE_SECURE="true"
JWT_COOKIE_HTTP_ONLY="true"
```

## Deployment Platforms

### 1. Traditional VPS (Hostinger, Contabo, DigitalOcean, AWS EC2)

**Setup Process:**
1. Provision a server with Node.js 18+ installed
2. Copy your built application to the server
3. Install production dependencies: `pnpm install`
4. Set up environment variables
5. Start the application: `pnpm run start`

**Using PM2 for Process Management:**
```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [{
    name: 'arkos-app',
    script: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
}

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 2. Platform as a Service (Heroku, Railway, Render)

**Heroku Example:**
```bash
# Create Procfile
web: pnpm run start

# Deploy
git add .
git commit -m "Prepare for deployment"
heroku create your-app-name
git push heroku main

# Set environment variables
heroku config:set DATABASE_URL="your-database-url"
heroku config:set JWT_SECRET="your-jwt-secret"
```

### 3. Containerized Deployment (Docker)

**Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install

# Copy built application
COPY .build/ ./.build/
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

EXPOSE 3000

CMD ["pnpm", "run", "start"]
```

**Docker Compose Example:**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/arkos
      - JWT_SECRET=your-jwt-secret
    depends_on:
      - db
  
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=arkos
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Server Configuration

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Database Migration

Before starting your application, run database migrations:

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Optional: Seed database
npx prisma db seed
```

## Optimization Tips

1. **Enable Compression**: Arkos.js enables compression by default in production
2. **Environment Configuration**: Set `NODE_ENV=production` for optimal performance
3. **Database Connection Pooling**: Configure appropriate connection limits for your database
4. **File Uploads**: For cloud deployments, consider using cloud storage (S3, Cloudinary) instead of local file system

## Monitoring and Logging

Implement proper monitoring for your production application:

```bash
# Using PM2 logging
pm2 logs arkos-app
```

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **CORS**: Configure appropriate CORS settings for your frontend domain
3. **Rate Limiting**: Review and adjust rate limiting settings based on your needs
4. **File Uploads**: Implement proper validation and scanning for uploaded files

## Troubleshooting

Common deployment issues:

1. **Port Already in Use**: Ensure no other application is using your configured port
2. **Database Connection**: Verify database URL and accessibility
3. **File Permissions**: Ensure proper permissions for upload directories
4. **Environment Variables**: Double-check all required variables are set

## CI/CD Pipeline Example

```yaml
# GitHub Actions example
name: Deploy Arkos.js App

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'pnpm'
    
    - name: Install dependencies
      run: pnpm install
      
    - name: Build application
      run: pnpm run build
      
    - name: Run tests
      run: pnpm test
      
    - name: Deploy to production
      uses: some-deployment-action@v1
      with:
        host: ${{ secrets.SSH_HOST }}
        username: ${{ secrets.SSH_USERNAME }}
        key: ${{ secrets.SSH_KEY }}
```

By following this deployment guide, you can ensure your Arkos.js application is deployed efficiently and securely to production environments.
