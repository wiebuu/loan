import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { fonts, makeStyles, radius, useColors } from '../theme';
import { Summary } from '../types';
import { formatMoney } from '../utils/format';

const NOTCH = 24;

function numbers(summary: Summary | null) {
  const lent = summary?.totalLent ?? 0;
  const repaid = summary?.totalRepaid ?? 0;
  const overdue = summary?.overdueAmount ?? 0;
  const outstanding = summary?.toReceive ?? 0;
  const share = lent > 0 ? Math.min(repaid / lent, 1) : 0;
  return { lent, repaid, overdue, outstanding, due: Math.max(outstanding - overdue, 0), toPay: summary?.toPay ?? 0, share, pct: Math.round(share * 100) };
}

/** A ring showing how much has come back. */
function Ring({ share, size = 76, stroke = 8, track, color, children }: { share: number; size?: number; stroke?: number; track: string; color: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {share > 0 ? (
          // The round caps add half a stroke at each end, so take a stroke off the length:
          // the ring keeps a visible gap until it's really 100%.
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${share >= 1 ? c : Math.max(c * share - stroke, 0.5)} ${c}`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children}</View>
    </View>
  );
}


function TicketSummary({ summary }: { summary: Summary | null }) {
  const s = useStyles();
  const colors = useColors();
  const n = numbers(summary);
  return (
    <View style={s.ticketWrap}>
      <View style={[s.base, s.ticket]}>
        <View style={s.topRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.caption}>Still to get back</Text>
            <Text style={s.big} numberOfLines={1} adjustsFontSizeToFit>{summary ? formatMoney(n.outstanding) : '—'}</Text>
            <View style={s.backPill}>
              <Text style={s.backPillText} numberOfLines={1}>
                {formatMoney(n.repaid)} of {formatMoney(n.lent)} back
              </Text>
            </View>
          </View>
          <Ring share={n.share} size={70} stroke={7} track={colors.sunken} color={colors.brand}>
            <Text style={s.pctSmall}>{n.pct}%</Text>
          </Ring>
        </View>
        <View style={s.perfRow}>
          <View style={[s.notch, { left: -NOTCH / 2 }]} />
          {/* Drawn as a real dashed line: iOS won't dash a one-sided border. */}
          <Svg style={s.perf} width="100%" height={2}>
            <Line x1="0" y1="1" x2="100%" y2="1" stroke={colors.borderStrong} strokeWidth={1.5} strokeDasharray="6 5" strokeLinecap="round" />
          </Svg>
          <View style={[s.notch, { right: -NOTCH / 2 }]} />
        </View>
        <View style={s.stubRow}>
          <Stub label="Overdue" value={summary ? formatMoney(n.overdue) : '—'} alert={n.overdue > 0} />
          <View style={s.vline} />
          <Stub label="Still due" value={summary ? formatMoney(n.due) : '—'} />
          <View style={s.vline} />
          <Stub label="You owe" value={summary ? formatMoney(n.toPay) : '—'} />
        </View>
      </View>
    </View>
  );
}



function Stub({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  const s = useStyles();
  const colors = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={s.chipLabel}>{label}</Text>
      <Text style={[s.chipValue, alert && { color: colors.danger }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}


const useStyles = makeStyles((colors) => {
  const dark = colors.scheme === 'dark';
  return {
    base: { borderRadius: radius.lg + 2, padding: 20, marginTop: 4, marginBottom: 18 },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    caption: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.muted },
    big: { fontSize: 38, fontFamily: fonts.heavy, color: colors.ink, letterSpacing: -1.2, marginTop: 2 },
    pctSmall: { fontSize: 16, fontFamily: fonts.heavy, color: colors.ink },
    chipLabel: { fontSize: 11.5, fontFamily: fonts.bold, color: colors.muted },
    chipValue: { fontSize: 16, fontFamily: fonts.heavy, color: colors.ink, marginTop: 2, letterSpacing: -0.3 },
    ticketWrap: { marginTop: 4, marginBottom: 18 },
    ticket: {
      marginTop: 0,
      marginBottom: 0,
      paddingBottom: 16,
      backgroundColor: colors.card,
      overflow: 'hidden',
      borderWidth: dark ? 1 : 0,
      borderColor: colors.border,
    },
    backPill: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.brandSoft },
    backPillText: { fontSize: 12, fontFamily: fonts.bold, color: colors.brand },
    // The tear line runs the full width of the card; the notches are circles half outside it,
    // cut in the page colour so they read as bites out of the ticket.
    perfRow: { height: NOTCH, justifyContent: 'center', marginVertical: 12, marginHorizontal: -20 },
    perf: { marginHorizontal: NOTCH / 2 + 8, height: 2 },
    notch: { position: 'absolute', top: 0, width: NOTCH, height: NOTCH, borderRadius: NOTCH / 2, backgroundColor: colors.bg },
    stubRow: { flexDirection: 'row', alignItems: 'center' },
    vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.borderStrong },
  };
});

/**
 * The top of Home, styled as a ticket: what's still owed to you and a ring showing how much
 * has come back, then a perforated tear line, then the overdue, still due and you-owe figures.
 */
export function SummaryCard({ summary }: { summary: Summary | null }) {
  return <TicketSummary summary={summary} />;
}
