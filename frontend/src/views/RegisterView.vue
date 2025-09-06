<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { registerWithEmail, createUserProfile } from '../firebase'

const email = ref('')
const password = ref('')
const router = useRouter()

const handleRegister = async () => {
  // フロント側での簡易チェック
  if (!email.value || password.value.length < 6) {
    alert('メールアドレスと6文字以上のパスワードを入力してください。')
    return
  }

  try {
    const userCredential = await registerWithEmail(email.value, password.value)
    console.log('新規登録に成功しました！:', userCredential.user)

    await createUserProfile(userCredential.user, {
      displayName: '新しいユーザー'
    })

    router.push('/')

  } catch (error) {
    console.error('登録エラー:', error.code)
    
    // --- ↓ここからがエラーの出し分け処理 ---
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
  <div class="auth-container">
    <h1>新規登録</h1>
    <div class="form-group">
      <label for="email">メールアドレス</label>
      <input type="email" id="email" v-model="email" placeholder="email@example.com" />
    </div>
    <div class="form-group">
      <label for="password">パスワード</label>
      <input type="password" id="password" v-model="password" placeholder="6文字以上" />
    </div>
    <div class="button-group">
      <button @click="handleRegister">登録する</button>
    </div>
  </div>
</template>

<style scoped>
/* LoginView.vueと共通のスタイル */
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
}
.button-group {
  display: flex;
  justify-content: center; /* ボタンを中央に配置 */
  margin-top: 1.5rem;
}
button {
  padding: 0.75rem 1.5rem;
  border: none;
  background-color: #28a745; /* 登録ボタンの色 */
  color: white;
  border-radius: 5px;
  cursor: pointer;
}
</style>