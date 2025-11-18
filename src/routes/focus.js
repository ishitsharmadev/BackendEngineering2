const express = require('express');
const router = express.Router();

// simple auth check (keeps behavior consistent with other routes)
router.use((req, res, next) => {
  if (!req.session || !req.session.user) {
    req.flash('error', 'Please login first');
    return res.redirect('/login');
  }
  next();
});

router.get('/', (req, res) => {
  res.render('tasks/focus');
});

module.exports = router;