class PomodoroTimer {
  constructor() {
    this.workDuration = 25 * 60; // 25 minutes in seconds
    this.shortBreak = 5 * 60; // 5 minutes
    this.longBreak = 15 * 60; // 15 minutes
    this.timeRemaining = this.workDuration;
    this.isRunning = false;
    this.isPaused = false;
    this.mode = 'work'; // 'work', 'shortBreak', 'longBreak'
    this.pomodorosCompleted = 0;
    this.currentTaskId = null;
    this.currentTaskTitle = null;
    this.interval = null;
    
    this.init();
    this.loadState();
  }

  init() {
    // Create timer UI
    this.createTimerUI();
    
    // Load saved state from sessionStorage
    this.loadState();
    
    // Update display
    this.updateDisplay();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  createTimerUI() {
    // Check if timer already exists
    if (document.getElementById('pomodoro-timer')) return;

    const timerHTML = `
      <div id="pomodoro-timer" class="pomodoro-timer collapsed">
        <div class="pomodoro-header">
          <button class="pomodoro-toggle" id="pomodoroToggle">
            <span class="timer-icon">🍅</span>
          </button>
        </div>
        
        <div class="pomodoro-content">
          <div class="pomodoro-task-info" id="pomodoroTaskInfo">
            <div class="task-title-display" id="taskTitleDisplay">No task selected</div>
            <button class="clear-task-btn" id="clearTaskBtn" style="display: none;">×</button>
          </div>
          
          <div class="pomodoro-mode-selector">
            <button class="mode-btn active" data-mode="work">Work</button>
            <button class="mode-btn" data-mode="shortBreak">Short Break</button>
            <button class="mode-btn" data-mode="longBreak">Long Break</button>
          </div>
          
          <div class="pomodoro-display">
            <svg class="progress-ring" width="200" height="200">
              <circle class="progress-ring-bg" cx="100" cy="100" r="85" />
              <circle class="progress-ring-circle" cx="100" cy="100" r="85" />
            </svg>
            <div class="time-display" id="timeDisplay">25:00</div>
          </div>
          
          <div class="pomodoro-controls">
            <button class="control-btn start-btn" id="startBtn">
              <span>▶</span> Start
            </button>
            <button class="control-btn pause-btn" id="pauseBtn" style="display: none;">
              <span>⏸</span> Pause
            </button>
            <button class="control-btn reset-btn" id="resetBtn">
              <span>↻</span> Reset
            </button>
          </div>
          
          <div class="pomodoro-stats">
            <div class="stat-item">
              <span class="stat-label">Pomodoros Today</span>
              <span class="stat-value" id="pomodoroCount">0</span>
            </div>
          </div>
          
          <div class="pomodoro-settings">
            <details>
              <summary>⚙️ Settings</summary>
              <div class="settings-content">
                <div class="setting-item">
                  <label>Work Duration (min)</label>
                  <input type="number" id="workDuration" value="25" min="1" max="60">
                </div>
                <div class="setting-item">
                  <label>Short Break (min)</label>
                  <input type="number" id="shortBreak" value="5" min="1" max="30">
                </div>
                <div class="setting-item">
                  <label>Long Break (min)</label>
                  <input type="number" id="longBreak" value="15" min="1" max="60">
                </div>
                <button class="save-settings-btn" id="saveSettings">Save Settings</button>
              </div>
            </details>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', timerHTML);
    
    // Add notification permission request
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  setupEventListeners() {
    // Toggle timer visibility
    document.getElementById('pomodoroToggle').addEventListener('click', () => {
      this.toggleTimer();
    });

    // Mode selection
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        this.switchMode(mode);
      });
    });

    // Start button
    document.getElementById('startBtn').addEventListener('click', () => {
      this.start();
    });

    // Pause button
    document.getElementById('pauseBtn').addEventListener('click', () => {
      this.pause();
    });

    // Reset button
    document.getElementById('resetBtn').addEventListener('click', () => {
      this.reset();
    });

    // Clear task button
    document.getElementById('clearTaskBtn').addEventListener('click', () => {
      this.clearTask();
    });

    // Settings
    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });
  }

  toggleTimer() {
    const timer = document.getElementById('pomodoro-timer');
    timer.classList.toggle('collapsed');
    
    // Save state
    const isCollapsed = timer.classList.contains('collapsed');
    sessionStorage.setItem('pomodoroCollapsed', isCollapsed);
  }

  switchMode(mode) {
    if (this.isRunning) {
      if (!confirm('This will stop the current timer. Continue?')) return;
      this.stop();
    }

    this.mode = mode;
    
    // Update active button
    document.querySelectorAll('.mode-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.mode === mode) {
        btn.classList.add('active');
      }
    });

    // Set time based on mode
    switch(mode) {
      case 'work':
        this.timeRemaining = this.workDuration;
        break;
      case 'shortBreak':
        this.timeRemaining = this.shortBreak;
        break;
      case 'longBreak':
        this.timeRemaining = this.longBreak;
        break;
    }

    this.updateDisplay();
    this.saveState();
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    
    // Update UI
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-flex';
    
    // Start countdown
    this.interval = setInterval(() => {
      this.tick();
    }, 1000);

    this.saveState();
    this.addPomodoroClass();
  }

  pause() {
    this.isPaused = true;
    this.isRunning = false;
    clearInterval(this.interval);
    
    // Update UI
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('pauseBtn').style.display = 'none';
    
    this.saveState();
    this.removePomodoroClass();
  }

  stop() {
    this.isRunning = false;
    this.isPaused = false;
    clearInterval(this.interval);
    
    // Update UI
    document.getElementById('startBtn').style.display = 'inline-flex';
    document.getElementById('pauseBtn').style.display = 'none';
    
    this.removePomodoroClass();
  }

  reset() {
    if (this.isRunning && !confirm('This will reset the timer. Continue?')) return;
    
    this.stop();
    
    switch(this.mode) {
      case 'work':
        this.timeRemaining = this.workDuration;
        break;
      case 'shortBreak':
        this.timeRemaining = this.shortBreak;
        break;
      case 'longBreak':
        this.timeRemaining = this.longBreak;
        break;
    }
    
    this.updateDisplay();
    this.saveState();
  }

  tick() {
    this.timeRemaining--;
    
    if (this.timeRemaining <= 0) {
      this.complete();
    }
    
    this.updateDisplay();
    this.saveState();
  }

  complete() {
    this.stop();
    
    // Play notification sound (optional)
    this.playNotificationSound();
    
    // Show notification
    this.showNotification();
    
    // Update stats if it was a work session
    if (this.mode === 'work') {
      this.pomodorosCompleted++;
      document.getElementById('pomodoroCount').textContent = this.pomodorosCompleted;
      
      // Auto-switch to break
      const breakMode = this.pomodorosCompleted % 4 === 0 ? 'longBreak' : 'shortBreak';
      setTimeout(() => {
        this.switchMode(breakMode);
      }, 1000);
    } else {
      // Switch back to work after break
      setTimeout(() => {
        this.switchMode('work');
      }, 1000);
    }
    
    this.saveState();
  }

  updateDisplay() {
    const minutes = Math.floor(this.timeRemaining / 60);
    const seconds = this.timeRemaining % 60;
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    document.getElementById('timeDisplay').textContent = timeString;
    
    // Update progress ring
    const totalTime = this.mode === 'work' ? this.workDuration : 
                      this.mode === 'shortBreak' ? this.shortBreak : this.longBreak;
    const progress = (totalTime - this.timeRemaining) / totalTime;
    this.updateProgressRing(progress);
    
    // Update page title when running
    if (this.isRunning) {
      document.title = `${timeString} - ${this.mode === 'work' ? '🍅' : '☕'} Oollert Tasks`;
    } else {
      document.title = 'Oollert Tasks';
    }
  }

  updateProgressRing(progress) {
    const circle = document.querySelector('.progress-ring-circle');
    const radius = 85;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress);
    
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = offset;
  }

  setTask(taskId, taskTitle) {
    this.currentTaskId = taskId;
    this.currentTaskTitle = taskTitle;
    
    document.getElementById('taskTitleDisplay').textContent = taskTitle;
    document.getElementById('clearTaskBtn').style.display = 'inline-block';
    
    // Expand timer if collapsed
    const timer = document.getElementById('pomodoro-timer');
    if (timer.classList.contains('collapsed')) {
      timer.classList.remove('collapsed');
    }
    
    this.saveState();
  }

  clearTask() {
    if (this.isRunning && !confirm('This will stop the timer. Continue?')) return;
    
    this.currentTaskId = null;
    this.currentTaskTitle = null;
    
    document.getElementById('taskTitleDisplay').textContent = 'No task selected';
    document.getElementById('clearTaskBtn').style.display = 'none';
    
    if (this.isRunning) {
      this.stop();
      this.reset();
    }
    
    this.saveState();
  }

  saveSettings() {
    const workDuration = parseInt(document.getElementById('workDuration').value);
    const shortBreak = parseInt(document.getElementById('shortBreak').value);
    const longBreak = parseInt(document.getElementById('longBreak').value);
    
    this.workDuration = workDuration * 60;
    this.shortBreak = shortBreak * 60;
    this.longBreak = longBreak * 60;
    
    // Reset current time if not running
    if (!this.isRunning) {
      this.switchMode(this.mode);
    }
    
    // Save to localStorage
    localStorage.setItem('pomodoroSettings', JSON.stringify({
      workDuration: this.workDuration,
      shortBreak: this.shortBreak,
      longBreak: this.longBreak
    }));
    
    alert('Settings saved!');
  }

  saveState() {
    const state = {
      timeRemaining: this.timeRemaining,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      mode: this.mode,
      pomodorosCompleted: this.pomodorosCompleted,
      currentTaskId: this.currentTaskId,
      currentTaskTitle: this.currentTaskTitle,
      timestamp: Date.now()
    };
    
    sessionStorage.setItem('pomodoroState', JSON.stringify(state));
  }

  loadState() {
    // Load settings from localStorage
    const settings = localStorage.getItem('pomodoroSettings');
    if (settings) {
      const parsed = JSON.parse(settings);
      this.workDuration = parsed.workDuration;
      this.shortBreak = parsed.shortBreak;
      this.longBreak = parsed.longBreak;
      
      // Update settings inputs
      document.getElementById('workDuration').value = this.workDuration / 60;
      document.getElementById('shortBreak').value = this.shortBreak / 60;
      document.getElementById('longBreak').value = this.longBreak / 60;
    }
    
    // Load state from sessionStorage
    const state = sessionStorage.getItem('pomodoroState');
    if (state) {
      const parsed = JSON.parse(state);
      
      // Check if state is from today
      const stateDate = new Date(parsed.timestamp);
      const today = new Date();
      if (stateDate.toDateString() === today.toDateString()) {
        this.timeRemaining = parsed.timeRemaining;
        this.mode = parsed.mode;
        this.pomodorosCompleted = parsed.pomodorosCompleted;
        this.currentTaskId = parsed.currentTaskId;
        this.currentTaskTitle = parsed.currentTaskTitle;
        
        // Update UI
        document.getElementById('pomodoroCount').textContent = this.pomodorosCompleted;
        
        if (this.currentTaskTitle) {
          document.getElementById('taskTitleDisplay').textContent = this.currentTaskTitle;
          document.getElementById('clearTaskBtn').style.display = 'inline-block';
        }
        
        // Set active mode button
        document.querySelectorAll('.mode-btn').forEach(btn => {
          btn.classList.remove('active');
          if (btn.dataset.mode === this.mode) {
            btn.classList.add('active');
          }
        });
        
        // Don't auto-resume if it was running
        this.isRunning = false;
      }
    }
    
    // Load collapsed state
    const isCollapsed = sessionStorage.getItem('pomodoroCollapsed');
    if (isCollapsed === 'true') {
      document.getElementById('pomodoro-timer').classList.add('collapsed');
    }
  }

  showNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = this.mode === 'work' ? 'Work Session Complete! 🎉' : 'Break Complete!';
      const body = this.mode === 'work' 
        ? 'Time for a break! You earned it.' 
        : 'Break is over. Ready to focus again?';
      
      new Notification(title, {
        body: body,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  }

  playNotificationSound() {
    // Create a simple beep sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
      console.log('Audio not supported');
    }
  }

  addPomodoroClass() {
    document.body.classList.add('pomodoro-active');
  }

  removePomodoroClass() {
    document.body.classList.remove('pomodoro-active');
  }
}

// Initialize Pomodoro timer when DOM is loaded
let pomodoroTimer;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pomodoroTimer = new PomodoroTimer();
    window.pomodoroTimer = pomodoroTimer;
  });
} else {
  pomodoroTimer = new PomodoroTimer();
  window.pomodoroTimer = pomodoroTimer;
}