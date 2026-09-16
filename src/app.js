/**
 * Application Express principale pour l'API Chez Roger Becker.
 * Assemble les middlewares de securite, les parseurs et les routes API REST.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/environment');

// Middlewares
const { globalLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth.routes');
const publicRoutes = require('./routes/public.routes');
const orderRoutes = require('./routes/order.routes');
const driverRoutes = require('./routes/driver.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// 1. Securite des en-tetes HTTP
app.use(helmet());

// 2. Configuration CORS stricte
app.use(
  cors({
    origin: (origin, callback) => {
      // Autoriser requetes locales ou sans origin (ex: Postman/outils serveur)
      if (!origin || env.CORS_ORIGIN.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origine non autorisee par la politique CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. Parseurs de requetes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// 4. Limitation globale de requetes
app.use('/api', globalLimiter);

// 5. Verification de sante de l'API
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 6. Enregistrement des routes API REST (/api/v1)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/driver', driverRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1', publicRoutes);

// 7. Capture des routes inexistantes (404)
app.use(notFoundHandler);

// 8. Capture centralisee des erreurs
app.use(errorHandler);

module.exports = app;
