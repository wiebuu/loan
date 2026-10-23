import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { loadSetting, saveSetting } from './api/storage';

/** Every colour the app uses, by what it's for. Each theme fills in all of them. */
export interface Palette {
  scheme: 'light' | 'dark';
  bg: string;
  card: string;
  /** A slightly raised surface inside a card, e.g. a pressed row or a track. */
  sunken: string;
  ink: string;
  muted: string;
  faint: string;
  border: string;
  /** Stronger border, e.g. a filled code box. */
  borderStrong: string;
  /** Text field background, before it's focused. */
  input: string;
  /** Emerald: links, the selected tab, "you lent". */
  brand: string;
  /** Text and icons on a brand-coloured background. */
  onBrand: string;
  brandSoft: string;
  /** Lime accent: the main action buttons, progress, the active filter count. */
  gold: string;
  /** Text and icons on the lime accent. */
  onGold: string;
  /** Amber, for "you borrowed", "due soon" and reminders. */
  goldInk: string;
  goldSoft: string;
  goldLine: string;
  danger: string;
  dangerSoft: string;
  dangerLine: string;
  success: string;
  successSoft: string;
  shadow: string;
  /** Where the logo's two circles overlap. */
  logoLens: string;
  /** The refresh coin: its face, its rim and the ₹ on it. */
  coinFace: string;
  coinRim: string;
  coinInk: string;
  /** The feature surfaces: summary card, login and loading screens. */
  hero: string;
  heroInk: string;
  heroMuted: string;
  heroTile: string;
  heroTrack: string;
  /** The mint wash behind the top of Home (and its header), fading into the page. */
  heroTop: string;
  /** Lime on the hero surface. */
  heroAccent: string;
  heroAlert: string;
  heroAlertInk: string;
  /** Avatar circles: [background, letter] pairs. One quiet neutral pair keeps lists calm. */
  tints: [string, string][];
}

/** Light mode: soft paper white and pale mint, emerald and lime. Nothing dark but the text. */
export const lightColors: Palette = {
  scheme: 'light',
  bg: '#F4F5F1',
  card: '#FFFFFF',
  sunken: '#F0F1EC',
  ink: '#111513',
  muted: '#5C6560',
  faint: '#99A19C',
  border: '#E5E7E1',
  borderStrong: '#C8CDC7',
  input: '#F7F8F5',
  brand: '#0B8459',
  onBrand: '#FFFFFF',
  brandSoft: '#E1F2E9',
  gold: '#C4F16A',
  onGold: '#111513',
  goldInk: '#9A5A00',
  goldSoft: '#FFF1DA',
  goldLine: '#F1D9AA',
  danger: '#D2433C',
  dangerSoft: '#FCEDEB',
  dangerLine: '#F1C3BF',
  success: '#0B8459',
  successSoft: '#E1F2E9',
  shadow: '#111513',
  logoLens: '#62BA4F',
  coinFace: '#C4F16A',
  coinRim: '#8FCB3A',
  coinInk: '#0B6E4B',
  hero: '#FFFFFF',
  heroInk: '#111513',
  heroMuted: '#5C6560',
  heroTile: '#F4F5F1',
  heroTrack: 'rgba(17,21,19,0.08)',
  heroAccent: '#0B8459',
  heroTop: '#DCEFE3',
  heroAlert: '#FCEDEB',
  heroAlertInk: '#C0392B',
  tints: [['#EDEFEA', '#3D4540']],
};

/** Dark mode: deep green-black, mint and lime. */
export const darkColors: Palette = {
  scheme: 'dark',
  bg: '#0A0D0C',
  card: '#141917',
  sunken: '#1B211E',
  ink: '#EDF2EF',
  muted: '#9BA69F',
  faint: '#5E6964',
  border: '#222925',
  borderStrong: '#36403B',
  input: '#101412',
  brand: '#3DD598',
  onBrand: '#05130D',
  brandSoft: '#12291F',
  gold: '#C4F16A',
  onGold: '#0A0D0C',
  goldInk: '#F2B661',
  goldSoft: '#2A2113',
  goldLine: '#4A391B',
  danger: '#FF6B61',
  dangerSoft: '#2B1514',
  dangerLine: '#58241F',
  success: '#3DD598',
  successSoft: '#12291F',
  shadow: '#000000',
  logoLens: '#0A0D0C',
  coinFace: '#C4F16A',
  coinRim: '#8FCB3A',
  coinInk: '#0A0D0C',
  hero: '#141917',
  heroInk: '#F2F6F4',
  heroMuted: '#94A29B',
  heroTile: '#1B211E',
  heroTrack: 'rgba(255,255,255,0.1)',
  heroAccent: '#3DD598',
  heroTop: '#10251B',
  heroAlert: 'rgba(255,107,97,0.16)',
  heroAlertInk: '#FF948B',
  tints: [['#1F2623', '#C9D2CD']],
};

/** Manrope weights, loaded in App.tsx. Use these instead of fontWeight so Android picks the right face. */
export const fonts = {
  regular: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

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
