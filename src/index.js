require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const morgan = require('morgan');
const methodOverride = require('method-override');

const app = express();
const PORT = process.env.PORT || 3000;

// Database
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/oollert-tasks';
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error', err));

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI })
}));
app.use(flash());

// locals for views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
app.use('/', authRoutes);
app.use('/tasks', taskRoutes);

// Home
app.get('/home', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('home');
});

// Root
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.redirect('/login');
});

// Process-level handlers (uncaught exceptions / unhandled rejections)
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION - shutting down');
  console.error(err && err.stack ? err.stack : err);
  // In a real app you might notify monitoring here (Sentry, etc.)
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
  // In dev we don't exit immediately, but in production consider exiting
});

// Error handler middleware (render friendly page in dev)
app.use((err, req, res, next) => {
  console.error(err && err.stack ? err.stack : err);
  const isDev = process.env.NODE_ENV !== 'production';
  if (req.accepts('html')) {
    return res.status(500).render('error', { error: err, showStack: isDev });
  }
  res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
