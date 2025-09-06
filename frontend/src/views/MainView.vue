<script setup>
import { RouterView, RouterLink } from 'vue-router'
</script>

<template>
  <div class="main-container">
    <nav class="tabs">
    <RouterLink to="/main/recent" class="tab-link">最新の投稿</RouterLink>
    <RouterLink to="/main/search" class="tab-link">検索</RouterLink>
    <RouterLink to="/main/ranking" class="tab-link">ランキング</RouterLink>
    </nav>
    <div class="content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
/* スタイルは変更なし */
.tabs {
  display: flex;
  border-bottom: 1px solid #eee;
  margin-bottom: 2rem;
}
.tab-link {
  padding: 1rem 1.5rem;
  text-decoration: none;
  color: #888;
  font-weight: bold;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
}
.tab-link:hover {
  color: #333;
}
.router-link-exact-active {
  color: #dc8144ff;
  border-bottom-color: #dc8144ff;
}
</style>