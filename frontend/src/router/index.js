import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import ChainView from '../views/ChainView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView // ログインと同じ画面コンポーネントを指定
    },
    {
      path: '/chain/:id', // ← :id はどの投稿かを区別するためのID
      name: 'chain',
      component: ChainView
    }
  ]
})

export default router