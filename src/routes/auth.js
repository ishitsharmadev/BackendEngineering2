const express = require('express');
const router = express.Router();
const User = require('../models/User');

// helper: sum numeric digits in a string
function sumPasswordDigits(pwd) {
  if (!pwd || typeof pwd !== 'string') return 0;
  let sum = 0;
  for (const ch of pwd) {
    const d = parseInt(ch, 10);
    if (!Number.isNaN(d)) sum += d;
  }
  console.log(sum);
}

// Login form
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.render('auth/login');
});

// Login handler
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // print sum of password digits to server console (example requirement)
  try {
    const s = sumPasswordDigits(password);
    console.log('Password digit sum (login):', s);
  } catch (e) {
    console.error('Error computing password sum', e);
  }
  const user = await User.findOne({ username });
  if (!user) {
    req.flash('error', 'User not found. Please sign up first.');
    return res.redirect('/signup');
  }
  const ok = await user.comparePassword(password);
  if (!ok) {
    req.flash('error', 'Invalid credentials');
    return res.redirect('/login');
  }
  req.session.user = { id: user._id, username: user.username };
  req.flash('success', 'Logged in successfully');
  res.redirect('/home');

});

// Signup form
router.get('/signup', (req, res) => {
  res.render('auth/signup');
});

// Signup handler
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  // print sum of password digits to server console (example requirement)
  try {
    const s = sumPasswordDigits(password);
    console.log('Password digit sum (signup):', s);
  } catch (e) {
    console.error('Error computing password sum', e);
  }
  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      req.flash('error', 'Username or email already taken');
      return res.redirect('/signup');
    }
    const user = new User({ username, email, password });
    await user.save();
    req.flash('success', 'Account created successfully. Please log in.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error creating account');
    res.redirect('/signup');
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

module.exports = router;
