import { StyleSheet } from 'react-native';
import Svg, { Defs, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useColors } from '../theme';

interface Props {
  /** Side of one square, in points. */
  size?: number;
  /** Soften the middle so text on top stays easy to read. */
  fade?: boolean;
}

/** A chessboard of squares in the theme's two hero colours. Fills its parent; put content on top. */
export function Checker({ size = 28, fade = true }: Props) {
  const colors = useColors();
  const id = `loanChecker${size}`;
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={size * 2} height={size * 2}>
          <Rect width={size * 2} height={size * 2} fill={colors.hero} />
          <Rect width={size} height={size} fill={colors.heroAlt} />
          <Rect x={size} y={size} width={size} height={size} fill={colors.heroAlt} />
        </Pattern>
        <RadialGradient id="loanCheckerFade" cx="50%" cy="50%" r="65%">
          <Stop offset="0" stopColor={colors.hero} stopOpacity={0.9} />
          <Stop offset="0.6" stopColor={colors.hero} stopOpacity={0.35} />
          <Stop offset="1" stopColor={colors.hero} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
      {fade ? <Rect width="100%" height="100%" fill="url(#loanCheckerFade)" /> : null}
    </Svg>
  );
}
