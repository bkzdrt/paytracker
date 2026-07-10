import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

export default function WeeklyChart({ data, currentWeek }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(v) => [v.toLocaleString(), '']}
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
          cursor={{ fill: 'rgba(22,24,29,0.04)' }}
        />
        <Bar dataKey="gross" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.week === currentWeek ? 'var(--ink)' : 'var(--surface-3)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
