'use client';

import { useEffect, useReducer } from 'react';
import {
  INITIAL_STATE,
  RING_LENGTH,
  RING_LENGTH_FOCUS,
  STORAGE_KEY,
  TICK_MS,
  formatTime,
  modeLabel,
  persistableState,
  timerReducer,
  totalSeconds,
} from '../lib/timer';
import { getTheme } from '../lib/theme';

// Cada tema do usuário mapeia para uma variante de getTheme.
const VARIANT_BY_THEME = { dark: 'noite', light: 'papel' };

const SETTING_FIELDS = [
  ['focus', 'Foco (min)'],
  ['short', 'Pausa curta'],
  ['long', 'Pausa longa'],
  ['every', 'Longa a cada'],
];

const MODES = ['focus', 'short', 'long'];

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.2);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.22);
    });
  } catch {
    // Áudio indisponível: ignora.
  }
}

export default function PomodoroTimer() {
  const [state, dispatch] = useReducer(timerReducer, INITIAL_STATE);

  const total = totalSeconds(state);
  const frac = Math.min(1, Math.max(0, 1 - state.remaining / total));
  const th = getTheme(VARIANT_BY_THEME[state.theme] || 'noite', state.mode);
  const activeTask = state.tasks.find((t) => t.id === state.activeId && !t.done);
  const doneCount = state.tasks.filter((t) => t.done).length;
  const every = state.durations.every;
  const inCycle = state.cycle % every;

  // Carrega o estado salvo (só no cliente, para não quebrar a hidratação).
  useEffect(() => {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') || {};
    } catch {
      saved = {};
    }
    dispatch({ type: 'load', saved, today: new Date().toDateString() });
  }, []);

  // Salva a cada mudança, depois de carregar.
  useEffect(() => {
    if (!state.loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistableState(state)));
    } catch {
      // Armazenamento indisponível: segue sem salvar.
    }
  }, [state]);

  // Relógio do timer.
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick', now: Date.now() }), TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Atalhos de teclado: espaço, r, f e Esc.
  useEffect(() => {
    function onKeyDown(e) {
      if (/INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        dispatch({ type: 'toggleRun', now: Date.now() });
      }
      if (e.key === 'r') dispatch({ type: 'reset' });
      if (e.key === 'f') dispatch({ type: 'toggleFocus' });
      if (e.key === 'Escape') dispatch({ type: 'setFocus', on: false });
    }
    function onFullscreenChange() {
      if (!document.fullscreenElement) dispatch({ type: 'setFocus', on: false });
    }
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  // Modo foco entra/sai de tela cheia.
  useEffect(() => {
    if (state.focusMode) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    }
  }, [state.focusMode]);

  // Toca o alarme quando um ciclo termina naturalmente.
  useEffect(() => {
    if (state.beeps > 0) beep();
  }, [state.beeps]);

  // Título da aba com o tempo restante.
  useEffect(() => {
    document.title =
      (state.running ? '▶ ' : '') + formatTime(state.remaining) + ' · ' + modeLabel(state.mode);
  }, [state.running, state.remaining, state.mode]);

  const runLabel = state.running
    ? 'Pausar'
    : state.remaining < total
      ? 'Continuar'
      : 'Iniciar';

  let statusText;
  if (activeTask) {
    statusText = activeTask.title;
  } else if (state.mode === 'focus') {
    statusText = state.running ? 'Concentre-se' : 'Pronto para focar';
  } else {
    statusText = 'Respire. Levante-se.';
  }

  const timeText = formatTime(state.remaining);
  const dashOffset = (RING_LENGTH * (1 - frac)).toFixed(2);
  const dashOffsetFocus = (RING_LENGTH_FOCUS * (1 - frac)).toFixed(2);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '28px 18px 40px',
        boxSizing: 'border-box',
        gap: 28,
        background: th.bg,
        color: th.ink,
        fontFamily: 'var(--font-sans), Helvetica, sans-serif',
        transition: 'background 0.4s',
      }}
    >
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: th.dot }} />
          <span style={{ fontWeight: 600, fontSize: 17, letterSpacing: '-0.01em' }}>Foco</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 16px', alignItems: 'center', fontSize: 14, color: th.muted }}>
          <span>
            Hoje:{' '}
            <strong style={{ color: th.ink, fontWeight: 600 }}>{state.todayCount}</strong> pomodoros ·{' '}
            <strong style={{ color: th.ink, fontWeight: 600 }}>{state.todayMinutes}</strong> min
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="pomo-btn"
              onClick={() => dispatch({ type: 'setFocus', on: true })}
              style={pillButton(th)}
            >
              Modo foco
            </button>
            <button
              type="button"
              className="pomo-btn"
              onClick={() => dispatch({ type: 'toggleTheme' })}
              aria-label={state.theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              title={state.theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              style={pillButton(th)}
            >
              {state.theme === 'dark' ? '☀' : '☾'}
            </button>
            <button
              type="button"
              className="pomo-btn"
              onClick={() => dispatch({ type: 'toggleSettings' })}
              style={pillButton(th)}
            >
              Ajustes
            </button>
          </div>
        </div>
      </header>

      {state.showSettings && (
        <div style={{ ...styles.panel, background: th.card, border: `1px solid ${th.border}`, display: 'flex', flexWrap: 'wrap', gap: '18px 24px', alignItems: 'flex-end' }}>
          {SETTING_FIELDS.map(([key, label]) => (
            <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: th.muted }}>
              {label}
              <input
                type="number"
                min="1"
                max="120"
                value={state.durations[key]}
                onChange={(e) => dispatch({ type: 'setDuration', key, value: e.target.value })}
                style={{
                  width: 88,
                  padding: '10px 12px',
                  border: `1px solid ${th.border}`,
                  borderRadius: 10,
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 16,
                  color: th.ink,
                  background: th.soft,
                }}
              />
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', paddingBottom: 10 }}>
            <input type="checkbox" checked={state.sound} onChange={() => dispatch({ type: 'toggleSound' })} />
            Som ao terminar
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', paddingBottom: 10 }}>
            <input type="checkbox" checked={state.autoStart} onChange={() => dispatch({ type: 'toggleAuto' })} />
            Iniciar próximo automaticamente
          </label>
        </div>
      )}

      <main style={styles.main}>
        <section style={{ ...styles.card, background: th.card, border: `1px solid ${th.border}`, borderRadius: 24, padding: '24px 20px 28px', gap: 26 }}>
          <div style={{ display: 'flex', gap: 4, background: th.soft, padding: 4, borderRadius: 999 }}>
            {MODES.map((m) => {
              const active = m === state.mode;
              return (
                <button
                  key={m}
                  type="button"
                  className="pomo-btn"
                  onClick={() => dispatch({ type: 'setMode', mode: m, now: Date.now() })}
                  style={{
                    border: 'none',
                    borderRadius: 999,
                    padding: '9px 14px',
                    whiteSpace: 'nowrap',
                    font: 'inherit',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: 'pointer',
                    background: active ? th.segActive : 'transparent',
                    color: active ? (th.segActiveFg || th.ink) : th.muted,
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.14)' : 'none',
                  }}
                >
                  {modeLabel(m)}
                </button>
              );
            })}
          </div>

          <div style={{ position: 'relative', width: 'min(290px, 100%)', aspectRatio: '1', containerType: 'inline-size' }}>
            <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="100" cy="100" r="90" fill="none" stroke={th.track} strokeWidth="6" />
              <circle
                cx="100"
                cy="100"
                r="90"
                fill="none"
                stroke={th.ring}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={dashOffset}
                style={{ transition: 'stroke-dashoffset 0.4s linear, stroke 0.3s' }}
              />
            </svg>
            <div style={styles.centerText}>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 300, fontSize: '22cqw', letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' }}>
                {timeText}
              </div>
              <div style={{ fontSize: 14, color: th.muted, maxWidth: 170, textAlign: 'center', textWrap: 'pretty' }}>
                {statusText}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {Array.from({ length: every }, (_, i) => {
              let color = th.track;
              if (i < inCycle) color = th.ring;
              else if (i === inCycle && state.mode === 'focus') color = th.faint;
              return <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />;
            })}
          </div>

          <Controls
            th={th}
            runLabel={runLabel}
            onReset={() => dispatch({ type: 'reset' })}
            onToggle={() => dispatch({ type: 'toggleRun', now: Date.now() })}
            onSkip={() => dispatch({ type: 'skip', now: Date.now() })}
          />

          <div style={{ fontSize: 12, color: th.faint, fontFamily: 'var(--font-mono), monospace', textAlign: 'center' }}>
            espaço · iniciar/pausar &nbsp; r · reiniciar &nbsp; f · foco
          </div>
        </section>

        <section style={{ ...styles.card, background: th.card, border: `1px solid ${th.border}`, borderRadius: 24, padding: '22px 20px', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}>Tarefas</h2>
            <span style={{ fontSize: 13, color: th.muted }}>
              {state.tasks.length ? `${doneCount} de ${state.tasks.length} concluídas` : ''}
            </span>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              dispatch({ type: 'addTask', id: Date.now() });
            }}
            style={{ display: 'flex', gap: 8 }}
          >
            <input
              value={state.draft}
              onChange={(e) => dispatch({ type: 'setDraft', value: e.target.value })}
              placeholder="O que você vai fazer?"
              style={{ flex: 1, minWidth: 0, padding: '12px 14px', border: `1px solid ${th.border}`, borderRadius: 12, font: 'inherit', fontSize: 15, background: th.soft, color: th.ink }}
            />
            <input
              value={state.draftEst}
              onChange={(e) => dispatch({ type: 'setDraftEst', value: e.target.value })}
              type="number"
              min="1"
              max="20"
              title="Pomodoros estimados"
              style={{ width: 52, padding: '12px 6px', border: `1px solid ${th.border}`, borderRadius: 12, fontFamily: 'var(--font-mono), monospace', fontSize: 15, textAlign: 'center', background: th.soft, color: th.ink }}
            />
            <button
              type="submit"
              className="pomo-btn"
              style={{ padding: '0 14px', minHeight: 44, border: 'none', borderRadius: 12, background: th.ink, color: th.bgSolid, font: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
            >
              Adicionar
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {state.tasks.map((t) => {
              const isActive = t.id === state.activeId && !t.done;
              return (
                <div
                  key={t.id}
                  onClick={() => dispatch({ type: 'selectTask', id: t.id })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    minHeight: 44,
                    boxSizing: 'border-box',
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: `1px solid ${isActive ? th.ring : th.border}`,
                    background: isActive ? th.active : 'transparent',
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'toggleTask', id: t.id });
                    }}
                    style={{
                      flex: 'none',
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      border: `1.5px solid ${t.done ? th.ink : th.faint}`,
                      background: t.done ? th.ink : 'transparent',
                      color: th.bgSolid,
                      fontSize: 12,
                      lineHeight: 1,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {t.done ? '✓' : ''}
                  </button>
                  <span style={{ flex: 1, fontSize: 15, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? th.faint : th.ink, textWrap: 'pretty' }}>
                    {t.title}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 13, color: th.muted }}>
                    {`${t.done_p}/${t.est}`}
                  </span>
                  <button
                    type="button"
                    title="Remover"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: 'removeTask', id: t.id });
                    }}
                    style={{ border: 'none', background: 'none', color: th.faint, fontSize: 18, cursor: 'pointer', padding: '0 2px' }}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            {state.tasks.length === 0 && (
              <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: 14, color: th.faint }}>
                Nenhuma tarefa. Adicione uma e toque nela para focar.
              </div>
            )}
          </div>

          {doneCount > 0 && (
            <button
              type="button"
              onClick={() => dispatch({ type: 'clearDone' })}
              style={{ alignSelf: 'flex-start', border: 'none', background: 'none', font: 'inherit', fontSize: 13, color: th.muted, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
            >
              Limpar concluídas
            </button>
          )}
        </section>
      </main>

      {state.focusMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: th.focusBg, color: th.focusInk, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32, padding: 24, boxSizing: 'border-box', transition: 'background 0.4s', containerType: 'size' }}>
          <button
            type="button"
            className="pomo-btn"
            onClick={() => dispatch({ type: 'setFocus', on: false })}
            style={{ position: 'absolute', top: 20, right: 20, border: `1px solid ${th.focusLine}`, background: 'transparent', color: th.focusInk, borderRadius: 999, padding: '9px 16px', font: 'inherit', fontSize: 14, cursor: 'pointer' }}
          >
            Sair · Esc
          </button>
          <div style={{ fontSize: 15, letterSpacing: '0.08em', textTransform: 'uppercase', color: th.focusMuted }}>
            {modeLabel(state.mode)}
          </div>
          <div style={{ position: 'relative', width: 'min(440px, 78cqw, 58cqh)', aspectRatio: '1', containerType: 'inline-size' }}>
            <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
              <circle cx="100" cy="100" r="92" fill="none" stroke={th.focusLine} strokeWidth="3" />
              <circle
                cx="100"
                cy="100"
                r="92"
                fill="none"
                stroke={th.focusRing}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={RING_LENGTH_FOCUS}
                strokeDashoffset={dashOffsetFocus}
                style={{ transition: 'stroke-dashoffset 0.4s linear' }}
              />
            </svg>
            <div style={{ ...styles.centerText, gap: 10 }}>
              <div style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 300, fontSize: '22cqw', letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums' }}>
                {timeText}
              </div>
              <div style={{ fontSize: 17, color: th.focusMuted, maxWidth: 260, textAlign: 'center', textWrap: 'pretty' }}>
                {statusText}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              type="button"
              className="pomo-btn"
              title="Reiniciar"
              onClick={() => dispatch({ type: 'reset' })}
              style={{ width: 52, height: 52, borderRadius: '50%', border: `1px solid ${th.focusLine}`, background: 'transparent', font: 'inherit', fontSize: 18, color: th.focusInk, cursor: 'pointer' }}
            >
              ↺
            </button>
            <button
              type="button"
              className="pomo-btn pomo-run"
              onClick={() => dispatch({ type: 'toggleRun', now: Date.now() })}
              style={{ minWidth: 156, height: 60, borderRadius: 999, border: 'none', background: th.focusInk, color: th.focusBg, font: 'inherit', fontSize: 17, fontWeight: 600, cursor: 'pointer' }}
            >
              {runLabel}
            </button>
            <button
              type="button"
              className="pomo-btn"
              title="Pular"
              onClick={() => dispatch({ type: 'skip', now: Date.now() })}
              style={{ width: 52, height: 52, borderRadius: '50%', border: `1px solid ${th.focusLine}`, background: 'transparent', font: 'inherit', fontSize: 15, color: th.focusInk, cursor: 'pointer' }}
            >
              ⏭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Controls({ th, runLabel, onReset, onToggle, onSkip }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <button
        type="button"
        className="pomo-btn"
        title="Reiniciar"
        onClick={onReset}
        style={{ width: 52, height: 52, borderRadius: '50%', border: `1px solid ${th.border}`, background: 'transparent', font: 'inherit', fontSize: 18, color: th.muted, cursor: 'pointer' }}
      >
        ↺
      </button>
      <button
        type="button"
        className="pomo-btn pomo-run"
        onClick={onToggle}
        style={{ minWidth: 156, height: 60, borderRadius: 999, border: 'none', background: th.btnBg, color: th.btnFg, font: 'inherit', fontSize: 17, fontWeight: 600, cursor: 'pointer', transition: 'background 0.3s' }}
      >
        {runLabel}
      </button>
      <button
        type="button"
        className="pomo-btn"
        title="Pular"
        onClick={onSkip}
        style={{ width: 52, height: 52, borderRadius: '50%', border: `1px solid ${th.border}`, background: 'transparent', font: 'inherit', fontSize: 15, color: th.muted, cursor: 'pointer' }}
      >
        ⏭
      </button>
    </div>
  );
}

function pillButton(th) {
  return {
    border: `1px solid ${th.border}`,
    background: th.card,
    borderRadius: 999,
    padding: '8px 14px',
    font: 'inherit',
    fontSize: 14,
    color: th.ink,
    cursor: 'pointer',
  };
}

const styles = {
  header: {
    width: '100%',
    maxWidth: 980,
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px 16px',
  },
  panel: {
    width: '100%',
    maxWidth: 980,
    borderRadius: 16,
    padding: 20,
    boxSizing: 'border-box',
  },
  main: {
    width: '100%',
    maxWidth: 980,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: 20,
    alignItems: 'start',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  centerText: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
};
