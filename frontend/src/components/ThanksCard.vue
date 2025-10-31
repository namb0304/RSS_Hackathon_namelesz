<script setup>
import { defineProps, ref, onMounted, computed } from 'vue'
import { getUserProfile, likePost, saveAsTask, hidePost } from '../firebaseService'
import { user } from '../store/user'
import { useRouter } from 'vue-router'

import letterBackground from '../assets/thanks-card.png'

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
  const style = {}
  
  if (props.bottleColor) {
    style['--card-border-color'] = props.bottleColor.border
    style['--card-shadow'] = props.bottleColor.shadow
  }
  
  return style
})

</script>

<template>
  <div class="post-wrapper">
    <div 
      class="thread-item thanks-post" 
      role="article" 
      :style="cardStyle"
      :class="{ 
        'with-color': bottleColor,
        'highlight': isSelected,
      }"
    >
      <img :src="letterBackground" alt="" class="letter-background" />
      
      <div class="thread-content">
        <div class="avatar" :style="authorAvatar ? `background-image: url(${authorAvatar})` : ''">
          <template v-if="!authorAvatar">{{ avatarInitial }}</template>
        </div>
        
        <div class="thread-text">
          <div class="thread-header">
            <span class="thread-name">{{ authorName }}</span>
            <span class="thread-time">{{ formatTimestamp(props.post.timestamp) }}</span>
          </div>
          
          <div class="thread-body">
            {{ props.post.text }}
          </div>
          
          <div v-if="props.post.feeling" class="thread-feeling">
            "{{ props.post.feeling }}"
          </div>
          
          <div v-if="props.post.tags && props.post.tags.length > 0" class="thread-tags">
            <span 
              v-for="tag in props.post.tags" 
              :key="tag" 
              class="tag"
            >
              #{{ tag }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 木製バーのアクションボタン -->
    <div class="thread-actions-below">
      <!-- 封蝋風いいねボタン -->
      <button @click="handleLike" class="like-button seal-style" title="いいね (10回まで)">
        <span class="seal-wax">❤️</span>
        <span class="seal-count">{{ props.post.likeCount || 0 }}</span>
        <span v-if="myLikeCount > 0" class="my-like-indicator">{{ myLikeCount }}</span>
      </button>
      
      <!-- その他のアクションボタン -->
      <div class="action-buttons">
        <button @click="goToChain" class="draft-button" title="連鎖マップを見る">
          <span class="button-icon">🌳</span>
          <span>マップ</span>
        </button>
        
        <button 
          @click="handleSaveTask" 
          class="draft-button task-style"
          :class="{ saved: isTaskSaved }"
          :title="isTaskSaved ? 'Task保存済み' : 'Taskとして保存'"
        >
          <span class="button-icon">{{ isTaskSaved ? '✓' : '📌' }}</span>
          <span>{{ isTaskSaved ? '保存済み' : 'ボトルを保管' }}</span>
        </button>
        
        <button @click="handleHide" class="hide-button" title="この投稿を非表示">
          <span class="button-icon">🌊</span>
          <span>遠くに流す</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 投稿とボタンのラッパー */
.post-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  width: 100%;
}

/* 投稿アイテム - 手紙背景 */
.thread-item {
  position: relative;
  padding: 20px 30px;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  cursor: pointer;
  transition: transform 0.2s, filter 0.3s ease;
  min-height: 350px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 320px;
  aspect-ratio: 7 / 8;
}

.letter-background {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  min-height: 100%;
  object-fit: fill;
  z-index: 0;
  pointer-events: none;
  image-rendering: -webkit-optimize-contrast;
}

.thread-item.with-color {
  transition: opacity 0.3s ease, outline 0.3s ease, box-shadow 0.3s ease, transform 0.2s ease, filter 0.3s ease;
}

.thread-item.with-color:not(.highlight) {
  outline: none;
  box-shadow: none;
}

.thread-item.with-color:not(.highlight)::before {
  opacity: 0;
}

.thread-item.with-color.highlight {
  outline: 4px solid var(--card-border-color);
  outline-offset: -8px;
  box-shadow: 
    0 0 20px var(--card-shadow),
    0 0 40px var(--card-shadow),
    inset 0 0 30px rgba(255, 255, 255, 0.1);
}

.thread-item.with-color.highlight::before {
  opacity: 0.8;
}

.thread-item.with-color::before {
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
  opacity: 0;
  transition: opacity 0.3s ease;
}

.thread-item.highlight {
  transform: scale(1.05);
  filter: brightness(1.05);
}

.thread-item.with-color.highlight {
  outline: 4px solid var(--card-border-color);
  outline-offset: -8px;
  box-shadow: 
    0 0 20px var(--card-shadow),
    0 0 40px var(--card-shadow),
    inset 0 0 30px rgba(255, 255, 255, 0.1);
}

.thread-item.with-color.highlight::before {
  opacity: 0.8;
}

.thread-content {
  position: relative;
  display: flex;
  align-items: flex-start;
  z-index: 1;
  width: 58%;
  max-width: 100%;
  margin-top: -25px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
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
  font-family: serif;
}

.thread-text {
  margin-left: 10px;
  flex-grow: 1;
  min-width: 0;
}

.thread-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 115, 85, 0.3);
  gap: 8px;
}

.thread-name {
  font-weight: bold;
  color: #3C2F2F;
  font-family: serif;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
}

.thread-time {
  color: #8B7355;
  font-size: 0.65em;
  font-family: serif;
  font-style: italic;
  white-space: nowrap;
  flex-shrink: 0;
}

