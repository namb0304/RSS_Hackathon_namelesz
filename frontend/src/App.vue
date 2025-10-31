<script setup>
import { computed, onMounted } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import TheHeader from './components/TheHeader.vue'
import PostFormModal from './components/PostFormModal.vue'
import { isPostFormModalOpen } from './store/modal'
import { user } from './store/user'
import { auth } from './firebaseService'
import { onAuthStateChanged } from 'firebase/auth'

const route = useRoute()

// ログイン後、かつメインのコンテンツページでのみ投稿ボタンを表示
const showFloatingButton = computed(() => {
  const allowedRoutes = ['main', 'recent', 'search', 'ranking', 'chain']
  return user.value && allowedRoutes.includes(route.name)
})

// アプリ起動時に認証状態を監視
onMounted(() => {
  onAuthStateChanged(auth, (authUser) => {
    user.value = authUser
  })
})
</script>

<template>
  <TheHeader />
  <main>
    <RouterView />
  </main>

  <PostFormModal v-if="isPostFormModalOpen" />

</template>

<style>
/* グローバルスタイル */
html,
body,
#app {
  margin: 0;
  padding: 0;
  height: 100%;
  background-color: #FFFAF5;
  font-family: 'Poppins', sans-serif;
}
</style>

<style scoped>
main {
  padding-top: 70px;
}

</style>
