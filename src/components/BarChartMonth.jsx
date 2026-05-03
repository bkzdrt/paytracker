import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

export default function BarChartMonth({ data, onBarClick, currentMonth }) {
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} onClick={(e) => {
        if (e?.activePayload?.[0]) {
          onBarClick(e.activePayload[0].payload.monthIndex)
        }
      }}>
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#F0F0F0' }} axisLine={false} tickLine={false} interval={0} />
        <YAxis hide />
        <Tooltip
          formatter={(v) => v ? [v.toLocaleString(), ''] : ['-', '']}
          contentStyle={{ background: 'rgba(15,15,15,0.96)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, fontSize: 12, color: '#F0F0F0' }}
          labelStyle={{ color: '#F0F0F0' }}
          itemStyle={{ color: '#F0F0F0' }}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
        />
        <Bar dataKey="gross" radius={[4, 4, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={i + 1 === currentMonth ? '#C9A84C' : entry.gross ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.05)'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
