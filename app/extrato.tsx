import { useCallback, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, Pressable, RefreshControl } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Expense, brl, categoryColor, shortDate, paymentLabelRow } from '@/types'
import {
  listExpenses, summarize, monthRange, weekRange, todayISO, shiftDaysISO, addMonthsISO,
  deleteExpenseSmart, Summary,
} from '@/lib/repo'
import CategoryChart from '@/components/CategoryChart'

const PRIMARY = '#4f46e5'
const DANGER = '#dc2626'

type PeriodKey = 'hoje' | 'ontem' | 'semana' | 'semana_passada' | 'mes' | 'passado'
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: 'ontem', label: 'Ontem' },
  { key: 'semana', label: 'Esta semana' },
  { key: 'semana_passada', label: 'Semana passada' },
  { key: 'mes', label: 'Este mês' },
  { key: 'passado', label: 'Mês passado' },
]

function rangeFor(key: PeriodKey): { from: string; to: string } {
  const today = todayISO()
  if (key === 'hoje') return { from: today, to: today }
  if (key === 'ontem') { const y = shiftDaysISO(today, -1); return { from: y, to: y } }
  if (key === 'semana') return weekRange(today)
  if (key === 'semana_passada') return weekRange(shiftDaysISO(today, -7))
  if (key === 'passado') return monthRange(addMonthsISO(today, -1))
  return monthRange(today)
}

export default function ExtratoScreen() {
  const [period, setPeriod] = useState<PeriodKey>('mes')
  const [category, setCategory] = useState<string | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [rows, setRows] = useState<Expense[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState<Expense | null>(null)

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
  const afterDelete = async () => { setDeleting(null); await load() }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <FlatList
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        data={rows}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        ListHeaderComponent={
          <View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8, marginBottom: 14, marginTop: 4 }}>
              {PERIODS.map((p) => {
                const active = p.key === period
                return (
                  <TouchableOpacity
                    key={p.key}
                    onPress={() => { setPeriod(p.key); setCategory(null) }}
                    style={{ width: '48.5%', paddingVertical: 10, borderRadius: 999, alignItems: 'center', backgroundColor: active ? PRIMARY : '#eef2ff', borderWidth: 1, borderColor: active ? PRIMARY : '#c7d2fe' }}
                  >
                    <Text style={{ color: active ? '#fff' : PRIMARY, fontWeight: '700', fontSize: 13 }}>{p.label}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>

            <View style={{ backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: '#e2e8f0', padding: 16 }}>
              <Text style={{ color: '#64748b', fontSize: 13 }}>Total no período</Text>
              <Text style={{ fontSize: 30, fontWeight: '900', color: '#0f172a', marginTop: 2 }}>{brl(summary?.total || 0)}</Text>
              {summary?.top ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <Ionicons name="trophy" size={15} color="#f59e0b" />
                  <Text style={{ color: '#64748b', fontSize: 13 }}>
                    Categoria vencedora: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{summary.top.categoria}</Text>
                  </Text>
                </View>
              ) : null}
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

            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 18, marginBottom: 4, marginLeft: 4 }}>
              <Text style={{ fontWeight: '800', color: '#0f172a' }}>Lançamentos</Text>
              {rows.length > 0 ? <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '700' }}>{rows.length}</Text> : null}
            </View>
          </View>
        }
        renderItem={({ item }) => <Row e={item} onDelete={() => setDeleting(item)} />}
        ListEmptyComponent={
          <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 24 }}>
            Nenhum gasto por aqui ainda.
          </Text>
        }
      />

      {deleting ? (
        <DeleteSheet expense={deleting} onClose={() => setDeleting(null)} onDeleted={afterDelete} />
      ) : null}
    </View>
  )
}

function FilterChip({ label, color, active, onPress }: { label: string; color?: string; active: boolean; onPress: () => void }) {
  const c = color || PRIMARY
  return (
    <TouchableOpacity onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: active ? c + '22' : '#f1f5f9', borderWidth: 1, borderColor: active ? c : '#e2e8f0' }}>
      {color ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} /> : null}
      <Text style={{ color: active ? c : '#475569', fontSize: 12.5, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  )
}

function Row({ e, onDelete }: { e: Expense; onDelete: () => void }) {
  const color = categoryColor(e.category)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, padding: 12, marginBottom: 8 }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{e.description}</Text>
        <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
          {e.category} · {paymentLabelRow(e.payment_method, e.installment_no, e.installments)} · {shortDate(e.date)}
        </Text>
      </View>
      <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 15, marginRight: 8 }}>{brl(e.value)}</Text>
      <Pressable
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ hovered, pressed }: any) => ({
          width: 34, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
          backgroundColor: hovered || pressed ? '#fee2e2' : 'transparent',
        })}
      >
        {({ hovered, pressed }: any) => (
          <Ionicons name="trash-outline" size={20} color={hovered || pressed ? DANGER : '#cbd5e1'} />
        )}
      </Pressable>
    </View>
  )
}

function DeleteSheet({ expense, onClose, onDeleted }: {
  expense: Expense
  onClose: () => void
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)
  const parcelado = expense.installments > 1

  const remove = async () => {
    if (busy) return
    setBusy(true)
    try { await deleteExpenseSmart(expense); onDeleted() } finally { setBusy(false) }
  }

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <TouchableOpacity activeOpacity={1} onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      <View style={{ width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#0f172a' }}>Excluir gasto</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 14, borderWidth: 1, borderColor: '#e2e8f0', padding: 12, marginBottom: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: categoryColor(expense.category) + '22', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: categoryColor(expense.category) }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 14 }} numberOfLines={1}>{expense.description}</Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
              {expense.category} · {paymentLabelRow(expense.payment_method, expense.installment_no, expense.installments)} · {shortDate(expense.date)}
            </Text>
          </View>
          <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 15 }}>{brl(expense.value)}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, backgroundColor: parcelado ? '#fffbeb' : '#fef2f2', borderRadius: 14, borderWidth: 1, borderColor: parcelado ? '#fde68a' : '#fecaca', padding: 14, marginBottom: 16 }}>
          <Ionicons name={parcelado ? 'warning-outline' : 'alert-circle-outline'} size={20} color={parcelado ? '#b45309' : DANGER} />
          <Text style={{ flex: 1, color: parcelado ? '#7c2d12' : '#7f1d1d', fontSize: 13, lineHeight: 19 }}>
            {parcelado
              ? `Esse gasto é parcelado em ${expense.installments}x. Excluir vai remover TODAS as ${expense.installments} parcelas dessa compra. Essa ação não tem volta.`
              : 'Tem certeza que deseja excluir? Essa ação não tem volta.'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity onPress={onClose} style={{ flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: '#f1f5f9' }}>
            <Text style={{ color: '#475569', fontWeight: '700' }}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={busy} onPress={remove} style={{ flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', backgroundColor: DANGER, opacity: busy ? 0.6 : 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{parcelado ? 'Excluir tudo' : 'Excluir'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}
