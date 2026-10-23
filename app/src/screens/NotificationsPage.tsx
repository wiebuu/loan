import { Animated, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { GroupHeader } from '../components/Group';
import { BellIcon, CheckAllIcon } from '../components/Icons';
import { Page } from '../components/Page';
import { CoinRefresh, RefreshMode, ThemedRefreshControl, useScrollY } from '../components/Refresh';
import { fonts, makeStyles, Palette, radius, useColors } from '../theme';
import { AppNotification } from '../types';

interface Props {
  visible: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onOpenLoan: (loanId: number) => void;
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  refreshing: boolean;
  refreshMode: RefreshMode;
  onRefresh: () => void;
}

/**
 * The inbox, as a full page. New (unread) ones sit on a white card in bold. Opening one marks
 * it read, and it turns into a plain, quieter row under "Earlier".
 */
export function NotificationsPage({ visible, notifications, onClose, onOpenLoan, onMarkRead, onMarkAllRead, refreshing, refreshMode, onRefresh }: Props) {
  const styles = useStyles();
  const colors = useColors();
  const fresh = notifications.filter((n) => !n.read);
  const { scrollY, onScroll } = useScrollY();
  const earlier = notifications.filter((n) => n.read);
  const sections = [
    ...(fresh.length ? [{ title: 'New', data: fresh }] : []),
    ...(earlier.length ? [{ title: 'Earlier', data: earlier }] : []),
  ];

  return (
    <Page
      visible={visible}
      onClose={onClose}
      title="Notifications"
      right={
        <Pressable
          onPress={onMarkAllRead}
          disabled={fresh.length === 0}
          hitSlop={10}
          style={({ pressed }) => [styles.headerIcon, pressed && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel="Mark all as read"
          accessibilityState={{ disabled: fresh.length === 0 }}
        >
          <CheckAllIcon size={24} color={fresh.length ? colors.brand : colors.faint} />
        </Pressable>
      }
    >
      <CoinRefresh refreshing={refreshing} mode={refreshMode} scrollY={scrollY}>
      <AnimatedSectionList
        sections={sections}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={<ThemedRefreshControl refreshing={refreshing && refreshMode === 'pull'} onRefresh={onRefresh} />}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <GroupHeader
            title={section.title}
            right={section.title === 'New' ? `${fresh.length} unread` : undefined}
            first={section.title === sections[0]?.title}
          />
        )}
        renderItem={({ item, index, section }) => {
          const t = tone(item.type, colors);
          const unread = !item.read;
          const open = () => {
            onMarkRead(item.id);
            if (item.loanId) onOpenLoan(item.loanId);
          };
          const body = (
            <>
              <View style={[styles.icon, { backgroundColor: unread ? t.bg : colors.sunken }]}>
                <BellIcon size={16} color={unread ? t.fg : colors.faint} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={unread ? styles.unreadText : styles.readText}>{item.message}</Text>
                <Text style={[styles.time, unread && { color: colors.brand }]}>{timeAgo(item.createdAt)}</Text>
              </View>
            </>
          );
          // Unread ones each get their own card; read ones are plain rows on the page.
          return unread ? (
            <Pressable
              onPress={open}
              style={({ pressed }) => [styles.unreadItem, pressed && { backgroundColor: colors.sunken }]}
              accessibilityRole="button"
              accessibilityLabel={`Unread. ${item.message}`}
            >
              {body}
            </Pressable>
          ) : (
            <Pressable
              onPress={open}
              style={({ pressed }) => [styles.readItem, index < section.data.length - 1 && styles.readDivider, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={item.message}
            >
              {body}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <BellIcon size={26} color={colors.faint} />
            </View>
            <Text style={styles.emptyTitle}>Nothing yet</Text>
            <Text style={styles.emptyText}>Loan requests, reminders and payment updates show up here.</Text>
          </View>
        }
      />
      </CoinRefresh>
    </Page>
  );
}

// Animated, so the list's scroll position can drive the refresh coin on the native side.
const AnimatedSectionList = Animated.createAnimatedComponent(SectionList) as unknown as typeof SectionList<AppNotification, { title: string; data: AppNotification[] }>;

function tone(type: string, colors: Palette) {
  if (type === 'reminder' || type === 'paid_rejected') return { bg: colors.goldSoft, fg: colors.goldInk };
  if (type === 'declined' || type === 'cancelled') return { bg: colors.sunken, fg: colors.muted };
  if (type === 'paid_confirmed' || type === 'marked_repaid' || type === 'accepted') return { bg: colors.successSoft, fg: colors.success };
  return { bg: colors.brandSoft, fg: colors.brand };
}

function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const useStyles = makeStyles((colors) => ({
  headerIcon: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40 },
  unreadItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOpacity: colors.scheme === 'dark' ? 0 : 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: colors.scheme === 'dark' ? 0 : 1,
  },
  readItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 4 },
  readDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderStrong },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: 14.5, fontFamily: fonts.bold, color: colors.ink, lineHeight: 20 },
  readText: { fontSize: 14.5, fontFamily: fonts.regular, color: colors.muted, lineHeight: 20 },
  time: { fontSize: 12, fontFamily: fonts.semibold, color: colors.faint, marginTop: 4 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.sunken,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, marginTop: 6, textAlign: 'center' },
}));
