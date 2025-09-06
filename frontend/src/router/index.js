import { createRouter, createWebHistory } from 'vue-router'
// 新しいページ構成に合わせて、読み込む部品を変更・追加します
import LandingView from '../views/LandingView.vue'
import TimelineView from '../views/TimelineView.vue' // HomeViewから名称変更したタイムラインページ
import ChainView from '../views/ChainView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      // サイトの入り口('/')にアクセスしたら、ランディングページを表示する設定
      path: '/',
      name: 'landing',
      component: LandingView
    },
    {
      // ログイン後のメインページとなるタイムライン
      path: '/timeline',
      name: 'timeline',
      component: TimelineView
    },
    {
      // ログインページ
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      // 新規登録ページ
      path: '/register',
      name: 'register',
      component: RegisterView
    },
    {
      // 詳細ページ
      path: '/chain/:id',
      name: 'chain',
      component: ChainView
    }
  ]
})

export default router

