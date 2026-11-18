export const STORAGE_KEY = 'pomodoro-v1';
export const TICK_MS = 250;
export const RING_LENGTH = 565.49;
export const RING_LENGTH_FOCUS = 578.05;

export const INITIAL_STATE = {
  durations: { focus: 25, short: 5, long: 15, every: 4 },
  mode: 'focus',
  remaining: 25 * 60,
  running: false,
  cycle: 0,
  tasks: [],
  activeId: null,
  draft: '',
  draftEst: 1,
  sound: true,
  autoStart: false,
  theme: 'dark',
  showSettings: false,
  focusMode: false,
  statsDay: '',
  todayCount: 0,
  todayMinutes: 0,
  loaded: false,
  last: 0,
  beeps: 0,
};

// Campos que não são persistidos no localStorage (igual ao original).
const TRANSIENT_KEYS = ['running', 'showSettings', 'draft', 'focusMode', 'loaded', 'last', 'beeps'];

export function persistableState(state) {
  const saved = {};
  for (const key of Object.keys(state)) {
    if (!TRANSIENT_KEYS.includes(key)) saved[key] = state[key];
  }
  return saved;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}

export function modeLabel(mode) {
  return { focus: 'Foco', short: 'Pausa curta', long: 'Pausa longa' }[mode];
}

export function totalSeconds(state) {
  return state.durations[state.mode] * 60;
}

// Avança o ciclo ao terminar (naturalmente ou com "pular").
function finish(s, natural, now) {
  let next;
  const upd = {};
  if (s.mode === 'focus') {
    const cycle = s.cycle + 1;
    upd.cycle = cycle;
    if (natural) {
      upd.todayCount = s.todayCount + 1;
      upd.todayMinutes = s.todayMinutes + s.durations.focus;
      upd.tasks = s.tasks.map((t) => (t.id === s.activeId ? { ...t, done_p: t.done_p + 1 } : t));
    }
    next = cycle % s.durations.every === 0 ? 'long' : 'short';
  } else {
    next = 'focus';
  }
  const base = { ...s, ...upd };
  return {
    ...base,
    beeps: natural && s.sound ? s.beeps + 1 : s.beeps,
    mode: next,
    last: now,
    remaining: base.durations[next] * 60,
    running: natural && s.autoStart,
  };
}

export function timerReducer(state, action) {
  switch (action.type) {
    case 'load': {
      const { saved, today } = action;
      const merged = {
        ...INITIAL_STATE,
        ...saved,
        running: false,
        showSettings: false,
        focusMode: false,
        loaded: true,
      };
      if (merged.statsDay !== today) {
        merged.statsDay = today;
        merged.todayCount = 0;
        merged.todayMinutes = 0;
      }
      return merged;
    }

    case 'tick': {
      if (!state.running) return state;
      const dt = (action.now - state.last) / 1000;
      const remaining = state.remaining - dt;
      if (remaining <= 0) return finish(state, true, action.now);
      return { ...state, remaining, last: action.now };
    }

    case 'toggleRun':
      return { ...state, last: action.now, running: !state.running };

    case 'reset':
      return { ...state, remaining: totalSeconds(state), running: false };

    case 'setMode':
      return {
        ...state,
        last: action.now,
        mode: action.mode,
        remaining: state.durations[action.mode] * 60,
        running: false,
      };

    case 'skip':
      return finish(state, false, action.now);

    case 'setDuration': {
      const v = Math.max(1, Math.min(120, parseInt(action.value, 10) || 1));
      const durations = { ...state.durations, [action.key]: v };
      if (action.key === state.mode && !state.running) {
        return { ...state, durations, remaining: v * 60 };
      }
      return { ...state, durations };
    }

    case 'toggleSound':
      return { ...state, sound: !state.sound };

    case 'toggleAuto':
      return { ...state, autoStart: !state.autoStart };

    case 'toggleTheme':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' };

    case 'toggleSettings':
      return { ...state, showSettings: !state.showSettings };

    case 'setFocus':
      return { ...state, focusMode: action.on };

    case 'toggleFocus':
      return { ...state, focusMode: !state.focusMode };

    case 'setDraft':
      return { ...state, draft: action.value };

    case 'setDraftEst':
      return { ...state, draftEst: action.value };

    case 'addTask': {
      const title = state.draft.trim();
      if (!title) return state;
      const id = action.id;
      return {
        ...state,
        tasks: [
          ...state.tasks,
          { id, title, est: Math.max(1, parseInt(state.draftEst, 10) || 1), done_p: 0, done: false },
        ],
        draft: '',
        draftEst: 1,
        activeId: state.activeId ?? id,
      };
    }

    case 'selectTask':
      return { ...state, activeId: action.id };

    case 'toggleTask':
      return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t)),
      };

    case 'removeTask':
      return {
        ...state,
        tasks: state.tasks.filter((t) => t.id !== action.id),
        activeId: state.activeId === action.id ? null : state.activeId,
      };

    case 'clearDone':
      return { ...state, tasks: state.tasks.filter((t) => !t.done) };

    default:
      return state;
  }
}
