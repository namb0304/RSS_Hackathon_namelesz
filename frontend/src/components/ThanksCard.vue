<script setup>
import { defineProps, ref, onMounted } from 'vue'
import { getUserProfile } from '../firebase'
import { isPostFormModalOpen, replyToPost } from '../store/modal'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const authorName = ref('匿名ユーザー')

onMounted(async () => {
  if (props.post.isAnonymous) return
  const profile = await getUserProfile(props.post.authorId)
  if (profile && profile.displayName) {
    authorName.value = profile.displayName
  } else {
    authorName.value = '名前未設定のユーザー'
  }
})

const formatTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '---';
  const date = timestamp.toDate();
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Intl.DateTimeFormat('ja-JP', options).format(date);
};

// 「続ける」ボタンが押された時の処理
const handleReplyClick = () => {
  // どの投稿への返信かをストアに保存
  replyToPost.value = props.post
  // モーダルを開く
  isPostFormModalOpen.value = true
}
</script>

<template>
  <div class="thanks-card">
    <RouterLink :to="{ name: 'chain', params: { id: post.id } }" class="card-link">
      <div class="thanks-card">
        </div>
    </RouterLink>
    <div class="chain-connector">
      <div class="line top-line" v-if="props.post.type === 'action'"></div>
      <div class="dot"></div>
      <div class="line bottom-line" v-if="props.post.actionCount > 0 || props.post.type === 'action'"></div>
      <div class="line end-line" v-else></div>
    </div>

    <div class="card-content">
      <div class="card-header">
        <span class="post-type" :class="props.post.type">{{ props.post.type === 'thanks' ? 'Thanks' : 'Next Action' }}</span>
        <span class="timestamp">{{ formatTimestamp(props.post.timestamp) }}</span>
      </div>

      <p class="post-text">{{ props.post.text }}</p>

      <p v-if="props.post.feeling" class="post-feeling">
        "{{ props.post.feeling }}"
      </p>

      <div v-if="props.post.tags && props.post.tags.length > 0" class="post-tags">
        <span v-for="(tag, index) in props.post.tags" :key="index" class="tag">
          #{{ tag }}
        </span>
      </div>

      <div class="card-footer">
        <span class="author">{{ authorName }}</span>
          <div class="actions">
            <span class="chain-info" title="チェーンの階層">
              Lv. {{ props.post.depth }}
            </span>
            <span class="chain-info" title="この投稿からの枝分かれ数">
              🌿 {{ props.post.actionCount }}
            </span>
            <span class="likes">❤️ {{ props.post.likeCount }}</span>
            <button @click="handleReplyClick" class="reply-button">
              続ける
            </button>
          </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.thanks-card {
  display: flex;
  gap: 1.5rem;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);
  padding: 1.8rem;
  transition: transform 0.2s ease-in-out;
  overflow: hidden;
  border: 1px solid #fdeee0; /* ← 変更点: 枠線を追加 */
}

.thanks-card:hover {
  transform: translateY(-5px);
}

/* --- 左側のチェーンデザイン --- */
.chain-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 6px;
}
.dot {
  width: 10px;       /* ← 変更点: 少し大きくする */
  height: 10px;      /* ← 変更点: 少し大きくする */
  background-color: #f7c9aa;
  border-radius: 50%;
  flex-shrink: 0;
  
  /* ↓ 変更点: ドーナツ型にするためのスタイル */
  border: 5px solid #fff; /* 内側の白い枠 */
  outline: 2px solid #f7c9aa; /* 外側のオレンジ色の枠 */
  outline-offset: -2px; /* outlineが内側に入るように調整 */
  box-shadow: 0 0 0 1px #f7c9aa; /* 微妙な境界線 */
}
.line {
  width: 2px;
  background-color: #fbe5d6;
}
.top-line {
  height: 6rem;
  margin-bottom: 0.5rem;
}
.bottom-line {
  flex-grow: 1;
  min-height: 4rem;
  margin-top: 0.5rem;
}

/* ↓ 変更点: チェーン終端用の短い線のスタイルを追加 */
.end-line {
  height: 12rem;
  margin-top: 0.5rem;
}

/* --- 右側のコンテンツ --- */
.card-content {
  flex-grow: 1;
  min-width: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.card-link {
  text-decoration: none; /* リンクの下線を消す */
  color: inherit; /* 親要素の色を継承 */
}

.post-type {
  font-weight: bold;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  color: white;
  font-size: 0.8rem;
}
.post-type.thanks { background-color: #ee965fff; }
.post-type.action { background-color: #6c757d; }
.timestamp { font-size: 0.85rem; color: #a0a0a0; }

.post-text {
  font-size: 1.1rem;
  line-height: 1.7;
  color: #333;
  margin-top: 0;
  margin-bottom: 1rem;
}
.post-feeling {
  font-style: italic;
  color: #555;
  margin: 1.5rem 0;
  border-left: 3px solid #fdeee0;
  padding-left: 1rem;
  font-size: 1rem;
}
.post-tags {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tag {
  background-color: #f7f7f7;
  color: #777;
  padding: 0.3rem 0.7rem;
  border-radius: 15px;
  font-size: 0.8rem;
}

.chain-info {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: #aaa;
  background-color: #f7f7f7;
  padding: 0.2rem 0.6rem;
  border-radius: 15px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}
.author { font-weight: bold; color: #666; font-size: 0.9rem; }
.actions { display: flex; gap: 1rem; align-items: center; }
.likes, .actions-count { display: flex; align-items: center; gap: 0.3rem; font-weight: bold; font-size: 0.9rem; color: #777; }

.reply-button {
  background-color: transparent;
  color: #ee965f;
  border: 1px solid #ee965f;
  border-radius: 20px;
  padding: 0.3rem 0.8rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.reply-button:hover { background-color: #ee965f; color: white; }
</style>

