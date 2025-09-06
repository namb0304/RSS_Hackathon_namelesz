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

  </div>
</template>

<style scoped>
/* ベーススタイル */
.page-container {
  background-color: #f0f2f5;
  min-height: 100vh;
  padding-bottom: 80px;
}

/* タイムラインコンテナ */
.timeline-container {
  padding: 10px;
  /* ★ 変更：PC表示時に2列表示に対応するため、横幅を広げます */
  max-width: 1200px; 
  margin: 0 auto;
}

/* 投稿リスト */
.posts-list {
  /* ★ 変更：FlexboxからGridレイアウトに変更します */
  display: grid;
  gap: 15px; /* カード間の隙間 */
}

/* ★★★ ここからが新しいスタイルです ★★★ */
/* 画面幅が768px以上のとき（タブレットやPC）に適用されます */
@media (min-width: 768px) {
  .posts-list {
    /* 2つのカラムを作成します。frは利用可能なスペースの割合を示します */
    grid-template-columns: 1fr 1fr;
  }
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
  /* ★ 追加：2列表示でも中央に配置されるように調整 */
  grid-column: 1 / -1;
}

</style>
