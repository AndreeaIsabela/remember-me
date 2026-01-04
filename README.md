# Remember Me API

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - Comes with Node.js
- **MongoDB** (v7.0 or higher) - [Download](https://www.mongodb.com/try/download/community) (if running locally without Docker)
- **Docker** (v20.10 or higher) - [Download](https://www.docker.com/get-started) (optional, for containerized setup)
- **Docker Compose** (v2.0 or higher) - [Download](https://docs.docker.com/compose/install/) (optional, for containerized setup)

### Optional Tools

- **Git** - For version control
- **Postman** or **Insomnia** - For API testing
- **VS Code** or your preferred IDE

## Installation

### Option 1: Docker Compose (Recommended for Development)

This is the easiest way to get started as it sets up all services (API, MongoDB, MailHog) automatically.

1. **Clone the repository** (if applicable):
   ```bash
   git clone <repository-url>
   cd remember-me
   ```

2. **Navigate to the API directory**:
   ```bash
   cd remember-me-api
   ```

3. **Create environment file**:
   ```bash
   cp env.example .env
   ```

4. **Update the `.env` file** for Docker Compose:
   ```env
   NODE_ENV=development
   PORT=3000
   
   # Use 'mongodb' as hostname when running with Docker Compose
   MONGODB_URI=mongodb://mongodb:27017/remember-me
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Email - Use 'mailhog' as hostname when running with Docker Compose
   SMTP_HOST=mailhog
   SMTP_PORT=1025
   SMTP_FROM=noreply@remember-me.local
   ```

5. **Start all services with Docker Compose**:
   ```bash
   cd ..
   docker-compose up -d
   ```

   This will start:
   - API server on `http://localhost:3000`
   - MongoDB on `localhost:27017`
   - MailHog web UI on `http://localhost:8025`
   - MailHog SMTP on `localhost:1025`

6. **View logs**:
   ```bash
   docker-compose logs -f api
   ```

7. **Stop services**:
   ```bash
   docker-compose down
   ```

### Option 2: Local Development Setup

If you prefer to run the services locally without Docker:

1. **Install MongoDB**:
   - Follow the [MongoDB installation guide](https://www.mongodb.com/docs/manual/installation/)
   - Start MongoDB service:
     ```bash
     # Windows
     net start MongoDB
     
     # macOS (with Homebrew)
     brew services start mongodb-community
     
     # Linux
     sudo systemctl start mongod
     ```

2. **Install MailHog** (for email testing):
   ```bash
   # macOS
   brew install mailhog
   
   # Or download from: https://github.com/mailhog/MailHog/releases
   # Then run: mailhog
   ```

3. **Navigate to the API directory**:
   ```bash
   cd remember-me-api
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Create environment file**:
   ```bash
   cp env.example .env
   ```

6. **Update the `.env` file** for local development:
   ```env
   NODE_ENV=development
   PORT=3000
   
   # Use 'localhost' when running locally
   MONGODB_URI=mongodb://localhost:27017/remember-me
   
   # JWT Configuration (CHANGE IN PRODUCTION!)
   JWT_SECRET=your-super-secret-jwt-key-change-in-production-min-32-chars
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d
   
   # Email - Use 'localhost' when running locally
   SMTP_HOST=localhost
   SMTP_PORT=1025
   SMTP_FROM=noreply@remember-me.local
   ```

7. **Start the development server**:
   ```bash
   npm run start:dev
   ```

   The API will be available at `http://localhost:3000`

## Configuration

### Environment Variables

The application uses the following environment variables (defined in `.env`):

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode (development/production) | `development` | No |
| `PORT` | API server port | `3000` | No |
| `MONGODB_URI` | MongoDB connection string | - | Yes |
| `JWT_SECRET` | Secret key for JWT token signing | - | Yes |
| `JWT_EXPIRES_IN` | Access token expiration time | `15m` | No |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiration time | `7d` | No |
| `SMTP_HOST` | SMTP server hostname | - | Yes |
| `SMTP_PORT` | SMTP server port | `1025` | No |
| `SMTP_FROM` | Default sender email address | - | Yes |

## Running the Application

### Development Mode

```bash
npm run start:dev
```

Runs the app in watch mode. The app will automatically reload when you change any source file.

### Debug Mode

```bash
npm run start:debug
```

Runs the app in debug mode with Node.js inspector enabled.

### Production Mode

```bash
# Build the application
npm run build

# Run the production build
npm run start:prod
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register a new user | No |
| POST | `/auth/login` | Login with email and password | No |
| POST | `/auth/refresh` | Refresh access token | No |
| POST | `/auth/logout` | Logout current user | Yes |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| POST | `/auth/change-password` | Change password (authenticated) | Yes |
| POST | `/auth/confirm-email` | Confirm email address | No |
| POST | `/auth/resend-verification` | Resend verification email | No |

### Example API Usage

**Register a new user:**
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

## Development

### Project Structure

```
remember-me-api/
├── src/
│   ├── auth/              # Authentication module
│   │   ├── dto/           # Data Transfer Objects
│   │   ├── guards/        # Auth guards
│   │   └── strategies/    # Passport strategies
│   ├── user/              # User module
│   ├── email/             # Email service module
│   ├── common/            # Shared utilities
│   ├── config/            # Configuration
│   └── main.ts            # Application entry point
├── test/                  # E2E tests
├── dist/                  # Compiled output
└── package.json
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Start the application |
| `npm run start:dev` | Start in development mode (watch) |
| `npm run start:debug` | Start in debug mode |
| `npm run start:prod` | Start in production mode |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |

### Code Style

The project uses:
- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** strict mode

Run linting and formatting:
```bash
npm run lint
npm run format
```

## Testing

### Unit Tests

```bash
npm run test
```

### E2E Tests

```bash
npm run test:e2e
```

### Test Coverage

```bash
npm run test:cov
```

## Email Testing with MailHog

When running with Docker Compose or MailHog locally, you can view all sent emails in the MailHog web UI:

- **Web UI**: http://localhost:8025
- **SMTP Server**: localhost:1025

This is useful for testing email verification and password reset flows during development.

## Troubleshooting

### MongoDB Connection Issues

- **Docker Compose**: Ensure MongoDB container is running (`docker-compose ps`)
- **Local**: Verify MongoDB service is started and accessible on port 27017
- Check `MONGODB_URI` in `.env` matches your setup (use `mongodb` for Docker, `localhost` for local)

### Port Already in Use

If port 3000 is already in use:
- Change `PORT` in `.env` to a different port
- Or stop the service using port 3000

### Email Not Sending

- Verify MailHog is running (check http://localhost:8025)
- Check `SMTP_HOST` and `SMTP_PORT` in `.env`
- For Docker: use `mailhog` as hostname
- For local: use `localhost` as hostname

### Module Not Found Errors

```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install
```

## Production Deployment

### Building for Production

1. **Set environment variables** for production:
   ```env
   NODE_ENV=production
   PORT=3000
   MONGODB_URI=mongodb://your-production-mongodb-uri
   JWT_SECRET=your-strong-production-secret-min-32-chars
   SMTP_HOST=your-smtp-server
   SMTP_PORT=587
   SMTP_FROM=noreply@yourdomain.com
   ```

2. **Build the application**:
   ```bash
   npm run build
   ```

3. **Run production build**:
   ```bash
   npm run start:prod
   ```

### Docker Production Build

```bash
docker build -f remember-me-api/Dockerfile -t remember-me-api:latest ./remember-me-api
docker run -p 3000:3000 --env-file remember-me-api/.env remember-me-api:latest
```

## License

This project is private and unlicensed.

## Support

For issues and questions, please contact the development team or create an issue in the project repository.

