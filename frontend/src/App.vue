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

  <button
    v-if="showFloatingButton"
    @click="isPostFormModalOpen = true"
    class="floating-post-button"
  >
    +
  </button>
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

.floating-post-button {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #ee965fff;
  color: white;
  border: none;
  font-size: 2.7rem;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(93, 90, 90, 1);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s;
  z-index: 900;
}
.floating-post-button:hover {
  filter: brightness(1.1);
  transform: scale(1.05);
}
</style>
