<script setup>
import { ref, onMounted } from 'vue'
import ThanksCard from '../components/ThanksCard.vue'
// ★★★ 作成したモーダルを読み込む ★★★
import ThanksModal from '../components/ThanksModal.vue'
import { getThanksPosts } from '../firebase.js'

const posts = ref([])
// ★★★ モーダルの表示状態を管理する変数 ★★★
const isModalOpen = ref(false)

// 投稿データを取得する処理を関数にまとめる
const fetchPosts = async () => {
  posts.value = await getThanksPosts()
}

// ページが表示されたら、まずデータを取得
onMounted(fetchPosts)

// ★★★ モーダルが正常に閉じられた後の処理 ★★★
const handleModalClose = () => {
  isModalOpen.value = false
  // 投稿後に最新のデータを再取得して、タイムラインを更新
  fetchPosts()
}
</script>

<template>
  <main>
    <div class="header">
      <h1>Thanks タイムライン</h1>
      <button @click="isModalOpen = true" class="btn-post">投稿する</button>
    </div>
    
    <div class="timeline">
      <ThanksCard 
        v-for="post in posts" 
        :key="post.id" 
        :post="post" 
      />
    </div>

    <ThanksModal 
      v-if="isModalOpen" 
      @close="handleModalClose" 
    />
  </main>
</template>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.btn-post {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background-color: #42b883;
  color: white;
  cursor: pointer;
  font-size: 16px;
}
.timeline {
  margin-top: 20px;
}
</style>