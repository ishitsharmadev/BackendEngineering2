const express = require('express');
const router = express.Router();
const Task = require('../models/Task');

// Middleware to ensure auth
function ensureAuth(req, res, next) {
  if (!req.session.user) {
    req.flash('error', 'Please login first');
    return res.redirect('/login');
  }
  next();
}

router.use(ensureAuth);

// Helper function to categorize tasks
function categorizeTasks(tasks) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  
  return {
    overdue: tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      return new Date(t.dueDate) < today;
    }),
    today: tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const dueDate = new Date(t.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    }),
    upcoming: tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const dueDate = new Date(t.dueDate);
      return dueDate >= tomorrow && dueDate < nextWeek;
    }),
    later: tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      return new Date(t.dueDate) >= nextWeek;
    }),
    noDueDate: tasks.filter(t => !t.dueDate && t.status !== 'done')
  };
}

// List tasks for user - Board view
router.get('/', async (req, res) => {
  const userId = req.session.user.id;
  const tasks = await Task.find({ owner: userId }).sort({ priority: -1, createdAt: -1 });
  
  // Get unique labels for filter
  const allLabels = [...new Set(tasks.flatMap(t => t.labels || []))];
  
  res.render('tasks/index', { tasks, allLabels });
});

// Smart view - Today, Upcoming, etc.
router.get('/smart', async (req, res) => {
  const userId = req.session.user.id;
  const tasks = await Task.find({ owner: userId, status: { $ne: 'done' } })
    .sort({ priority: -1, dueDate: 1, createdAt: -1 });
  
  const categorized = categorizeTasks(tasks);
  const allLabels = [...new Set(tasks.flatMap(t => t.labels || []))];
  
  res.render('tasks/smart', { 
    ...categorized, 
    allLabels,
    totalTasks: tasks.length
  });
});

// Analytics view
router.get('/analytics', async (req, res) => {
  const userId = req.session.user.id;
  const tasks = await Task.find({ owner: userId });
  
  // Calculate statistics
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'inprogress').length,
    completed: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      return new Date(t.dueDate) < new Date();
    }).length,
    byPriority: {
      urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length,
      high: tasks.filter(t => t.priority === 'high' && t.status !== 'done').length,
      medium: tasks.filter(t => t.priority === 'medium' && t.status !== 'done').length,
      low: tasks.filter(t => t.priority === 'low' && t.status !== 'done').length
    },
    completionRate: tasks.length > 0 
      ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
      : 0
  };
  
  // Get recent completions (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentCompletions = tasks.filter(t => 
    t.completedAt && new Date(t.completedAt) >= sevenDaysAgo
  ).length;
  
  stats.recentCompletions = recentCompletions;
  
  res.render('tasks/analytics', { stats });
});

// Create task with enhanced fields
router.post('/', async (req, res) => {
  const userId = req.session.user.id;
  const { title, description, dueDate, priority, labels } = req.body;
  
  try {
    // Parse labels (comma-separated string to array)
    const labelArray = labels 
      ? labels.split(',').map(l => l.trim()).filter(l => l.length > 0)
      : [];
    
    await Task.create({ 
      title, 
      description, 
      owner: userId,
      dueDate: dueDate || undefined,
      priority: priority || 'medium',
      labels: labelArray
    });
    
    req.flash('success', 'Task created successfully');
    res.redirect(req.get('Referer') || '/tasks');
  } catch (err) {
    console.error('Error creating task:', err);
    req.flash('error', 'Could not create task');
    res.redirect(req.get('Referer') || '/tasks');
  }
});

// Update task (enhanced with priority, labels, dueDate)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;
  const { title, description, dueDate, priority, labels, status } = req.body;
  
  try {
    const task = await Task.findOne({ _id: id, owner: userId });
    if (!task) {
      return res.status(404).json({ ok: false, message: 'Task not found' });
    }
    
    // Parse labels
    const labelArray = labels 
      ? labels.split(',').map(l => l.trim()).filter(l => l.length > 0)
      : [];
    
    // Update fields
    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = dueDate || undefined;
    if (priority) task.priority = priority;
    if (labels !== undefined) task.labels = labelArray;
    if (status) task.status = status;
    
    await task.save();
    
    res.json({ ok: true, task });
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Update task status (existing endpoint, kept for compatibility)
router.post('/:id/move', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.session.user.id;
  
  try {
    const task = await Task.findOne({ _id: id, owner: userId });
    if (!task) {
      return res.status(404).json({ ok: false, message: 'Task not found' });
    }
    
    task.status = status;
    await task.save();
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Error moving task:', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Quick update priority
router.post('/:id/priority', async (req, res) => {
  const { id } = req.params;
  const { priority } = req.body;
  const userId = req.session.user.id;
  
  try {
    const task = await Task.findOne({ _id: id, owner: userId });
    if (!task) {
      return res.status(404).json({ ok: false, message: 'Task not found' });
    }
    
    task.priority = priority;
    await task.save();
    
    res.json({ ok: true, task });
  } catch (err) {
    console.error('Error updating priority:', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Delete task
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;
  
  try {
    const task = await Task.findOne({ _id: id, owner: userId });
    if (!task) {
      return res.status(404).json({ ok: false, message: 'Task not found' });
    }
    
    await Task.findByIdAndDelete(id);
    res.json({ ok: true, message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// Focus mode page
router.get('/focus', (req, res) => {
  res.render('tasks/focus');
});


module.exports = router;