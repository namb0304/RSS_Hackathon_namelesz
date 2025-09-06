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
      <RouterLink :to="user ? '/timeline' : '/'">Thanks</RouterLink>
    </div>
    
    <nav v-if="!user" class="auth-nav">
      <RouterLink to="/register" class="btn signup">無料で始める</RouterLink>
      <RouterLink to="/login" class="btn login">ログイン</RouterLink>
    </nav>

    <nav v-else class="auth-nav">
      <RouterLink v-if="user" to="/mypage" class="btn mypage">
        <span class="mypage-icon">👤</span>
        <span v-if="user.displayName">{{ user.displayName }}</span>
      </RouterLink>
      <button @click="handleLogout" class="btn logout">ログアウト</button>
    </nav>

  </header>
</template>

<style scoped>
/* ★★★ ランディングページとフォントを統一 ★★★ */
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@800&family=Poppins:wght@400;700&display=swap');

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 2rem;
  background-color: #FFFFFF;
  border-bottom: 1px solid #fdeee0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
  font-family: 'Poppins', sans-serif;
}

.logo a {
  /* ★★★ ランディングページとフォントを統一 ★★★ */
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 1.8rem;
  text-decoration: none;
  /* ランディングページのタイトルに合わせたグラデーション */
  background: linear-gradient(45deg, #FF8C42, #EE965F);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
}

.auth-nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* ★★★ 全ボタン共通のスタイルを定義 ★★★ */
.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.5rem;
  border-radius: 50px; /* 角を丸くする */
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s ease;
  font-size: 0.9rem;
  border: 2px solid transparent;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); /* 影を追加 */
  cursor: pointer;
  font-family: 'Poppins', sans-serif;
}

.btn:hover {
  transform: translateY(-2px); /* ホバー時に少し浮き上がる */
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

/* ★★★ ランディングページのデザインを適用 ★★★ */
.signup {
  background-color: #ee965fff;
  color: white;
}
.signup:hover {
  filter: brightness(1.1);
}

.login {
  background-color: #FFFFFF;
  color: #dc8144ff;
  border-color: #dc8144ff;
}
.login:hover {
  background-color: #FFF7F0;
  border-color: #f79254ff;
}

/* ★★★ ログイン後のボタンもデザインを統一 ★★★ */
.logout {
  background-color: #f3f4f6; /* 落ち着いたグレー */
  color: #6b7280;
  border-color: #e5e7eb;
}
.logout:hover {
  background-color: #e5e7eb;
  color: #4b5563;
}

.mypage {
  background-color: transparent;
  color: #374151;
  padding-left: 0.8rem; /* アイコンがあるので少し調整 */
}
.mypage:hover {
  background-color: #f9fafb;
}
.mypage-icon {
  font-size: 1.2rem;
}
</style>

