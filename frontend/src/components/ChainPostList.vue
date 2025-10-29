<script setup>
import { ref, computed, defineProps, defineEmits, watch, nextTick } from 'vue'
import { likePost } from '../firebaseService'
import { isPostFormModalOpen, replyToPost } from '../store/modal'
import { user } from '../store/user'

const props = defineProps({
  chainPosts: {
    type: Array,
    required: true
  },
  authorProfiles: {
    type: Object,
    required: true
  },
  isOpen: {
    type: Boolean,
    default: false
  },
  highlightedPostIndex: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:isOpen', 'selectPost'])

// ポップアップのコンテンツ要素への参照
const popupContent = ref(null)

// ハイライトされた投稿が変わったら自動スクロール
watch(() => props.highlightedPostIndex, async (newIndex) => {
  if (props.isOpen && popupContent.value) {
    await nextTick()
    // ハイライトされた要素を探してスクロール
    const highlightedElement = popupContent.value.querySelector('.thread-item.highlight')
    if (highlightedElement) {
      highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
})

// ポップアップが開いた時もスクロール
watch(() => props.isOpen, async (isOpen) => {
  if (isOpen && popupContent.value) {
    await nextTick()
    // 少し遅延させてDOMが完全にレンダリングされるのを待つ
    setTimeout(() => {
      const highlightedElement = popupContent.value?.querySelector('.thread-item.highlight')
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }
})

// いいね機能
const handleLike = async (post, event) => {
  event.stopPropagation()
  if (!user.value) {
    alert("いいねするにはログインが必要です。")
    return
  }

  const myLikeCount = getMyLikeCount(post)
  if (myLikeCount >= 10) {
    alert("いいねは一投稿につき10回までです！")
    return
  }

  try {
    if (post.likeCount === undefined) post.likeCount = 0
    post.likeCount++
    if (!post.likesMap) post.likesMap = {}
    if (!post.likesMap[user.value.uid]) post.likesMap[user.value.uid] = 0
    post.likesMap[user.value.uid]++
    await likePost(post.id, user.value.uid)
  } catch (error) {
    console.error("いいね処理中にエラー:", error)
    post.likeCount--
    post.likesMap[user.value.uid]--
    alert("いいねに失敗しました。")
  }
}

// 返信機能
const handleReply = (post, event) => {
  event.stopPropagation()
  replyToPost.value = post
  isPostFormModalOpen.value = true
}

const getMyLikeCount = (post) => {
  if (!user.value || !post.likesMap) return 0
  return post.likesMap[user.value.uid] || 0
}

// 階層ごとの色を取得
const getColorByDepth = (depth) => {
  const colors = ['#FF8C42', '#2196F3', '#4CAF50', '#9C27B0', '#FF5722', '#795548', '#607D8B']
  return colors[(depth || 0) % colors.length]
}

const rootPost = computed(() => {
  return props.chainPosts.find(post => post.type === 'thanks') || null
})

const actionPosts = computed(() => {
  return props.chainPosts.filter(post => post.type === 'action')
})

const getAuthorName = (post) => {
  if (!post || !post.authorId) return '読み込み中...'
  if (post.isAnonymous) return '匿名ユーザー'

  const profile = props.authorProfiles[post.authorId]
  return profile?.displayName || '名前未設定のユーザー'
}

const getAvatarInitial = (post) => {
  if (!post) return ''
  const name = getAuthorName(post)
  return name.charAt(0).toUpperCase()
}

const formatTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '---'
  const date = timestamp.toDate()
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
  return new Intl.DateTimeFormat('ja-JP', options).format(date)
}

const closePopup = () => {
  emit('update:isOpen', false)
}

const togglePopup = () => {
  emit('update:isOpen', !props.isOpen)
}

// 投稿をクリックした時にマップと連動
const handlePostClick = (index) => {
  emit('selectPost', index)
}
</script>

<template>
  <!-- トグルボタン -->
  <button
    class="popup-toggle-button"
    :class="{ active: isOpen }"
    @click="togglePopup"
  >
    <span v-if="!isOpen">📝 投稿を表示</span>
    <span v-else>✕ 閉じる</span>
  </button>

  <!-- ポップアップコンテナ -->
  <div class="popup-container" :class="{ open: isOpen }">
    <div class="popup-header">
      <h3>投稿リスト</h3>
      <button class="close-button" @click="closePopup">✕</button>
    </div>

    <div ref="popupContent" class="popup-content">
      <!-- Thanks投稿 -->
      <div
        v-if="rootPost"
        class="thread-item thanks-post"
        :class="{ highlight: highlightedPostIndex === 0 }"
        @click="handlePostClick(0)"
      >
        <div class="thread-content">
          <div class="avatar" :style="{backgroundColor: getColorByDepth(0)}">
            {{ getAvatarInitial(rootPost) }}
          </div>
          <div class="thread-text">
            <div class="thread-header">
              <div class="thread-name">{{ getAuthorName(rootPost) }}</div>
              <div class="thread-time">{{ formatTimestamp(rootPost.timestamp) }}</div>
            </div>
            <div class="thread-body">
              {{ rootPost.text }}
              <div v-if="rootPost.feeling" class="thread-feeling">
                "{{ rootPost.feeling }}"
              </div>
              <div v-if="rootPost.tags && rootPost.tags.length > 0" class="thread-tags">
                <span v-for="tag in rootPost.tags" :key="tag" class="tag">#{{ tag }}</span>
              </div>
            </div>

            <div class="thread-actions">
              <button @click="handleLike(rootPost, $event)" class="like-button">
                <span>❤️ {{ rootPost.likeCount || 0 }}</span>
                <span v-if="getMyLikeCount(rootPost) > 0" class="my-like-count-indicator">
                  ({{ getMyLikeCount(rootPost) }}/10)
                </span>
              </button>
              <button @click="handleReply(rootPost, $event)" class="reply-button">続ける</button>
           </div>
          </div>
          <div class="post-type-badge thanks-badge">
            <span class="badge-icon">🙏</span>Thanks
          </div>
        </div>
      </div>

      <!-- NextAction投稿 -->
      <div
        v-for="(post, index) in actionPosts"
        :key="post.id"
        class="thread-item next-action"
        :class="{ highlight: highlightedPostIndex === index + 1 }"
        :style="{ borderLeftColor: getColorByDepth(post.depth) }"
        @click="handlePostClick(index + 1)"
      >
        <div class="thread-content">
          <div class="avatar" :style="{backgroundColor: getColorByDepth(post.depth)}">
            {{ getAvatarInitial(post) }}
          </div>
          <div class="thread-text">
            <div class="thread-header">
              <div class="thread-name">{{ getAuthorName(post) }}</div>
              <div class="thread-time">{{ formatTimestamp(post.timestamp) }}</div>
            </div>
            <div class="thread-body">
              {{ post.text }}
              <div v-if="post.feeling" class="thread-feeling">
                "{{ post.feeling }}"
              </div>
              <div v-if="post.tags && post.tags.length > 0" class="thread-tags">
                <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
              </div>
            </div>

            <div class="thread-actions">
              <button @click="handleLike(post, $event)" class="like-button">
                <span>❤️ {{ post.likeCount || 0 }}</span>
                <span v-if="getMyLikeCount(post) > 0" class="my-like-count-indicator">
                  ({{ getMyLikeCount(post) }}/10)
                </span>
              </button>
              <button @click="handleReply(post, $event)" class="reply-button">続ける</button>
            </div>
          </div>
          <div class="post-type-badge next-badge" :style="{ backgroundColor: getColorByDepth(post.depth) }">
            <span class="badge-icon">🔄</span>NextAction
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- オーバーレイ背景 -->
  <div v-if="isOpen" class="popup-overlay" @click="closePopup"></div>
</template>

<style scoped>
/* トグルボタン */
.popup-toggle-button {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: #FF8C42;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  transition: all 0.3s;
}

.popup-toggle-button:hover {
  background-color: #EE965F;
  transform: translateX(-50%) translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
}

.popup-toggle-button.active {
  background-color: #666;
}

/* ポップアップコンテナ */
.popup-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40vh;
  background: white;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.2);
  z-index: 1002;
  transform: translateY(100%);
  transition: transform 0.3s ease-in-out;
  display: flex;
  flex-direction: column;
  pointer-events: auto;
}

.popup-container.open {
  transform: translateY(0);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.popup-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
}

.close-button {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  line-height: 1;
}

.close-button:hover {
  color: #333;
}

.popup-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* オーバーレイ背景 */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 1001;
  pointer-events: none;
}

/* 投稿アイテム */
.thread-item {
  padding: 15px;
  margin-bottom: 12px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: background-color 0.2s;
}

.thread-item:hover {
  background-color: #f9f9f9;
}

.thread-item.highlight {
  background-color: #f0f8ff;
  box-shadow: 0 2px 6px rgba(33, 150, 243, 0.3);
}

.thread-item.thanks-post {
  border-left: 4px solid #FF8C42;
}

.thread-item.next-action {
  border-left: 4px solid;
  margin-left: 20px;
}

.thread-content {
  display: flex;
  align-items: flex-start;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-weight: bold;
  flex-shrink: 0;
}

.thread-text {
  margin-left: 10px;
  flex-grow: 1;
}

.thread-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.thread-name {
  font-weight: bold;
  color: #333;
}

.thread-time {
  color: #888;
  font-size: 0.8em;
}

.thread-body {
  color: #333;
  line-height: 1.5;
}

.thread-feeling {
  font-style: italic;
  color: #555;
  margin: 10px 0;
  border-left: 3px solid #fdeee0;
  padding-left: 10px;
  font-size: 0.95rem;
}

.thread-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 10px;
}

.tag {
  background-color: #e0f7fa;
  color: #00838f;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8em;
}

.thread-actions {
  display: flex;
  align-items: center;
  margin-top: 12px;
}

.like-button {
  background: none;
  border: none;
  padding: 4px 8px;
  margin: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: #666;
  font-size: 0.9rem;
  border-radius: 16px;
  transition: all 0.2s ease;
}

.like-button:hover {
  color: #e74c3c;
  background-color: #f9f9f9;
}

.my-like-count-indicator {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-left: 6px;
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 8px;
}

.reply-button {
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-left: auto;
}

.reply-button:hover {
  background-color: #45a049;
}

.post-type-badge {
  border-radius: 16px;
  padding: 3px 10px;
  display: inline-flex;
  align-items: center;
  color: white;
  font-weight: bold;
  font-size: 0.8em;
  margin-left: 10px;
  flex-shrink: 0;
}

.thanks-badge {
  background-color: #FF8C42;
}

.badge-icon {
  margin-right: 4px;
}
</style>
