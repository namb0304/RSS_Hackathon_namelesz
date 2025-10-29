<script setup>
import { ref, onMounted, watch, computed } from 'vue'
// ★ getThanksPosts と 'user' ストアをインポート
import { getThanksPosts } from '../firebaseService'
import { user } from '../store/user'
import { useRouter } from 'vue-router'
import ThanksCard from '../components/ThanksCard.vue'
import bottleImg from '../assets/bottle.png'

// state
const allPosts = ref([])
const displayedBottles = ref([])
const isLoading = ref(true)
const isModalOpen = ref(false)    // 下からスライドで表示するグリッドモーダル
const selectedId = ref(null)
const router = useRouter() // router は使われていませんが、念のため残します

// ボトル用スタイル生成（よりランダム性を高める）
const generateBottleStyle = (index) => {
  const randomX = Math.random() * 80 + 10 // 10-90%
  const randomY = Math.random() * 60 + 10 // 10-70%
  const randomDuration = Math.random() * 8 + 10 // 10-18秒（長めで自然に）
  const randomDelay = Math.random() * 5 // 0-5秒
  const randomRotate = Math.random() * 30 - 15 // -15deg ~ +15deg
  const randomXDrift = Math.random() * 200 - 100 // -100px ~ +100px 横流し幅
  const randomYDrift = Math.random() * 60 - 30 // -30px ~ +30px 縦揺れ幅

  return {
    left: `${randomX}%`,
    top: `${randomY}%`,
    '--float-duration': `${randomDuration}s`,
    '--float-delay': `${randomDelay}s`,
    '--random-rotate': `${randomRotate}deg`,
    '--drift-x': `${randomXDrift}px`,
    '--drift-y': `${randomYDrift}px`,
  }
}

// ランダムに 4 件選ぶ（表示配列に style を付与）
const selectRandomBottles = () => {
  if (!allPosts.value || allPosts.value.length === 0) {
    displayedBottles.value = []
    return
  }
  const shuffled = [...allPosts.value].sort(() => 0.5 - Math.random())
  displayedBottles.value = shuffled.slice(0, Math.min(4, shuffled.length)).map((post, idx) => ({
    ...post,
    style: generateBottleStyle(idx)
  }))
}

// データ取得ラッパー
const fetchPosts = async () => {
  isLoading.value = true
  try {
    const posts = await getThanksPosts()
    
    // ★ 仕様書に基づき、非表示フィルタリングをここで行う (関数は未実装のためコメントアウト)
    // const hiddenIds = await getHiddenPostIds(user.value?.uid);
    // if (hiddenIds) {
    //   allPosts.value = posts.filter(post => !hiddenIds.includes(post.id));
    // } else {
    //   allPosts.value = posts;
    // }
    
    // 現状はフィルタリングなし
    allPosts.value = posts
    
    selectRandomBottles()
  } catch (err) {
    console.error('投稿の取得に失敗:', err)
  } finally {
    isLoading.value = false
  }
}

// 初回マウント時にまず取得（未ログインでも閲覧可能）
onMounted(async () => {
  await fetchPosts()
})

// ★ 認証監視を store/user のみに一本化
// ログイン状態が 'null' -> 'ログイン情報' に変わった時、
// または 'ログイン情報' -> 'null' に変わった時に再フェッチ
watch(user, (newUser, oldUser) => {
  // ログイン状態が変化した時のみ再取得
  if ((newUser?.uid !== oldUser?.uid)) {
    console.log('認証状態が変化したため、投稿を再取得します。');
    fetchPosts()
  }
})

// モーダル開閉制御（下のボタンから）
const openModal = () => {
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedId.value = null
}

// ボトルがクリックされたら（未ログインでも詳細グリッドを開ける）
const handleBottleClick = (bottle) => {
  // 要求どおり、未ログインでも詳細は見られる
  selectedId.value = bottle.id
  // 開く（グリッド表示内でハイライト可能）
  isModalOpen.value = true
}

