interface Props {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  color?: 'green' | 'red' | 'blue' | 'default';
}

export default function StatCard({ label, value, sub, color = 'default' }: Props) {
  const valueColor = {
    green: 'text-emerald-400',
    red: 'text-red-400',
    blue: 'text-sky-400',
    default: 'text-white',
  }[color];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-2xl font-bold font-mono ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  );
}
