<script setup>
import { defineProps, ref, onMounted, computed } from 'vue'
import { getUserProfile, likePost, saveAsTask, hidePost } from '../firebaseService'
import { user } from '../store/user'
import { useRouter } from 'vue-router'

import scrollBackground from '../assets/thanks-card.png'

const props = defineProps({
  post: {
    type: Object,
    required: true
  },
  bottleColor: {
    type: Object,
    default: null
  },
  isSelected: {
    type: Boolean,
    default: false
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

const goToChain = () => {
  if (!props.post || !props.post.id) return
  router.push({ name: 'chain', params: { id: props.post.id } })
}

const myLikeCount = computed(() => {
  if (!user.value || !props.post.likesMap) return 0;
  return props.post.likesMap[user.value.uid] || 0;
});

const handleLike = async () => {
  if (!user.value) {
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
    if (props.post.likeCount === undefined) props.post.likeCount = 0;
    props.post.likeCount++;
    if (!props.post.likesMap) props.post.likesMap = {};
    if (!props.post.likesMap[user.value.uid]) props.post.likesMap[user.value.uid] = 0;
    props.post.likesMap[user.value.uid]++;
    await likePost(props.post.id, user.value.uid);
  } catch (error) {
    console.error("いいね処理中にエラー:", error)
    if (props.post.likeCount !== undefined) props.post.likeCount--;
    if (props.post.likesMap && user.value && props.post.likesMap[user.value.uid]) {
      props.post.likesMap[user.value.uid] = Math.max(0, props.post.likesMap[user.value.uid] - 1)
    }
    alert("いいねに失敗しました。")
  } finally {
    processing.value = false
  }
}

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
  } catch (error) {
    console.error("非表示エラー:", error)
    alert("非表示に失敗しました")
  } finally {
    processing.value = false
  }
}

const cardStyle = computed(() => {
  const style = {
    '--scroll-bg': `url(${scrollBackground})`
  }
  
  if (props.bottleColor) {
    style['--card-border-color'] = props.bottleColor.border
    style['--card-shadow'] = props.bottleColor.shadow
  }
  
  return style
})

</script>

<template>
  <div 
    class="card thanks-card" 
    role="article" 
    :style="cardStyle"
    :class="{ 
      'with-color': bottleColor,
      'is-selected': isSelected,
      'is-not-selected': bottleColor && !isSelected
    }"
  >
    <div class="card-header">
      <div class="avatar" :style="authorAvatar ? `background-image: url(${authorAvatar})` : ''">
        <template v-if="!authorAvatar">{{ avatarInitial }}</template>
      </div>
      <div class="user-info">
        <div class="name">{{ authorName }}</div>
        <div class="id">@{{ (authorName || '').toLowerCase().replace(/\s/g, '') }} · {{ formatTimestamp(props.post.timestamp) }}</div>
      </div>
    </div>

    <div class="card-body">
      <p>{{ props.post.text }}</p>
      <div v-if="props.post.feeling" class="feeling-quote">
        "{{ props.post.feeling }}"
      </div>
      <div v-if="props.post.tags && props.post.tags.length > 0" class="tags-container">
        <span 
          v-for="tag in props.post.tags" 
          :key="tag" 
          class="tag"
        >
          #{{ tag }}
        </span>
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
.card.thanks-card {
  background-image: var(--scroll-bg); 
  background-size: 95% 90%; 
  background-repeat: no-repeat;
  background-position: center;
  background-color: transparent;
  
  border-radius: 0; 
  box-shadow: none;
  border: none;
  
  margin-bottom: 20px; 
  
  display: flex;
  flex-direction: column;

  padding: 130px 45px 50px 100px;

  color: #4b3832c6;
  image-rendering: -webkit-optimize-contrast;
  
  aspect-ratio: 5 / 4;
  width: 60%;
  max-width: 200px;
  
  position: relative;
  transition: all 0.3s ease;
  
  font-family: "游明朝", "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "Hiragino Mincho Pro", "HGS明朝E", "MS P明朝", "MS 明朝", serif;
}

.card.thanks-card.with-color {
  outline: 4px solid var(--card-border-color);
  outline-offset: -8px;
  box-shadow: 
    0 0 20px var(--card-shadow),
    0 0 40px var(--card-shadow),
    inset 0 0 30px rgba(255, 255, 255, 0.1);
  transition: opacity 0.3s ease, outline 0.3s ease, box-shadow 0.3s ease;
}

