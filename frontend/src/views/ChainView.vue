<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getPostChain } from '../firebase'
import ThanksCard from '../components/ThanksCard.vue'

const route = useRoute()
const chainPosts = ref([])
const isLoading = ref(true)

onMounted(async () => {
  const postId = route.params.id
  try {
    const posts = await getPostChain(postId)
    if (posts) {
      chainPosts.value = posts
    }
  } catch (error) {
    console.error("チェーンの取得に失敗しました:", error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="chain-view-container">
    <div v-if="isLoading">読み込み中...</div>
    <div v-else-if="chainPosts.length > 0" class="layout">
      
      <div class="post-list-column">
        <h2>つながりの投稿一覧</h2>
        <div class="posts-list">
          <ThanksCard 
            v-for="post in chainPosts" 
            :key="post.id" 
            :post="post" 
          />
        </div>
      </div>

      <div class="tree-view-column">
        <h2>つながりのツリー</h2>
        <ul class="tree-root">
          <li v-for="post in chainPosts.filter(p => p.type === 'thanks')" :key="post.id">
            <span>{{ post.text.substring(0, 20) }}...</span>
            </li>
        </ul>
      </div>

    </div>
    <div v-else>投稿が見つかりませんでした。</div>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 2fr 1fr; /* 2:1の比率で分割 */
  gap: 2rem;
}
.post-list-column {
  max-width: 800px;
}
.tree-view-column {
  position: sticky; /* スクロールしても追従 */
  top: 90px;
  height: calc(100vh - 120px);
}
.posts-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
/* 簡単なツリー表示のスタイル */
.tree-root {
  list-style: none;
  padding-left: 1rem;
}
.tree-root li {
  padding: 0.5rem;
  border-left: 2px solid #fdeee0;
}
</style>