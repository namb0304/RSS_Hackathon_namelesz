<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginWithEmail } from '../firebase' // 作成した関数をインポート

const email = ref('')
const password = ref('')
const router = useRouter()

const handleLogin = async () => {
  if (!email.value || !password.value) {
    alert('メールアドレスとパスワードを入力してください。')
    return
  }

  try {
    // Firebaseのログイン機能を呼び出す
    const userCredential = await loginWithEmail(email.value, password.value)
    console.log('ログインに成功しました！:', userCredential.user)

    
    // ホームページにリダイレクト
    router.push('/TimeLine')

  } catch (error) {
    console.error('ログインエラー:', error.code)
    
    // エラーコードに応じてアラートを出し分け
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        alert('メールアドレスまたはパスワードが間違っています。')
        break
      case 'auth/invalid-email':
        alert('メールアドレスの形式が正しくありません。')
        break
      default:
        alert('ログインに失敗しました。')
        break
    }
  }
}
</script>

<template>
  <div class="auth-container">
    <h1>ログイン</h1>
    <div class="form-group">
      <label for="email">メールアドレス</label>
      <input type="email" id="email" v-model="email" />
    </div>
    <div class="form-group">
      <label for="password">パスワード</label>
      <input type="password" id="password" v-model="password" />
    </div>
    <div class="button-group">
      <button @click="handleLogin">ログインする</button>
    </div>
  </div>
</template>

<style scoped>
/* RegisterView.vueと共通のスタイル */
.auth-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}
.form-group {
  margin-bottom: 1rem;
}
label {
  display: block;
  margin-bottom: 0.5rem;
}
input {
  width: 100%;
  padding: 0.5rem;
  font-size: 1rem;
  box-sizing: border-box; /* ← この行を追加 */
}
.button-group {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
}
button {
  padding: 0.75rem 1.5rem;
  border: none;
  background-color: #007bff; /* ログインボタンの色 */
  color: white;
  border-radius: 5px;
  cursor: pointer;
}
</style>