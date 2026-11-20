// Environment & dependencies
require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const morgan = require('morgan');
const methodOverride = require('method-override');
const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

// Init app
const app = express();

// Security headers (Optimized for Google Lighthouse, DevTools & CDN compatibility)
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
  strictTransportSecurity: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true
  } : false
}));

// Fast compression (gzip)
app.use(compression({
  level: 6,
  threshold: 512
}));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Try again in 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/admin/login', loginLimiter);

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many requests. Try again in 15 minutes.'
});
app.use('/inquiry', inquiryLimiter);

// DB connection
connectDB();

// Ensure DB is connected for serverless environments (e.g. Vercel)
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (e) {
    console.error('Database connection middleware warning:', e.message);
  }
  next();
});

// Logger (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Request parsers
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(methodOverride('_method'));

// View engine & cache (Compiled into memory for ultra-fast TTFB)
app.set('view engine', 'ejs');
const fs = require('fs');
const viewsDir = fs.existsSync(path.join(__dirname, 'views'))
  ? path.join(__dirname, 'views')
  : path.resolve(process.cwd(), 'views');
app.set('views', viewsDir);
app.enable('view cache');

// Favicon shortcut
app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/images/logo.svg'));
});

// Static assets cache (Optimized for Mobile browsers & Core Web Vitals)
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '365d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Images, fonts, and icons get 1-year immutable cache for instant mobile loading
    if (/\.(webp|jpg|jpeg|png|svg|ico|woff|woff2|ttf|eot)$/i.test(filePath)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
      // Versioned CSS & JS (?v=...) get 1-year immutable cache
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Session setup
app.use(session({
  name: 'bs_session',
  secret: process.env.SESSION_SECRET || 'bluesky_pools_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// Flash notifications
app.use(flash());

// View locals
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.admin = req.session.admin || null;
  next();
});

// App routes
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/admin', adminRoutes);
app.use('/', publicRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).render('public/home', {
    title: '404 - Page Not Found',
    settings: {
      companyName: 'Bluesky International',
      phone: '+91 81289 20702',
      email: 'pritesh029@gmail.com',
      whatsapp: '+91 81289 20702',
      address: 'A-8, Laxmikant Ashram Rd, Rashi Circle, Bhulabhai Desai Park, Hari Darshan Society, Katargam, Surat, Gujarat 395004',
      experienceYears: 19,
      poolsBuilt: 720,
      happyClients: 680
    },
    services: [],
    projects: [],
    products: [],
    testimonials: [],
    path: ''
  });
});

// Server listen (only in non-Vercel environment)
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

