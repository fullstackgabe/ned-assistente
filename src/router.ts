import { createRouter, createWebHistory } from 'vue-router'
import ChatView from '@/views/ChatView.vue'
import ExtratoView from '@/views/ExtratoView.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/chat' },
    { path: '/chat', name: 'chat', component: ChatView, meta: { title: 'Home' } },
    { path: '/extrato', name: 'extrato', component: ExtratoView, meta: { title: 'Extrato' } },
    { path: '/:pathMatch(.*)*', redirect: '/chat' },
  ],
})
