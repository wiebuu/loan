const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number): string {
  return rupees.format(amount);
}

/** Today's date as YYYY-MM-DD in the device's local time zone. */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(days: number, from = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** "2026-10-24" -> "24 Oct 2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Whole days from `iso` to today; positive means the date is in the past. */
export function daysPast(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  const due = new Date(y, m - 1, d).getTime();
  const [ty, tm, td] = todayISO().split('-').map(Number);
  const today = new Date(ty, tm - 1, td).getTime();
  return Math.round((today - due) / 86_400_000);
}