.card.thanks-card.with-color::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 0;
  pointer-events: none;
  box-shadow: 
    inset 0 0 20px var(--card-shadow),
    inset 0 0 40px var(--card-shadow);
  opacity: 0.6;
  transition: opacity 0.3s ease;
}

.card.thanks-card.is-not-selected {
  opacity: 1 !important;
  outline-width: 2px !important;
  outline-color: rgba(128, 128, 128, 0.3) !important;
  box-shadow: 
    0 0 5px rgba(128, 128, 128, 0.2) !important,
    0 0 10px rgba(128, 128, 128, 0.1) !important;
}

.card.thanks-card.is-not-selected::before {
  opacity: 0.1 !important;
}

.card.thanks-card.is-selected {
  opacity: 1 !important;
  outline-width: 4px !important;
}

.card.thanks-card.is-selected::before {
  opacity: 0.8 !important;
}

.card-header {
  padding: 0;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 1;
}

.avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  margin-right: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  background-size: cover;
  background-position: center;
  
  background-color: #D7CCC8; 
  color: #5D4037; 
  border: 2px solid #A1887F; 
  flex-shrink: 0;
}

.user-info {
  flex-grow: 1;
  min-width: 0;
}

.name {
  font-weight: bold;
  font-size: 1rem;
  color: #3E2723;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.id {
  font-size: 0.8rem;
  color: #5D4037;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-body {
  padding: 0; 
  margin-bottom: 20px; 
  flex-grow: 1;
  overflow-y: auto;
  position: relative;
  z-index: 1;
}

.card-body p {
  color: #3E2723;
  line-height: 1.6;
  margin-top: 0;
  margin-bottom: 8px;
  word-wrap: break-word;
}

.feeling-quote {
  font-style: italic;
  color: #5D4037;
  margin: 12px 0;
  border-left: 3px solid #8D6E63;
  padding-left: 12px;
  word-wrap: break-word;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tag {
  background-color: rgba(255, 255, 255, 0.2); 
  color: #4B3832;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.85rem;
  border: 1px solid #C1A78A;
  white-space: nowrap;
  font-weight: 500;
}

.card-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  padding: 0;
  margin-top: auto; 
  
  transform: translateY(75px);
  position: relative;
  z-index: 1;
} 

.action-btn {
  padding: 8px 5px;
  border: none;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  transform: translateX(-30px);
  
  background-color: #8D6E63; 
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.action-btn:hover {
  background-color: #795548; 
}

.chain-btn {
  background-color: #689F38; 
  color: white;
}
.chain-btn:hover { 
  background-color: #558B2F; 
}

.hide-btn {
  background-color: #757575; 
  color: white;
}
.hide-btn:hover { 
  background-color: #616161; 
}

.like-btn {
  background-color: #FBE9E7; 
  color: #d35454;
  border: 2px solid #d45050;
  box-shadow: none; 
}
.like-btn:hover {
  background-color: #D32F2F;
  color: white;
}

.my-like-badge {
  background-color: #D32F2F;
  color: white;
  font-size: 0.7rem;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 6px;
}

.task-btn {
  background-color: #FFF8E1; 
  color: #AF8900;
  border: 2px solid #FFC107;
  box-shadow: none;
}
.task-btn:hover {
  background-color: #FFC107;
  color: #3E2723;
}
.task-btn.saved {
  background-color: #E8F5E9; 
  color: #2E7D32;
  border: 2px solid #28A745;
  cursor: default;
}
.task-btn.saved:hover {
  background-color: #E8F5E9;
  color: #2E7D32;
}

@media (max-width: 768px) {
  .card.thanks-card {
    padding: 80px 40px 40px 80px;
    max-width: 100%;
  }

  .card-actions {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    transform: translateY(20px); 
  }

  .action-btn {
    font-size: 0.75rem;
    padding: 8px 10px;
  }
  
  .avatar {
    width: 36px;
    height: 36px;
  }
  
  .name {
    font-size: 0.9rem;
  }
  
  .id {
    font-size: 0.75rem;
  }
}
</style>