// ユーザが一覧内のカードをクリックしたら（カード内の操作は ThanksCard 側で判断）
const onCardClicked = (postId) => {
  // グリッド内でクリックされたものをハイライト
  selectedId.value = postId
}

// computed: 海を dim にするか（モーダルが開いていたら dim）
const isDimmed = computed(() => isModalOpen.value)

// 画像取得用バインド（テンプレートで :src="bottleImg" 使う）
</script>

<template>
  <div class="main-view">
    <div class="ocean-container" :class="{ dimmed: isDimmed }">
      <div v-if="isLoading" class="loading-state">
        <div class="wave">🌊</div>
        <p>ボトルメールを探しています...</p>
      </div>

      <div v-else-if="displayedBottles.length === 0" class="empty-state">
        <div class="empty-icon">🏝️</div>
        <p>まだボトルメールが流れていません</p>
        <p class="empty-hint">最初のThanksを投稿してみませんか?</p>
      </div>

      <div v-else class="bottles-area" aria-hidden="false">
        <div
          v-for="(bottle, index) in displayedBottles"
          :key="bottle.id"
          class="bottle-wrapper"
          :style="bottle.style"
          @click="handleBottleClick(bottle)"
        >
          <div class="bottle">
            <img :src="bottleImg" alt="bottle" class="bottle-image" />
          </div>

          <div v-if="bottle.tags && bottle.tags.length > 0" class="bottle-tags">
            <span v-for="(tag, i) in bottle.tags.slice(0, 2)" :key="i" class="tag-badge">#{{ tag }}</span>
            <span v-if="bottle.tags.length > 2" class="tag-more">+{{ bottle.tags.length - 2 }}</span>
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="!isModalOpen"
      class="floating-toggle open-btn"
      @click="openModal"
      title="ボトルを見る"
      aria-label="ボトルを見る"
    >
      ↑
      <span class="tooltip">ボトルを見る</span>
    </button>

    <button
      v-else
      class="floating-toggle close-btn"
      @click="closeModal"
      title="海に戻る"
      aria-label="海に戻る"
    >
      ↓
      <span class="tooltip">海に戻る</span>
    </button>

    <transition name="slide-up">
      <div v-if="isModalOpen" class="detail-overlay" @click.self="closeModal">
        <div class="detail-container">
          <div class="modal-handle"></div>

          <div class="modal-content">
            <h3 class="modal-title">流れてきたボトルメール</h3>

            <div class="cards-grid">
              <ThanksCard
                v-for="b in displayedBottles"
                :key="b.id"
                :post="b"
                @click="onCardClicked(b.id)"
                :class="{ highlighted: selectedId === b.id }"
              />
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
/* ★ ハイライト用スタイル */
.cards-grid .thanks-card.highlighted {
  border-color: #FF8C42;
  box-shadow: 0 4px 12px rgba(255, 140, 66, 0.4);
  transform: scale(1.02);
}
.cards-grid .thanks-card {
  transition: all 0.2s ease-out;
}

.main-view {
  position: relative;
  min-height: calc(100vh - 70px);
  overflow: hidden;
}

/* 海背景 */
.ocean-container {
  position: relative;
  min-height: calc(100vh - 70px);
  background: linear-gradient(to bottom, #87CEEB 0%, #B0E0E6 50%, #ADD8E6 100%);
  transition: filter 0.3s ease;
  padding: 2rem 1rem;
}

.ocean-container.dimmed {
  filter: brightness(0.6);
}

/* ローディング */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: #fff;
  font-size: 1.2rem;
}

