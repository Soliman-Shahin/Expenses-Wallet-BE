# 💰 Expenses Wallet - Backend API

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/yourusername/expenses-wallet-be)
[![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.2.2-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

A secure, feature-rich backend API for the Expenses Wallet application with advanced encryption, comprehensive monitoring, and enterprise-grade security features.

### Password recovery environment

Configure `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `PASSWORD_RESET_URL` in the server environment. Reset links expire after 20 minutes. Raw reset tokens are never persisted or logged; newer requests supersede older tokens and a successful reset revokes all refresh sessions.

---

## ✨ Features

### 🔐 Security

- **Advanced AES-256-GCM Encryption** - Stronger encryption with authentication tags
- **Rate Limiting** - Multi-tier protection against abuse
- **Brute Force Protection** - Progressive delays and account lockout
- **Password Validation** - Comprehensive strength checking
- **JWT Authentication** - Access + Refresh token system
- **OAuth Integration** - Google & Facebook login

### 📊 Monitoring & Logging

- **Structured Logging** - JSON logs for production, colorful for development
- **Request Tracking** - Full request/response logging with context
- **Performance Monitoring** - Slow request detection
- **Health Checks** - Kubernetes-compatible endpoints
- **Error Tracking** - Comprehensive error logging with context

### 🚀 Performance

- **Selective Encryption** - Only encrypt sensitive data
- **Memory Management** - Automatic cleanup of tracking data
- **Response Optimization** - Size warnings and compression ready
- **Database Connection Pooling** - Efficient MongoDB connections

### 🛡️ Error Handling

- **Custom Error Classes** - 15+ specific error types
- **Safe Error Responses** - No internal details leaked in production
- **Async Error Catching** - Automatic promise rejection handling
- **Global Error Handlers** - Unhandled rejection/exception protection

---

## 📋 Table of Contents

- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Security](#-security)
- [Monitoring](#-monitoring)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/expenses-wallet-be.git

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output to ENCRYPTION_KEY in .env

# Start development server
npm run dev

# Test health check
curl http://localhost:3000/health
```

See **[QUICK-START.md](QUICK-START.md)** for detailed setup.

---

## 📦 Installation

### Prerequisites

- Node.js >= 18
- MongoDB >= 6.0
- npm or yarn

### Steps

```bash
npm install
```

No additional dependencies needed! All enhancements use existing packages.

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database
MONGO_URI=mongodb://localhost:27017/expenses-wallet

# JWT & Authentication
JWT_SECRET=your_jwt_secret
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret

# Encryption (Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=your_256_bit_encryption_key

# Security
SALT_ROUNDS=10

# Server
PORT=3000
NODE_ENV=development

# CORS
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:8100
```

See **[.env.example](.env.example)** for all available options.

---

## 📚 API Documentation

### Base URL

```
http://localhost:3000
```

### Health Endpoints

#### GET /health

Basic health check

```json
{
  "status": "ok",
  "timestamp": "2024-11-24T10:00:00.000Z",
  "uptime": 3600
}
```

#### GET /health/detailed

Comprehensive health check with database and memory status

### Authentication Endpoints

#### POST /v1/users/signup

Register a new user

**Request:**

```json
{
  "email": "user@example.com",
  "password": "SecureP@ssw0rd123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Signup successful",
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

**Security:**

- Rate limited: 5 requests per 15 minutes
- Brute force protected
- Password validation enforced

#### POST /v1/users/login

Authenticate user

**Security features:**

- Progressive delays on failed attempts
- Account lockout after 5 failures
- Rate limiting
- Automatic unlock after 15 minutes

See **[SYNC_API.md](SYNC_API.md)** for full API documentation.

---

## 🔒 Security

### Encryption

- **Algorithm:** AES-256-GCM
- **IV:** Unique per operation (16 bytes)
- **Auth Tag:** 16 bytes for integrity verification
- **Key Derivation:** scrypt with salt

### Rate Limiting

| Endpoint Type        | Limit        | Window     |
| -------------------- | ------------ | ---------- |
| Authentication       | 5 requests   | 15 minutes |
| Standard API         | 100 requests | 15 minutes |
| Read Operations      | 200 requests | 15 minutes |
| Expensive Operations | 10 requests  | 1 hour     |

### Brute Force Protection

- **Max Attempts:** 5 failed logins
- **Lockout Duration:** 15 minutes
- **Progressive Delays:** 1s, 2s, 4s, 8s, 16s...
- **Tracking:** By IP and email

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character
- Not in top 100 common passwords

---

## 📊 Monitoring

### Logging Levels

```typescript
logger.debug('Detailed information'); // Development only
logger.info('General information'); // Normal operations
logger.warn('Warning message'); // Potential issues
logger.error('Error occurred', error); // Errors
logger.fatal('Critical error', error); // Fatal errors
```

### Performance Metrics

- Request duration tracking
- Slow request warnings (>1000ms)
- Large payload warnings (>100KB)
- Memory usage monitoring
- Database health checks

### Health Checks

- **Basic:** `/health`
- **Detailed:** `/health/detailed`
- **Readiness:** `/health/ready`
- **Liveness:** `/health/live`

---

## 🛠️ Development

### Start Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Run Production Server

```bash
npm start
```

### Project Structure

```
src/app/
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── models/          # Mongoose models
├── routes/          # API routes
├── services/        # Business logic
└── shared/          # Shared utilities
```

See **[PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md)** for details.

---

## 🚀 Deployment

### Environment Setup

```bash
# Set production environment
export NODE_ENV=production

# Generate secure keys
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

### Kubernetes Health Probes

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

---

## 📖 Documentation

- **[ENHANCEMENTS.md](ENHANCEMENTS.md)** - Comprehensive feature documentation
- **[SUMMARY-AR.md](SUMMARY-AR.md)** - Arabic summary
- **[QUICK-START.md](QUICK-START.md)** - Quick setup guide
- **[INTEGRATION-CHECKLIST.md](INTEGRATION-CHECKLIST.md)** - Integration steps
- **[PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md)** - Project organization
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **[SYNC_API.md](SYNC_API.md)** - Sync API documentation

---

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health

# Detailed health
curl http://localhost:3000/health/detailed

# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/v1/users/login
done
```

### Automated Tests

```bash
npm test  # Coming soon
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Authors

- **Soliman Shahin** - Original codebase
- **AI Assistant (Antigravity)** - Security & Performance enhancements

---

## 🙏 Acknowledgments

- Express.js community
- MongoDB team
- TypeScript team
- All contributors

---

## 📞 Support

For bugs and feature requests, please [open an issue](https://github.com/yourusername/expenses-wallet-be/issues).

---

## 🗺️ Roadmap

- [x] Advanced encryption (AES-256-GCM)
- [x] Rate limiting
- [x] Brute force protection
- [x] Comprehensive logging
- [x] Health checks
- [ ] Redis integration
- [ ] Email notifications
- [ ] Swagger documentation
- [ ] Unit tests
- [ ] Integration tests
- [ ] CI/CD pipeline
- [ ] Docker compose setup

---

**Made with ❤️ for Expenses Wallet**

**Version:** 2.0.0 | **Last Updated:** 2024-11-24
