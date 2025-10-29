<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { registerWithEmail, createUserProfile } from '../firebaseService'
import { user } from '../store/user'

const username = ref('')
const email = ref('')
const password = ref('')
const router = useRouter()

const handleRegister = async () => {
  if (!username.value || !email.value || password.value.length < 6) {
    alert('ユーザー名、メールアドレス、6文字以上のパスワードをすべて入力してください。')
    return
  }

  try {
    const userCredential = await registerWithEmail(email.value, password.value)

    await createUserProfile(userCredential.user, {
      displayName: username.value
    })

    user.value = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: username.value,
    }

    router.push('/')

  } catch (error) {
    console.error('登録エラー:', error.code)

    switch (error.code) {
      case 'auth/invalid-email':
        alert('メールアドレスの形式が正しくありません。')
        break
      case 'auth/weak-password':
        alert('パスワードは6文字以上で設定してください。')
        break
      case 'auth/email-already-in-use':
        alert('このメールアドレスは既に使用されています。')
        break
      default:
        alert('登録に失敗しました。時間をおいて再度お試しください。')
        break
    }
  }
}
</script>

<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <h2 class="card-title">✨ 新規登録 ✨</h2>
      <form @submit.prevent="handleRegister">

        <div class="form-group">
          <label for="username">ユーザー名</label>
          <input type="text" id="username" v-model="username" placeholder="Thanks 太郎" required />
        </div>

        <div class="form-group">
          <label for="email">メールアドレス</label>
          <input type="email" id="email" v-model="email" placeholder="email@example.com" required />
        </div>
        <div class="form-group">
          <label for="password">パスワード</label>
          <input type="password" id="password" v-model="password" placeholder="6文字以上" required />
        </div>
        <button type="submit" class="btn-primary">登録する</button>
      </form>
      <p class="login-prompt">
        アカウントをお持ちですか？ <RouterLink to="/login" class="login-link">ログイン</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-wrapper {
  min-height: 100vh; /* 全画面をカバー */
  background-color: #fcf8f5; /* 柔らかいクリーム色の背景 */
  display: flex;
  justify-content: center;
  align-items: center; /* 垂直方向も中央揃え */
  padding: 2rem 1rem;
  box-sizing: border-box;
}

.auth-card {
  width: 100%;
  max-width: 450px; /* 少し大きめに */
  background-color: #fff;
  border-radius: 16px; /* 角をさらに丸く */
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08); /* 影を強調 */
  padding: 3rem 2.5rem; /* 余白を広げる */
}

.card-title {
  text-align: center;
  margin-bottom: 2.5rem;
  color: #ee965fff; /* テーマカラー */
  font-size: 2rem;
  font-weight: bold;
}

.form-group {
  margin-bottom: 1.8rem; /* グループ間の余白 */
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
  padding: 1rem 1.2rem; /* 入力欄のパディングを増やす */
  border: 1px solid #e0e0e0;
  border-radius: 8px; /* 入力欄も角丸に */
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

input:focus {
  outline: none;
  border-color: #f7c9aa; /* フォーカス時にテーマカラーの薄い色 */
  box-shadow: 0 0 0 3px rgba(238, 150, 95, 0.2); /* 影で強調 */
}

.btn-primary {
  width: 100%;
  padding: 1.1rem; /* ボタンのパディングを増やす */
  background-color: #ee965fff; /* テーマカラー */
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 2rem; /* 上の要素との余白 */
  transition: background-color 0.2s ease, transform 0.1s ease;
}

.btn-primary:hover {
  background-color: #e57d3c; /* ホバー時に少し濃く */
  transform: translateY(-2px); /* 少し浮き上がる効果 */
}

.login-prompt {
  text-align: center;
  margin-top: 2.5rem; /* 上の要素との余白 */
  color: #777;
  font-size: 0.95rem;
}

.login-link {
  color: #ee965fff; /* テーマカラー */
  text-decoration: none;
  font-weight: bold;
  transition: color 0.2s ease;
}

.login-link:hover {
  color: #e57d3c; /* ホバー時に少し濃く */
  text-decoration: underline;
}
</style>
