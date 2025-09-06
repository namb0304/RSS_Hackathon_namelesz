<script setup>
import { isPostFormModalOpen, replyToPost } from '../store/modal'
import PostForm from './PostForm.vue'

// 投稿が成功したらモーダルを閉じる
const handlePostSuccess = () => {
  isPostFormModalOpen.value = false
  replyToPost.value = null // 返信先情報もリセット
}

// モーダルを閉じる共通の関数
const closeModal = () => {
  isPostFormModalOpen.value = false
  replyToPost.value = null
}
</script>

<template>
  <div class="modal-overlay" @click.self="closeModal">
    <div class="modal-content">
      <button @click="closeModal" class="close-button">&times;</button>
      
      <div v-if="replyToPost" class="reply-context">
        <p class="reply-context-text">"{{ replyToPost.text }}"</p>
        <p v-if="replyToPost.feeling" class="reply-context-feeling">
          - {{ replyToPost.feeling }}
        </p>
      </div>

      <PostForm @post-success="handlePostSuccess" />
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed; /* 画面全体に固定 */
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6); /* 半透明の黒い背景 */
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000; /* ヘッダーよりも手前に表示 */
}

.modal-content {
  position: relative;
  width: 90%;
  max-width: 500px;
  background-color: #f9f9f9;
  border-radius: 12px;
  box-shadow: 0 5px 25px rgba(0,0,0,0.2);
  padding: 1rem;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 15px;
  background: none;
  border: none;
  font-size: 2rem;
  color: #aaa;
  cursor: pointer;
}

.reply-context {
  background-color: #f0f0f0;
  border-radius: 8px;
  padding: 1rem;
  margin: 1.5rem 1.5rem 0;
  border-left: 4px solid #ee965fff;
}
.reply-context-text {
  margin: 0;
  color: #555;
  font-size: 0.95rem;
}
.reply-context-feeling {
  margin: 0.5rem 0 0;
  text-align: right;
  font-style: italic;
  color: #777;
  font-size: 0.9rem;
}

.modal-content :deep(.post-form) {
  box-shadow: none;
  padding: 2rem 1.5rem 1.5rem;
  margin-bottom: 0;
}
</style>