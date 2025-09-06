<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
// firebase.jsから、ユーザー登録とプロフィール作成の関数をインポート
import { registerWithEmail, createUserProfile } from '../firebase'
// ★★★ アプリ全体のユーザー情報を管理する`user`をインポート ★★★
import { user } from '../store/user'

// フォームの入力内容をVueに伝えるための変数
const username = ref('')
const email = ref('')
const password = ref('')
const router = useRouter()

// 「登録する」ボタンが押されたときの処理
const handleRegister = async () => {
  // フロント側での簡易チェック
  if (!username.value || !email.value || password.value.length < 6) {
    alert('ユーザー名、メールアドレス、6文字以上のパスワードをすべて入力してください。')
    return
  }

  try {
    // 1. Firebase Authにメールアドレスとパスワードでユーザーを作成
    const userCredential = await registerWithEmail(email.value, password.value)
    
    // 2. Firestoreにユーザーのプロフィール（名前など）を保存
    await createUserProfile(userCredential.user, {
      displayName: username.value
    })

    // ★★★ 登録直後に、ユーザー情報を手動で更新 ★★★
    // これにより、情報管理人が古い情報を見る前に、正しい名前を教えてあげる
    user.value = {
      uid: userCredential.user.uid,
      email: userCredential.user.email,
      displayName: username.value,
    }

    // 3. 登録成功後、タイムラインページへ移動
    router.push('/main')

  } catch (error) {
    console.error('登録エラー:', error.code)
    
    // エラーの種類に応じて、分かりやすいメッセージを表示
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
    <div class="auth-form">
      <h2>新規登録</h2>
      <!-- formのsubmitイベントでhandleRegisterを呼び出す -->
      <form @submit.prevent="handleRegister">
        
        <!-- ユーザー名入力欄を追加 -->
        <div class="form-group">
          <label for="username">ユーザー名</label>
          <input type="text" id="username" v-model="username" placeholder="Thanks 太郎" />
        </div>

        <div class="form-group">
          <label for="email">メールアドレス</label>
          <!-- v-modelでスクリプトの変数と連携 -->
          <input type="email" id="email" v-model="email" placeholder="email@example.com" />
        </div>
        <div class="form-group">
          <label for="password">パスワード</label>
          <!-- v-modelでスクリプトの変数と連携 -->
          <input type="password" id="password" v-model="password" placeholder="6文字以上" />
        </div>
        <button type="submit" class="btn-submit">登録する</button>
      </form>
      <p class="link-text">
        アカウントをお持ちですか？ <RouterLink to="/login">ログイン</RouterLink>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  padding-top: 4rem;
}
.auth-form {
  width: 100%;
  max-width: 400px;
  padding: 2rem;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fff;
}
h2 {
  text-align: center;
  margin-bottom: 1.5rem;
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
  padding: 0.8rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box; /* ← この行を追加 */
}
.btn-submit {
  width: 100%;
  padding: 0.8rem;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
}
.link-text {
  text-align: center;
  margin-top: 1.5rem;
}
</style>

