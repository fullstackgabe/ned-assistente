import { View, Text } from 'react-native'
import { ParsedExpense, brl, categoryColor, shortDate, paymentLabel } from '@/types'

export default function ExpenseCard({ expense }: { expense: ParsedExpense }) {
  const color = categoryColor(expense.category)
  return (
    <View style={{ marginTop: 10, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>{brl(expense.value)}</Text>
        <View style={{ backgroundColor: color + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ color, fontSize: 12, fontWeight: '700' }}>{expense.category}</Text>
        </View>
      </View>
      <Text style={{ color: '#334155', marginTop: 6, fontSize: 14 }}>{expense.description}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <Chip>{paymentLabel(expense.payment_method, expense.installments)}</Chip>
        <Chip>{shortDate(expense.date)}</Chip>
      </View>
    </View>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
      <Text style={{ color: '#475569', fontSize: 12, fontWeight: '600' }}>{children}</Text>
    </View>
  )
}
