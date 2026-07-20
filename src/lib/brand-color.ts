import React from 'react';

export const ADMIN_VARS = {
  accent: '--color-accent',
  hover: '--color-accent-hover',
  light: '--color-accent-light',
  ink: '--color-accent-ink',
  rgb: '--color-accent-rgb'
};

export const PUB_VARS = {
  accent: '--pub-accent',
  hover: '--pub-accent-hover',
  light: '--pub-accent-light',
  ink: '--pub-accent-ink',
  rgb: '--pub-accent-rgb'
};

/**
 * Parses hex and returns HSL values
 */
function hexToHsl(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/**
 * Formats HSL back to Hex string
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

/**
 * Returns CSS variable styles object for react style prop
 */
export function getBrandColorStyles(hex: string | undefined, varNames: typeof PUB_VARS) {
  if (!hex || !/^#([0-9a-f]{6})$/i.test(hex)) {
    return {};
  }
  const { h, s, l } = hexToHsl(hex);
  const hover = hslToHex(h, s, Math.max(0, l - 10));
  const light = hslToHex(h, Math.max(0, s - 15), Math.min(92, l + 22));

  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return {
    [varNames.accent]: hex,
    [varNames.hover]: hover,
    [varNames.light]: light,
    [varNames.ink]: '#17140f',
    [varNames.rgb]: `${r},${g},${b}`
  } as React.CSSProperties;
}

/**
 * Dynamic body injector (legacy or global fallback)
 */
export function applyBrandColor(hex: string, varNames: typeof PUB_VARS, root = document.documentElement) {
  if (!hex || !/^#([0-9a-f]{6})$/i.test(hex)) return;
  const styles = getBrandColorStyles(hex, varNames);
  Object.entries(styles).forEach(([key, val]) => {
    if (val) root.style.setProperty(key, val as string);
  });
}
