import { createRouter, createWebHistory } from 'vue-router'
import LandingView from '../views/LandingView.vue'
import MainView from '../views/MainView.vue'
import RecentPostsView from '../views/RecentPostsView.vue'
import SearchView from '../views/SearchView.vue'
import RankingView from '../views/RankingView.vue'
import ChainView from '../views/ChainView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import MyPageView from '../views/MyPageView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'main',
      alias: '/main',
      component: MainView
    },
    // ★★★ マイページをMainViewの子供から独立させる ★★★
    {
      path: '/mypage',
      name: 'mypage',
      component: MyPageView
    },
    {
      path: '/chain/:id',
      name: 'chain',
      component: ChainView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
  ]
})

export default router
