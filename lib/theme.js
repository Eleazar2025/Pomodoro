// Cor de cada modo (foco, pausa curta, pausa longa), em oklch.
export function modeColor(mode, lightness = 0.64) {
  const hue = { focus: 32, short: 160, long: 250 }[mode];
  return 'oklch(' + lightness + ' 0.15 ' + hue + ')';
}

export function getTheme(variant, mode) {
  const accent = modeColor(mode);

  if (variant === 'noite') {
    return {
      bg: '#151413',
      bgSolid: '#151413',
      card: '#1e1c1a',
      ink: '#f2efea',
      muted: '#a59e95',
      faint: '#77716a',
      border: '#2f2c29',
      soft: '#262321',
      track: '#2f2c29',
      ring: modeColor(mode, 0.72),
      dot: modeColor(mode, 0.72),
      btnBg: modeColor(mode, 0.72),
      btnFg: '#151413',
      segActive: '#35322e',
      active: '#2a2724',
      focusBg: '#0e0d0c',
      focusInk: '#f2efea',
      focusMuted: '#a59e95',
      focusLine: '#2f2c29',
      focusRing: modeColor(mode, 0.72),
    };
  }

  if (variant === 'imersivo') {
    const dark = modeColor(mode, 0.32);
    return {
      bg: modeColor(mode, 0.56),
      bgSolid: modeColor(mode, 0.5),
      card: 'rgba(255,255,255,0.12)',
      ink: '#ffffff',
      muted: 'rgba(255,255,255,0.86)',
      faint: 'rgba(255,255,255,0.7)',
      border: 'rgba(255,255,255,0.22)',
      soft: 'rgba(0,0,0,0.12)',
      track: 'rgba(255,255,255,0.22)',
      ring: '#ffffff',
      dot: '#ffffff',
      btnBg: '#ffffff',
      btnFg: modeColor(mode, 0.45),
      segActive: 'rgba(255,255,255,0.95)',
      segActiveFg: modeColor(mode, 0.4),
      active: 'rgba(255,255,255,0.2)',
      focusBg: dark,
      focusInk: '#ffffff',
      focusMuted: 'rgba(255,255,255,0.8)',
      focusLine: 'rgba(255,255,255,0.2)',
      focusRing: '#ffffff',
    };
  }

  // papel (padrão claro)
  return {
    bg: '#f6f4f1',
    bgSolid: '#ffffff',
    card: '#ffffff',
    ink: '#1d1b19',
    muted: '#6b655e',
    faint: '#9a938a',
    border: '#e6e1da',
    soft: '#f2efeb',
    track: '#efebe6',
    ring: accent,
    dot: accent,
    btnBg: accent,
    btnFg: '#ffffff',
    segActive: '#ffffff',
    active: '#faf9f7',
    focusBg: '#f6f4f1',
    focusInk: '#1d1b19',
    focusMuted: '#6b655e',
    focusLine: '#e6e1da',
    focusRing: accent,
  };
}
