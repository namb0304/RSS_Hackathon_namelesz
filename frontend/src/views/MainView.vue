<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { getThanksPosts } from '../firebaseService'
import { user } from '../store/user'
import { useRouter } from 'vue-router'
import ThanksCard from '../components/ThanksCard.vue'
import bottleImg from '../assets/bottle.png'

const allPosts = ref([])
const displayedBottles = ref([])
const isLoading = ref(true)
const isModalOpen = ref(false)
const selectedId = ref(null)
const router = useRouter()

// -----------------------------------------------------------------
// ★★★ アニメーション調整の「司令塔」 ★★★
// -----------------------------------------------------------------
const generateBottleStyle = (index) => {
  // 10種類の多様な軌道パターン
  const patterns = [
    { startX: 10, startY: 15, endX: 75, endY: 60 },   // 左上 → 右下
    { startX: 70, startY: 10, endX: 15, endY: 65 },   // 右上 → 左下
    { startX: 40, startY: 55, endX: 80, endY: 20 },   // 中央下 → 右上
    { startX: 15, startY: 50, endX: 75, endY: 35 },   // 左下 → 右中央
    { startX: 20, startY: 25, endX: 70, endY: 30 },   // 左上 → 右上(ほぼ水平)
    { startX: 75, startY: 45, endX: 20, endY: 50 },   // 右中 → 左中(ほぼ水平)
    { startX: 30, startY: 20, endX: 35, endY: 60 },   // 左寄り上 → 下
    { startX: 65, startY: 55, endX: 60, endY: 15 },   // 右寄り下 → 上
    { startX: 50, startY: 30, endX: 25, endY: 55 },   // 中央 → 左下
    { startX: 25, startY: 40, endX: 70, endY: 25 },   // 左中 → 右上
  ]
  
  const pattern = patterns[index % patterns.length]
  
  // 1. 大移動 (★35〜55秒かけて移動 - 少しゆっくりに)
  const journeyDuration = Math.random() * 20 + 35
  const journeyDelay = Math.random() * 10
  
  // 2. 縦の「ぷかぷか」 (★6〜11秒周期 - さらにゆったり)
  const bobDuration = Math.random() * 5 + 6
  const bobDelay = Math.random() * 2
  const bobY = Math.random() * 60 + 50 // 50〜110px上下
  
  // 3. 回転のゆらぎ (5〜9秒周期で、±25〜60度回転)
  const rotateDuration = Math.random() * 4 + 5
  const rotateDelay = Math.random() * 3
  const rotateAngle = Math.random() * 35 + 25
  
  // 4. 小刻みな横揺れ (★3〜6秒周期 - 少しゆっくりに)
  const wiggleDuration = Math.random() * 3 + 3
  const wiggleDelay = Math.random() * 1.5
  const wiggleX = Math.random() * 40 + 30 // 30〜70px左右
  
  return {
    '--start-x': `${pattern.startX}%`,
    '--start-y': `${pattern.startY}%`,
    '--end-x': `${pattern.endX}%`,
    '--end-y': `${pattern.endY}%`,
    
    '--journey-duration': `${journeyDuration}s`,
    '--journey-delay': `${journeyDelay}s`,
    
    '--bob-duration': `${bobDuration}s`,
    '--bob-delay': `${bobDelay}s`,
    '--bob-y': `${bobY}px`,
    
    '--rotate-duration': `${rotateDuration}s`,
    '--rotate-delay': `${rotateDelay}s`,
    '--rotate-angle': `${rotateAngle}deg`,
    
    '--wiggle-duration': `${wiggleDuration}s`,
    '--wiggle-delay': `${wiggleDelay}s`,
    '--wiggle-x': `${wiggleX}px`,
  }
}

// ランダムに4件選ぶ
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

// データ取得
const fetchPosts = async () => {
  isLoading.value = true
  try {
    const posts = await getThanksPosts()
    allPosts.value = posts
    selectRandomBottles()
  } catch (err) {
    console.error('投稿の取得に失敗:', err)
  } finally {
    isLoading.value = false
  }
}

// 起動時
onMounted(async () => {
  await fetchPosts()
})

