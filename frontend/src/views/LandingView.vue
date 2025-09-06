<script setup>
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="page-container">
    <div class="landing-container">
      <!-- 背景に浮かぶ装飾用のシェイプ -->
      <div class="shape shape1"></div>
      <div class="shape shape2"></div>
      <div class="shape shape3"></div>

      <main class="content">
        <h1 class="title">Thanks</h1>
        <p class="subtitle">あなたの「ありがとう」が、次の誰かの優しさになる。</p>
        <div class="actions">
          <RouterLink to="/register" class="btn signup">無料で始める</RouterLink>
          <RouterLink to="/login" class="btn login">ログイン</RouterLink>
        </div>
      </main>
    </div>

    <footer class="footer">
      <p>&copy; 2025 Thanks. All Rights Reserved.</p>
      <div class="footer-links">
        <RouterLink to="/terms">利用規約</RouterLink>
        <span>|</span>
        <RouterLink to="/privacy">プライバシーポリシー</RouterLink>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* フォントをGoogle Fontsからインポート */
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@850&family=Poppins:wght@400;700&display=swap');

/* ★★★ ページ全体コンテナに背景と横スクロール防止を追加 ★★★ */
.page-container {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 80px); /* ヘッダーの高さを考慮 */
  background: linear-gradient(135deg, #FFF7F0 0%, #FFFAF5 100%);
  font-family: 'Poppins', sans-serif;
  overflow-x: hidden; /* ★ 横スクロールを防止します */
}

.landing-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-grow: 1; 
  padding: 2rem;
  text-align: center;
  position: relative;
  overflow: hidden; 
}

/* --- コンテンツ --- */
.content {
  max-width: 700px;
  z-index: 2;
}

.title {
  font-family: 'Nunito', sans-serif;
  font-size: 6.5rem;
  font-weight: 800;
  margin-bottom: 1rem;
  line-height: 1.2;
  background: linear-gradient(45deg, #FF8C42, #EE965F);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
}

.subtitle {
  font-size: 1.7rem;
  color: #6C6C6C;
  margin-bottom: 3.5rem;
  line-height: 1.8;
}

/* --- ボタン --- */
.actions {
  display: flex;
  justify-content: center;
  gap: 3rem;
}

.btn {
  padding: 1rem 2.5rem;
  border-radius: 50px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.3s ease;
  font-size: 1.2rem;
  border: 2px solid transparent;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}

.signup {
  background-color: #ee965fff;
  color: white;
}
.signup:hover {
  background-color: #ee965fff;
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

/* --- 背景の装飾 --- */
.shape {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(45deg, rgba(255, 140, 66, 0.1), rgba(255, 218, 185, 0.2));
  z-index: 1;
  animation: float 20s infinite ease-in-out;
}
.shape1 { width: 200px; height: 200px; top: 10%; left: 15%; animation-duration: 25s; }
.shape2 { width: 150px; height: 150px; bottom: 15%; right: 20%; animation-duration: 20s; animation-delay: 5s; }
.shape3 { width: 100px; height: 100px; top: 60%; left: 5%; animation-duration: 30s; animation-delay: 10s; }

@keyframes float {
  0% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-30px) rotate(180deg); }
  100% { transform: translateY(0) rotate(360deg); }
}

/* --- フッターのスタイル --- */
.footer {
  width: 100%;
  padding: 2.5rem;
  background-color: transparent; /* 背景を透過させる */
  text-align: center;
  color: #bcaaa4; /* 背景に馴染む、少し濃いめの色に変更 */
  font-size: 0.9rem;
}

.footer p {
  margin: 0;
  margin-bottom: 0.75rem;
}

.footer-links {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.footer-links a {
  color: #bcaaa4; /* テキストと同じ色に */
  text-decoration: none;
  transition: color 0.3s ease;
  font-weight: bold; /* 少しだけ強調 */
}

.footer-links a:hover {
  color: #FF8C42; /* メインのオレンジ色に */
}
</style>
