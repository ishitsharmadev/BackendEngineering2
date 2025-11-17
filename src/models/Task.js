const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['todo', 'inprogress', 'done'], default: 'todo' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // New fields for enhanced functionality
  dueDate: { type: Date }, // When the task is due
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  labels: [{ 
    type: String,
    trim: true
  }], // Array of custom labels like ['work', 'personal', 'urgent']
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date } // Track when task was completed
});

// Update the updatedAt timestamp before saving
taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Set completedAt when status changes to 'done'
  if (this.isModified('status') && this.status === 'done' && !this.completedAt) {
    this.completedAt = Date.now();
  }
  
  // Clear completedAt if task is reopened
  if (this.isModified('status') && this.status !== 'done') {
    this.completedAt = undefined;
  }
  
  next();
});

// Virtual for checking if task is overdue
taskSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'done') return false;
  return new Date() > this.dueDate;
});

// Virtual for checking if task is due today
taskSchema.virtual('isDueToday').get(function() {
  if (!this.dueDate || this.status === 'done') return false;
  const today = new Date();
  const due = new Date(this.dueDate);
  return today.toDateString() === due.toDateString();
});

// Virtual for checking if task is upcoming (due within 7 days)
taskSchema.virtual('isUpcoming').get(function() {
  if (!this.dueDate || this.status === 'done') return false;
  const today = new Date();
  const due = new Date(this.dueDate);
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 7;
});

// Add index for efficient queries
taskSchema.index({ owner: 1, dueDate: 1 });
taskSchema.index({ owner: 1, priority: 1 });
taskSchema.index({ owner: 1, status: 1 });

module.exports = mongoose.model('Task', taskSchema);