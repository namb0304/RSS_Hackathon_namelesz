<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { subscribeToAllPosts } from '../firebase'
import ThanksCard from '../components/ThanksCard.vue'
// ★★★ 変更点: 新しいActionCardをインポート ★★★
import ActionCard from '../components/ActionCard.vue' 
import { isPostFormModalOpen } from '../store/modal'

const posts = ref([])
const isLoading = ref(true)
let unsubscribe = null

onMounted(() => {
  // ★★★ 変更点: .filterを削除し、全ての投稿(ThanksとAction)を受け取る ★★★
  unsubscribe = subscribeToAllPosts((allPosts) => {
    posts.value = allPosts
    isLoading.value = false
  })
})

onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})

// 投稿作成ボタンのクリックハンドラー
const handleNewPostClick = () => {
  isPostFormModalOpen.value = true
}
</script>

<template>
  <div class="page-container">
    <div class="timeline-container">
      <div v-if="isLoading" class="loading-message">
        <p>読み込み中...</p>
      </div>

      <div v-else-if="posts.length > 0" class="posts-list">
        <div v-for="post in posts" :key="post.id">
          <ThanksCard v-if="post.type === 'thanks'" :post="post" />
          <ActionCard v-else-if="post.type === 'action'" :post="post" />
        </div>
      </div>

      <div v-else class="empty-message">
        <p>まだ感謝の投稿がありません。</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* スタイル部分は変更ありません */
.page-container {
  background-color: #FEFAF6;
  min-height: 100vh;
  padding-bottom: 80px;
}
.timeline-container {
  padding: 10px;
  max-width: 1200px; 
  margin: 0 auto;
}
.posts-list {
  display: grid;
  gap: 15px;
}
@media (min-width: 768px) {
  .posts-list {
    grid-template-columns: 1fr 1fr;
  }
}
.loading-message,
.empty-message {
  text-align: center;
  color: #666;
  margin-top: 3rem;
  font-size: 1.1rem;
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  grid-column: 1 / -1;
}
</style>