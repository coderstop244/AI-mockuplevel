/**
 * Mockuplevel - Human-Crafted Learning & Study Dashboard
 * User-isolated data, theme switcher (Dark/Light + Accents), and interactive tools
 */

const App = {
  state: {
    activeTab: 'dashboard',
    quizSubtab: 'papers',
    themeMode: 'light',
    accentTheme: 'teal',
    user: null,

    // User-specific data
    topics: [],
    recentFiles: [],
    recentActivities: [],
    mockReports: [],

    // Remote materials
    sources: [],
    selectedSource: null,
    storageFiles: [],

    // Flashcards & Quizzes
    flashcards: [],
    currentCardIndex: 0,
    isCardFlipped: false,
    mockPapers: [],
    activeMockPaper: null,
    mockPaperTimer: null,
    mockPaperTimeLeft: 3600
  },

  init() {
    this.restoreUserAndTheme();
    this.setupEventListeners();
    this.initUserData();
    this.renderDashboard();
    this.fetchSources();
    this.fetchStorageFiles();
    this.loadMockPapers();
    this.loadFlashcards();

    if (window.Session) {
      window.Session.renderNavigation();
    }
    this.renderIcons();
  },

  renderIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  },

  // -----------------------------
  // Theme & User Setup
  // -----------------------------
  restoreUserAndTheme() {
    this.state.user = window.Session ? window.Session.getUser() : { name: 'Nikhil', email: 'nikhil@gmail.com' };

    // Theme Mode: Light (default matching screenshot) vs Dark
    const savedMode = localStorage.getItem('mockuplevel_theme_mode') || 'light';
    this.setThemeMode(savedMode, false);

    // Accent Palette
    const savedAccent = localStorage.getItem('mockuplevel_accent') || 'teal';
    this.setAccentTheme(savedAccent, false);
  },

  setThemeMode(mode, save = true) {
    this.state.themeMode = mode;
    const isDark = mode === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.body.classList.toggle('dark', isDark);

    const icon = document.getElementById('theme-mode-icon');
    if (icon) {
      icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    }

    if (save) {
      localStorage.setItem('mockuplevel_theme_mode', mode);
      this.showToast(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode enabled`, 'info', 1600);
    }
    this.renderIcons();
  },

  toggleThemeMode() {
    const newMode = this.state.themeMode === 'dark' ? 'light' : 'dark';
    this.setThemeMode(newMode);
  },

  setAccentTheme(theme, save = true) {
    this.state.accentTheme = theme;
    document.body.classList.remove('theme-teal', 'theme-cyan', 'theme-indigo', 'theme-emerald', 'theme-violet');
    document.body.classList.add(`theme-${theme}`);

    if (save) {
      localStorage.setItem('mockuplevel_accent', theme);
      this.showToast(`Color palette updated to ${theme.toUpperCase()}`, 'info', 1600);
    }
  },

  promptSwitchUser() {
    const email = prompt('Enter a Gmail address to log in as a different user:', 'alex@gmail.com');
    if (email && email.trim()) {
      const name = prompt('Enter the learner name:', email.split('@')[0]);
      window.Session.signIn({
        email: email.trim(),
        name: name ? name.trim() : email.split('@')[0],
        provider: 'google'
      });
      window.location.reload();
    }
  },

  // -----------------------------
  // User Data Isolation
  // -----------------------------
  initUserData() {
    const user = this.state.user;
    if (!user) return;

    // Load or initialize user's recent files matching reference screenshot
    const defaultFiles = [
      { name: 'OS_Notes.pdf', pages: 24, size: '3.2 MB', type: 'pdf', color: 'rose' },
      { name: 'Python_Basics.pdf', pages: 18, size: '1.8 MB', type: 'pdf', color: 'blue' },
      { name: 'DBMS_Notes.pdf', pages: 16, size: '2.1 MB', type: 'pdf', color: 'purple' },
      { name: 'Data_Visualization.pptx', pages: 42, size: '5.6 MB', type: 'pptx', color: 'amber' }
    ];
    this.state.recentFiles = window.Session.getUserData('recent_files', defaultFiles);

    // Load or initialize user's recent activity matching reference screenshot
    const defaultActivities = [
      { id: 1, title: 'Quiz completed', detail: 'Python Basics • 8/10', time: '2 hours ago', icon: 'check-circle', color: 'emerald' },
      { id: 2, title: 'Material uploaded', detail: 'DSA Notes.pdf', time: '5 hours ago', icon: 'upload-cloud', color: 'blue' },
      { id: 3, title: 'Started new topic', detail: 'Database Systems', time: '1 day ago', icon: 'book-open', color: 'purple' },
      { id: 4, title: 'Quiz review', detail: 'Maths Notes', time: '1 day ago', icon: 'file-text', color: 'teal' }
    ];
    this.state.recentActivities = window.Session.getUserData('recent_activities', defaultActivities);

    // Load user's mock examination reports
    this.state.mockReports = window.Session.getUserData('mock_reports', []);
  },

  recordUserActivity(title, detail, icon = 'check-circle', color = 'emerald') {
    const newAct = {
      id: Date.now(),
      title,
      detail,
      time: 'Just now',
      icon,
      color
    };
    this.state.recentActivities.unshift(newAct);
    this.state.recentActivities = this.state.recentActivities.slice(0, 10);
    window.Session.setUserData('recent_activities', this.state.recentActivities);
    this.renderRecentActivities();
  },

  // -----------------------------
  // Navigation & Tabs
  // -----------------------------
  switchTab(tab) {
    this.state.activeTab = tab;

    // Hide all tab views
    document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));
    const target = document.getElementById(`tab-${tab}`);
    if (target) target.classList.remove('hidden');

    // Update active state in sidebar
    document.querySelectorAll('#sidebar-nav .nav-item').forEach(btn => {
      const isTarget = btn.getAttribute('data-nav') === tab;
      btn.classList.toggle('active', isTarget);
    });

    if (tab === 'materials') this.renderMaterialsGrid();
    if (tab === 'review') this.renderExamReports();
    if (tab === 'progress') this.fetchMastery();

    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.renderIcons();
  },

  switchQuizSubtab(subtab) {
    this.state.quizSubtab = subtab;
    const isPapers = subtab === 'papers';
    const papersEl = document.getElementById('quiz-subtab-papers');
    const flashEl = document.getElementById('quiz-subtab-flashcards');
    const btnPapers = document.getElementById('btn-subtab-papers');
    const btnFlash = document.getElementById('btn-subtab-flashcards');

    if (papersEl) papersEl.classList.toggle('hidden', !isPapers);
    if (flashEl) flashEl.classList.toggle('hidden', isPapers);

    if (btnPapers) {
      btnPapers.className = isPapers
        ? 'px-3.5 py-1.5 rounded-xl bg-teal-500 text-white font-semibold text-xs transition-all'
        : 'px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-all';
    }
    if (btnFlash) {
      btnFlash.className = !isPapers
        ? 'px-3.5 py-1.5 rounded-xl bg-teal-500 text-white font-semibold text-xs transition-all'
        : 'px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs transition-all';
    }
    this.renderIcons();
  },

  toggleMobileMenu() {
    const sidebar = document.querySelector('.app-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('hidden');
      sidebar.classList.toggle('fixed');
      sidebar.classList.toggle('inset-0');
      sidebar.classList.toggle('z-50');
    }
  },

  // -----------------------------
  // Dashboard Renderers
  // -----------------------------
  renderDashboard() {
    const user = this.state.user;
    if (!user) return;

    // Greeting
    const greetingEl = document.querySelector('.session-greeting-text');
    if (greetingEl) {
      const greeting = window.Session ? window.Session.getTimeGreeting() : 'Good evening';
      greetingEl.innerHTML = `${greeting}, ${this.escapeHtml(user.name)} <span class="wave-emoji">👋</span>`;
    }

    // Sidebar motivation card
    const motEl = document.getElementById('sidebar-motivation-user');
    if (motEl) {
      motEl.textContent = `Keep going, ${user.name}!`;
    }

    // Render Recent Files List (Right column)
    this.renderRecentFiles();

    // Render Recent Activity (Center bottom)
    this.renderRecentActivities();

    // Render Progress Donut (85%)
    const donutCircle = document.getElementById('donut-progress-val');
    if (donutCircle) {
      // 377 is circumference, 85% is offset 56.55
      donutCircle.style.strokeDashoffset = '56';
    }
  },

  renderRecentFiles() {
    const list = document.getElementById('recent-files-list');
    if (!list) return;

    list.innerHTML = this.state.recentFiles.map(file => {
      let iconColor = 'text-rose-500 bg-rose-50 dark:bg-rose-500/10';
      if (file.color === 'blue') iconColor = 'text-blue-500 bg-blue-50 dark:bg-blue-500/10';
      if (file.color === 'purple') iconColor = 'text-purple-500 bg-purple-50 dark:bg-purple-500/10';
      if (file.color === 'amber') iconColor = 'text-amber-500 bg-amber-50 dark:bg-amber-500/10';

      return `
        <div class="file-item-row group cursor-pointer" onclick="App.openFile('${encodeURIComponent(file.name)}')">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${iconColor}">
              <i data-lucide="${file.type === 'pdf' ? 'file-text' : 'file'}" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                ${this.escapeHtml(file.name)}
              </div>
              <div class="text-[10px] text-slate-400">
                ${file.pages} pages • ${file.size}
              </div>
            </div>
          </div>
          <button class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white" title="Options">
            <i data-lucide="more-vertical" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    }).join('');

    this.renderIcons();
  },

  renderRecentActivities() {
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    container.innerHTML = this.state.recentActivities.map(act => {
      let badgeStyle = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400';
      if (act.color === 'blue') badgeStyle = 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400';
      if (act.color === 'purple') badgeStyle = 'bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400';
      if (act.color === 'teal') badgeStyle = 'bg-teal-50 text-teal-600 dark:bg-teal-500/10 dark:text-teal-400';

      return `
        <div class="flex items-center justify-between py-1">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${badgeStyle}">
              <i data-lucide="${act.icon || 'check-circle'}" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="text-xs font-semibold text-slate-800 dark:text-slate-100">${this.escapeHtml(act.title)}</div>
              <div class="text-[11px] text-slate-400">${this.escapeHtml(act.detail)}</div>
            </div>
          </div>
          <span class="text-[11px] text-slate-400 font-mono">${this.escapeHtml(act.time)}</span>
        </div>
      `;
    }).join('');

    this.renderIcons();
  },

  studySubject(subject) {
    this.showToast(`Starting review session for: ${subject}`, 'info', 2000);
    this.recordUserActivity(`Reviewed ${subject}`, 'Focus study session', 'book-open', 'purple');
    this.switchTab('quiz');
  },

  openFile(fileName) {
    fileName = decodeURIComponent(fileName);
    this.showToast(`Opened: ${fileName}`, 'success', 2000);
    this.recordUserActivity(`Opened ${fileName}`, 'Document reading', 'file-text', 'blue');
    this.switchTab('materials');
  },

  // -----------------------------
  // Materials & Reader
  // -----------------------------
  async fetchSources() {
    try {
      const res = await fetch('/api/v1/sources');
      const data = await res.json();
      this.state.sources = data.sources || [];
      this.renderMaterialsGrid();
    } catch (err) {
      console.warn('Sources could not be loaded:', err);
    }
  },

  renderMaterialsGrid() {
    const grid = document.getElementById('materials-grid');
    if (!grid) return;

    if (!this.state.sources.length) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12 text-slate-400 text-xs">
          No materials loaded yet. Upload your first lecture or PDF document.
        </div>
      `;
      return;
    }

    grid.innerHTML = this.state.sources.map(s => `
      <div class="app-card p-5 flex flex-col justify-between space-y-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.media_type === 'video' ? 'bg-indigo-500/10 text-indigo-500' : 'bg-teal-500/10 text-teal-600'}">
              ${s.media_type}
            </span>
            <span class="text-xs text-slate-400 font-mono">${s.chunks_count} chunks</span>
          </div>
          <h4 class="font-bold text-sm text-slate-800 dark:text-slate-100">${this.escapeHtml(s.title)}</h4>
          <p class="text-[11px] text-slate-400 truncate mt-1">ID: ${this.escapeHtml(s.source_id)}</p>
        </div>

        <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
          <span class="text-xs text-slate-400">${s.keyframes_count || 0} Keyframes</span>
          <button onclick="App.startStudy('${encodeURIComponent(s.source_id)}')" class="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow transition-all flex items-center gap-1">
            <span>Study Now</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>
    `).join('');

    this.renderIcons();
  },

  startStudy(sourceId) {
    sourceId = decodeURIComponent(sourceId);
    this.state.selectedSource = sourceId;
    this.showToast(`Selected source: ${sourceId}`, 'info');
    this.recordUserActivity(`Studied ${sourceId}`, 'Material review', 'book-open', 'teal');
    this.switchTab('quiz');
  },

  // -----------------------------
  // Storage & Direct Upload
  // -----------------------------
  async fetchStorageFiles(manual = false) {
    const spinner = document.getElementById('storage-refresh-spinner');
    if (spinner) spinner.classList.add('animate-spin');

    try {
      const res = await fetch('/api/v1/storage/files');
      const data = await res.json();
      this.state.storageFiles = data.files || [];
      this.renderStorageFiles();
      if (manual) this.showToast('Cloud storage synchronized! 🔄', 'info', 1800);
    } catch (err) {
      console.warn('Storage fetch failed:', err);
    } finally {
      if (spinner) setTimeout(() => spinner.classList.remove('animate-spin'), 600);
    }
  },

  renderStorageFiles() {
    const container = document.getElementById('storage-files-container');
    if (!container) return;

    if (!this.state.storageFiles.length) {
      container.innerHTML = `
        <div class="text-center py-6 text-slate-400 text-xs">
          No cloud storage files found.
        </div>
      `;
      return;
    }

    container.innerHTML = this.state.storageFiles.map(f => `
      <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
        <div class="flex items-center gap-2.5 truncate pr-2">
          <i data-lucide="${f.type === 'video' ? 'video' : 'file-text'}" class="w-4 h-4 text-teal-500 shrink-0"></i>
          <span class="font-semibold text-slate-800 dark:text-slate-100 truncate">${this.escapeHtml(f.name)}</span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="text-[10px] text-slate-400 font-mono">${(f.size_bytes / 1024 / 1024).toFixed(1)} MB</span>
          ${f.is_ingested ? `
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Indexed</span>
          ` : `
            <button onclick="App.ingestFile('${f.name}', '${f.type}')" class="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-[11px] transition-all">
              Ingest
            </button>
          `}
        </div>
      </div>
    `).join('');

    this.renderIcons();
  },

  async ingestFile(filename, type) {
    this.showToast(`Starting ingestion for ${filename}...`, 'info');
    try {
      const endpoint = type === 'video' ? '/api/v1/ingest/video' : '/api/v1/ingest/document';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: filename, storage_path: filename })
      });
      const data = await res.json();
      this.showToast(`Ingestion queued: Task ID ${data.task_id || 'OK'}`, 'success');
      this.recordUserActivity(`Ingested ${filename}`, 'Knowledge base indexing', 'upload-cloud', 'blue');
    } catch (err) {
      this.showToast(`Ingestion failed: ${err.message}`, 'error');
    }
  },

  async handleFileUpload(file) {
    if (!file) return;
    this.showToast(`Uploading ${file.name}...`, 'info');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auto_ingest', 'true');

    try {
      const res = await fetch('/api/v1/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      this.showToast(`Uploaded ${file.name} successfully! 🎉`, 'success');
      this.recordUserActivity(`Uploaded ${file.name}`, 'File upload', 'upload-cloud', 'blue');
      this.fetchSources();
      this.fetchStorageFiles();
    } catch (err) {
      this.showToast(`Upload failed: ${err.message}`, 'error');
    }
  },

  // -----------------------------
  // Mock Papers & Examination
  // -----------------------------
  async loadMockPapers() {
    const wrapper = document.getElementById('mock-papers-wrapper');
    if (!wrapper) return;

    try {
      const res = await fetch('/api/v1/study/mock-papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: this.state.selectedSource })
      });
      const data = await res.json();
      this.state.mockPapers = data.papers || [];
      this.renderMockPapers();
    } catch (err) {
      console.warn('Mock papers load error:', err);
    }
  },

  renderMockPapers() {
    const wrapper = document.getElementById('mock-papers-wrapper');
    if (!wrapper || !this.state.mockPapers.length) return;

    wrapper.innerHTML = `
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        ${this.state.mockPapers.map((paper, idx) => {
          const diff = paper.difficulty || 'Easy';
          let diffColor = 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10';
          if (diff === 'Medium') diffColor = 'text-amber-500 bg-amber-50 dark:bg-amber-500/10';
          if (diff === 'Hard') diffColor = 'text-orange-500 bg-orange-50 dark:bg-orange-500/10';
          if (diff === 'Expert') diffColor = 'text-rose-500 bg-rose-50 dark:bg-rose-500/10';

          return `
            <div class="app-card p-4 flex flex-col justify-between hover:border-teal-500 transition-all cursor-pointer group"
                 onclick="App.startExam(${idx})">
              <div>
                <div class="flex items-center justify-between mb-3">
                  <span class="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center justify-center">
                    #${idx + 1}
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold ${diffColor}">
                    ${diff}
                  </span>
                </div>
                <h4 class="font-bold text-xs text-slate-800 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                  ${this.escapeHtml(paper.title)}
                </h4>
              </div>
              <div class="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span>${paper.question_count || paper.questions.length} MCQs</span>
                <span class="text-teal-600 font-semibold group-hover:underline">Start →</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.renderIcons();
  },

  startExam(paperIndex) {
    const paper = this.state.mockPapers[paperIndex];
    if (!paper) return;

    this.state.activeMockPaper = paperIndex;
    this.state.mockPaperTimeLeft = 3600;

    const modal = document.getElementById('exam-modal');
    const title = document.getElementById('exam-modal-title');
    const subtitle = document.getElementById('exam-modal-subtitle');
    const body = document.getElementById('exam-modal-body');

    if (title) title.textContent = paper.title;
    if (subtitle) subtitle.textContent = `${paper.difficulty} Tier • ${paper.questions.length} Questions • 1-Hour Exam`;

    body.innerHTML = `
      <form id="exam-form" class="space-y-4" onsubmit="App.submitExam(event)">
        ${paper.questions.map((q, qIdx) => `
          <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 space-y-2.5">
            <div class="text-xs font-bold text-teal-600">Question ${qIdx + 1} of ${paper.questions.length}</div>
            <p class="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">${this.escapeHtml(q.question)}</p>
            <div class="space-y-1.5 pt-1">
              ${q.options.map((opt, optIdx) => `
                <label class="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 cursor-pointer text-xs">
                  <input type="radio" name="q-${qIdx}" value="${optIdx}" class="mt-0.5 accent-teal-600">
                  <span class="text-slate-700 dark:text-slate-200"><strong>${String.fromCharCode(65 + optIdx)}.</strong> ${this.escapeHtml(opt)}</span>
                </label>
              `).join('')}
            </div>
          </div>
        `).join('')}
        <div class="pt-2 flex justify-end">
          <button type="submit" class="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow">
            Submit Examination Paper
          </button>
        </div>
      </form>
    `;

    if (modal) modal.classList.remove('hidden');

    // Timer countdown
    if (this.state.mockPaperTimer) clearInterval(this.state.mockPaperTimer);
    this.state.mockPaperTimer = setInterval(() => {
      this.state.mockPaperTimeLeft--;
      const min = Math.floor(this.state.mockPaperTimeLeft / 60);
      const sec = this.state.mockPaperTimeLeft % 60;
      const timerEl = document.getElementById('exam-modal-timer');
      if (timerEl) timerEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      if (this.state.mockPaperTimeLeft <= 0) {
        clearInterval(this.state.mockPaperTimer);
        this.submitExam();
      }
    }, 1000);
  },

  submitExam(event) {
    if (event) event.preventDefault();
    const paper = this.state.mockPapers[this.state.activeMockPaper];
    const form = document.getElementById('exam-form');
    if (!paper || !form) return;

    const formData = new FormData(form);
    let correct = 0;
    const review = [];

    paper.questions.forEach((q, idx) => {
      const selected = formData.get(`q-${idx}`);
      const isAnswered = selected !== null;
      const isCorrect = isAnswered && Number(selected) === q.correct_index;
      if (isCorrect) correct++;

      review.push({
        num: idx + 1,
        question: q.question,
        options: q.options,
        correctIndex: q.correct_index,
        selectedIndex: isAnswered ? Number(selected) : null,
        isCorrect
      });
    });

    const total = paper.questions.length;
    const pct = Math.round((correct / total) * 100);

    const report = {
      id: Date.now(),
      title: paper.title,
      difficulty: paper.difficulty,
      score: correct,
      total,
      percentage: pct,
      date: new Date().toLocaleDateString(),
      review
    };

    // Store in user's isolated reports
    this.state.mockReports.unshift(report);
    window.Session.setUserData('mock_reports', this.state.mockReports);

    // Record activity
    this.recordUserActivity(`Completed ${paper.title}`, `Score: ${correct}/${total} (${pct}%)`, 'award', pct >= 70 ? 'emerald' : 'amber');

    this.closeExamModal();
    this.showToast(`Exam submitted! You scored ${pct}% 🎉`, 'success', 3000);
    this.switchTab('review');
  },

  closeExamModal() {
    if (this.state.mockPaperTimer) clearInterval(this.state.mockPaperTimer);
    const modal = document.getElementById('exam-modal');
    if (modal) modal.classList.add('hidden');
  },

  renderExamReports() {
    const tbody = document.getElementById('exam-reports-tbody');
    if (!tbody) return;

    if (!this.state.mockReports.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8 text-slate-400 text-xs">
            No examination papers taken yet. Take your first test under "Quiz & Mock Tests"!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.state.mockReports.map((r, idx) => `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/30 text-xs">
        <td class="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100">${this.escapeHtml(r.title)}</td>
        <td class="py-3 px-4"><span class="px-2 py-0.5 rounded font-bold text-[10px] bg-teal-500/10 text-teal-600">${r.difficulty}</span></td>
        <td class="py-3 px-4 font-mono font-bold">${r.score} / ${r.total}</td>
        <td class="py-3 px-4 font-mono font-bold ${r.percentage >= 70 ? 'text-emerald-500' : 'text-amber-500'}">${r.percentage}%</td>
        <td class="py-3 px-4 text-slate-400">${r.date}</td>
        <td class="py-3 px-4 text-right">
          <button onclick="App.viewReportDetails(${idx})" class="text-teal-600 dark:text-teal-400 font-semibold hover:underline">
            Review Q&A
          </button>
        </td>
      </tr>
    `).join('');
  },

  viewReportDetails(index) {
    const r = this.state.mockReports[index];
    if (!r) return;

    const modal = document.getElementById('exam-modal');
    const title = document.getElementById('exam-modal-title');
    const subtitle = document.getElementById('exam-modal-subtitle');
    const body = document.getElementById('exam-modal-body');

    if (title) title.textContent = `${r.title} — Detailed Evaluation`;
    if (subtitle) subtitle.textContent = `Score: ${r.score}/${r.total} (${r.percentage}%) • Taken on ${r.date}`;

    body.innerHTML = `
      <div class="space-y-3">
        ${(r.review || []).map(q => `
          <div class="p-3.5 rounded-xl border ${q.isCorrect ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-500/20' : 'bg-rose-50/50 border-rose-200 dark:bg-rose-950/20 dark:border-rose-500/20'} text-xs space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-slate-700 dark:text-slate-200">Question ${q.num}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${q.isCorrect ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/20 text-rose-600 dark:text-rose-400'}">
                ${q.isCorrect ? 'CORRECT' : 'INCORRECT'}
              </span>
            </div>
            <p class="font-semibold text-slate-800 dark:text-slate-100">${this.escapeHtml(q.question)}</p>
            <div class="space-y-1 pt-1">
              ${q.options.map((opt, optIdx) => `
                <div class="${optIdx === q.correctIndex ? 'text-emerald-600 dark:text-emerald-400 font-bold' : optIdx === q.selectedIndex ? 'text-rose-500 line-through' : 'text-slate-400'}">
                  ${String.fromCharCode(65 + optIdx)}. ${this.escapeHtml(opt)}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;

    if (modal) modal.classList.remove('hidden');
  },

  clearUserExamReports() {
    if (confirm('Clear all your examination history?')) {
      this.state.mockReports = [];
      window.Session.setUserData('mock_reports', []);
      this.renderExamReports();
      this.showToast('Examination history cleared.', 'info');
    }
  },

  // -----------------------------
  // Flashcards
  // -----------------------------
  async loadFlashcards() {
    try {
      const res = await fetch('/api/v1/study/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: this.state.selectedSource })
      });
      const data = await res.json();
      this.state.flashcards = data.cards || [];
      this.state.currentCardIndex = 0;
      this.state.isCardFlipped = false;
      this.renderFlashcard();
    } catch (err) {
      console.warn('Flashcard load error:', err);
    }
  },

  toggleFlashcardFlip() {
    this.state.isCardFlipped = !this.state.isCardFlipped;
    const flipper = document.getElementById('flashcard-flipper');
    if (flipper) flipper.classList.toggle('card-flipped', this.state.isCardFlipped);
  },

  shuffleFlashcards() {
    this.state.flashcards.sort(() => Math.random() - 0.5);
    this.state.currentCardIndex = 0;
    this.state.isCardFlipped = false;
    this.renderFlashcard();
    this.showToast('Flashcard deck shuffled! 🔀', 'info', 1500);
  },

  nextFlashcard(mastered = false) {
    if (mastered) {
      this.showToast('Card marked as mastered! 🌟', 'success', 1500);
      this.recordUserActivity('Mastered Flashcard', 'Active recall retention', 'zap', 'emerald');
    }
    if (this.state.currentCardIndex < this.state.flashcards.length - 1) {
      this.state.currentCardIndex++;
      this.state.isCardFlipped = false;
      this.renderFlashcard();
    } else {
      this.showToast('Deck completed! 🎉', 'success', 2500);
    }
  },

  prevFlashcard() {
    if (this.state.currentCardIndex > 0) {
      this.state.currentCardIndex--;
      this.state.isCardFlipped = false;
      this.renderFlashcard();
    }
  },

  renderFlashcard() {
    const card = this.state.flashcards[this.state.currentCardIndex];
    if (!card) return;

    const counter = document.getElementById('flashcard-counter-badge');
    const topic = document.getElementById('card-topic');
    const q = document.getElementById('card-question');
    const a = document.getElementById('card-answer');
    const cit = document.getElementById('card-citation');

    if (counter) counter.textContent = `Card ${this.state.currentCardIndex + 1} of ${this.state.flashcards.length}`;
    if (topic) topic.textContent = card.topic || 'Concept';
    if (q) q.textContent = card.question;
    if (a) a.textContent = card.answer;
    if (cit) cit.textContent = `⏱️ ${card.citation || 'Verified Source'}`;

    const flipper = document.getElementById('flashcard-flipper');
    if (flipper) flipper.classList.toggle('card-flipped', this.state.isCardFlipped);
  },

  // -----------------------------
  // Progress & Mastery
  // -----------------------------
  async fetchMastery() {
    const container = document.getElementById('progress-topics-list');
    if (!container) return;

    try {
      const res = await fetch('/api/v1/mastery');
      const data = await res.json();
      container.innerHTML = (data.topics || []).map(t => `
        <div class="app-card p-4 space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-slate-800 dark:text-slate-100">${this.escapeHtml(t.topic)}</span>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/10 text-teal-600">${t.status}</span>
              <span class="font-mono font-bold text-slate-800 dark:text-slate-200">${t.mastery}%</span>
            </div>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div class="bg-gradient-to-r from-teal-500 to-cyan-400 h-full rounded-full transition-all duration-500" style="width: ${t.mastery}%"></div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      console.warn('Mastery load failed:', err);
    }
  },

  exportMasteryReport() {
    const user = this.state.user ? this.state.user.name : 'Learner';
    const content = `# Mockuplevel - Competency Report for ${user}\nGenerated on ${new Date().toLocaleDateString()}\n\n- Total Topics: 9\n- Study Streak: 7 Days\n- Overall Progress: 33%\n\nKeep pushing forward!`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `StudyReport_${user}_${Date.now()}.md`;
    a.click();
    this.showToast('Competency report downloaded! 📊', 'success');
  },

  // -----------------------------
  // Settings & OpenAI Key
  // -----------------------------
  async saveOpenAIKey() {
    const input = document.getElementById('input-openai-key');
    const key = input ? input.value.trim() : '';
    if (!key) return this.showToast('Please enter an API key', 'warning');

    try {
      const res = await fetch('/api/v1/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openai_api_key: key })
      });
      if (res.ok) {
        this.showToast('OpenAI API key saved to server runtime! 🔑', 'success');
        input.value = '';
      }
    } catch (err) {
      this.showToast(`Error saving key: ${err.message}`, 'error');
    }
  },

  // -----------------------------
  // Search & Global Event Listeners
  // -----------------------------
  handleGlobalSearch(query) {
    query = (query || '').toLowerCase().trim();
    if (!query) return;

    if (query.includes('quiz') || query.includes('test') || query.includes('mock')) {
      this.switchTab('quiz');
    } else if (query.includes('material') || query.includes('pdf') || query.includes('note')) {
      this.switchTab('materials');
    } else if (query.includes('progress') || query.includes('score')) {
      this.switchTab('progress');
    }
  },

  setupEventListeners() {
    // Keyboard Spacebar for flashcards
    document.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA');
      if (e.code === 'Space' && !isInput && this.state.activeTab === 'quiz' && this.state.quizSubtab === 'flashcards') {
        e.preventDefault();
        this.toggleFlashcardFlip();
      }
      if (e.code === 'Escape') {
        this.closeExamModal();
      }
    });

    // File Dropzone setup
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-upload-input');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) this.handleFileUpload(e.target.files[0]);
      });
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('border-teal-500');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('border-teal-500'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('border-teal-500');
        if (e.dataTransfer.files.length) this.handleFileUpload(e.dataTransfer.files[0]);
      });
    }
  },

  // -----------------------------
  // Toast Helper
  // -----------------------------
  showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';

    let iconColor = 'text-teal-500';
    let iconName = 'info';
    if (type === 'success') { iconColor = 'text-emerald-500'; iconName = 'check-circle'; }
    if (type === 'warning') { iconColor = 'text-amber-500'; iconName = 'alert-triangle'; }
    if (type === 'error') { iconColor = 'text-rose-500'; iconName = 'alert-circle'; }

    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 ${iconColor} shrink-0"></i>
      <span class="flex-1">${this.escapeHtml(message)}</span>
      <button onclick="this.parentElement.remove()" class="text-slate-400 hover:text-slate-600 dark:hover:text-white p-0.5">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    `;

    container.appendChild(toast);
    this.renderIcons();

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