.wave {
  font-size: 3rem;
  animation: wave 2s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* ボトルエリア */
.bottles-area {
  position: relative;
  height: 70vh;
  max-width: 1400px;
  margin: 0 auto;
}

/* 浮遊アニメーション（横ドリフト + 縦ゆらぎ） */
.bottle-wrapper {
  position: absolute;
  cursor: pointer;
  transform: translateX(-50%) translateY(-50%);
  z-index: 1;
  transition: transform 0.2s ease;
  animation-name: floatDrift;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-duration: var(--float-duration);
  animation-delay: var(--float-delay);
}

/* アニメーション定義 */
@keyframes floatDrift {
  0% {
    transform: translate(calc(-50% + 0px), calc(-50% + 0px)) rotate(calc(var(--random-rotate)));
  }
  25% {
    transform: translate(calc(-50% + var(--drift-x) * 0.25), calc(-50% - var(--drift-y))) rotate(calc(var(--random-rotate) * 0.4));
  }
  50% {
    transform: translate(calc(-50% + var(--drift-x)), calc(-50% + var(--drift-y) * 0.2)) rotate(calc(var(--random-rotate) * -0.6));
  }
  75% {
    transform: translate(calc(-50% + var(--drift-x) * 0.5), calc(-50% - var(--drift-y) * 0.4)) rotate(calc(var(--random-rotate) * 0.2));
  }
  100% {
    transform: translate(calc(-50% + 0px), calc(-50% + 0px)) rotate(calc(var(--random-rotate)));
  }
}

/* ボトル画像 */
.bottle-image {
  /* ★ サイズを少し大きく */
  width: 110px;
  height: auto;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  transition: transform 0.15s ease;
}

.bottle-wrapper:hover .bottle-image {
  transform: scale(1.08);
}

/* タグをボトルの少し下に表示 */
.bottle-tags {
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  align-items: center;
  z-index: 2;
}

.tag-badge {
  background: rgba(255,255,255,0.95);
  padding: 4px 6px;
  border-radius: 999px;
  font-size: 0.65rem;
  color: #333;
  box-shadow: 0 2px 6px rgba(0,0,0,0.08);
}

.tag-more {
  font-size: 0.65rem;
  color: #555;
  opacity: 0.9;
}

/* 下の固定ボタン（アイコンのみ） */
.floating-toggle {
  position: fixed;
  bottom: 1.8rem;
  left: 50%;
  transform: translateX(-50%);
  width: 56px;
  height: 56px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.6rem;
  color: white;
  cursor: pointer;
  z-index: 110;
  box-shadow: 0 6px 18px rgba(0,0,0,0.18);
  border: none;
}

/* open/close 色分け */
.open-btn {
  background: #FF8C42;
}
.close-btn {
  background: #2196F3;
}

/* tooltip on hover */
.floating-toggle .tooltip {
  display: none;
  position: absolute;
  bottom: 70px;
  background: rgba(0,0,0,0.7);
  color: white;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  white-space: nowrap;
}
.floating-toggle:hover .tooltip {
  display: block;
}

/* スライドアップモーダル（下から） */
.detail-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  background-color: rgba(0,0,0,0.35);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.detail-container {
  width: 100%;
  max-height: 90vh;
  background-color: #FFFAF5;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 16px;
  box-shadow: 0 -4px 24px rgba(0,0,0,0.2);
  overflow-y: auto;
}

/* 小さなハンドル */
.modal-handle {
  width: 48px;
  height: 6px;
  background: #ddd;
  border-radius: 6px;
  margin: 0 auto 12px auto;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
  text-align: center;
  margin-bottom: 1rem;
}

/* グリッド */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}

/* スライドアップアニメーション */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.32s ease;
}
/* vue 3 の transition では opacity も設定可能 */
.slide-up-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.slide-up-enter-to {
  transform: translateY(0);
  opacity: 1;
}
.slide-up-leave-from {
  transform: translateY(0);
  opacity: 1;
}
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* レスポンシブ微調整 */
@media (max-width: 768px) {
  /* ★ スマホでもボトルを少し大きく */
  .bottle-image { width: 90px; }
  .floating-toggle { width: 48px; height: 48px; font-size: 1.2rem; }
  .tag-badge { font-size: 0.6rem; padding: 3px 6px; }
}
</style>