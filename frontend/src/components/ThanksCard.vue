<script setup>
defineProps({
  post: Object
})
</script>

<template>
  <RouterLink :to="{ name: 'chain', params: { id: post.id } }" class="card-link">
  <div class="card">
      <p class="author">
        投稿者: {{ post.isAnonymous ? '匿名さん' : post.author }}
      </p>
      <p class="text">
        {{ post.text }}
      </p>
      <div class="actions">
        <span>🤝 {{ post.actionCount }}人がバトンを繋ぎました</span>
        <span>❤️ {{ post.likeCount }}人が共感</span>
      </div>
    </div>
  </RouterLink>
  </template>

<style scoped>
/* ★★★ ここから追加 ★★★ */
.card-link {
  text-decoration: none; /* リンクの下線を消す */
  color: inherit; /* 文字色を親要素に合わせる */
}
/* ★★★ ここまで追加 ★★★ */

.card {
  border: 1px solid #ddd;
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  background-color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  /* ★★★ ホバー効果を追加 ★★★ */
  transition: transform 0.2s ease-in-out;
}
.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}
/* ★★★ ここまで追加 ★★★ */

.author {
  font-size: 14px;
  font-weight: bold;
  color: #555;
}
.text {
  margin: 12px 0;
  font-size: 16px;
  line-height: 1.6;
}
.actions {
  display: flex;
  gap: 16px;
  font-size: 14px;
  color: #888;
}
</style>