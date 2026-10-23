import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { loadSetting, saveSetting } from './api/storage';

/** Every colour the app uses, by what it's for. Each theme fills in all of them. */
export interface Palette {
  scheme: 'light' | 'dark';
  bg: string;
  card: string;
  ink: string;
  muted: string;
  faint: string;
  border: string;
  /** Stronger border, e.g. a filled code box. */
  borderStrong: string;
  /** Text field background, before it's focused. */
  input: string;
  brand: string;
  /** Text and icons on a brand-coloured background. */
  onBrand: string;
  /** Text and icons on gold. */
  onGold: string;
  brandSoft: string;
  gold: string;
  goldInk: string;
  goldSoft: string;
  goldLine: string;
  danger: string;
  dangerSoft: string;
  dangerLine: string;
  success: string;
  successSoft: string;
  shadow: string;
  /** The checkerboard areas: loading screen, login header, summary card. */
  hero: string;
  /** The second colour of the checkerboard squares. */
  heroAlt: string;
  heroInk: string;
  heroMuted: string;
  heroTile: string;
  heroTrack: string;
  heroAlert: string;
  heroAlertInk: string;
  /** Avatar circles: [background, letter] pairs. */
  tints: [string, string][];
}

/** Light mode: sky blue on white, navy text. */
export const lightColors: Palette = {
  scheme: 'light',
  bg: '#EEF5FC',
  card: '#FFFFFF',
  ink: '#0E2A47',
  muted: '#58708B',
  faint: '#94A7BC',
  border: '#DAE6F2',
  borderStrong: '#B6CDE6',
  input: '#F6FAFE',
  brand: '#2A84D2',
  onBrand: '#FFFFFF',
  onGold: '#1B1405',
  brandSoft: '#E0EEFB',
  gold: '#FFC94D',
  goldInk: '#8A5A00',
  goldSoft: '#FFF6DE',
  goldLine: '#F6E0A8',
  danger: '#D33A3A',
  dangerSoft: '#FDEDED',
  dangerLine: '#F4BEBE',
  success: '#1E8A5A',
  successSoft: '#E3F5EC',
  shadow: '#0E2A47',
  hero: '#CFE6FB',
  heroAlt: '#C1DEF9',
  heroInk: '#0E2A47',
  heroMuted: '#4D6987',
  heroTile: 'rgba(255,255,255,0.6)',
  heroTrack: 'rgba(14,42,71,0.12)',
  heroAlert: '#FBDADA',
  heroAlertInk: '#B42323',
  tints: [
    ['#E0EEFB', '#1F6CB0'],
    ['#FFF3D6', '#8A5A00'],
    ['#E4F5EC', '#1E7A50'],
    ['#F1E8FA', '#6E3FA0'],
    ['#E2F4F6', '#1F6E78'],
  ],
};

/** Dark mode: midnight navy with ice-blue accents. */
export const darkColors: Palette = {
  scheme: 'dark',
  bg: '#0A111E',
  card: '#121B2C',
  ink: '#E9F0F8',
  muted: '#93A4BC',
  faint: '#5F7089',
  border: '#1E2A3F',
  borderStrong: '#2E3E5A',
  input: '#0E1626',
  brand: '#5DB2F7',
  onBrand: '#061220',
  onGold: '#1B1405',
  brandSoft: '#132841',
  gold: '#F4C557',
  goldInk: '#F4C96A',
  goldSoft: '#251E10',
  goldLine: '#47391A',
  danger: '#FF6B6B',
  dangerSoft: '#2B1418',
  dangerLine: '#5A232A',
  success: '#43CC88',
  successSoft: '#0F2A1F',
  shadow: '#000000',
  hero: '#0D1A2D',
  heroAlt: '#112239',
  heroInk: '#F2F7FD',
  heroMuted: '#8EA5C3',
  heroTile: 'rgba(255,255,255,0.06)',
  heroTrack: 'rgba(255,255,255,0.1)',
  heroAlert: '#4A1D24',
  heroAlertInk: '#FFB3B3',
  tints: [
    ['#14304D', '#8CC8FA'],
    ['#33280F', '#F4C96A'],
    ['#123224', '#6FD9A4'],
    ['#2A1D3D', '#C6A4F0'],
    ['#11303A', '#7AD3DE'],
  ],
};

/** Manrope weights, loaded in App.tsx. Use these instead of fontWeight so Android picks the right face. */
export const fonts = {
  regular: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
};

export const radius = { sm: 10, md: 14, lg: 22, pill: 999 };

export type ThemePreference = 'system' | 'light' | 'dark';

interface Theme {
  colors: Palette;
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<Theme>({ colors: lightColors, preference: 'system', setPreference: () => undefined });
const PREFERENCE_KEY = 'loan.theme';

/** Follows the phone's (or browser's) light/dark setting unless the user picked one in Profile. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    loadSetting(PREFERENCE_KEY).then((p) => {
      if (p === 'light' || p === 'dark') setPref(p);
    });
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPref(p);
    saveSetting(PREFERENCE_KEY, p === 'system' ? null : p);
  }, []);

  const scheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(
    () => ({ colors: scheme === 'dark' ? darkColors : lightColors, preference, setPreference }),
    [scheme, preference, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
export const useColors = () => useContext(ThemeContext).colors;

/**
 * Like StyleSheet.create, but the styles are built from the current theme's colours:
 *   const useStyles = makeStyles((colors) => ({ title: { color: colors.ink } }));
 *   ...and in the component: const styles = useStyles();
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  build: (colors: Palette) => T & StyleSheet.NamedStyles<any>,
) {
  const cache = new Map<Palette, T>();
  return function useStyles(): T {
    const colors = useColors();
    let styles = cache.get(colors);
    if (!styles) {
      styles = StyleSheet.create(build(colors));
      cache.set(colors, styles);
    }
    return styles;
  };
}
