<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { getThanksPosts, subscribeToAllPosts } from '../firebase'
import ThanksCard from '../components/ThanksCard.vue'
import { isPostFormModalOpen } from '../store/modal'

const posts = ref([])
const isLoading = ref(true)
let unsubscribe = null

onMounted(() => {
  // subscribeToAllPosts の代わりに、Thanksタイプの投稿だけをフィルタリングする
  unsubscribe = subscribeToAllPosts((allPosts) => {
    // Thanksタイプの投稿だけをフィルタリング
    posts.value = allPosts.filter(post => post.type === 'thanks')
    isLoading.value = false
  })

  // または、直接Thanksのみを取得する関数を使用することもできます
  // この場合はリアルタイム更新ではなくなります
  /*
  const loadPosts = async () => {
    try {
      posts.value = await getThanksPosts()
    } catch (error) {
      console.error("投稿の取得に失敗しました:", error)
    } finally {
      isLoading.value = false
    }
  }
  loadPosts()
  */
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
    <header class="app-header">
      <div class="header-left">ThanksChain</div>
      <div class="header-right">
        <span class="icon">🔍</span>
        <span class="icon">🔔</span>
        <span class="icon">👤</span>
      </div>
    </header>

    <div class="timeline-container">
      <div v-if="isLoading" class="loading-message">
        <p>読み込み中...</p>
      </div>

      <div v-else-if="posts.length > 0" class="posts-list">
        <ThanksCard 
          v-for="post in posts" 
          :key="post.id" 
          :post="post" 
        />
      </div>

      <div v-else class="empty-message">
        <p>まだ感謝の投稿がありません。</p>
      </div>
    </div>

    <button class="fab-button" @click="handleNewPostClick">+</button>
  </div>
</template>

<style scoped>
/* ベーススタイル */
.page-container {
  background-color: #f0f2f5;
  min-height: 100vh;
  padding-bottom: 80px;
}

/* ヘッダースタイル */
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-left {
  font-weight: bold;
  font-size: 1.2em;
  color: #FF8C42;
}

.header-right {
  display: flex;
  align-items: center;
}

.icon {
  margin-left: 15px;
  font-size: 1.1em;
  cursor: pointer;
}

/* タイムラインコンテナ */
.timeline-container {
  padding: 10px;
  max-width: 600px;
  margin: 0 auto;
}

/* 投稿リスト */
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* メッセージスタイル */
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
}

/* FABボタン */
.fab-button {
  position: fixed;
  bottom: 25px;
  right: 25px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #FF8C42;
  color: white;
  font-size: 1.8em;
  border: none;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  z-index: 1001;
}

.fab-button:hover {
  background-color: #EE965F;
  transform: scale(1.05);
}
</style>