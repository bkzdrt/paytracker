import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

export default function DailyChart({ data, todayNum }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="10%">
        <XAxis
          dataKey="day"
          tick={{ fontSize: 9, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
          interval={2}
        />
        <YAxis hide />
        <Tooltip
          formatter={(v) => v ? [v.toLocaleString(), ''] : ['-', '']}
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
          cursor={{ fill: 'var(--surface-2)' }}
          labelFormatter={(label) => `${label}`}
        />
        <Bar dataKey="gross" radius={[3, 3, 0, 0]} minPointSize={2}>
          {data.map((entry, i) => {
            let fill = 'var(--border)'
            if (entry.day === todayNum) fill = 'var(--accent)'
            else if (entry.gross > 0) fill = 'var(--surface-2)'
            return <Cell key={i} fill={fill} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
