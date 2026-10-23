import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { BellIcon } from '../components/Icons';
import { fonts, makeStyles, Palette, radius, useColors } from '../theme';
import { AppNotification } from '../types';

interface Props {
  visible: boolean;
  notifications: AppNotification[];
  onClose: () => void;
  onOpenLoan: (loanId: number) => void;
}

export function NotificationsModal({ visible, notifications, onClose, onOpenLoan }: Props) {
  const styles = useStyles();
  const colors = useColors();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.close}>Done</Text>
          </Pressable>
        </View>
        <FlatList
          data={notifications}
          keyExtractor={(n) => String(n.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              disabled={!item.loanId}
              onPress={() => item.loanId && onOpenLoan(item.loanId)}
              style={({ pressed }) => [styles.item, !item.read && styles.unread, pressed && { opacity: 0.8 }]}
            >
              <View style={[styles.icon, { backgroundColor: tone(item.type, colors).bg }]}>
                <BellIcon size={16} color={tone(item.type, colors).fg} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.message}>{item.message}</Text>
                <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.read ? <View style={styles.dot} /> : null}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing yet</Text>
              <Text style={styles.emptyText}>Loan requests, reminders and payment updates show up here.</Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

function tone(type: string, colors: Palette) {
  if (type === 'reminder' || type === 'paid_rejected') return { bg: colors.goldSoft, fg: colors.goldInk };
  if (type === 'declined' || type === 'cancelled') return { bg: colors.bg, fg: colors.muted };
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
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 12,
  },
  title: { fontSize: 24, fontFamily: fonts.heavy, color: colors.ink },
  close: { fontSize: 16, color: colors.brand, fontFamily: fonts.bold },
  list: { padding: 16, paddingTop: 4 },
  item: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: { borderColor: colors.brand },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 14.5, fontFamily: fonts.semibold, color: colors.ink, lineHeight: 20 },
  time: { fontSize: 12, fontFamily: fonts.regular, color: colors.faint, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand, marginTop: 6 },
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 17, fontFamily: fonts.bold, color: colors.ink },
  emptyText: { color: colors.muted, fontFamily: fonts.regular, marginTop: 6, textAlign: 'center' },
}));
