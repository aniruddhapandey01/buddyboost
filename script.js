document.addEventListener('DOMContentLoaded', () => {
  // ==========================================
  // 1. STATE & LOCAL STORAGE MANAGERS
  // ==========================================
  const defaultState = {
    theme: 'light',
    totalMinutes: 0,
    completedSessions: 0,
    masteredCards: 0,
    streak: 1,
    lastStudyDate: new Date().toDateString(),
    history: []
  };

  let state = { ...defaultState };

  const loadState = () => {
    try {
      const saved = localStorage.getItem('buddyboost_pro_state');
      if (saved) {
        state = { ...defaultState, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load local storage:', e);
    }
  };

  const saveState = () => {
    try {
      localStorage.setItem('buddyboost_pro_state', JSON.stringify(state));
      updateAnalyticsUI();
    } catch (e) {
      console.warn('Failed to save local storage:', e);
    }
  };

  // ==========================================
  // 2. THEME & NAVIGATION CONTROLLER
  // ==========================================
  const themeToggle = document.getElementById('themeToggle');
  
  const applyTheme = (theme) => {
    document.body.setAttribute('data-theme', theme);
    if (themeToggle) themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    state.theme = theme;
    saveState();
  };

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const newTheme = document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });
  }

  // Tab Navigation
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      navBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((tc) => tc.classList.remove('active'));

      btn.classList.add('active');
      const activeContent = document.getElementById(`tab-${targetTab}`);
      if (activeContent) activeContent.classList.add('active');
    });
  });

  // ==========================================
  // 3. WEB AUDIO SYNTHESIZER (CHIME & ALARM)
  // ==========================================
  let audioCtx = null;

  const getAudioContext = () => {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  };

  const playChimeSound = () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freqs = [659.25, 830.61, 987.77];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.9);
      });
    } catch (err) {
      console.warn('Audio chime error:', err);
    }
  };

  const testChimeBtn = document.getElementById('testChimeBtn');
  if (testChimeBtn) {
    testChimeBtn.addEventListener('click', () => {
      playChimeSound();
    });
  }

  // ==========================================
  // 4. PROCEDURAL AMBIENT SOUND ENGINE
  // ==========================================
  const activeSoundNodes = {};
  let masterGainNode = null;

  const initAudioEngine = () => {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (!masterGainNode) {
      masterGainNode = ctx.createGain();
      const masterVolInput = document.getElementById('masterVolume');
      const val = masterVolInput ? parseInt(masterVolInput.value, 10) / 100 : 0.7;
      masterGainNode.gain.setValueAtTime(val, ctx.currentTime);
      masterGainNode.connect(ctx.destination);
    }
  };

  const masterVolumeInput = document.getElementById('masterVolume');
  const masterVolumeLabel = document.getElementById('masterVolumeLabel');
  if (masterVolumeInput) {
    masterVolumeInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (masterVolumeLabel) masterVolumeLabel.textContent = `${val}%`;
      if (masterGainNode && audioCtx) {
        masterGainNode.gain.setValueAtTime(val / 100, audioCtx.currentTime);
      }
    });
  }

  const muteAllBtn = document.getElementById('muteAllBtn');
  if (muteAllBtn) {
    muteAllBtn.addEventListener('click', () => {
      Object.keys(activeSoundNodes).forEach((type) => {
        stopSound(type);
      });
      document.querySelectorAll('.sound-card').forEach((sc) => {
        sc.classList.remove('playing');
        const btn = sc.querySelector('.sound-toggle-btn');
        if (btn) btn.textContent = 'Play';
      });
    });
  }

  const createNoiseBuffer = (ctx, seconds = 5) => {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const startSound = (type, volume) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    initAudioEngine();
    stopSound(type);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.connect(masterGainNode);

    if (type === 'rain') {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx);
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gainNode);
      noise.start();
      activeSoundNodes[type] = { source: noise, gain: gainNode };
    } else if (type === 'ocean') {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx);
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);

      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(0.12, ctx.currentTime);
      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(250, ctx.currentTime);

      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      noise.connect(filter);
      filter.connect(gainNode);
      noise.start();
      lfo.start();
      activeSoundNodes[type] = { source: noise, lfo, gain: gainNode };
    } else if (type === 'brown') {
      const noise = ctx.createBufferSource();
      noise.buffer = createNoiseBuffer(ctx);
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(220, ctx.currentTime);

      noise.connect(filter);
      filter.connect(gainNode);
      noise.start();
      activeSoundNodes[type] = { source: noise, gain: gainNode };
    } else if (type === 'binaural') {
      const oscL = ctx.createOscillator();
      const oscR = ctx.createOscillator();

      oscL.frequency.setValueAtTime(200, ctx.currentTime);
      oscR.frequency.setValueAtTime(240, ctx.currentTime);

      const merger = ctx.createChannelMerger(2);
      oscL.connect(merger, 0, 0);
      oscR.connect(merger, 0, 1);

      merger.connect(gainNode);
      oscL.start();
      oscR.start();
      activeSoundNodes[type] = { sourceL: oscL, sourceR: oscR, gain: gainNode };
    }
  };

  const stopSound = (type) => {
    if (activeSoundNodes[type]) {
      const node = activeSoundNodes[type];
      if (node.source) node.source.stop();
      if (node.sourceL) node.sourceL.stop();
      if (node.sourceR) node.sourceR.stop();
      if (node.lfo) node.lfo.stop();
      delete activeSoundNodes[type];
    }
  };

  document.querySelectorAll('.sound-card').forEach((card) => {
    const soundType = card.dataset.sound;
    const toggleBtn = card.querySelector('.sound-toggle-btn');
    const volInput = card.querySelector('.sound-volume');

    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isPlaying = card.classList.contains('playing');
        if (isPlaying) {
          card.classList.remove('playing');
          toggleBtn.textContent = 'Play';
          stopSound(soundType);
        } else {
          card.classList.add('playing');
          toggleBtn.textContent = 'Pause';
          const vol = volInput ? parseInt(volInput.value, 10) / 100 : 0.5;
          startSound(soundType, vol);
        }
      });
    }

    if (volInput) {
      volInput.addEventListener('input', (e) => {
        const vol = parseInt(e.target.value, 10) / 100;
        if (activeSoundNodes[soundType] && audioCtx) {
          activeSoundNodes[soundType].gain.gain.setValueAtTime(vol, audioCtx.currentTime);
        }
      });
    }
  });

  // ==========================================
  // 5. FAST PLANNER & TURBO POMODORO TIMER
  // ==========================================
  const plannerForm = document.getElementById('plannerForm');
  const nameInput = document.getElementById('name');
  const goalInput = document.getElementById('goal');
  const subjectInput = document.getElementById('subject');
  const minutesInput = document.getElementById('minutes');
  const minutesLabel = document.getElementById('minutesLabel');
  const energyChoices = document.getElementById('energyChoices');
  const styleChoices = document.getElementById('styleChoices');
  const generateBtn = document.getElementById('generateBtn');

  const resultsSection = document.getElementById('results');
  const greetingEl = document.getElementById('greeting');
  const planListEl = document.getElementById('planList');
  const tinyWinEl = document.getElementById('tinyWin');
  const quizListEl = document.getElementById('quizList');
  const friendMessageEl = document.getElementById('friendMessage');
  const copyMessageBtn = document.getElementById('copyMessage');
  const modeNoteEl = document.getElementById('modeNote');
  const startOverBtn = document.getElementById('startOver');
  const markCompletedBtn = document.getElementById('markCompletedBtn');
  const errorBox = document.getElementById('errorBox');

  // Timer Widget Elements
  const timerCircle = document.getElementById('timerCircle');
  const timerTimeDisplay = document.getElementById('timerTimeDisplay');
  const timerCurrentStepTitle = document.getElementById('timerCurrentStepTitle');
  const timerPhaseBadge = document.getElementById('timerPhaseBadge');
  const timerStepCounter = document.getElementById('timerStepCounter');
  const timerToggleBtn = document.getElementById('timerToggleBtn');
  const timerToggleIcon = document.getElementById('timerToggleIcon');
  const timerToggleText = document.getElementById('timerToggleText');
  const timerResetBtn = document.getElementById('timerResetBtn');
  const timerSkipBtn = document.getElementById('timerSkipBtn');
  const timerTurboBtn = document.getElementById('timerTurboBtn');
  const timerAdd1MinBtn = document.getElementById('timerAdd1MinBtn');
  const timerAdd5MinBtn = document.getElementById('timerAdd5MinBtn');

  let activePlan = [];
  let currentStepIdx = 0;
  let timerInterval = null;
  let timerTotalSeconds = 25 * 60;
  let timerRemainingSeconds = 25 * 60;
  let isTimerRunning = false;
  let isTurboMode = false;

  if (minutesInput && minutesLabel) {
    minutesInput.addEventListener('input', (e) => {
      minutesLabel.textContent = `${e.target.value} min`;
    });
  }

  const setupChoiceRow = (container) => {
    if (!container) return;
    container.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.choice');
      if (!targetBtn) return;
      container.querySelectorAll('.choice').forEach((b) => b.classList.remove('selected'));
      targetBtn.classList.add('selected');
    });
  };

  setupChoiceRow(energyChoices);
  setupChoiceRow(styleChoices);

  const getSelectedValue = (container, dataAttr) => {
    const selectedBtn = container ? container.querySelector('.choice.selected') : null;
    return selectedBtn ? selectedBtn.dataset[dataAttr] : null;
  };

  const selectChoiceByData = (container, dataAttr, val) => {
    if (!container) return;
    const btn = container.querySelector(`.choice[data-${dataAttr}="${val}"]`);
    if (btn) {
      container.querySelectorAll('.choice').forEach((b) => b.classList.remove('selected'));
      btn.classList.add('selected');
    }
  };

  // 1-Click Fast Presets
  document.querySelectorAll('.preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const g = btn.dataset.goal;
      const s = btn.dataset.subject;
      const m = btn.dataset.min;
      const e = btn.dataset.energy;
      const st = btn.dataset.style;

      if (goalInput) goalInput.value = g;
      if (subjectInput) subjectInput.value = s;
      if (minutesInput) {
        minutesInput.value = m;
        if (minutesLabel) minutesLabel.textContent = `${m} min`;
      }
      selectChoiceByData(energyChoices, 'energy', e);
      selectChoiceByData(styleChoices, 'style', st);

      // Trigger instant plan build
      buildPlanInstant();
    });
  });

  // Timer Functions
  const updateTimerDisplay = () => {
    const mins = Math.floor(timerRemainingSeconds / 60);
    const secs = timerRemainingSeconds % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    if (timerTimeDisplay) timerTimeDisplay.textContent = formatted;

    if (timerCircle) {
      const circumference = 2 * Math.PI * 45;
      const progressRatio = timerTotalSeconds > 0 ? timerRemainingSeconds / timerTotalSeconds : 0;
      const offset = circumference * (1 - progressRatio);
      timerCircle.style.strokeDashoffset = offset;
    }
  };

  const startTimer = () => {
    if (isTimerRunning) return;
    isTimerRunning = true;
    if (timerToggleIcon) timerToggleIcon.textContent = '⏸';
    if (timerToggleText) timerToggleText.textContent = 'Pause';

    const tickRate = isTurboMode ? 100 : 1000;
    const decrementAmt = isTurboMode ? 5 : 1;

    timerInterval = setInterval(() => {
      if (timerRemainingSeconds > 0) {
        timerRemainingSeconds = Math.max(0, timerRemainingSeconds - decrementAmt);
        updateTimerDisplay();
      } else {
        pauseTimer();
        playChimeSound();
        if (currentStepIdx < activePlan.length - 1) {
          loadStepInTimer(currentStepIdx + 1);
        } else {
          alert('🎉 Congratulations! You completed all study phases for this session!');
        }
      }
    }, tickRate);
  };

  const pauseTimer = () => {
    isTimerRunning = false;
    if (timerInterval) clearInterval(timerInterval);
    if (timerToggleIcon) timerToggleIcon.textContent = '▶';
    if (timerToggleText) timerToggleText.textContent = 'Resume';
  };

  const loadStepInTimer = (idx) => {
    if (!activePlan || !activePlan[idx]) return;
    pauseTimer();
    currentStepIdx = idx;
    const step = activePlan[idx];

    if (timerCurrentStepTitle) timerCurrentStepTitle.textContent = step.title;
    if (timerStepCounter) timerStepCounter.textContent = `Step ${idx + 1} of ${activePlan.length}`;
    if (timerPhaseBadge) timerPhaseBadge.textContent = step.type || 'Focus Phase';

    timerTotalSeconds = step.durationMin * 60;
    timerRemainingSeconds = timerTotalSeconds;
    updateTimerDisplay();

    document.querySelectorAll('.plan-step').forEach((el, i) => {
      if (i === idx) {
        el.style.borderColor = 'var(--purple)';
        el.style.background = 'var(--lav)';
      } else {
        el.style.borderColor = 'var(--line)';
        el.style.background = 'var(--bg-card)';
      }
    });
  };

  if (timerToggleBtn) {
    timerToggleBtn.addEventListener('click', () => {
      if (isTimerRunning) pauseTimer();
      else startTimer();
    });
  }

  if (timerResetBtn) {
    timerResetBtn.addEventListener('click', () => {
      pauseTimer();
      timerRemainingSeconds = timerTotalSeconds;
      updateTimerDisplay();
    });
  }

  if (timerSkipBtn) {
    timerSkipBtn.addEventListener('click', () => {
      if (currentStepIdx < activePlan.length - 1) {
        loadStepInTimer(currentStepIdx + 1);
      }
    });
  }

  if (timerTurboBtn) {
    timerTurboBtn.addEventListener('click', () => {
      isTurboMode = !isTurboMode;
      timerTurboBtn.classList.toggle('active', isTurboMode);
      timerTurboBtn.textContent = isTurboMode ? '⚡ Turbo 5x ON' : '⚡ Turbo Mode';
      if (isTimerRunning) {
        pauseTimer();
        startTimer();
      }
    });
  }

  if (timerAdd1MinBtn) {
    timerAdd1MinBtn.addEventListener('click', () => {
      timerRemainingSeconds += 60;
      timerTotalSeconds += 60;
      updateTimerDisplay();
    });
  }

  if (timerAdd5MinBtn) {
    timerAdd5MinBtn.addEventListener('click', () => {
      timerRemainingSeconds += 300;
      timerTotalSeconds += 300;
      updateTimerDisplay();
    });
  }

  // Instantaneous Plan Generator
  const generatePlanSteps = (goal, subject, minutes, energy, style) => {
    const steps = [];
    let warmUpTime = 5;
    let coolDownTime = 5;
    let totalFocusTime = minutes - warmUpTime - coolDownTime;

    steps.push({
      durationMin: warmUpTime,
      type: 'Warm-up',
      title: style === 'playful' ? '🚀 Quest Setup' : '🌱 Warm-up & Desk Setup',
      desc: `Spend ${warmUpTime} minutes setting up your notes for ${subject}. Silence phone notifications and write down your main goal: "${goal}".`
    });

    if (minutes >= 45) {
      const sprint1Time = Math.floor(totalFocusTime * 0.55);
      const breakTime = 5;
      const sprint2Time = totalFocusTime - sprint1Time - breakTime;

      steps.push({
        durationMin: sprint1Time,
        type: 'Deep Focus',
        title: style === 'playful' ? '⚡ Core Quest Sprint (Part 1)' : '🧠 Core Concept Mastery',
        desc: `Dive straight into ${subject}. Focus purely on understanding key concepts related to "${goal}".`
      });

      steps.push({
        durationMin: breakTime,
        type: 'Brain Break',
        title: '☕ Mindful Rest & Water Break',
        desc: `Step away from your desk. Stretch your back, take a deep breath, and let your brain process what you studied.`
      });

      steps.push({
        durationMin: sprint2Time,
        type: 'Practice',
        title: style === 'playful' ? '🎯 Boss Fight: Practice' : '✍️ Practical Application & Active Recall',
        desc: `Apply what you learned in ${subject}. Solve 1 or 2 practice problems or summarize key takeaways in your own words.`
      });
    } else {
      steps.push({
        durationMin: totalFocusTime,
        type: 'Deep Focus',
        title: style === 'playful' ? '⚡ Focused Challenge Sprint' : '🧠 High-Impact Learning Sprint',
        desc: `Focus deeply on ${subject}. Break down "${goal}" into key sub-topics and test yourself as you read.`
      });
    }

    steps.push({
      durationMin: coolDownTime,
      type: 'Review',
      title: '🌟 Session Wrap-up & Review',
      desc: `Spend ${coolDownTime} minutes reviewing what you accomplished. Write down 3 quick key takeaways!`
    });

    return steps;
  };

  const buildPlanInstant = () => {
    const name = nameInput.value.trim() || 'Friend';
    const goal = goalInput.value.trim();
    const subject = subjectInput.value.trim();
    const minutes = parseInt(minutesInput.value, 10) || 25;
    const energy = getSelectedValue(energyChoices, 'energy') || 'Okay';
    const style = getSelectedValue(styleChoices, 'style') || 'gentle';

    if (!goal || !subject) {
      if (errorBox) {
        errorBox.textContent = 'Please fill in both your study goal and subject to build a plan.';
        errorBox.classList.remove('hidden');
      }
      return;
    }

    if (errorBox) errorBox.classList.add('hidden');

    greetingEl.textContent = `Here is your custom ${minutes}-minute game plan for ${subject}, ${name}!`;

    activePlan = generatePlanSteps(goal, subject, minutes, energy, style);
    planListEl.innerHTML = activePlan
      .map(
        (step, idx) => `
      <div class="plan-step">
        <div class="plan-time">${step.durationMin} min</div>
        <div>
          <h3>${step.title}</h3>
          <p>${step.desc}</p>
        </div>
        <button class="load-timer-btn" data-step-idx="${idx}">Load in Timer ⏱️</button>
      </div>
    `
      )
      .join('');

    planListEl.querySelectorAll('.load-timer-btn').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        const idx = parseInt(ev.target.dataset.stepIdx, 10);
        loadStepInTimer(idx);
        document.getElementById('timerWidget').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });

    loadStepInTimer(0);

    tinyWinEl.textContent = `Open your notes on "${subject}" right now and write down the single title: "${goal}". That's 1% done already!`;

    generateFlashcardDeck(subject, goal);

    quizListEl.innerHTML = [
      { q: `1. Can you explain the core idea of "${subject}" in 2 sentences?`, a: `Focus on the main definition and why it matters in practical applications.` },
      { q: `2. What is the single most important rule regarding "${goal}"?`, a: `Recall 1 key formula, logic rule, or pattern you encountered.` },
      { q: `3. What trap or common mistake should you avoid in ${subject}?`, a: `Write down 1 common misconception and how to avoid it.` }
    ].map(item => `
      <div class="quiz-item">
        <button type="button" class="quiz-question">
          <span>${item.q}</span>
          <span>+</span>
        </button>
        <div class="quiz-answer"><p>${item.a}</p></div>
      </div>
    `).join('');

    quizListEl.querySelectorAll('.quiz-item').forEach(item => {
      item.querySelector('.quiz-question').addEventListener('click', () => {
        item.classList.toggle('open');
      });
    });

    const friendMessageText = `Hey! I'm starting a focused ${minutes}-min study session right now to work on "${goal}" (${subject}). Wish me luck! 📚✨`;
    friendMessageEl.textContent = `"${friendMessageText}"`;

    copyMessageBtn.onclick = () => {
      navigator.clipboard.writeText(friendMessageText).then(() => {
        copyMessageBtn.textContent = 'Copied! ✨';
        setTimeout(() => { copyMessageBtn.textContent = 'Copy message'; }, 2000);
      });
    };

    modeNoteEl.textContent = `Plan customized for ${name} • ${minutes} min • ${energy} Energy • ${style} Vibe`;

    resultsSection.classList.remove('hidden');
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (plannerForm) {
    plannerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      buildPlanInstant();
    });
  }

  if (markCompletedBtn) {
    markCompletedBtn.addEventListener('click', () => {
      const subject = subjectInput.value.trim() || 'Study Session';
      const minutes = parseInt(minutesInput.value, 10) || 25;

      state.totalMinutes += minutes;
      state.completedSessions += 1;
      state.history.unshift({
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        subject: subject,
        minutes: minutes
      });

      saveState();
      alert(`🎉 Session logged! Added ${minutes} focus minutes to your study stats.`);
    });
  }

  if (startOverBtn) {
    startOverBtn.addEventListener('click', () => {
      resultsSection.classList.add('hidden');
      if (plannerForm) {
        plannerForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (goalInput) goalInput.focus();
      }
    });
  }

  // ==========================================
  // 6. FLASHCARDS DECK ENGINE
  // ==========================================
  let currentDeck = [];
  let currentCardIndex = 0;

  const generateFlashcardDeck = (subject, goal) => {
    currentDeck = [
      {
        front: `What is the primary objective of studying ${subject}?`,
        back: `To master "${goal}" and build a fundamental understanding of its key principles.`
      },
      {
        front: `What key concept or structure forms the foundation of ${subject}?`,
        back: `Understanding how components, syntax, data structures, or equations operate in context.`
      },
      {
        front: `How can you verify that you understand ${goal}?`,
        back: `By solving a problem from scratch or explaining the concept without looking at notes.`
      },
      {
        front: `What is a practical example of applying ${subject}?`,
        back: `Building a project, writing clean code, solving real-world practice questions, or summarizing case studies.`
      }
    ];

    currentCardIndex = 0;
    updateFlashcardUI();
  };

  const activeFlashcard = document.getElementById('activeFlashcard');
  const cardFrontText = document.getElementById('cardFrontText');
  const cardBackText = document.getElementById('cardBackText');
  const deckTopicLabel = document.getElementById('deckTopicLabel');
  const deckCardCount = document.getElementById('deckCardCount');
  const prevCardBtn = document.getElementById('prevCardBtn');
  const nextCardBtn = document.getElementById('nextCardBtn');
  const markMasteredBtn = document.getElementById('markMasteredBtn');
  const markNeedsReviewBtn = document.getElementById('markNeedsReviewBtn');
  const generateNewDeckBtn = document.getElementById('generateNewDeckBtn');

  const updateFlashcardUI = () => {
    if (!currentDeck.length) return;
    if (activeFlashcard) activeFlashcard.classList.remove('flipped');

    const card = currentDeck[currentCardIndex];
    if (cardFrontText) cardFrontText.textContent = card.front;
    if (cardBackText) cardBackText.textContent = card.back;
    if (deckCardCount) deckCardCount.textContent = `Card ${currentCardIndex + 1} of ${currentDeck.length}`;
    if (deckTopicLabel) {
      const subject = subjectInput.value.trim() || 'General Study';
      deckTopicLabel.textContent = `Topic: ${subject}`;
    }
  };

  if (activeFlashcard) {
    activeFlashcard.addEventListener('click', () => {
      activeFlashcard.classList.toggle('flipped');
    });
    activeFlashcard.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        activeFlashcard.classList.toggle('flipped');
      }
    });
  }

  if (prevCardBtn) {
    prevCardBtn.addEventListener('click', () => {
      if (currentCardIndex > 0) {
        currentCardIndex--;
        updateFlashcardUI();
      }
    });
  }

  if (nextCardBtn) {
    nextCardBtn.addEventListener('click', () => {
      if (currentCardIndex < currentDeck.length - 1) {
        currentCardIndex++;
        updateFlashcardUI();
      }
    });
  }

  if (markMasteredBtn) {
    markMasteredBtn.addEventListener('click', () => {
      state.masteredCards += 1;
      saveState();
      if (currentCardIndex < currentDeck.length - 1) {
        currentCardIndex++;
        updateFlashcardUI();
      }
    });
  }

  if (markNeedsReviewBtn) {
    markNeedsReviewBtn.addEventListener('click', () => {
      if (currentCardIndex < currentDeck.length - 1) {
        currentCardIndex++;
        updateFlashcardUI();
      }
    });
  }

  if (generateNewDeckBtn) {
    generateNewDeckBtn.addEventListener('click', () => {
      const subj = subjectInput.value.trim() || 'General Study';
      const gl = goalInput.value.trim() || 'Core Mastery';
      generateFlashcardDeck(subj, gl);
    });
  }

  generateFlashcardDeck('C Programming & Arrays', 'Understand arrays in C');

  // ==========================================
  // 7. ANALYTICS & DASHBOARD UI UPDATER
  // ==========================================
  const updateAnalyticsUI = () => {
    const streakCount = document.getElementById('streakCount');
    const heroTotalMinutes = document.getElementById('heroTotalMinutes');
    const heroTotalSessions = document.getElementById('heroTotalSessions');
    const heroMasteredCards = document.getElementById('heroMasteredCards');

    if (streakCount) streakCount.textContent = state.streak;
    if (heroTotalMinutes) heroTotalMinutes.textContent = state.totalMinutes;
    if (heroTotalSessions) heroTotalSessions.textContent = state.completedSessions;
    if (heroMasteredCards) heroMasteredCards.textContent = state.masteredCards;

    const heroProgress = document.getElementById('heroProgress');
    if (heroProgress) {
      const pct = Math.min(100, Math.max(15, (state.totalMinutes % 100)));
      heroProgress.style.width = `${pct}%`;
    }

    const analyticsTotalMinutes = document.getElementById('analyticsTotalMinutes');
    const analyticsTotalSessions = document.getElementById('analyticsTotalSessions');
    const analyticsMastered = document.getElementById('analyticsMastered');
    const analyticsStreak = document.getElementById('analyticsStreak');
    const historyList = document.getElementById('historyList');

    if (analyticsTotalMinutes) analyticsTotalMinutes.textContent = state.totalMinutes;
    if (analyticsTotalSessions) analyticsTotalSessions.textContent = state.completedSessions;
    if (analyticsMastered) analyticsMastered.textContent = state.masteredCards;
    if (analyticsStreak) analyticsStreak.textContent = state.streak;

    if (historyList) {
      if (state.history.length === 0) {
        historyList.innerHTML = `<p class="empty-history">No completed sessions logged yet. Complete a study session to build your streak!</p>`;
      } else {
        historyList.innerHTML = state.history
          .map(
            (item) => `
          <div class="history-item">
            <div>
              <strong>${item.subject}</strong>
              <div style="font-size: 10px; color: var(--muted);">${item.date} at ${item.time}</div>
            </div>
            <span class="plan-time">${item.minutes} min</span>
          </div>
        `
          )
          .join('');
      }
    }
  };

  const clearDataBtn = document.getElementById('clearDataBtn');
  if (clearDataBtn) {
    clearDataBtn.addEventListener('click', () => {
      if (confirm('Are you sure you want to reset all your study analytics and history?')) {
        state = { ...defaultState };
        saveState();
      }
    });
  }

  loadState();
  applyTheme(state.theme);
  updateAnalyticsUI();
});