import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ChainView from '../views/ChainView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/chain/:id', // ← :id はどの投稿かを区別するためのID
      name: 'chain',
      component: ChainView
    }
  ]
})

export default router