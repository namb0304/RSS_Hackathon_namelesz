<script setup>
import { defineProps, ref, onMounted, computed } from 'vue'
import { getUserProfile, likePost, saveAsTask, hidePost } from '../firebaseService'
// ★ 'isPostFormModalOpen' と 'replyToPost' は使わなくなったので削除
// import { isPostFormModalOpen, replyToPost } from '../store/modal'
import { user } from '../store/user'
import { useRouter } from 'vue-router'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const authorName = ref('匿名ユーザー')
const authorAvatar = ref(null)
const isTaskSaved = ref(false)
const processing = ref(false)

onMounted(async () => {
  if (!props.post.isAnonymous) {
    try {
      const profile = await getUserProfile(props.post.authorId)
      if (profile) {
        authorName.value = profile.displayName || '名前未設定のユーザー'
        authorAvatar.value = profile.photoURL || null
      }
    } catch (error) {
      console.error("ユーザープロフィールの取得に失敗:", error)
    }
  } else {
    authorName.value = '匿名ユーザー'
  }
})

// timestamp formatting (Firestore Timestamp expected)
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

const avatarInitial = computed(() => (authorName.value && authorName.value.length > 0) ? authorName.value.charAt(0).toUpperCase() : '無')

// 連鎖マップへ移動（誰でも可能）
const goToChain = () => {
  if (!props.post || !props.post.id) return
  router.push({ name: 'chain', params: { id: props.post.id } })
}

// ★ 「続ける」ボタンのロジック (handleReplyClick) を仕様書に基づき削除

// いいね: 1人10回まで
const myLikeCount = computed(() => {
  if (!user.value || !props.post.likesMap) return 0;
  return props.post.likesMap[user.value.uid] || 0;
});

const handleLike = async () => {
  if (!user.value) {
    // 未ログインならログインページへ
    router.push('/login')
    return
  }
  if (processing.value) return
  if (myLikeCount.value >= 10) {
    alert("いいねは一投稿につき10回までです！")
    return
  }
  processing.value = true
  try {
    // optimistic UI
    if (props.post.likeCount === undefined) props.post.likeCount = 0;
    props.post.likeCount++;
    if (!props.post.likesMap) props.post.likesMap = {};
    if (!props.post.likesMap[user.value.uid]) props.post.likesMap[user.value.uid] = 0;
    props.post.likesMap[user.value.uid]++;
    await likePost(props.post.id, user.value.uid);
  } catch (error) {
    console.error("いいね処理中にエラー:", error)
    // rollback
    if (props.post.likeCount !== undefined) props.post.likeCount--;
    if (props.post.likesMap && user.value && props.post.likesMap[user.value.uid]) {
      props.post.likesMap[user.value.uid] = Math.max(0, props.post.likesMap[user.value.uid] - 1)
    }
    alert("いいねに失敗しました。")
  } finally {
    processing.value = false
  }
}

// Task 保存（ログイン必須）
const handleSaveTask = async () => {
  if (!user.value) {
    router.push('/login')
    return
  }
  if (isTaskSaved.value) {
    alert("既にTaskとして保存済みです")
    return
  }
  processing.value = true
  try {
    await saveAsTask(props.post.id, user.value.uid)
    isTaskSaved.value = true
    alert("Taskとして保存しました!")
  } catch (error) {
    console.error("Task保存エラー:", error)
    // もし既に保存済みなら UI を合わせる
    if (error && error.message && error.message.includes("既に")) {
      isTaskSaved.value = true
      alert("既にTaskとして保存されています")
    } else {
      alert("Task保存に失敗しました")
    }
  } finally {
    processing.value = false
  }
}

// 非表示（ログイン必須）
const handleHide = async () => {
  if (!user.value) {
    router.push('/login')
    return
  }
  if (!confirm("この投稿を非表示にしますか?\n(以降表示されなくなります)")) return
  processing.value = true
  try {
    await hidePost(props.post.id, user.value.uid)
    alert("投稿を非表示にしました")
    // 親コンポーネント(MainView) が非表示投稿をフィルタリングして
    // 再取得・再描画するのを待つ (window.location.reload() は避ける)
    
  } catch (error) {
    console.error("非表示エラー:", error)
    alert("非表示に失敗しました")
  } finally {
    processing.value = false
  }
}
</script>

<template>
  <div class="card thanks-card" role="article">
    <div class="card-header">
      <div class="avatar" :style="authorAvatar ? `background-image: url(${authorAvatar})` : ''">
        <template v-if="!authorAvatar">{{ avatarInitial }}</template>
      </div>
      <div class="user-info">
        <div class="name">{{ authorName }}</div>
        <div class="id">@{{ (authorName || '').toLowerCase().replace(/\s/g, '') }} · {{ formatTimestamp(props.post.timestamp) }}</div>
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

    <div class="card-actions">
      <button @click="goToChain" class="action-btn chain-btn" title="連鎖マップを見る">
        🌳 マップ
      </button>
      
      <button @click="handleHide" class="action-btn hide-btn" title="この投稿を非表示">
        👁️‍🗨️ 非表示
      </button>
      
      <button @click="handleLike" class="action-btn like-btn" :title="`10回までいいねできます`">
        <span>❤️ {{ props.post.likeCount || 0 }}</span>
        <span v-if="myLikeCount > 0" class="my-like-badge">{{ myLikeCount }}</span>
      </button>
      
      <button 
        @click="handleSaveTask" 
        class="action-btn task-btn" 
        :class="{ saved: isTaskSaved }"
        :title="isTaskSaved ? 'Task保存済み' : 'Taskとして保存'"
      >
        {{ isTaskSaved ? '✓ 保存済み' : '📌 Task保存' }}
      </button>
    </div>

    </div>
</template>

<style scoped>
.card {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  /* ★ .card-footer が無くなったので、下部のマージンを .card 自体で調整 */
  margin-bottom: 0; 
  display: flex;
  flex-direction: column;
}

.thanks-card {
  border-left: 4px solid #FF8C42;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  padding: 16px 16px 0 16px;
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

.card-body {
  padding: 0 16px 16px 16px;
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

/* 4つのボタン */
.card-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  /* ★ .card-footer が無くなったので、下部の padding を調整 */
  padding: 0 16px 16px 16px;
}

.action-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.chain-btn {
  background-color: #4CAF50;
  color: white;
}
.chain-btn:hover {
  transform: translateY(-1px);
}

.hide-btn {
  background-color: #9E9E9E;
  color: white;
}
.hide-btn:hover {
  transform: translateY(-1px);
}

.like-btn {
  background-color: #FFE5E5;
  color: #E74C3C;
  border: 2px solid #E74C3C;
  position: relative;
}
.like-btn:hover {
  background-color: #E74C3C;
  color: white;
  transform: translateY(-1px);
}

.my-like-badge {
  background-color: #E74C3C;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
}

.task-btn {
  background-color: #FFF3CD;
  color: #856404;
  border: 2px solid #FFC107;
}
.task-btn:hover {
  background-color: #FFC107;
  color: white;
  transform: translateY(-1px);
}
.task-btn.saved {
  background-color: #D4EDDA;
  color: #155724;
  border: 2px solid #28A745;
  cursor: default;
}

/* ★ .card-footer と .reply-button のスタイルを削除 */

/* スマホ対応 */
@media (max-width: 768px) {
  .card-actions {
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
  }

  .action-btn {
    font-size: 0.75rem;
    padding: 6px 8px;
  }
}
</style>