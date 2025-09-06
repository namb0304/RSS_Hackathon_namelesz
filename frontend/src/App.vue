<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import TheHeader from './components/TheHeader.vue'
import { auth } from './firebase' // firebase.jsからauthをインポート
import { onAuthStateChanged } from 'firebase/auth' // onAuthStateChangedをインポート

// ログインしているユーザーの情報を保持するリアクティブな変数
import { user } from './store/user'

// アプリがマウントされたら、Firebaseの認証状態の監視を開始
onMounted(() => {
  onAuthStateChanged(auth, (authUser) => {
    // ログインしていればauthUserオブジェクトが、していなければnullが入る
    user.value = authUser
  })
})
</script>

<template>
  <TheHeader />
  <main>
    <RouterView />
  </main>
</template>

<style scoped>
main {
  padding: 2rem;
}
</style>