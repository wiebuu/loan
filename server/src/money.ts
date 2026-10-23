const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const exact = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

export const paiseToRupees = (paise: number) => paise / 100;
/** 150000 -> '₹1,500', 49950 -> '₹499.50' */
export const formatPaise = (paise: number) => (paise % 100 === 0 ? whole : exact).format(paise / 100);

/** '2026-10-24' -> '24 Oct 2026' */
export function formatDay(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
