import { View, Text } from 'react-native'
import Svg, { Path, Circle } from 'react-native-svg'
import { ChartData, brl, categoryColor } from '@/types'

type Props = { data: ChartData[]; total?: number; size?: number }

function arc(cx: number, cy: number, r: number, start: number, end: number): string {
  const s = polar(cx, cy, r, end)
  const e = polar(cx, cy, r, start)
  const large = end - start <= 180 ? 0 : 1
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 0 ${e.x} ${e.y}`
}
function polar(cx: number, cy: number, r: number, angle: number) {
  const a = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

export default function CategoryChart({ data, total, size = 168 }: Props) {
  const clean = data.filter((d) => d.total > 0)
  const sum = total ?? clean.reduce((a, b) => a + b.total, 0)
  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 10
  const stroke = 22

  let acc = 0
  const slices = clean.map((d) => {
    const frac = sum > 0 ? d.total / sum : 0
    const start = acc * 360
    const end = (acc + frac) * 360
    acc += frac
    return { d, start, end, frac }
  })

  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <View style={{ width: size, height: size }}>
          <Svg width={size} height={size}>
            <Circle cx={cx} cy={cy} r={r} stroke="#eef2f7" strokeWidth={stroke} fill="none" />
            {slices.length === 1 ? (
              <Circle cx={cx} cy={cy} r={r} stroke={categoryColor(slices[0].d.categoria)} strokeWidth={stroke} fill="none" />
            ) : (
              slices.map((s, i) => (
                <Path
                  key={i}
                  d={arc(cx, cy, r, s.start, Math.max(s.start + 0.5, s.end))}
                  stroke={categoryColor(s.d.categoria)}
                  strokeWidth={stroke}
                  fill="none"
                  strokeLinecap="butt"
                />
              ))
            )}
          </Svg>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, color: '#64748b' }}>total</Text>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>{brl(sum)}</Text>
          </View>
        </View>

        <View style={{ flex: 1, minWidth: 140, gap: 6 }}>
          {slices.map((s, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: categoryColor(s.d.categoria), marginRight: 8 }} />
              <Text style={{ flex: 1, color: '#334155', fontSize: 13 }} numberOfLines={1}>{s.d.categoria}</Text>
              <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '700' }}>{brl(s.d.total)}</Text>
              <Text style={{ color: '#94a3b8', fontSize: 12, width: 42, textAlign: 'right' }}>{Math.round(s.frac * 100)}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  )
}
