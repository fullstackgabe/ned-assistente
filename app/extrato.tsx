import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Expense, brl, categoryColor, shortDate } from '@/types'
import { listExpenses, summarize, monthRange, todayISO, addMonthsISO, Summary } from '@/lib/repo'
import { supabase } from '@/lib/supabase'
import { isDemo } from '@/lib/config'
import { demoAuth } from '@/lib/demoAuth'
import CategoryChart from '@/components/CategoryChart'

const PRIMARY = '#4f46e5'

type PeriodKey = 'mes' | 'passado' | 'tudo'
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'mes', label: 'Este mês' },
  { key: 'passado', label: 'Mês passado' },
  { key: 'tudo', label: 'Tudo' },
]

function rangeFor(key: PeriodKey): { from: string; to: string } {
  const today = todayISO()
  if (key === 'passado') return monthRange(addMonthsISO(today, -1))
  if (key === 'tudo') return { from: '2000-01-01', to: '2100-01-01' }
  return monthRange(today)
}

export default function ExtratoScreen() {
  const [period, setPeriod] = useState<PeriodKey>('mes')
  const [category, setCategory] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rows, setRows] = useState<Expense[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    const { from, to } = rangeFor(period)
    const [s, list] = await Promise.all([
      summarize(from, to),
      listExpenses({ from, to, category: category ?? undefined }),
    ])
    setSummary(s)
    setRows(list)
  }, [period, category])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false) }

  return (
    <FlatList
      style={{ backgroundColor: '#f8fafc' }}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      data={rows}
      keyExtractor={(e) => e.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
      ListHeaderComponent={
        <View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Seu extrato</Text>
            <TouchableOpacity onPress={() => (isDemo ? demoAuth.signOut() : supabase.auth.signOut())}>
              <Text style={{ color: '#94a3b8', fontWeight: '600' }}>Sair</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {PERIODS.map((p) => {
              const active = p.key === period
              return (
                <TouchableOpacity
                  key={p.key}
                  onPress={() => { setPeriod(p.key); setCategory(null) }}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? PRIMARY : '#eef2ff' }}
                >
                  <Text style={{ color: active ? '#fff' : PRIMARY, fontWeight: '700', fontSize: 13 }}>{p.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 }}>
            <Text style={{ color: '#64748b', fontSize: 13 }}>Total no período</Text>
            <Text style={{ fontSize: 30, fontWeight: '900', color: '#0f172a', marginTop: 2 }}>{brl(summary?.total || 0)}</Text>
            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 2 }}>
              {summary?.count || 0} lançamento(s){summary?.top ? ` · maior: ${summary.top.categoria}` : ''}
            </Text>
            {summary && summary.byCategory.length > 0 ? <CategoryChart data={summary.byCategory} total={summary.total} /> : null}
          </View>

          {summary && summary.byCategory.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              <FilterChip label="Todas" active={category === null} onPress={() => setCategory(null)} />
              {summary.byCategory.map((c) => (
                <FilterChip key={c.categoria} label={c.categoria} color={categoryColor(c.categoria)} active={category === c.categoria} onPress={() => setCategory(c.categoria)} />
              ))}
            </View>
          ) : null}

          <Text style={{ fontWeight: '800', color: '#0f172a', marginTop: 18, marginBottom: 4 }}>Lançamentos</Text>
        </View>
      }
      renderItem={({ item }) => <Row e={item} />}
      ListEmptyComponent={
        <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 24 }}>
          Nenhum gasto por aqui ainda. Vá até o chat e diga "gastei 30 no almoço". 🙂
        </Text>
      }
    />
  )
}

function FilterChip({ label, color, active, onPress }: { label: string; color?: string; active: boolean; onPress: () => void }) {
  const c = color || PRIMARY
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: active ? c + '22' : '#f1f5f9', borderWidth: 1, borderColor: active ? c : 'transparent' }}>
      {color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /> : null}
      <Text style={{ color: active ? c : '#475569', fontSize: 12.5, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  )
}

function Row({ e }: { e: Expense }) {
  const color = categoryColor(e.category)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, marginBottom: 8 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{e.description}</Text>
        <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
          {e.category} · {e.payment_method} · {shortDate(e.date)}
          {e.installments > 1 ? ` · ${e.installment_no}/${e.installments}` : ''}
        </Text>
      </View>
      <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 15 }}>{brl(e.value)}</Text>
    </View>
  )
}
