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
  // 10種類の多様な軌道パターン (水平線視点: Y値は海エリア0-60%に制限)
  const patterns = [
    { startX: 10, startY: 10, endX: 75, endY: 45 },   // 左上 → 右中
    { startX: 70, startY: 5, endX: 15, endY: 50 },    // 右上 → 左中
    { startX: 40, startY: 40, endX: 80, endY: 15 },   // 中央 → 右上
    { startX: 15, startY: 35, endX: 75, endY: 25 },   // 左中 → 右上
    { startX: 20, startY: 20, endX: 70, endY: 20 },   // 左上 → 右上(水平)
    { startX: 75, startY: 30, endX: 20, endY: 35 },   // 右中 → 左中(水平)
    { startX: 30, startY: 15, endX: 35, endY: 50 },   // 左寄り上 → 下
    { startX: 65, startY: 45, endX: 60, endY: 10 },   // 右寄り下 → 上
    { startX: 50, startY: 25, endX: 25, endY: 40 },   // 中央 → 左
    { startX: 25, startY: 30, endX: 70, endY: 18 },   // 左中 → 右上
  ]
  
  const pattern = patterns[index % patterns.length]
  
  // 1. 大移動 (35〜55秒かけて移動)
  const journeyDuration = Math.random() * 20 + 35
  const journeyDelay = Math.random() * 10
  
  // 2. 縦の「ぷかぷか」 (6〜11秒周期)
  const bobDuration = Math.random() * 5 + 6
  const bobDelay = Math.random() * 2
  const bobY = Math.random() * 60 + 50 // 50〜110px上下

  // 3. 回転のゆらぎ (5〜9秒周期で、±10〜25度回転)
  const rotateDuration = Math.random() * 4 + 5
  const rotateDelay = Math.random() * 3
  const rotateAngle = Math.random() * 15 + 10 // 10〜25度
  
  // 4. 小刻みな横揺れ (3〜6秒周期)
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

      <!-- 砂浜と海の境界の波 -->
      <div class="shore-waves">
        <div class="wave-layer wave-layer-1"></div>
        <div class="wave-layer wave-layer-2"></div>
        <div class="wave-layer wave-layer-3"></div>
      </div>

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
  display: flex;
  flex-direction: column;
}

/* 海のグラデーション (水平線視点・空なし) */
.ocean-container {
  position: relative;
  flex: 1;
  
  /* 上から: 水平線→遠い海→中間の海→手前の海→波打ち際→砂浜 */
  background: linear-gradient(
    to bottom,
    #1E5A7A 0%,      /* 水平線(濃い青) */
    #2975A0 10%,     /* 遠くの海 */
    #006994 25%,     /* 遠い海 */
    #005A82 40%,     /* 中間の海 */
    #00738F 55%,     /* 手前の海 */
    #008FA5 68%,     /* 波打ち際手前 */
    #C2B280 80%,     /* 波打ち際(砂混じり) */
    #E8D4B0 90%,     /* 砂浜(濡れた部分) */
    #EDD9B8 95%,     /* 砂浜(やや乾いた部分) */
    #F2DFC0 100%     /* 砂浜(乾いた部分) */
  );
  transition: filter 0.3s ease;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ocean-container.dimmed { 
  filter: brightness(0.6); 
}

/* 砂浜と海の境界の波 */
.shore-waves {
  position: absolute;
  bottom: 15%;
  left: 0;
  width: 100%;
  height: 15%;
  pointer-events: none;
  z-index: 3;
}

.wave-layer {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(255, 255, 255, 0.12) 25%,
    rgba(255, 255, 255, 0.22) 50%,
    rgba(255, 255, 255, 0.18) 75%,
    rgba(255, 255, 255, 0.08) 85%,
    transparent 100%
  );
  mix-blend-mode: screen;
}

.wave-layer-1 {
  animation: tide-flow-1 3.5s ease-in-out infinite;
  opacity: 0.85;
}

.wave-layer-2 {
  animation: tide-flow-2 4.5s ease-in-out infinite;
  opacity: 0.7;
  animation-delay: -1.5s;
}

.wave-layer-3 {
  animation: tide-flow-3 5.5s ease-in-out infinite;
  opacity: 0.75;
  animation-delay: -3s;
}

@keyframes tide-flow-1 {
  0%, 100% {
    transform: translateY(0) scaleY(1);
    opacity: 0.85;
  }
  50% {
    transform: translateY(-35px) scaleY(1.4);
    opacity: 0.95;
  }
}

@keyframes tide-flow-2 {
  0%, 100% {
    transform: translateY(0) scaleY(1);
    opacity: 0.7;
  }
  50% {
    transform: translateY(-45px) scaleY(1.3);
    opacity: 0.85;
  }
}

@keyframes tide-flow-3 {
  0%, 100% {
    transform: translateY(0) scaleY(1);
    opacity: 0.75;
  }
  50% {
    transform: translateY(-25px) scaleY(1.5);
    opacity: 0.9;
  }
}

/* ローディング・空状態 */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #fff;
  font-size: 1.2rem;
  z-index: 5;
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
  flex: 1;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  
  /* ボトルは海エリア(上部60%)にのみ配置 */
  padding: 2rem 1rem 0 1rem;
  z-index: 4;
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
  width: 200px; 
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


/* タグのデザイン (中央基点) */
.bottle-tags {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translateX(calc(-50% + 25px)) translateY(calc(-50% + 60px)) rotate(8deg);
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
  top: -30px;
  left: 0px;
  transform-origin: bottom center; 
  transform: rotate(-15deg); 
  width: 2px;
  height: 50px;
  background: #902821c3;
  opacity: 0.8;
}

/* 白いタグ本体 */
.simple-tag {
  background: rgba(255, 255, 255, 0.85);
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
  
  /* スマホ用のタグ位置調整 */
  .bottle-tags {
    top: 50%;
    left: 50%;
    transform: translateX(calc(-50% + 15px)) translateY(calc(-50% + 10px)) rotate(8deg); 
  }
}
</style>