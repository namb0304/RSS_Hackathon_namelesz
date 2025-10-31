<script setup>
import { ref, computed, defineProps, defineEmits, watch, nextTick } from 'vue'
import { likePost } from '../firebaseService'
import { isPostFormModalOpen, replyToPost } from '../store/modal'
import { user } from '../store/user'
import letterImage from '../assets/letter1.png'

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

const emit = defineEmits(['update:isOpen', 'selectPost', 'update:height'])

// ポップアップのコンテンツ要素への参照
const popupContent = ref(null)

// リサイズ機能
const popupHeight = ref(40) // vh単位
const isDragging = ref(false)
const startY = ref(0)
const startHeight = ref(0)

const startResize = (event) => {
  isDragging.value = true
  startY.value = event.clientY || event.touches[0].clientY
  startHeight.value = popupHeight.value
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  document.addEventListener('touchmove', onResize)
  document.addEventListener('touchend', stopResize)
}

const onResize = (event) => {
  if (!isDragging.value) return

  const currentY = event.clientY || event.touches[0].clientY
  const deltaY = startY.value - currentY // 上に動かすと正の値
  const windowHeight = window.innerHeight
  const deltaVh = (deltaY / windowHeight) * 100

  let newHeight = startHeight.value + deltaVh
  // 最小20vh、最大95vhに制限
  newHeight = Math.max(20, Math.min(95, newHeight))

  popupHeight.value = newHeight
  emit('update:height', newHeight) // 親に高さを通知
}

const stopResize = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
  document.removeEventListener('touchmove', onResize)
  document.removeEventListener('touchend', stopResize)
}

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

// 返信を保管（下書き保存）
const handleDraft = (post, event) => {
  event.stopPropagation()
  // TODO: 後で実装する関数を呼び出す
  console.log('返信を保管:', post.id)
  alert('返信を保管しました（仮実装）')
}

// 投稿を非表示
const handleHide = (post, event) => {
  event.stopPropagation()
  // TODO: 後で実装する関数を呼び出す
  console.log('非表示:', post.id)
  alert('この投稿を非表示にしました（仮実装）')
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

// 階層ヘッダーの色を取得（手紙に合う落ち着いた色）
const getDepthHeaderColor = (depth) => {
  const colors = [
    '#C8A882', // ベージュゴールド
    '#A89070', // モカブラウン
    '#B8A890', // サンドベージュ
    '#9B8B7E', // グレージュ
    '#D4A574', // ライトブラウン
    '#8B7B6B', // ダークベージュ
    '#C4B5A0'  // ウォームグレー
  ]
  return colors[(depth || 0) % colors.length]
}

const rootPost = computed(() => {
  return props.chainPosts.find(post => post.type === 'thanks') || null
})

const actionPosts = computed(() => {
  return props.chainPosts.filter(post => post.type === 'action')
})

// 深さごとに投稿をグループ化
const postsByDepth = computed(() => {
  const groups = {}

  actionPosts.value.forEach((post, index) => {
    const depth = post.depth || 0
    if (!groups[depth]) {
      groups[depth] = []
    }
    groups[depth].push({
      ...post,
      originalIndex: index + 1 // rootPostの分+1
    })
  })

  return groups
})

const getAuthorName = (post) => {
  if (!post || !post.authorId) return '読み込み中...'
  if (post.isAnonymous) return '匿名ユーザー'

  const profile = props.authorProfiles[post.authorId]
  return profile?.displayName || '名前未設定のユーザー'
}

// 最大階層数を取得
const getMaxDepth = () => {
  return Math.max(...props.chainPosts.map(p => p.depth || 0), 0)
}

// 総いいね数を取得
const getTotalLikes = () => {
  return props.chainPosts.reduce((sum, post) => sum + (post.likeCount || 0), 0)
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
  <div class="popup-container" :class="{ open: isOpen }" :style="{ height: `${popupHeight}vh` }">
    <div class="popup-header">
      <h3>投稿リスト</h3>
      <!-- 統計情報 -->
      <div class="header-stats">
        <span class="header-stat">📊 {{ getMaxDepth() }}層</span>
        <span class="header-stat">🪶 {{ chainPosts.length }}通</span>
        <span class="header-stat">❤️ {{ getTotalLikes() }}</span>
      </div>
      <!-- リサイズ可能な棒状ハンドル -->
      <button
        class="close-handle"
        @mousedown="startResize"
        @touchstart="startResize"
        @dblclick="closePopup"
      >
        <span class="close-bar"></span>
      </button>
    </div>

    <div ref="popupContent" class="popup-content">
      <!-- Thanks投稿（0層） -->
      <div v-if="rootPost" class="depth-group single-item">
        <!-- 階層ヘッダー -->
        <div class="depth-header">
          <div class="depth-block" style="background-color: #D4A574;">
            <span class="depth-number">0</span>
          </div>
          <div class="depth-label">
            <span class="depth-text">始まりの手紙</span>
            <span class="depth-count">1通</span>
          </div>
          <div class="depth-line"></div>
        </div>

        <div
          class="thread-item thanks-post"
          :class="{ highlight: highlightedPostIndex === 0 }"
          @click="handlePostClick(0)"
        >
          <img :src="letterImage" class="letter-background" alt="letter" />
          <div class="thread-content">
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
            </div>
          </div>
        </div>
      </div>

      <!-- NextAction投稿（深さごとにグループ化） -->
      <template v-for="(posts, depth) in postsByDepth" :key="`depth-${depth}`">
        <div class="depth-group" :class="{ 'single-item': posts.length === 1 }">
          <!-- 階層ヘッダー -->
          <div class="depth-header" :style="{ borderLeftColor: getDepthHeaderColor(depth) }">
            <div class="depth-block" :style="{ backgroundColor: getDepthHeaderColor(depth) }">
              <span class="depth-number">{{ depth }}</span>
            </div>
            <div class="depth-label">
              <span class="depth-text">第{{ depth }}層</span>
              <span class="depth-count">{{ posts.length }}通</span>
            </div>
            <div class="depth-line"></div>
          </div>

          <div
            v-for="post in posts"
            :key="post.id"
            class="thread-item next-action"
            :class="{ highlight: highlightedPostIndex === post.originalIndex }"
            :style="{ borderLeftColor: getColorByDepth(post.depth) }"
            @click="handlePostClick(post.originalIndex)"
          >
            <img :src="letterImage" class="letter-background" alt="letter" />
            <div class="thread-content">
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
              </div>
            </div>
          </div>
        </div>
      </template>
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
  flex-direction: column;
  align-items: center;
  padding: 8px 20px 16px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
  position: relative;
}

.popup-header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #333;
  margin-top: 8px;
}

