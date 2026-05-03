import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

export default function DailyChart({ data, todayNum }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }} barCategoryGap="10%">
        <XAxis
          dataKey="day"
          tick={{ fontSize: 9, fill: '#F0F0F0' }}
          axisLine={false}
          tickLine={false}
          interval={2}
        />
        <YAxis hide />
        <Tooltip
          formatter={(v) => v ? [v.toLocaleString(), ''] : ['-', '']}
          contentStyle={{ background: 'rgba(15,15,15,0.96)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, fontSize: 12, color: '#F0F0F0' }}
          labelStyle={{ color: '#F0F0F0' }}
          itemStyle={{ color: '#F0F0F0' }}
          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
          labelFormatter={(label) => `${label}`}
        />
        <Bar dataKey="gross" radius={[3, 3, 0, 0]} minPointSize={2}>
          {data.map((entry, i) => {
            let fill = 'rgba(255,255,255,0.05)'
            if (entry.day === todayNum) fill = '#C9A84C'
            else if (entry.gross > 0) fill = 'rgba(255,255,255,0.18)'
            return <Cell key={i} fill={fill} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
