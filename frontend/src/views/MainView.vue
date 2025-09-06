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

  /* ★★★ ここからが変更点です ★★★ */
  /* ヘッダーを固定するためのスタイル */
  position: sticky;
  /* メインヘッダー(約70px)の高さ分だけ下に配置 */
  top: 70px;
  /* スクロール時に下のコンテンツが透けないように背景色を指定 */
  background-color: #FFFAF5; /* App.vueの背景色と合わせます */
  /* 他の要素より手前に表示されるようにz-indexを指定 */
  z-index: 999;
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