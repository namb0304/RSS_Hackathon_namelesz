import { createRouter, createWebHistory } from 'vue-router'
// 新しいページ構成に合わせて、読み込む部品を変更・追加します
import LandingView from '../views/LandingView.vue'
import MainView from '../views/MainView.vue'
import RecentPostsView from '../views/RecentPostsView.vue'
import SearchView from '../views/SearchView.vue'
import RankingView from '../views/RankingView.vue'
import ChainView from '../views/ChainView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
routes: [
    {
      path: '/',
      name: 'landing',
      component: LandingView
    },
    // '/timeline'を削除し、以下の'/main'の構造に置き換えます
    {
      path: '/main',
      name: 'main',
      component: MainView,
      // /main の中に表示される子ページのルート設定
      children: [
        {
          path: '', // '/main'にアクセスされた時のリダイレクト先
          redirect: '/main/recent'
        },
        {
          path: 'recent', // '/main/recent'のパス
          name: 'recent',
          component: RecentPostsView
        },
        {
          path: 'search', // '/main/search'のパス
          name: 'search',
          component: SearchView
        },
        {
          path: 'ranking', // '/main/ranking'のパス
          name: 'ranking',
          component: RankingView
        },
        {
          path: '/chain/:id', // :id は動的なパラメータ
          name: 'chain',
          component: ChainView
        }
      ]
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
    {
      path: '/chain/:id',
      name: 'chain',
      component: ChainView
    }
  ]
})

export default router

