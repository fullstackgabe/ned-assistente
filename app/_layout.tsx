import { Tabs } from 'expo-router'
import { Platform, SafeAreaView, Text, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AuthGate from '@/components/AuthGate'
import { supabase } from '@/lib/supabase'
import { isDemo } from '@/lib/config'
import { demoAuth } from '@/lib/demoAuth'

const PRIMARY = '#4f46e5'

function LogoutButton() {
  return (
    <TouchableOpacity
      onPress={() => (isDemo ? demoAuth.signOut() : supabase.auth.signOut())}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ paddingHorizontal: 16 }}
      accessibilityLabel="Sair"
    >
      <Ionicons name="log-out-outline" size={24} color="#fff" />
    </TouchableOpacity>
  )
}

if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('web-frame')) {
  const s = document.createElement('style')
  s.id = 'web-frame'
  s.textContent = `
    html,body{margin:0}
    #root :focus, #root :focus-visible{outline:none !important}
    @media (min-width:720px){
      body{background:linear-gradient(135deg,#e0e7ff,#f5f3ff);min-height:100vh}
      #root{width:460px;max-width:100%;height:min(860px, calc(100vh - 48px));margin:24px auto;background:#fff;border-radius:36px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,.22)}
    }`
  document.head.appendChild(s)
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color, opacity: color === PRIMARY ? 1 : 0.55 }}>{emoji}</Text>
}

export default function RootLayout() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <AuthGate>
        <Tabs
          screenOptions={{
            headerStyle: { backgroundColor: PRIMARY },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '800' },
            headerRight: () => <LogoutButton />,
            tabBarActiveTintColor: PRIMARY,
            tabBarInactiveTintColor: '#94a3b8',
            tabBarStyle: { borderTopColor: '#e2e8f0' },
          }}
        >
          <Tabs.Screen name="index" options={{ href: null }} />
          <Tabs.Screen
            name="chat"
            options={{ title: 'Ned', tabBarLabel: 'Chat', tabBarIcon: ({ color }) => <TabIcon emoji="💬" color={color} /> }}
          />
          <Tabs.Screen
            name="extrato"
            options={{ title: 'Extrato', tabBarLabel: 'Extrato', tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }}
          />
        </Tabs>
      </AuthGate>
    </SafeAreaView>
  )
}
