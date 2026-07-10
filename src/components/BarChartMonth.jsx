import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

export default function BarChartMonth({ data, onBarClick, currentMonth }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} onClick={(e) => {
        if (e?.activePayload?.[0]) {
          onBarClick(e.activePayload[0].payload.monthIndex)
        }
      }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={0} />
        <YAxis hide />
        <Tooltip
          formatter={(v) => v ? [v.toLocaleString(), ''] : ['-', '']}
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
          labelStyle={{ color: 'var(--text)' }}
          itemStyle={{ color: 'var(--text)' }}
          cursor={{ fill: 'rgba(22,24,29,0.04)' }}
        />
        <Bar dataKey="gross" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={i + 1 === currentMonth ? 'var(--ink)' : entry.gross ? 'var(--surface-3)' : 'var(--surface-2)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
