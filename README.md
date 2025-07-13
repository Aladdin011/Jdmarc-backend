# JD Marc Backend

Backend service for the JD Marc internal call system, built with Express.js and MySQL.

## 🚀 Features

- User authentication and authorization
- Task management system
- Real-time notifications
- Activity tracking
- Comprehensive statistics and dashboard
- Secure API endpoints with rate limiting
- Structured logging system

## 🛠 Tech Stack

- Node.js (>=16.0.0)
- Express.js
- MySQL
- Jest for testing
- Winston for logging
- JWT for authentication

## 📋 Prerequisites

- Node.js (>=16.0.0)
- MySQL Server
- npm or yarn

## 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd jdmarc-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```env
DB_HOST=localhost
DB_USER=your_db_user
DB_PASS=your_db_password
DB_NAME=jdmarc_db
JWT_SECRET=your_jwt_secret
PORT=3000

# Optional: Default admin credentials
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@example.com
DEFAULT_ADMIN_PASSWORD=admin123
```

4. Initialize the database:
```bash
npm run db:init
```

## 🚀 Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## 🧪 Testing

Run all tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Watch mode for development:
```bash
npm run test:watch
```

## 📝 Available Scripts

- `npm start` - Start the server in production mode
- `npm run dev` - Start the server in development mode with hot reload
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run db:init` - Initialize database with schema
- `npm run db:seed` - Create default admin user
- `npm run validate` - Run linting and tests

## 📁 Project Structure

```
├── controllers/     # Route controllers
├── middleware/     # Express middlewares
├── models/         # Database models
├── routes/         # API routes
├── scripts/        # Utility scripts
├── tests/          # Test files
├── utils/          # Utility functions
├── .env            # Environment variables
├── .env.example    # Example environment variables
├── server.js       # Application entry point
└── schema.sql      # Database schema
```

## 🔒 Security Features

- JWT authentication
- Password hashing with bcrypt
- Rate limiting
- Helmet security headers
- CORS protection
- SQL injection prevention
- Input validation
- Error logging

## 📊 Logging

Logs are stored in the `logs` directory:
- `combined.log` - All logs
- `error.log` - Error logs only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

## 🔄 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/verify` - Verify JWT token

### Dashboard
- `GET /api/dashboard/overview` - Get user dashboard overview
- `GET /api/dashboard/notifications` - Get user notifications
- `PUT /api/dashboard/notifications/:id/read` - Mark notification as read
- `GET /api/dashboard/summary` - Get user dashboard summary

### Statistics
- `GET /api/stats/user` - Get user statistics
- `GET /api/stats/dashboard` - Get dashboard statistics
- `GET /api/stats/admin` - Get admin statistics (admin only)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.