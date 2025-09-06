<script setup>
import { ref, onMounted, onUnmounted } from 'vue' // onUnmounted を追加
import { subscribeToAllPosts } from '../firebase' // 新しい関数をインポート
import ThanksCard from '../components/ThanksCard.vue'
import PostForm from '../components/PostForm.vue'

const posts = ref([])
const isLoading = ref(true)
let unsubscribe = null // 購読停止用の変数を準備

// onMountedはデータの購読を開始する役割に変わる
onMounted(() => {
  unsubscribe = subscribeToAllPosts((updatedPosts) => {
    posts.value = updatedPosts
    isLoading.value = false
  })
})

// ページを離れる時に、データベースの監視を停止する
onUnmounted(() => {
  if (unsubscribe) {
    unsubscribe()
  }
})
</script>

<template>
  <div class="page-container">
    <h2>最新の投稿</h2>
    
    <div v-if="isLoading" class="message">
      <p>読み込み中...</p>
    </div>

    <div v-else-if="posts.length > 0" class="posts-list">
      <ThanksCard 
        v-for="post in posts" 
        :key="post.id" 
        :post="post" 
      />
    </div>

    <div v-else class="message">
      <p>まだ投稿がありません。</p>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}

h2 {
  text-align: center;
  margin-bottom: 2rem;
  color: #333;
  font-size: 2rem;
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  background: linear-gradient(45deg, #FF8C42, #EE965F);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
}

.posts-list {
  display: grid;
  gap: 1.5rem;
}

.message {
  text-align: center;
  color: #666;
  margin-top: 3rem;
  font-size: 1.1rem;
}
</style>