// 認証状態の監視
watch(user, (newUser, oldUser) => {
  if (newUser?.uid !== oldUser?.uid) {
    fetchPosts()
  }
})

// モーダル制御
const openModal = () => {
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedId.value = null
}

// ボトルクリック
const handleBottleClick = (bottle) => {
  selectedId.value = bottle.id
  isModalOpen.value = true
}

// カードクリック (グリッド内で)
const onCardClicked = (postId) => {
  selectedId.value = postId
}

const isDimmed = computed(() => isModalOpen.value)
</script>

<template>
  <div class="main-view">
    <div class="ocean-container" :class="{ dimmed: isDimmed }">

      <div class="waves"></div>

      <div v-if="isLoading" class="loading-state">
        <div class="wave-icon">🌊</div>
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
            
            <div v-if="bottle.tags && bottle.tags.length > 0" class="bottle-tags">
              <span v-for="(tag, i) in bottle.tags.slice(0, 2)" :key="i" class="simple-tag">
                #{{ tag }}
              </span>
              <span v-if="bottle.tags.length > 2" class="tag-more">
                +{{ bottle.tags.length - 2 }}
              </span>
            </div>
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
/* カードハイライト */
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

/* 海のグラデーション */
.ocean-container {
  position: relative;
  min-height: calc(100vh - 70px);
  background: linear-gradient(
    to bottom,
    #87CEEB 0%,   /* 空色 */
    #006994 20%,  /* 水面（濃い） */
    #005073 50%,  /* 水中（最深部） */
    #006994 80%,  /* 水面（濃い） */
    #ADD8E6 100% /* 浅瀬（淡い） */
  );
  transition: filter 0.3s ease;
  padding: 2rem 1rem;
  overflow: hidden;
}
.ocean-container.dimmed { 
  filter: brightness(0.6); 
}

/* 波のアニメーション */
.waves {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 200px;
  pointer-events: none;
  z-index: 0;
}
.waves::before,
.waves::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 100' preserveAspectRatio='none'%3E%3Cpath fill='%23ffffff' d='M 0 50 C 250 100 250 0 500 50 S 750 100 1000 50 L 1000 100 L 0 100 Z' /%3E%3C/svg%3E");
  background-size: 1000px 100px;
  background-repeat: repeat-x;
  animation: wave-scroll 15s linear infinite;
}
.waves::before {
  opacity: 0.1;
  animation-duration: 10s;
  animation-direction: reverse;
}
.waves::after {
  opacity: 0.2;
  animation-duration: 20s;
  bottom: 10px;
}
@keyframes wave-scroll {
  from { background-position-x: 0; }
  to { background-position-x: 1000px; }
}

/* ローディング・空状態 */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  color: #fff;
  font-size: 1.2rem;
  z-index: 1;
  position: relative;
}
.wave-icon {
  font-size: 3rem;
  animation: wave 2s ease-in-out infinite;
}
@keyframes wave {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}
.empty-icon { 
  font-size: 4rem; 
  margin-bottom: 1rem; 
}
.empty-hint { 
  font-size: 0.9rem; 
  opacity: 0.8; 
  margin-top: 0.5rem; 
}

.bottles-area {
  position: relative;
  height: 70vh;
  max-width: 1400px;
  margin: 0 auto;
}

/* アニメーションの定義 (片道) */
@keyframes bottleJourney {
  0% { left: var(--start-x); top: var(--start-y); }
  100% { left: var(--end-x); top: var(--end-y); }
}
@keyframes floatBob {
  0% { transform: translateY(0); }
  100% { transform: translateY(calc(var(--bob-y) * -1)); }
}
@keyframes floatWiggle {
  0% { transform: translateX(0); }
  100% { transform: translateX(var(--wiggle-x)); }
}
@keyframes floatRotate {
  0% { transform: rotate(calc(var(--rotate-angle) * -0.5)); }
  100% { transform: rotate(calc(var(--rotate-angle) * 0.5)); }
}

/* ボトルラッパー (移動 + 上下動) */
.bottle-wrapper {
  position: absolute;
  cursor: pointer;
  z-index: 1;
  animation-name: bottleJourney, floatBob;
  animation-timing-function: ease-in-out, ease-in-out;
  animation-iteration-count: infinite, infinite;
  animation-direction: alternate, alternate;
  animation-fill-mode: backwards, backwards;
  animation-duration: 
    var(--journey-duration),
    var(--bob-duration);
  animation-delay: 
    var(--journey-delay),
    var(--bob-delay);
}