.thread-body {
  color: #3C2F2F;
  line-height: 1.7;
  font-family: serif;
  font-size: 0.85rem;
  text-align: left;
  letter-spacing: 0.02em;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.thread-feeling {
  font-style: italic;
  color: #5C4A3A;
  margin: 8px 0;
  border-left: 3px solid #D4A574;
  padding-left: 10px;
  font-size: 0.8rem;
  font-family: serif;
  background: rgba(212, 165, 116, 0.1);
  padding: 6px 10px;
  border-radius: 2px;
  word-wrap: break-word;
}

.thread-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  padding-top: 6px;
  border-top: 1px dashed rgba(139, 115, 85, 0.3);
}

.tag {
  background: transparent;
  color: #8B7355;
  padding: 2px 4px;
  border-radius: 0;
  font-size: 0.75em;
  font-family: 'Courier New', monospace;
  font-style: italic;
  border: none;
  position: relative;
  white-space: nowrap;
}

/* 手紙の下に配置されるアクションボタン - 木製の机モチーフ */
.thread-actions-below {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  max-width: 320px;
  padding: 16px 24px;
  background:
    linear-gradient(180deg,
      rgba(92, 74, 58, 0.95) 0%,
      rgba(76, 60, 46, 0.98) 50%,
      rgba(60, 47, 35, 1) 100%
    );
  border-radius: 8px;
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    inset 0 -2px 4px rgba(0, 0, 0, 0.2);
  position: relative;
  border: 1px solid rgba(60, 47, 35, 0.8);
}

/* 木目テクスチャのオーバーレイ */
.thread-actions-below::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 0, 0, 0.05) 2px,
      rgba(0, 0, 0, 0.05) 3px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(139, 115, 85, 0.1) 0%,
      rgba(92, 74, 58, 0.1) 10%,
      rgba(76, 60, 46, 0.1) 20%,
      rgba(139, 115, 85, 0.1) 30%
    );
  border-radius: 8px;
  pointer-events: none;
  opacity: 0.6;
}

/* 木の節の装飾 */
.thread-actions-below::after {
  content: '';
  position: absolute;
  bottom: 8px;
  right: 20px;
  width: 30px;
  height: 20px;
  background: radial-gradient(ellipse at center,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.08) 40%,
    transparent 70%
  );
  border-radius: 50%;
  pointer-events: none;
}

/* 封蝋風いいねボタン */
.like-button.seal-style {
  background: radial-gradient(circle, #C85A54 0%, #A84840 100%);
  border: none;
  padding: 6px 12px;
  margin: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: white;
  font-size: 0.75rem;
  border-radius: 50%;
  width: 55px;
  height: 55px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
  position: relative;
  flex-direction: column;
  gap: 1px;
  flex-shrink: 0;
  z-index: 10;
}

.like-button.seal-style::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  height: 80%;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.like-button.seal-style:hover {
  background: radial-gradient(circle, #D86A64 0%, #B85850 100%);
  transform: scale(1.05);
}

.seal-wax {
  font-size: 1.2rem;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.seal-count {
  font-size: 0.7rem;
  font-weight: bold;
  font-family: serif;
}

.my-like-indicator {
  position: absolute;
  top: -4px;
  right: -4px;
  background-color: #D32F2F;
  color: white;
  font-size: 0.65rem;
  padding: 2px 5px;
  border-radius: 10px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* アクションボタンコンテナ */
.action-buttons {
  display: flex;
  gap: 8px;
  flex: 1;
  justify-content: center;
  z-index: 10;
  position: relative;
  flex-wrap: wrap;
}

/* ボトルを保管ボタン */
.draft-button {
  background: linear-gradient(to bottom, #F5E6D3 0%, #E8D4B8 100%);
  border: 2px dashed #8B7355;
  color: #5C4A3A;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: serif;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.draft-button:hover {
  background: linear-gradient(to bottom, #FFF8EC 0%, #F5E6D3 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.draft-button.task-style.saved {
  background: linear-gradient(to bottom, #E8F5E9 0%, #C8E6C9 100%);
  border: 2px solid #66BB6A;
  color: #2E7D32;
}

.draft-button.task-style.saved:hover {
  background: linear-gradient(to bottom, #F1F8E9 0%, #DCEDC8 100%);
}

/* 遠くに流すボタン */
.hide-button {
  background: linear-gradient(to bottom, #D4E8F0 0%, #B8D8E8 100%);
  border: 2px solid #5B8FA3;
  color: #2C5F75;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: serif;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  white-space: nowrap;
}

.hide-button:hover {
  background: linear-gradient(to bottom, #E0F0F8 0%, #D0E8F0 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.button-icon {
  font-size: 0.9rem;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .thread-item {
    min-height: 240px;
    padding: 30px 20px;
  }
  
  .thread-content {
    width: 65%;
  }
  
  .avatar {
    width: 36px;
    height: 36px;
  }
  
  .thread-name {
    font-size: 0.85rem;
  }
  
  .thread-body {
    font-size: 0.8rem;
  }
  
  .thread-actions-below {
    padding: 12px 16px;
    gap: 12px;
    flex-wrap: wrap;
  }
  
  .action-buttons {
    gap: 6px;
  }
  
  .draft-button,
  .hide-button {
    font-size: 0.7rem;
    padding: 6px 10px;
  }
  
  .like-button.seal-style {
    width: 50px;
    height: 50px;
  }
}
</style>