<script setup>
import { ref } from 'vue'
import { searchPosts } from '../firebase'
import ThanksCard from '../components/ThanksCard.vue'
import ActionCard from '../components/ActionCard.vue' // // リアクティブな状態変数
const searchQuery = ref('')      // 検索フォームの入力値
const searchType = ref('tag')    // 'tag' or 'content' の検索タイプ
const results = ref([])          // 検索結果を格納する配列
const isLoading = ref(false)     // ローディング状態
const hasSearched = ref(false)   // 一度でも検索したかを判定するフラグ

/**
 * 検索を実行する関数
 */
const performSearch = async () => {
  // 入力値が空なら何もしない
  if (!searchQuery.value.trim()) {
    return
  }
  
  isLoading.value = true
  hasSearched.value = true
  results.value = [] // 新しい検索の前に結果をリセット

  try {
    const searchResultPosts = await searchPosts(searchQuery.value, searchType.value)
    // Thanks投稿を優先的に表示するためソートする（任意）
    results.value = searchResultPosts.sort((a, b) => {
      if (a.type === 'thanks' && b.type !== 'thanks') return -1;
      if (a.type !== 'thanks' && b.type === 'thanks') return 1;
      return 0;
    });
  } catch (error) {
    console.error('検索に失敗しました:', error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="page-container">
    <h2>投稿を検索</h2>
    
    <form @submit.prevent="performSearch" class="search-form">
      <div class="search-input-wrapper">
        <input 
          type="text" 
          v-model="searchQuery"
          placeholder="タグやキーワードを入力"
          class="search-input"
        />
        <button type="submit" class="search-button">検索</button>
      </div>

      <div class="search-options">
        <label>
          <input type="radio" v-model="searchType" value="tag" name="searchType" />
          タグで検索
        </label>
        <label>
          <input type="radio" v-model="searchType" value="content" name="searchType" />
          内容で検索
        </label>
      </div>
    </form>
    
    <div class="results-area">
      <div v-if="isLoading" class="message">
        <p>検索中...</p>
      </div>
      
      <div v-else-if="hasSearched && results.length > 0" class="posts-list">
        <p class="search-info">「{{ searchQuery }}」の検索結果: {{ results.length }}件</p>
        
        <template v-for="post in results" :key="post.id">
          <ThanksCard v-if="post.type === 'thanks'" :post="post" />
          <ActionCard v-else-if="post.type === 'action'" :post="post" />
        </template>
      </div>
      <div v-else-if="hasSearched && results.length === 0" class="message">
        <p>「{{ searchQuery }}」に一致する投稿は見つかりませんでした。</p>
      </div>

      <div v-else class="message initial-message">
        <p>検索したいタグやキーワードを入力してください。</p>
      </div>
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
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  font-size: 2rem;
  color: #555;
}

.search-form {
  margin-bottom: 2.5rem;
}

.search-input-wrapper {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search-input {
  flex-grow: 1;
  padding: 0.8rem 1rem;
  font-size: 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  transition: border-color 0.2s;
}
.search-input:focus {
  outline: none;
  border-color: #dc8144ff;
}

.search-button {
  padding: 0.8rem 1.5rem;
  font-size: 1rem;
  font-weight: bold;
  color: #fff;
  background-color: #dc8144ff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}
.search-button:hover {
  background-color: #d07538;
}

.search-options {
  display: flex;
  justify-content: center;
  gap: 2rem;
  color: #666;
}
.search-options label {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.results-area .message {
  text-align: center;
  color: #666;
  margin-top: 3rem;
  font-size: 1.1rem;
}
.results-area .initial-message {
  padding: 3rem 1rem;
  background-color: #fafafa;
  border-radius: 12px;
}

.search-info {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #888;
  font-size: 0.9rem;
}

.posts-list {
  display: grid;
  gap: 1.5rem;
}
</style>