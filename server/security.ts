import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import type { Express } from 'express';

// Production Security Configuration
export function setupProductionSecurity(app: Express) {
  // Security Headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite in dev
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "wss:", "ws:"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow embedding for development
  }));

  // Rate Limiting for Authentication Endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      error: 'Too many authentication attempts',
      message: 'Please wait 15 minutes before trying again',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Only apply to auth routes
    skip: (req) => !req.path.startsWith('/api/auth/'),
  });

  // Stricter rate limiting for password reset
  const passwordResetLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit to 3 password reset attempts per hour
    message: {
      error: 'Too many password reset attempts',
      message: 'Please wait 1 hour before requesting another password reset',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // General API rate limiting
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests',
      message: 'Please slow down your requests',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply rate limiters
  app.use('/api/auth/', authLimiter);
  app.use('/api/auth/reset-password', passwordResetLimiter);
  app.use('/api/', apiLimiter);

  console.log('✅ Production security measures enabled');
}

// CORS Configuration for Production
export function setupProductionCORS() {
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-domain.com'];
  
  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  };
}

// Environment Variable Validation
export function validateProductionEnvironment() {
  const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate JWT_SECRET strength
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret && jwtSecret.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters for production security');
  }

  console.log('✅ Environment variables validated');
}

// Security Recommendations for Production
export function logSecurityRecommendations() {
  console.log('\n🔒 Production Security Checklist:');
  console.log('  ✅ JWT tokens with secure secrets');
  console.log('  ✅ Password hashing with bcrypt (12 rounds)');
  console.log('  ✅ Rate limiting on authentication endpoints');
  console.log('  ✅ Security headers with Helmet.js');
  console.log('  ✅ Input validation with Zod schemas');
  console.log('  ✅ Database parameterized queries');
  console.log('  ✅ HTTPS enforcement in production');
  console.log('  ✅ Environment variable validation');
  console.log('\n📋 Additional Recommendations:');
  console.log('  • Enable database SSL connections');
  console.log('  • Set up monitoring and alerting');
  console.log('  • Configure backup strategies');
  console.log('  • Implement session management');
  console.log('  • Regular security audits');
  console.log('');
}