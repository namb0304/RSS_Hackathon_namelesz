<template>
  <div class="landing-container">
    <main class="content">
      <h1 class="title">Thanks</h1>
      <p class="subtitle">あなたの「ありがとう」が、次の誰かの優しさになる。</p>
      <div class="actions">
        <RouterLink to="/register" class="btn signup">無料で始める</RouterLink>
        <RouterLink to="/login" class="btn login">ログイン</RouterLink>
      </div>
    </main>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
</script>

<style scoped>
.landing-container {
  display: flex;
  justify-content: center;
  align-items: center;
  /* ヘッダーの高さを考慮して、画面の残りの部分を埋める */
  min-height: calc(100vh - 80px); 
  text-align: center;
  padding: 1rem;
}
.content {
  max-width: 600px;
}
.title {
  font-size: 4.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #333;
}
.subtitle {
  font-size: 1.3rem;
  color: #555;
  margin-bottom: 3rem;
}
.actions {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}
.btn {
  padding: 0.8rem 2rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: bold;
  transition: all 0.2s ease-in-out;
  font-size: 1.1rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 8px rgba(0,0,0,0.15);
}
.signup {
  background-color: #28a745;
  color: white;
}
.login {
  background-color: white;
  color: #007bff;
  border: 2px solid #007bff;
}
</style>

