<script setup>
import { RouterLink, useRouter } from 'vue-router'
import { logout } from '../firebase' // ログアウト関数をインポート
import { user } from '../store/user' // ユーザー情報をインポート

const router = useRouter()

const handleLogout = async () => {
  try {
    await logout()
    router.push('/') // ログアウト後にホームページへ移動
  } catch (error) {
    console.error('ログアウトエラー:', error)
  }
}
</script>

<template>
  <header class="header">
    <div class="logo">
      <!-- ★★★ ログイン状態に関わらず、ロゴクリックで適切なページへ飛ぶように変更 ★★★ -->
      <RouterLink :to="user ? '/timeline' : '/'">ThanksRelay</RouterLink>
    </div>
    
    <nav v-if="!user" class="auth-nav">
      <RouterLink to="/register" class="nav-button signup">新規登録</RouterLink>
      <RouterLink to="/login" class="nav-button login">ログイン</RouterLink>
    </nav>

    <nav v-else class="auth-nav">
      <!-- ★★★ ここを変更 ★★★ -->
      <!-- 人マークとユーザー名を両方表示 -->
      <RouterLink v-if="user" to="/mypage" class="nav-button mypage-link">
        <span class="mypage-icon">👤</span>
        <span v-if="user.displayName">{{ user.displayName }}</span>
      </RouterLink>
      <button @click="handleLogout" class="nav-button logout">ログアウト</button>
    </nav>

  </header>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}
.logo a {
  font-weight: bold;
  font-size: 1.5rem;
  text-decoration: none;
  color: #333;
}
.auth-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.nav-button {
  padding: 0.5rem 1rem;
  border-radius: 5px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.2s;
  text-align: center;
  cursor: pointer;
  background: none;
  font-size: 1rem;
  font-family: inherit;
}
.signup {
  background-color: #28a745;
  color: white;
  border: 1px solid #28a745;
}
.signup:hover {
  background-color: #218838;
}
.login {
  background-color: transparent;
  color: #007bff;
  border: 1px solid #007bff;
}
.login:hover {
  background-color: #007bff;
  color: white;
}
/* ログイン後のボタンのスタイル */
.logout {
  background-color: #dc3545;
  color: white;
  border: 1px solid #dc3545;
}
.logout:hover {
    background-color: #c82333;
}
/* ★★★ マイページリンクのスタイルを変更 ★★★ */
.mypage-link {
    display: flex;
    align-items: center;
    gap: 0.5rem; /* アイコンと名前の間隔 */
    border: 1px solid #6c757d;
    color: #333;
}
.mypage-link:hover {
    background-color: #e2e6ea;
}
.mypage-icon {
    font-size: 1.2rem;
}
</style>

