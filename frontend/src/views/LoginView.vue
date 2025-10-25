<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router' // ★ RouterLink をインポート
import { loginWithEmail } from '../firebaseService'

const email = ref('')
const password = ref('')
const router = useRouter()

const handleLogin = async () => {
  if (!email.value || !password.value) {
    alert('メールアドレスとパスワードを入力してください。')
    return
  }
  try {
    const userCredential = await loginWithEmail(email.value, password.value)
    console.log('ログインに成功しました！:', userCredential.user)
    router.push('/main')
  } catch (error) {
    console.error('ログインエラー:', error.code)
    switch (error.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential': // ★ 新しいFirebaseバージョン用のエラーコードを追加
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
  <div class="auth-wrapper">
    <div class="auth-card">
      <h2 class="card-title">おかえりなさい</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input type="email" id="email" v-model="email" placeholder="email@example.com" required />
        </div>
        <div class="form-group">
          <label for="password">パスワード</label>
          <input type="password" id="password" v-model="password" placeholder="パスワード" required />
        </div>
        <button type="submit" class="btn-primary">ログイン</button>
      </form>
      <p class="register-prompt">
        アカウントをお持ちでないですか？ <RouterLink to="/register" class="register-link">新規登録</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
/* RegisterView.vueと共通の温かみのあるデザイン */
.auth-wrapper {
  min-height: 100vh;
  background-color: #fcf8f5;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem 1rem;
  box-sizing: border-box;
}

.auth-card {
  width: 100%;
  max-width: 450px;
  background-color: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 3rem 2.5rem;
}

.card-title {
  text-align: center;
  margin-bottom: 2.5rem;
  color: #ee965fff;
  font-size: 2rem;
  font-weight: bold;
}

.form-group {
  margin-bottom: 1.8rem;
}

label {
  display: block;
  margin-bottom: 0.6rem;
  color: #555;
  font-weight: bold;
  font-size: 0.95rem;
}

input {
  width: 100%;
  padding: 1rem 1.2rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  outline: none;
  border-color: #f7c9aa;
  box-shadow: 0 0 0 3px rgba(238, 150, 95, 0.2);
}

.btn-primary {
  width: 100%;
  padding: 1.1rem;
  background-color: #ee965fff;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 2rem;
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-primary:hover {
  background-color: #e57d3c;
  transform: translateY(-2px);
}

.register-prompt {
  text-align: center;
  margin-top: 2.5rem;
  color: #777;
  font-size: 0.95rem;
}

.register-link {
  color: #ee965fff;
  text-decoration: none;
  font-weight: bold;
  transition: color 0.2s ease;
}

.register-link:hover {
  color: #e57d3c;
  text-decoration: underline;
}
</style>
