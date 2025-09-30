const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// middleware to ensure auth
function ensureAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Please login first');
    return res.redirect('/login');
  }
  next();
}

router.use(ensureAuth);

// list tasks for user
router.get('/', async (req, res) => {
  const userId = req.session.user.id;
  const tasks = await Task.find({ owner: userId }).sort('-createdAt');
  res.render('tasks/index', { tasks });
});

// create task
router.post('/', async (req, res) => {
  const userId = req.session.user.id;
  const { title, description } = req.body;
  try {
    await Task.create({ title, description, owner: userId });
    req.flash('success', 'Task created');
    res.redirect('/tasks');
  } catch (err) {
    req.flash('error', 'Could not create task');
    res.redirect('/tasks');
  }
});

// update task status
router.post('/:id/move', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await Task.findByIdAndUpdate(id, { status });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