.header-stats {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  gap: 12px;
  align-items: center;
}

.header-stat {
  font-family: serif;
  font-size: 0.9rem;
  color: #5C4A3A;
  font-weight: 500;
  white-space: nowrap;
}

/* リサイズ可能な棒状ハンドル */
.close-handle {
  background: none;
  border: none;
  cursor: ns-resize;
  padding: 8px 0;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.close-handle:hover .close-bar {
  background-color: #999;
  height: 5px;
}

.close-bar {
  width: 40px;
  height: 4px;
  background-color: #ccc;
  border-radius: 2px;
  transition: all 0.2s;
}

.popup-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: linear-gradient(to bottom, #E8D4B8 0%, #D4BEA8 100%);
  position: relative;
}

.popup-content::before {
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
      rgba(139, 115, 85, 0.03) 2px,
      rgba(139, 115, 85, 0.03) 3px
    ),
    repeating-linear-gradient(
      90deg,
      rgba(139, 115, 85, 0.02),
      rgba(139, 115, 85, 0.02) 1px,
      transparent 1px,
      transparent 3px
    ),
    linear-gradient(
      135deg,
      rgba(210, 180, 140, 0.1) 0%,
      transparent 20%,
      transparent 80%,
      rgba(160, 120, 80, 0.1) 100%
    );
  pointer-events: none;
  z-index: 0;
}

/* 深さごとのグループ */
.depth-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-bottom: 40px;
  position: relative;
  z-index: 1;
}

/* 階層ヘッダー */
.depth-header {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
  position: relative;
}

.depth-block {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.depth-number {
  font-family: serif;
  font-size: 1.5rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.depth-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.depth-text {
  font-family: serif;
  font-size: 0.95rem;
  font-weight: bold;
  color: #5C4A3A;
}

.depth-count {
  font-family: serif;
  font-size: 0.75rem;
  color: #8B7355;
}

.depth-line {
  flex: 1;
  height: 1px;
  border-top: 2px dashed #C8A882;
  margin-left: 8px;
}

.depth-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.depth-indicator {
  width: 100%;
  height: 6px;
  background: rgba(139, 115, 85, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.depth-bar {
  height: 100%;
  background: linear-gradient(to right, #C8A882, #A89070);
  border-radius: 3px;
  transition: width 0.3s ease;
}

/* 1つだけの場合は中央配置 */
.depth-group.single-item {
  grid-template-columns: 1fr;
  max-width: 50%;
  margin-left: auto;
  margin-right: auto;
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
  position: relative;
  padding: 40px 30px;
  background: transparent;
  border-radius: 0;
  box-shadow: none;
  cursor: pointer;
  transition: transform 0.2s;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.letter-background {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: auto;
  min-height: 100%;
  object-fit: contain;
  z-index: 0;
  pointer-events: none;
}

.thread-item:hover {
  transform: scale(1.02);
}

.thread-item.highlight {
  transform: scale(1.05);
  filter: drop-shadow(0 6px 12px rgba(255, 140, 66, 0.5));
}

.thread-item.thanks-post {
  border-left: none;
}

.thread-item.next-action {
  border-left: none;
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
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(139, 115, 85, 0.3);
}

.thread-name {
  font-weight: bold;
  color: #3C2F2F;
  font-family: serif;
  font-size: 0.95rem;
}

.thread-time {
  color: #8B7355;
  font-size: 0.65em;
  font-family: serif;
  font-style: italic;
}

.thread-body {
  color: #3C2F2F;
  line-height: 1.7;
  font-family: serif;
  font-size: 0.85rem;
  text-align: left;
  letter-spacing: 0.02em;
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
}
</style>