/* .bottle コンテナ (タグの親 + 横揺れ) */
.bottle {
  position: relative;
  display: inline-block;
  animation-name: floatWiggle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
  animation-fill-mode: backwards;
  animation-duration: var(--wiggle-duration);
  animation-delay: var(--wiggle-delay);
}

/* ボトル画像 (回転) */
.bottle-image {
  /* ★ サイズを大きく */
  width: 220px; 
  height: auto;
  filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.25));
  transition: transform 0.3s ease, filter 0.3s ease;
  animation-name: floatRotate;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
  animation-fill-mode: backwards;
  animation-duration: var(--rotate-duration);
  animation-delay: var(--rotate-delay);
}

.bottle-wrapper:hover .bottle-image {
  transform: scale(1.15);
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.4));
  animation-play-state: paused;
}
.bottle-wrapper:hover {
  animation-play-state: paused;
  z-index: 10;
}
.bottle-wrapper:hover .bottle {
  animation-play-state: paused;
}


/* ★★★ 改良: タグのデザイン (中央基点) ★★★ */
.bottle-tags {
  position: absolute;
  /* ★ .bottle コンテナの中央を基点にする */
  top: 50%;
  left: 50%;
  /* ★ 基点から手紙の紐あたりまで微調整 */
  /* translateX(-50%) translateY(-50%) で中央揃えにしつつ、
     ピクセルで右下にずらす */
  /* ★★★ 改良: translateY の値を増やして全体を下に移動 ★★★ */
  /* 以前: translateY(calc(-50% + 15px)) */
  transform: translateX(calc(-50% + 25px)) translateY(calc(-50% + 60px)) rotate(8deg); /* Y方向のオフセットを +15px -> +25px に変更 */
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
  z-index: 2;
  pointer-events: none;
}

/* 紐(ひも) */
.bottle-tags::before {
  content: '';
  position: absolute;
  /* ★ タグの上端左側に紐の「下端」が来るように調整 */
  top: -30px;      /* タグの上端に合わせる */
  left: 0px;   /* タグの少し左に起点 */
  
  /* ★ 紐自体の回転起点 */
  transform-origin: bottom center; 
  
  /* ★★★ 改良: translateYを削除し、rotateのみにする ★★★ */
  /* これにより、紐の下端が top:0, left:5px の位置に来る */
  transform: rotate(-15deg); 
  
  width: 2px;
  height: 35px; /* 紐の長さ */
  background: #902821c3;
  opacity: 0.8;
}
/* 白いタグ本体 */
.simple-tag {
  background: rgba(255, 255, 255, 0.85); /* 半透明 */
  padding: 3px 7px;
  border-radius: 4px;
  font-size: 0.7rem;
  color: #4E4E4E;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.4);
  white-space: nowrap;
}

/* 残り件数 */
.tag-more {
  font-size: 0.7rem;
  color: #4E4E4E;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 4px;
  padding: 2px 4px;
}
/* --- タグデザインここまで --- */


/* 固定ボタン */
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
  transition: transform 0.2s ease;
}
.floating-toggle:hover {
  transform: translateX(-50%) scale(1.1);
}
.open-btn { background: #FF8C42; }
.close-btn { background: #2196F3; }
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

/* モーダル */
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

/* レスポンシブ */
@media (max-width: 768px) {
  .bottle-image { 
    width: 125px; 
  }
  .floating-toggle { 
    width: 48px; 
    height: 48px; 
    font-size: 1.2rem; 
  }
  .simple-tag { 
    font-size: 0.65rem; 
    padding: 3px 6px; 
  }
  
  /* ★ スマホ用のタグ位置調整 */
  .bottle-tags {
    /* (125px幅の画像に合わせる) */
    top: 50%;
    left: 50%;
    /* 中央から右下に微調整 */
    transform: translateX(calc(-50% + 15px)) translateY(calc(-50% + 10px)) rotate(8deg); 
  }
}
</style>