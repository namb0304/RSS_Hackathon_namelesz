<script setup>
import { defineProps, ref, onMounted, computed } from 'vue'
import { getUserProfile } from '../firebase'
import { isPostFormModalOpen, replyToPost } from '../store/modal'
import { RouterLink } from 'vue-router'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const authorName = ref('匿名ユーザー')
const authorAvatar = ref(null)

onMounted(async () => {
  if (props.post.isAnonymous) return
  
  try {
    const profile = await getUserProfile(props.post.authorId)
    if (profile) {
      authorName.value = profile.displayName || '名前未設定のユーザー'
      authorAvatar.value = profile.photoURL || null
    }
  } catch (error) {
    console.error("ユーザープロフィールの取得に失敗:", error)
  }
})

const formatTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '---';
  const date = timestamp.toDate();
  const now = new Date();
  
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return '数秒前';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Intl.DateTimeFormat('ja-JP', options).format(date);
};

// アバターの頭文字を取得
const avatarInitial = computed(() => {
  return authorName.value.charAt(0).toUpperCase();
});

// 「続ける」ボタンが押された時の処理
const handleReplyClick = (event) => {
  event.preventDefault();
  // どの投稿への返信かをストアに保存
  replyToPost.value = props.post;
  // モーダルを開く
  isPostFormModalOpen.value = true;
};

// 関連するアクションの数が表示するプレビューの数を超えた場合は「もっと見る」を表示
const showMoreLink = computed(() => {
  return (props.post.actionCount || 0) > 0;
});

// プレビュー表示するアクション（最大2件）
const previewItems = computed(() => {
  if (props.post.actionCount <= 0) return [];
  
  // 実際のデータは取得できないため、ダミーデータを生成
  // 実際の実装では、firebase.jsに関連アクションを取得する関数を追加する必要があります
  const dummyItems = [];
  const count = Math.min(props.post.actionCount, 2);
  
  for (let i = 0; i < count; i++) {
    dummyItems.push({
      initial: String.fromCharCode(65 + i),
      text: `ユーザーがこの体験に触発されて行動しました`
    });
  }
  
  return dummyItems;
});
</script>

<template>
  <div class="card">
    <div class="card-header">
      <div class="avatar" :style="authorAvatar ? `background-image: url(${authorAvatar})` : ''">
        <template v-if="!authorAvatar">{{ avatarInitial }}</template>
      </div>
      <div class="user-info">
        <div class="name">{{ authorName }}</div>
        <div class="id">@{{ authorName.toLowerCase().replace(/\s/g, '') }} · {{ formatTimestamp(props.post.timestamp) }}</div>
      </div>
      <span class="post-type">Thanks</span>
    </div>
    
    <div class="card-body">
      <p>{{ props.post.text }}</p>
      <div v-if="props.post.feeling" class="feeling-quote">
        "{{ props.post.feeling }}"
      </div>
      <div v-if="props.post.tags && props.post.tags.length > 0" class="tags-container">
        <span v-for="tag in props.post.tags" :key="tag" class="tag">#{{ tag }}</span>
      </div>
    </div>
    
    <div class="branch-preview" v-if="showMoreLink">
      <div class="preview-title">
        <span class="preview-icon">🔄</span>
        <span>次のアクション ({{ props.post.actionCount }})</span>
      </div>
      
      <!-- アクションのプレビュー表示 -->
      <div v-if="previewItems.length > 0" class="preview-items">
        <div v-for="(item, index) in previewItems" :key="index" class="preview-item">
          <div class="preview-avatar">{{ item.initial }}</div>
          <span class="preview-text">{{ item.text }}</span>
        </div>
      </div>
      
      <RouterLink :to="{ name: 'chain', params: { id: props.post.id } }" class="more-link">
        すべてのアクションを見る
      </RouterLink>
    </div>
    
    <div class="card-footer">
      <div class="metrics">
        <span class="like-button">❤️ {{ props.post.likeCount || 0 }}</span>
        <span class="action-count">🔄 {{ props.post.actionCount || 0 }}</span>
      </div>
      <button @click="handleReplyClick" class="reply-button">続ける</button>
    </div>
  </div>
</template>

<style scoped>
/* カードのベーススタイル */
.card {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

/* カードヘッダー */
.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f0f0f0;
  margin-right: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #555;
  font-weight: bold;
  background-size: cover;
  background-position: center;
}

.user-info {
  flex-grow: 1;
}

.name {
  font-weight: bold;
  color: #333;
  font-size: 1rem;
}

.id {
  color: #666;
  font-size: 0.8rem;
}

.post-type {
  background-color: #FF8C42;
  color: white;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
}

/* カード本文 */
.card-body {
  margin-bottom: 16px;
}

.card-body p {
  color: #333;
  line-height: 1.5;
  margin-top: 0;
  margin-bottom: 12px;
}

.feeling-quote {
  font-style: italic;
  color: #555;
  margin: 12px 0;
  border-left: 3px solid #FF8C42;
  padding-left: 12px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tag {
  background-color: #f0f2f5;
  color: #666;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

/* ブランチプレビュー */
.branch-preview {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
}

.preview-title {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 500;
  color: #444;
}

.preview-icon {
  margin-right: 6px;
}

.preview-items {
  margin-bottom: 10px;
}

.preview-item {
  display: flex;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #eee;
}

.preview-item:last-child {
  border-bottom: none;
}

.preview-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: #e0e0e0;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.7rem;
  color: #666;
  margin-right: 8px;
  flex-shrink: 0;
}

.preview-text {
  font-size: 0.9rem;
  color: #555;
}

.more-link {
  display: block;
  text-align: center;
  color: #FF8C42;
  text-decoration: none;
  font-weight: 500;
  padding: 6px;
  font-size: 0.9rem;
}

.more-link:hover {
  text-decoration: underline;
}

/* カードフッター */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #eee;
}

.metrics {
  display: flex;
  gap: 16px;
}

.like-button, .action-count {
  color: #666;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.like-button:hover {
  color: #e74c3c;
}

.reply-button {
  background-color: #FF8C42;
  color: white;
  border: none;
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reply-button:hover {
  background-color: #EE965F;
}
</style>