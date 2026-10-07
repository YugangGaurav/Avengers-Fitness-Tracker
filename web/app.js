/**
 * ============================================================================
 * AVENGERS FITNESS TRACKER // STARK TECH HUD BROWSER ENGINE
 * Pure Vanilla JavaScript - GitHub Pages Compatible
 * Real-time DeviceMotionEvent sensor listener, zero-phase peak detection,
 * ACSM continuous calorie integration, Karvonen heart-rate modeling,
 * HTML5 canvas chart, and interactive ground-truth accuracy validation.
 * ============================================================================
 */

(function () {
  'use strict';

  // ==========================================================================
  // CONFIGURATION & CONSTANTS
  // ==========================================================================
  const CONFIG = {
    MAX_BUFFER_SEC: 12,        // Rolling waveform buffer window (seconds)
    MIN_STEP_TIME_MS: 280,     // Refractory lockout period (max 214 steps/min)
    GRAVITY_ESTIMATE: 9.80665, // Standard gravitational acceleration
    DEFAULT_STRIDE_M: 0.75,    // Default average step length (meters)
    STORAGE_KEYS: {
      PROFILE: 'avengers_fitness_profile',
      HISTORY: 'avengers_fitness_history',
      SIM_MODE: 'avengers_fitness_sim_mode'
    },
    MET_VALUES: {
      Sitting: 1.3,
      Walking: 3.8,
      Running: 7.0,
      Waiting: 1.0
    },
    INTENSITY_FACTORS: {
      Sitting: 0.10,
      Walking: 0.40,
      Running: 0.70,
      Waiting: 0.05
    }
  };

  // ==========================================================================
  // APPLICATION STATE
  // ==========================================================================
  const state = {
    // Session State
    isRunning: false,
    startTime: null,
    elapsedSec: 0,
    timerInterval: null,

    // Sensor & Hardware
    isSimulation: false,
    simActivity: 'Walking',
    sensorActive: false,
    sampleCount: 0,
    sampleRateHz: 50,
    lastSensorTimestamp: 0,
    simInterval: null,

    // Biomechanical Buffers
    rawBuffer: [],        // { t: seconds, rawMag, filtMag }
    stepTimestamps: [],   // Array of step occurrence timestamps (ms)
    lastStepTimeMs: -Infinity,
    peakMarkers: [],      // Array of detected peaks for canvas drawing

    // Calculated Workout Metrics
    steps: 0,
    calories: 0.0,
    distanceKm: 0.0,
    floors: 0,
    cadenceSpm: 0,
    currentActivity: 'WAITING',
    activityConfidence: 0,
    currentHR: 70,
    motionStd: 0.0,
    adaptiveThreshold: 1.2,

    // Accuracy Benchmark
    groundTruthSteps: 100,
    measuredAccuracy: null,

    // User Biometric Profile
    profile: {
      name: 'Avenger',
      weightKg: 70,
      heightCm: 175,
      age: 20,
      restHR: 70,
      strideM: 0.75
    },

    // Session History Archive
    history: []
  };

  // ==========================================================================
  // DOM ELEMENT REFERENCES
  // ==========================================================================
  const DOM = {
    // Navigation
    desktopNavItems: document.querySelectorAll('#desktopNav .nav-item'),
    mobileNavItems: document.querySelectorAll('#mobileNav .mobile-nav-item'),
    pages: document.querySelectorAll('.page'),
    pageTitle: document.getElementById('pageTitle'),
    pageSubtitle: document.getElementById('pageSubtitle'),
    globalTimer: document.getElementById('globalTimer'),
    modeBadge: document.getElementById('modeBadge'),
    modeText: document.getElementById('modeText'),

    // Telemetry & Indicators
    sidebarSensorBadge: document.getElementById('sidebarSensorBadge'),
    sidebarSensorText: document.getElementById('sidebarSensorText'),
    sidebarSampleRate: document.getElementById('sidebarSampleRate'),
    dashIndicatorDot: document.getElementById('dashIndicatorDot'),
    dashStatusText: document.getElementById('dashStatusText'),

    // Home Page Elements
    homeStartBtn: document.getElementById('homeStartBtn'),
    homeDashboardBtn: document.getElementById('homeDashboardBtn'),
    homeValidateBtn: document.getElementById('homeValidateBtn'),
    homeSteps: document.getElementById('homeSteps'),
    homeCalories: document.getElementById('homeCalories'),
    homeActivity: document.getElementById('homeActivity'),
    homeConfidence: document.getElementById('homeConfidence'),
    homeHR: document.getElementById('homeHR'),

    // Live Dashboard Elements
    dashStartBtn: document.getElementById('dashStartBtn'),
    dashStopBtn: document.getElementById('dashStopBtn'),
    dashResetBtn: document.getElementById('dashResetBtn'),
    dashSteps: document.getElementById('dashSteps'),
    dashCalories: document.getElementById('dashCalories'),
    dashHR: document.getElementById('dashHR'),
    dashDistance: document.getElementById('dashDistance'),
    dashFloors: document.getElementById('dashFloors'),
    dashCadence: document.getElementById('dashCadence'),
    dashActivity: document.getElementById('dashActivity'),
    dashConfidence: document.getElementById('dashConfidence'),
    dashPace: document.getElementById('dashPace'),

    // Canvas Elements
    accelCanvas: document.getElementById('accelCanvas'),
    liveSampleRateDisplay: document.getElementById('liveSampleRateDisplay'),
    liveStdDisplay: document.getElementById('liveStdDisplay'),
    liveBufferCount: document.getElementById('liveBufferCount'),

    // Activity Intelligence Elements
    intelActivityBadge: document.getElementById('intelActivityBadge'),
    intelConfidenceVal: document.getElementById('intelConfidenceVal'),
    intelConfidenceBar: document.getElementById('intelConfidenceBar'),
    intelCadence: document.getElementById('intelCadence'),
    intelStd: document.getElementById('intelStd'),
    intelDuration: document.getElementById('intelDuration'),
    activityTimelineList: document.getElementById('activityTimelineList'),

    // Health & Performance Elements
    healthHR: document.getElementById('healthHR'),
    healthCalories: document.getElementById('healthCalories'),
    healthDistance: document.getElementById('healthDistance'),
    healthSteps: document.getElementById('healthSteps'),
    healthZoneCurrent: document.getElementById('healthZoneCurrent'),
    healthHRMaxTag: document.getElementById('healthHRMaxTag'),
    healthNoteRestHR: document.getElementById('healthNoteRestHR'),
    healthNoteAge: document.getElementById('healthNoteAge'),
    zoneBars: [
      document.getElementById('zBar1'),
      document.getElementById('zBar2'),
      document.getElementById('zBar3'),
      document.getElementById('zBar4')
    ],

    // History & Accuracy Elements
    groundTruthInput: document.getElementById('groundTruthInput'),
    preset50Btn: document.getElementById('preset50Btn'),
    preset100Btn: document.getElementById('preset100Btn'),
    validateTestBtn: document.getElementById('validateTestBtn'),
    valDetectedSteps: document.getElementById('valDetectedSteps'),
    valActualSteps: document.getElementById('valActualSteps'),
    valDiffSteps: document.getElementById('valDiffSteps'),
    valAccuracyDisplay: document.getElementById('valAccuracyDisplay'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    historyTableBody: document.getElementById('historyTableBody'),

    // Profile & Settings Elements
    profileForm: document.getElementById('profileForm'),
    prefName: document.getElementById('prefName'),
    prefWeight: document.getElementById('prefWeight'),
    prefHeight: document.getElementById('prefHeight'),
    prefAge: document.getElementById('prefAge'),
    prefRestHR: document.getElementById('prefRestHR'),
    prefStepLength: document.getElementById('prefStepLength'),
    resetProfileBtn: document.getElementById('resetProfileBtn'),
    clearAllDataBtn: document.getElementById('clearAllDataBtn'),
    diagMotionStatus: document.getElementById('diagMotionStatus'),
    diagIosStatus: document.getElementById('diagIosStatus'),
    diagHttpsStatus: document.getElementById('diagHttpsStatus'),
    diagModeStatus: document.getElementById('diagModeStatus'),
    toggleSimEngineBtn: document.getElementById('toggleSimEngineBtn'),
    simActivitySelectRow: document.getElementById('simActivitySelectRow'),
    simActivitySelect: document.getElementById('simActivitySelect'),

    // Permission Modal Elements
    permissionModal: document.getElementById('permissionModal'),
    modalGrantBtn: document.getElementById('modalGrantBtn'),
    modalCancelBtn: document.getElementById('modalCancelBtn')
  };

  // Canvas 2D Rendering Context
  let ctx = null;
  let animationFrameId = null;

  // ==========================================================================
  // INITIALIZATION & LIFECYCLE
  // ==========================================================================
  function init() {
    loadProfile();
    loadHistory();
    initCanvas();
    setupEventListeners();
    runSensorDiagnostics();
    updateUI();
  }

  // ==========================================================================
  // LOCALSTORAGE MANAGEMENT
  // ==========================================================================
  function loadProfile() {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.PROFILE);
      if (saved) {
        state.profile = Object.assign(state.profile, JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not read user profile from localStorage:', e);
    }

    // Populate Settings Form
    if (DOM.prefName) DOM.prefName.value = state.profile.name;
    if (DOM.prefWeight) DOM.prefWeight.value = state.profile.weightKg;
    if (DOM.prefHeight) DOM.prefHeight.value = state.profile.heightCm;
    if (DOM.prefAge) DOM.prefAge.value = state.profile.age;
    if (DOM.prefRestHR) DOM.prefRestHR.value = state.profile.restHR;
    if (DOM.prefStepLength) DOM.prefStepLength.value = state.profile.strideM;

    state.currentHR = state.profile.restHR;
  }

  function saveProfile() {
    state.profile.name = DOM.prefName.value.trim() || 'Avenger';
    state.profile.weightKg = parseFloat(DOM.prefWeight.value) || 70;
    state.profile.heightCm = parseFloat(DOM.prefHeight.value) || 175;
    state.profile.age = parseInt(DOM.prefAge.value, 10) || 20;
    state.profile.restHR = parseInt(DOM.prefRestHR.value, 10) || 70;
    state.profile.strideM = parseFloat(DOM.prefStepLength.value) || 0.75;

    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.PROFILE, JSON.stringify(state.profile));
      alert('Biometric Profile saved successfully!');
    } catch (e) {
      alert('Could not save to localStorage: ' + e.message);
    }

    updateUI();
  }

  function loadHistory() {
    try {
      const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORY);
      if (saved) {
        state.history = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not read workout history from localStorage:', e);
    }
    renderHistoryTable();
  }

  function saveSessionToHistory() {
    if (state.steps === 0 && state.elapsedSec < 3) return;

    const hrMax = 220 - state.profile.age;
    const session = {
      date: new Date().toLocaleString(),
      durationSec: state.elapsedSec,
      steps: state.steps,
      calories: state.calories.toFixed(1),
      distanceKm: state.distanceKm.toFixed(2),
      activity: state.currentActivity,
      avgCadence: Math.round(state.cadenceSpm),
      hr: Math.round(state.currentHR),
      accuracy: state.measuredAccuracy !== null ? `${state.measuredAccuracy.toFixed(1)}%` : 'Not tested'
    };

    state.history.unshift(session);
    if (state.history.length > 50) state.history.pop();

    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORY, JSON.stringify(state.history));
    } catch (e) {
      console.warn('Could not save session to localStorage:', e);
    }
    renderHistoryTable();
  }

  function renderHistoryTable() {
    if (!DOM.historyTableBody) return;

    if (state.history.length === 0) {
      DOM.historyTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="9">No recorded test sessions yet. Start a tracking session to log results.</td>
        </tr>`;
      return;
    }

    DOM.historyTableBody.innerHTML = state.history.map(item => `
      <tr>
        <td><strong>${item.date}</strong></td>
        <td>${formatDuration(item.durationSec)}</td>
        <td class="cyan-text font-bold">${item.steps}</td>
        <td class="orange-text">${item.calories} kcal</td>
        <td class="blue-text">${item.distanceKm} km</td>
        <td><span class="diag-badge ${getActivityBadgeClass(item.activity)}">${item.activity}</span></td>
        <td>${item.avgCadence} spm</td>
        <td class="red-text">${item.hr} bpm</td>
        <td class="green-text font-bold">${item.accuracy}</td>
      </tr>
    `).join('');
  }

  function getActivityBadgeClass(act) {
    if (act === 'RUNNING') return 'green';
    if (act === 'WALKING') return 'cyan';
    return '';
  }

  // ==========================================================================
  // NAVIGATION CONTROLLER
  // ==========================================================================
  function switchPage(pageId) {
    DOM.pages.forEach(p => p.classList.remove('active'));
    DOM.desktopNavItems.forEach(n => n.classList.remove('active'));
    DOM.mobileNavItems.forEach(n => n.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.add('active');

    // Update active nav items
    document.querySelectorAll(`[data-page="${pageId}"]`).forEach(btn => btn.classList.add('active'));

    // Update Topbar Titles
    const titles = {
      home: { title: 'Home Command', subtitle: 'Your real-time fitness command center' },
      dashboard: { title: 'Live HUD Dashboard', subtitle: 'Live sensor telemetry, step peaks and cadence curves' },
      activity: { title: 'Activity Intelligence', subtitle: 'Biomechanical activity classification with motion thresholds' },
      health: { title: 'Health & Cardiac Performance', subtitle: 'Cardiac zones, dynamic energy burn and elevation' },
      history: { title: 'History & Accuracy Validation', subtitle: 'Ground-truth benchmark verification with measured accuracy' },
      settings: { title: 'Profile & Sensor Settings', subtitle: 'Hardware pairing, simulation toggles, and biometric setup' }
    };

    if (titles[pageId]) {
      DOM.pageTitle.textContent = titles[pageId].title;
      DOM.pageSubtitle.textContent = titles[pageId].subtitle;
    }

    // Resize canvas if switching to dashboard
    if (pageId === 'dashboard') {
      requestAnimationFrame(resizeCanvas);
    }
  }

  // ==========================================================================
  // HARDWARE SENSOR DIAGNOSTICS & PERMISSION FLOW
  // ==========================================================================
  function runSensorDiagnostics() {
    const hasMotion = 'DeviceMotionEvent' in window;
    const hasIosPerm = typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
    const isHttps = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (DOM.diagMotionStatus) {
      DOM.diagMotionStatus.textContent = hasMotion ? 'Supported' : 'Unavailable';
      DOM.diagMotionStatus.className = `diag-badge ${hasMotion ? 'green' : ''}`;
    }

    if (DOM.diagIosStatus) {
      DOM.diagIosStatus.textContent = hasIosPerm ? 'Requires Prompt' : 'Not Required / Standard';
    }

    if (DOM.diagHttpsStatus) {
      DOM.diagHttpsStatus.textContent = isHttps ? 'Secure Context (OK)' : 'Insecure (Sensors Blocked)';
      DOM.diagHttpsStatus.className = `diag-badge ${isHttps ? 'green' : 'red'}`;
    }
  }

  function requestSensorAccess() {
    // If running in simulation mode, start immediately
    if (state.isSimulation) {
      startTracking();
      return;
    }

    const hasMotion = 'DeviceMotionEvent' in window;
    if (!hasMotion) {
      showFallbackNotice('Motion sensors are not available in this browser or device.');
      return;
    }

    // Check iOS 13+ permission API
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      DOM.permissionModal.style.display = 'flex';
    } else {
      // Standard Android or Chrome desktop sensor binding
      bindSensorListeners();
      startTracking();
    }
  }

  function bindSensorListeners() {
    window.removeEventListener('devicemotion', handleMotionEvent);
    window.addEventListener('devicemotion', handleMotionEvent, { passive: true });
    state.sensorActive = true;
  }

  function unbindSensorListeners() {
    window.removeEventListener('devicemotion', handleMotionEvent);
    state.sensorActive = false;
  }

  function handleMotionEvent(event) {
    if (!state.isRunning) return;

    let acc = event.accelerationIncludingGravity || event.acceleration;
    if (!acc || (acc.x === null && acc.y === null && acc.z === null)) {
      return;
    }

    const x = acc.x || 0;
    const y = acc.y || 0;
    const z = acc.z || 0;

    const now = performance.now();
    if (state.lastSensorTimestamp > 0) {
      const dt = (now - state.lastSensorTimestamp) / 1000;
      if (dt > 0.005 && dt < 0.2) {
        state.sampleRateHz = Math.round(0.9 * state.sampleRateHz + 0.1 * (1 / dt));
      }
    }
    state.lastSensorTimestamp = now;
    state.sampleCount++;

    // Compute Resultant Acceleration Magnitude: sqrt(x² + y² + z²)
    const rawMag = Math.sqrt(x * x + y * y + z * z);
    processSample(rawMag, now / 1000);
  }

  // ==========================================================================
  // REAL-TIME SIGNAL PROCESSING & ADAPTIVE STEP DETECTION
  // ==========================================================================
  function processSample(rawMag, timestampSec) {
    // Zero-Phase Baseline Detrending (High-pass filter removing 9.8 m/s² gravity DC component)
    // We maintain a rolling exponential moving average of baseline gravity
    if (typeof state.gravityBaseline === 'undefined') {
      state.gravityBaseline = rawMag;
    }
    // Slowly tracking DC baseline (alpha = 0.02)
    state.gravityBaseline = 0.98 * state.gravityBaseline + 0.02 * rawMag;
    const filtMag = Math.abs(rawMag - state.gravityBaseline);

    // Push into rolling circular buffer
    state.rawBuffer.push({
      t: timestampSec,
      rawMag: rawMag,
      filtMag: filtMag
    });

    // Trim rolling window to MAX_BUFFER_SEC
    const cutoffTime = timestampSec - CONFIG.MAX_BUFFER_SEC;
    while (state.rawBuffer.length > 0 && state.rawBuffer[0].t < cutoffTime) {
      state.rawBuffer.shift();
    }

    // Biomechanical Step Detection Engine
    detectSteps(timestampSec);
  }

  function detectSteps(currentSec) {
    const N = state.rawBuffer.length;
    if (N < 15) return;

    // Analyze recent 2.5 second window
    const recentSamples = [];
    const windowStart = currentSec - 2.5;
    for (let i = N - 1; i >= 0; i--) {
      if (state.rawBuffer[i].t >= windowStart) {
        recentSamples.push(state.rawBuffer[i].filtMag);
      } else {
        break;
      }
    }

    if (recentSamples.length < 8) return;

    // Calculate window statistics (mean & standard deviation)
    let sum = 0;
    for (let i = 0; i < recentSamples.length; i++) sum += recentSamples[i];
    const mean = sum / recentSamples.length;

    let varianceSum = 0;
    for (let i = 0; i < recentSamples.length; i++) {
      const diff = recentSamples[i] - mean;
      varianceSum += diff * diff;
    }
    const std = Math.sqrt(varianceSum / recentSamples.length);
    state.motionStd = std;

    // Adaptive dynamic thresholding
    const peakHeightThresh = Math.max(0.20, mean + 0.35 * std);
    const prominenceThresh = Math.max(0.12, 0.28 * std);
    state.adaptiveThreshold = peakHeightThresh;

    // Look for local maximum at the center of the recent window
    const lastIdx = N - 2;
    if (lastIdx <= 1) return;

    const prev = state.rawBuffer[lastIdx - 1].filtMag;
    const curr = state.rawBuffer[lastIdx].filtMag;
    const next = state.rawBuffer[lastIdx + 1].filtMag;
    const peakTimeMs = state.rawBuffer[lastIdx].t * 1000;

    // Peak test: local maxima, exceeds adaptive threshold, and satisfies refractory lockout period (>= 280 ms)
    if (curr > prev && curr >= next && curr >= peakHeightThresh) {
      const timeSinceLastStep = peakTimeMs - state.lastStepTimeMs;

      if (timeSinceLastStep >= CONFIG.MIN_STEP_TIME_MS) {
        // Enforce prominence check
        if (curr - prev >= prominenceThresh * 0.5 || curr - next >= prominenceThresh * 0.5) {
          // Valid physical step identified!
          state.steps++;
          state.lastStepTimeMs = peakTimeMs;
          state.stepTimestamps.push(peakTimeMs);

          // Record peak marker for live canvas render
          state.peakMarkers.push({
            t: state.rawBuffer[lastIdx].t,
            val: curr
          });

          // Keep recent peak markers clean
          const peakCutoff = currentSec - CONFIG.MAX_BUFFER_SEC;
          state.peakMarkers = state.peakMarkers.filter(p => p.t >= peakCutoff);

          // Update metrics triggered by new step
          onStepDetected();
        }
      }
    }

    // Prune old step timestamps (> 8 seconds)
    const stepCutoff = performance.now() - 8000;
    state.stepTimestamps = state.stepTimestamps.filter(t => t >= stepCutoff);
  }

  // ==========================================================================
  // METRICS & CLASSIFICATION COMPUTATION
  // ==========================================================================
  function onStepDetected() {
    // Dynamic distance calculation
    const strideLength = state.currentActivity === 'RUNNING' ?
      (state.profile.heightCm / 100) * 0.53 :
      state.profile.strideM;

    state.distanceKm = (state.steps * strideLength) / 1000;

    // Floors: 1 floor ≈ 3 meters vertical gain
    if (state.isSimulation && (state.currentActivity === 'WALKING' || state.currentActivity === 'RUNNING')) {
      state.floors = Math.floor((state.distanceKm * 1000 * 0.03) / 3.0);
    }
  }

  function updateBiometrics(dtSec) {
    if (!state.isRunning) return;

    // 1. Calculate Cadence (Steps per Minute in rolling 6-second window)
    const recentSteps = state.stepTimestamps.filter(t => t >= performance.now() - 6000);
    if (recentSteps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < recentSteps.length; i++) {
        intervals.push((recentSteps[i] - recentSteps[i - 1]) / 1000);
      }
      intervals.sort((a, b) => a - b);
      const medianInterval = intervals[Math.floor(intervals.length / 2)];
      state.cadenceSpm = medianInterval > 0 ? Math.min(220, Math.round(60 / medianInterval)) : 0;
    } else {
      state.cadenceSpm = 0;
    }

    // 2. Multi-Class Activity Classification (SITTING, WALKING, RUNNING)
    let newAct = 'SITTING';
    let conf = 85;

    if (state.motionStd < 0.15 && state.cadenceSpm < 35) {
      newAct = 'SITTING';
      conf = Math.min(98, Math.round(90 + (0.15 - state.motionStd) * 50));
    } else if (state.cadenceSpm >= 135 || state.motionStd >= 0.55) {
      newAct = 'RUNNING';
      conf = Math.min(96, Math.round(82 + (state.motionStd - 0.55) * 20));
    } else if (state.cadenceSpm >= 40 || state.motionStd >= 0.15) {
      newAct = 'WALKING';
      conf = Math.min(94, Math.round(85 + Math.abs(state.cadenceSpm - 105) * 0.1));
    } else {
      newAct = state.currentActivity !== 'WAITING' ? state.currentActivity : 'SITTING';
      conf = 75;
    }

    if (newAct !== state.currentActivity) {
      logActivityTransition(newAct, state.cadenceSpm);
      state.currentActivity = newAct;
    }
    state.activityConfidence = Math.max(60, Math.min(98, conf));

    // 3. Continuous ACSM Calorie Integration
    // Calories/sec = (MET * 3.5 * weightKg) / 200 / 60
    const met = CONFIG.MET_VALUES[capitalize(newAct)] || 1.3;
    const calPerSec = (met * 3.5 * state.profile.weightKg) / 200 / 60;
    state.calories += calPerSec * dtSec;

    // 4. Physiologically Smoothed Karvonen Heart Rate
    // HRmax = 220 - age; HR = HRrest + (HRmax - HRrest) * intensity
    const hrMax = 220 - state.profile.age;
    const intensity = CONFIG.INTENSITY_FACTORS[capitalize(newAct)] || 0.10;
    const targetHR = state.profile.restHR + (hrMax - state.profile.restHR) * intensity;
    // Exponential physiological lag smoothing (alpha = 0.08)
    state.currentHR += 0.08 * (targetHR - state.currentHR);
  }

  function logActivityTransition(newAct, cadence) {
    if (!DOM.activityTimelineList) return;

    const mins = Math.floor(state.elapsedSec / 60);
    const secs = Math.floor(state.elapsedSec % 60);
    const timeStr = `[${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}]`;

    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `<span class="timeline-time">${timeStr}</span> State shifted to <strong>${newAct}</strong> (Cadence: ${cadence} SPM)`;

    DOM.activityTimelineList.prepend(item);
    if (DOM.activityTimelineList.children.length > 20) {
      DOM.activityTimelineList.removeChild(DOM.activityTimelineList.lastChild);
    }
  }

  // ==========================================================================
  // VIRTUAL SIMULATION ENGINE (TESTING ON DESKTOPS / NO SENSOR DEVICES)
  // ==========================================================================
  function startSimulation() {
    state.isSimulation = true;
    updateModeBadgeUI();

    if (state.simInterval) clearInterval(state.simInterval);

    let simT = performance.now() / 1000;
    const dt = 0.02; // 50 Hz

    state.simInterval = setInterval(() => {
      if (!state.isRunning) return;

      simT += dt;
      let az = CONFIG.GRAVITY_ESTIMATE;
      let ax = 0;
      let ay = 0;

      const act = state.simActivity || 'Walking';

      if (act === 'Sitting') {
        az += (Math.random() - 0.5) * 0.06;
      } else if (act === 'Walking') {
        const omega = 2 * Math.PI * 1.8 * simT; // 1.8 Hz ≈ 108 SPM
        az += 1.6 * Math.sin(omega) + 0.3 * Math.sin(2 * omega) + (Math.random() - 0.5) * 0.15;
        ax = 0.4 * Math.sin(omega / 2);
      } else if (act === 'Running') {
        const omega = 2 * Math.PI * 2.7 * simT; // 2.7 Hz ≈ 162 SPM
        const impact = Math.pow(Math.max(0, Math.sin(omega)), 1.8) * 3.4;
        az += impact - 1.2 + (Math.random() - 0.5) * 0.25;
        ax = 0.9 * Math.sin(omega / 2);
      }

      const rawMag = Math.sqrt(ax * ax + ay * ay + az * az);
      processSample(rawMag, simT);
    }, 20); // 50 Hz interval
  }

  function stopSimulation() {
    if (state.simInterval) {
      clearInterval(state.simInterval);
      state.simInterval = null;
    }
  }

  // ==========================================================================
  // TRACKING CONTROLLER (START / STOP / RESET)
  // ==========================================================================
  function startTracking() {
    if (state.isRunning) return;

    state.isRunning = true;
    state.startTime = Date.now() - (state.elapsedSec * 1000);

    DOM.dashStartBtn.disabled = true;
    DOM.dashStopBtn.disabled = false;
    DOM.homeStartBtn.innerHTML = '<span class="btn-icon">◉</span> LIVE TRACKING ACTIVE';

    updateStatusIndicators(true);

    if (state.isSimulation) {
      startSimulation();
    } else {
      bindSensorListeners();
    }

    // Start 1.0 second UI & calculation tick
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      state.elapsedSec++;
      updateBiometrics(1.0);
      updateUI();
    }, 1000);

    // Switch to Dashboard
    switchPage('dashboard');
  }

  function stopTracking() {
    if (!state.isRunning) return;

    state.isRunning = false;

    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    if (state.isSimulation) {
      stopSimulation();
    } else {
      unbindSensorListeners();
    }

    DOM.dashStartBtn.disabled = false;
    DOM.dashStopBtn.disabled = true;
    DOM.homeStartBtn.innerHTML = '<span class="btn-icon">▶</span> START LIVE TEST';

    updateStatusIndicators(false);
    saveSessionToHistory();

    // Auto-fill ground truth input for validation
    if (DOM.groundTruthInput && state.steps > 0) {
      DOM.groundTruthInput.value = state.steps;
    }

    updateUI();
  }

  function resetSession() {
    stopTracking();

    state.elapsedSec = 0;
    state.steps = 0;
    state.calories = 0.0;
    state.distanceKm = 0.0;
    state.floors = 0;
    state.cadenceSpm = 0;
    state.currentActivity = 'WAITING';
    state.activityConfidence = 0;
    state.currentHR = state.profile.restHR;
    state.motionStd = 0.0;
    state.rawBuffer = [];
    state.stepTimestamps = [];
    state.peakMarkers = [];
    state.lastStepTimeMs = -Infinity;
    state.measuredAccuracy = null;

    updateUI();
  }

  function updateStatusIndicators(active) {
    if (active) {
      const text = state.isSimulation ? '● SIMULATION TRACKING' : '● LIVE TRACKING';
      DOM.sidebarSensorText.textContent = text;
      DOM.dashStatusText.textContent = text;
      DOM.dashIndicatorDot.className = 'status-indicator-dot active';
      DOM.sidebarSensorBadge.className = 'telemetry-badge active';
    } else {
      const text = '● SENSOR READY';
      DOM.sidebarSensorText.textContent = text;
      DOM.dashStatusText.textContent = text;
      DOM.dashIndicatorDot.className = 'status-indicator-dot';
      DOM.sidebarSensorBadge.className = 'telemetry-badge';
    }
  }

  // ==========================================================================
  // ACCURACY BENCHMARK & STEP VALIDATION
  // ==========================================================================
  function calculateMeasuredAccuracy() {
    const actual = parseInt(DOM.groundTruthInput.value, 10);
    const detected = state.steps;

    if (isNaN(actual) || actual <= 0) {
      alert('Please enter a valid positive number for actual steps.');
      return;
    }

    // Formula: Accuracy = max(0, min(100, 100 - (|detected - actual| / actual * 100)))
    const diff = Math.abs(detected - actual);
    const pctErr = (diff / actual) * 100;
    const accuracy = Math.max(0, Math.min(100, 100 - pctErr));

    state.measuredAccuracy = accuracy;

    // Update Validation UI
    if (DOM.valDetectedSteps) DOM.valDetectedSteps.textContent = detected;
    if (DOM.valActualSteps) DOM.valActualSteps.textContent = actual;
    if (DOM.valDiffSteps) DOM.valDiffSteps.textContent = `${diff} (${pctErr.toFixed(1)}% error)`;
    if (DOM.valAccuracyDisplay) {
      DOM.valAccuracyDisplay.textContent = `${accuracy.toFixed(1)}%`;
      DOM.valAccuracyDisplay.className = `res-val ${accuracy >= 98 ? 'green-text' : accuracy >= 90 ? 'yellow-text' : 'red-text'}`;
    }

    // Save updated validation to most recent session log
    if (state.history.length > 0) {
      state.history[0].accuracy = `${accuracy.toFixed(1)}%`;
      renderHistoryTable();
    }
  }

  // ==========================================================================
  // REAL-TIME CANVAS ACCELEROMETER CHART
  // ==========================================================================
  function initCanvas() {
    if (!DOM.accelCanvas) return;
    ctx = DOM.accelCanvas.getContext('2d');
    window.addEventListener('resize', debounce(resizeCanvas, 150));
    resizeCanvas();
    startCanvasLoop();
  }

  function resizeCanvas() {
    if (!DOM.accelCanvas) return;
    const container = DOM.accelCanvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    DOM.accelCanvas.width = width * dpr;
    DOM.accelCanvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    renderCanvas();
  }

  function startCanvasLoop() {
    function loop() {
      renderCanvas();
      animationFrameId = requestAnimationFrame(loop);
    }
    loop();
  }

  function renderCanvas() {
    if (!ctx || !DOM.accelCanvas) return;
    const width = DOM.accelCanvas.clientWidth;
    const height = DOM.accelCanvas.clientHeight;

    // Clear Background
    ctx.clearRect(0, 0, width, height);

    // Draw Subtle Grid
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.06)';
    ctx.lineWidth = 1;
    const gridYSteps = 4;
    for (let i = 1; i < gridYSteps; i++) {
      const y = (height / gridYSteps) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const buf = state.rawBuffer;
    if (!buf || buf.length < 2) {
      // Empty waveform placeholder line
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.7);
      ctx.lineTo(width, height * 0.7);
      ctx.stroke();
      return;
    }

    const tEnd = buf[buf.length - 1].t;
    const tStart = tEnd - CONFIG.MAX_BUFFER_SEC;

    // Y-Axis Dynamic Range (0 m/s² to ~4.0 m/s²)
    const yMax = Math.max(3.2, state.adaptiveThreshold * 2.2);

    function getX(t) {
      return ((t - tStart) / CONFIG.MAX_BUFFER_SEC) * width;
    }

    function getY(val) {
      const norm = Math.min(1.0, Math.max(0, val / yMax));
      return height - (norm * (height - 24)) - 12;
    }

    // 1. Draw Adaptive Threshold Line (Gold Dashed)
    const threshY = getY(state.adaptiveThreshold);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255, 214, 0, 0.65)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, threshY);
    ctx.lineTo(width, threshY);
    ctx.stroke();
    ctx.restore();

    // 2. Draw Filtered Acceleration Magnitude Curve (Arc Cyan)
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();

    for (let i = 0; i < buf.length; i++) {
      const px = getX(buf[i].t);
      const py = getY(buf[i].filtMag);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    // 3. Draw Detected Step Peaks (Red Diamonds)
    const peaks = state.peakMarkers;
    for (let i = 0; i < peaks.length; i++) {
      const px = getX(peaks[i].t);
      if (px >= 0 && px <= width) {
        const py = getY(peaks[i].val);
        drawDiamond(ctx, px, py, 5, '#ff3d57');
      }
    }
  }

  function drawDiamond(c, x, y, size, color) {
    c.save();
    c.fillStyle = color;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(x, y - size);
    c.lineTo(x + size, y);
    c.lineTo(x, y + size);
    c.lineTo(x - size, y);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  }

  // ==========================================================================
  // UI REFRESH & BINDINGS
  // ==========================================================================
  function updateUI() {
    // Format Strings
    const sStr = String(state.steps);
    const calStr = state.calories.toFixed(1);
    const distStr = state.distanceKm.toFixed(2);
    const hrStr = String(Math.round(state.currentHR));
    const cadStr = String(state.cadenceSpm);
    const actStr = state.currentActivity;
    const confStr = state.activityConfidence > 0 ? `${state.activityConfidence}%` : '--';
    const paceStr = calculatePace(state.distanceKm, state.elapsedSec);

    // Global Timer
    if (DOM.globalTimer) DOM.globalTimer.textContent = `⏱ ${formatDuration(state.elapsedSec)}`;

    // Home Page
    if (DOM.homeSteps) DOM.homeSteps.textContent = sStr;
    if (DOM.homeCalories) DOM.homeCalories.innerHTML = `${calStr} <span class="unit">kcal</span>`;
    if (DOM.homeActivity) DOM.homeActivity.textContent = actStr;
    if (DOM.homeConfidence) DOM.homeConfidence.textContent = `CONFIDENCE: ${confStr}`;
    if (DOM.homeHR) DOM.homeHR.innerHTML = `${hrStr} <span class="unit">bpm</span>`;

    // Live Dashboard
    if (DOM.dashSteps) DOM.dashSteps.textContent = sStr;
    if (DOM.dashCalories) DOM.dashCalories.innerHTML = `${calStr} <span class="unit">kcal</span>`;
    if (DOM.dashHR) DOM.dashHR.innerHTML = `${hrStr} <span class="unit">bpm</span>`;
    if (DOM.dashDistance) DOM.dashDistance.innerHTML = `${distStr} <span class="unit">km</span>`;
    if (DOM.dashFloors) DOM.dashFloors.textContent = String(state.floors);
    if (DOM.dashCadence) DOM.dashCadence.innerHTML = `${cadStr} <span class="unit">spm</span>`;
    if (DOM.dashActivity) DOM.dashActivity.textContent = actStr;
    if (DOM.dashConfidence) DOM.dashConfidence.textContent = `CONFIDENCE: ${confStr}`;
    if (DOM.dashPace) DOM.dashPace.innerHTML = `${paceStr} <span class="unit">/km</span>`;

    // Canvas Status Info
    if (DOM.liveSampleRateDisplay) DOM.liveSampleRateDisplay.textContent = `${state.sampleRateHz} Hz`;
    if (DOM.liveStdDisplay) DOM.liveStdDisplay.textContent = `${state.motionStd.toFixed(2)} m/s²`;
    if (DOM.liveBufferCount) DOM.liveBufferCount.textContent = `${state.rawBuffer.length} samples`;

    // Activity Intel Tab
    if (DOM.intelActivityBadge) DOM.intelActivityBadge.textContent = actStr;
    if (DOM.intelConfidenceVal) DOM.intelConfidenceVal.textContent = confStr;
    if (DOM.intelConfidenceBar) DOM.intelConfidenceBar.style.width = `${state.activityConfidence}%`;
    if (DOM.intelCadence) DOM.intelCadence.textContent = `${cadStr} spm`;
    if (DOM.intelStd) DOM.intelStd.textContent = `${state.motionStd.toFixed(2)} m/s²`;
    if (DOM.intelDuration) DOM.intelDuration.textContent = `${state.elapsedSec} s`;

    // Health Tab
    if (DOM.healthHR) DOM.healthHR.innerHTML = `${hrStr} <span class="unit">bpm</span>`;
    if (DOM.healthCalories) DOM.healthCalories.innerHTML = `${calStr} <span class="unit">kcal</span>`;
    if (DOM.healthDistance) DOM.healthDistance.innerHTML = `${distStr} <span class="unit">km</span>`;
    if (DOM.healthSteps) DOM.healthSteps.textContent = sStr;

    // Cardiac Zone Calculation
    const hrMax = 220 - state.profile.age;
    const hrPct = (state.currentHR / hrMax) * 100;
    if (DOM.healthHRMaxTag) DOM.healthHRMaxTag.textContent = `HRmax: ${hrMax} bpm`;
    if (DOM.healthNoteRestHR) DOM.healthNoteRestHR.textContent = `${state.profile.restHR} bpm`;
    if (DOM.healthNoteAge) DOM.healthNoteAge.textContent = String(state.profile.age);

    updateCardiacZoneBars(hrPct);
  }

  function updateCardiacZoneBars(pct) {
    if (!DOM.zoneBars || !DOM.zoneBars[0]) return;
    DOM.zoneBars.forEach(b => b.classList.remove('active'));

    if (pct < 60) {
      DOM.zoneBars[0].classList.add('active');
      DOM.healthZoneCurrent.textContent = `Zone 1: Resting / Recovery (${Math.round(pct)}% HRmax)`;
    } else if (pct < 70) {
      DOM.zoneBars[1].classList.add('active');
      DOM.healthZoneCurrent.textContent = `Zone 2: Fat Burning Zone (${Math.round(pct)}% HRmax)`;
    } else if (pct < 85) {
      DOM.zoneBars[2].classList.add('active');
      DOM.healthZoneCurrent.textContent = `Zone 3: Aerobic Cardio Zone (${Math.round(pct)}% HRmax)`;
    } else {
      DOM.zoneBars[3].classList.add('active');
      DOM.healthZoneCurrent.textContent = `Zone 4: Peak Anaerobic Zone (${Math.round(pct)}% HRmax)`;
    }
  }

  function updateModeBadgeUI() {
    if (state.isSimulation) {
      DOM.modeText.textContent = 'SIMULATION ENGINE';
      DOM.modeBadge.className = 'mode-badge sim-mode';
      if (DOM.diagModeStatus) {
        DOM.diagModeStatus.textContent = 'Virtual Simulation Engine';
        DOM.diagModeStatus.className = 'diag-badge purple';
      }
      if (DOM.toggleSimEngineBtn) DOM.toggleSimEngineBtn.textContent = 'SWITCH TO SENSORS';
      if (DOM.simActivitySelectRow) DOM.simActivitySelectRow.style.display = 'flex';
    } else {
      DOM.modeText.textContent = 'HARDWARE SENSORS';
      DOM.modeBadge.className = 'mode-badge';
      if (DOM.diagModeStatus) {
        DOM.diagModeStatus.textContent = 'Physical Motion Sensors';
        DOM.diagModeStatus.className = 'diag-badge cyan';
      }
      if (DOM.toggleSimEngineBtn) DOM.toggleSimEngineBtn.textContent = 'ENABLE SIMULATION';
      if (DOM.simActivitySelectRow) DOM.simActivitySelectRow.style.display = 'none';
    }
  }

  // ==========================================================================
  // EVENT LISTENERS & UI WIRING
  // ==========================================================================
  function setupEventListeners() {
    // Navigation (Desktop & Mobile)
    DOM.desktopNavItems.forEach(btn => {
      btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });
    DOM.mobileNavItems.forEach(btn => {
      btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });

    // Home Actions
    DOM.homeStartBtn.addEventListener('click', requestSensorAccess);
    DOM.homeDashboardBtn.addEventListener('click', () => switchPage('dashboard'));
    DOM.homeValidateBtn.addEventListener('click', () => switchPage('history'));

    // Dashboard Controls
    DOM.dashStartBtn.addEventListener('click', requestSensorAccess);
    DOM.dashStopBtn.addEventListener('click', stopTracking);
    DOM.dashResetBtn.addEventListener('click', resetSession);

    // Mode Toggle
    DOM.modeBadge.addEventListener('click', toggleMode);
    DOM.toggleSimEngineBtn.addEventListener('click', toggleMode);
    DOM.simActivitySelect.addEventListener('change', (e) => {
      state.simActivity = e.target.value;
    });

    // Permission Modal
    DOM.modalGrantBtn.addEventListener('click', () => {
      DOM.permissionModal.style.display = 'none';
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        DeviceMotionEvent.requestPermission()
          .then(permissionState => {
            if (permissionState === 'granted') {
              bindSensorListeners();
              startTracking();
            } else {
              showFallbackNotice('Motion sensor permission was denied. You can use the Virtual Simulation Engine to test all features.');
            }
          })
          .catch(err => {
            showFallbackNotice(`Permission request failed: ${err.message}`);
          });
      }
    });

    DOM.modalCancelBtn.addEventListener('click', () => {
      DOM.permissionModal.style.display = 'none';
    });

    // Accuracy Test Presets
    DOM.preset50Btn.addEventListener('click', () => {
      DOM.groundTruthInput.value = 50;
    });
    DOM.preset100Btn.addEventListener('click', () => {
      DOM.groundTruthInput.value = 100;
    });
    DOM.validateTestBtn.addEventListener('click', calculateMeasuredAccuracy);

    // History Actions
    DOM.clearHistoryBtn.addEventListener('click', () => {
      if (confirm('Clear all recorded session logs?')) {
        state.history = [];
        localStorage.removeItem(CONFIG.STORAGE_KEYS.HISTORY);
        renderHistoryTable();
      }
    });

    // Profile Settings Form
    DOM.profileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveProfile();
    });

    DOM.resetProfileBtn.addEventListener('click', () => {
      if (confirm('Reset profile to factory defaults?')) {
        state.profile = {
          name: 'Avenger',
          weightKg: 70,
          heightCm: 175,
          age: 20,
          restHR: 70,
          strideM: 0.75
        };
        saveProfile();
      }
    });

    DOM.clearAllDataBtn.addEventListener('click', () => {
      if (confirm('Erase all localStorage data including profile and workout history?')) {
        localStorage.clear();
        location.reload();
      }
    });
  }

  function toggleMode() {
    if (state.isRunning) {
      alert('Please stop the active tracking session before changing sensor modes.');
      return;
    }
    state.isSimulation = !state.isSimulation;
    updateModeBadgeUI();
  }

  function showFallbackNotice(msg) {
    const useSim = confirm(`${msg}\n\nWould you like to enable the Virtual Simulation Engine to test the full live tracker?`);
    if (useSim) {
      state.isSimulation = true;
      updateModeBadgeUI();
      startTracking();
    }
  }

  // ==========================================================================
  // UTILITY HELPERS
  // ==========================================================================
  function formatDuration(sec) {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = Math.floor(sec % 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function calculatePace(distKm, elapsedSec) {
    if (distKm <= 0.01 || elapsedSec < 4) return '--:--';
    const paceSec = elapsedSec / distKm;
    const pMin = Math.floor(paceSec / 60);
    const pSec = Math.floor(paceSec % 60);
    if (pMin >= 99) return '--:--';
    return `${String(pMin).padStart(2, '0')}:${String(pSec).padStart(2, '0')}`;
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  // ==========================================================================
  // LAUNCH APP ON DOM READY
  // ==========================================================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
