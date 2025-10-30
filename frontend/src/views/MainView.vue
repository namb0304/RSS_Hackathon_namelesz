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

// ★ 海・ボトルメール・島の世界観に合う色パレット
const OCEAN_COLORS = [
  { name: 'coral', bg: 'rgba(255, 127, 80, 0.7)', border: '#FF7F50', shadow: 'rgba(255, 127, 80, 0.4)' },      // コーラル
  { name: 'turquoise', bg: 'rgba(64, 224, 208, 0.7)', border: '#40E0D0', shadow: 'rgba(64, 224, 208, 0.4)' }, // ターコイズ
  { name: 'ocean', bg: 'rgba(30, 144, 255, 0.7)', border: '#1E90FF', shadow: 'rgba(30, 144, 255, 0.4)' },     // オーシャンブルー
  { name: 'sand', bg: 'rgba(244, 164, 96, 0.7)', border: '#F4A460', shadow: 'rgba(244, 164, 96, 0.4)' },      // サンディブラウン
  { name: 'seaweed', bg: 'rgba(46, 139, 87, 0.7)', border: '#2E8B57', shadow: 'rgba(46, 139, 87, 0.4)' },     // シーグリーン
  { name: 'shell', bg: 'rgba(255, 182, 193, 0.7)', border: '#FFB6C1', shadow: 'rgba(255, 182, 193, 0.4)' },   // シェルピンク
  { name: 'sunset', bg: 'rgba(255, 140, 0, 0.7)', border: '#FF8C00', shadow: 'rgba(255, 140, 0, 0.4)' },      // サンセットオレンジ
  { name: 'pearl', bg: 'rgba(230, 230, 250, 0.7)', border: '#E6E6FA', shadow: 'rgba(230, 230, 250, 0.4)' },   // パールラベンダー
  { name: 'starfish', bg: 'rgba(255, 99, 71, 0.7)', border: '#FF6347', shadow: 'rgba(255, 99, 71, 0.4)' },    // トマトレッド
  { name: 'wave', bg: 'rgba(70, 130, 180, 0.7)', border: '#4682B4', shadow: 'rgba(70, 130, 180, 0.4)' },      // スチールブルー
]

// ★ 物理シミュレーション用の状態
const bottlePositions = ref([])
let animationFrameId = null

// ボトルの初期スタイル生成
const generateBottleStyle = (index, color) => {
  const patterns = [
    { startX: 10, startY: 12, endX: 75, endY: 48 },
    { startX: 70, startY: 8, endX: 15, endY: 52 },
    { startX: 40, startY: 42, endX: 80, endY: 18 },
    { startX: 15, startY: 38, endX: 75, endY: 28 },
    { startX: 20, startY: 22, endX: 70, endY: 24 },
    { startX: 75, startY: 32, endX: 20, endY: 38 },
    { startX: 30, startY: 18, endX: 35, endY: 52 },
    { startX: 65, startY: 48, endX: 60, endY: 12 },
    { startX: 50, startY: 28, endX: 25, endY: 42 },
    { startX: 25, startY: 32, endX: 70, endY: 20 },
  ]
  
  const pattern = patterns[index % patterns.length]
  
  const journeyDuration = Math.random() * 20 + 35
  const journeyDelay = Math.random() * 10
  
  const bobDuration = Math.random() * 5 + 6
  const bobDelay = Math.random() * 2
  const bobY = Math.random() * 60 + 50

  const rotateDuration = Math.random() * 4 + 5
  const rotateDelay = Math.random() * 3
  const rotateAngle = Math.random() * 15 + 10
  
  const wiggleDuration = Math.random() * 3 + 3
  const wiggleDelay = Math.random() * 1.5
  const wiggleX = Math.random() * 40 + 30
  
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
    
    '--bottle-color': color.border,
    '--bottle-shadow': color.shadow,
  }
}

// ★ ボトル同士の反発処理
const updateBottlePhysics = () => {
  const MIN_DISTANCE = 350
  const REPEL_FORCE = 0.7
  
  bottlePositions.value.forEach((bottle, i) => {
    if (!bottle.element) return
    
    let forceX = 0
    let forceY = 0
    
    bottlePositions.value.forEach((other, j) => {
      if (i === j || !other.element) return
      
      const dx = bottle.x - other.x
      const dy = bottle.y - other.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < MIN_DISTANCE && distance > 0) {
        const force = (MIN_DISTANCE - distance) / MIN_DISTANCE
        forceX += (dx / distance) * force * REPEL_FORCE
        forceY += (dy / distance) * force * REPEL_FORCE
      }
    })
    
    bottle.x += forceX
    bottle.y += forceY
    
    bottle.x = Math.max(5, Math.min(85, bottle.x))
    bottle.y = Math.max(5, Math.min(55, bottle.y))
    
    bottle.element.style.setProperty('--repel-x', `${forceX * 10}px`)
    bottle.element.style.setProperty('--repel-y', `${forceY * 10}px`)
  })
  
  animationFrameId = requestAnimationFrame(updateBottlePhysics)
}

const initBottlePhysics = () => {
  const elements = document.querySelectorAll('.bottle-wrapper')
  bottlePositions.value = Array.from(elements).map((el, index) => {
    const rect = el.getBoundingClientRect()
    const containerRect = el.parentElement.getBoundingClientRect()
    return {
      element: el,
      x: ((rect.left - containerRect.left) / containerRect.width) * 100,
      y: ((rect.top - containerRect.top) / containerRect.height) * 100,
    }
  })
  
  if (animationFrameId) cancelAnimationFrame(animationFrameId)
  updateBottlePhysics()
}

// ★ ランダムに4件選び、それぞれに色を割り当てる
const selectRandomBottles = () => {
  if (!allPosts.value || allPosts.value.length === 0) {
    displayedBottles.value = []
    return
  }
  
  const shuffled = [...allPosts.value].sort(() => 0.5 - Math.random())
  const selected = shuffled.slice(0, Math.min(4, shuffled.length))
  
  // ★ 4色をランダムに選択
  const shuffledColors = [...OCEAN_COLORS].sort(() => 0.5 - Math.random())
  const selectedColors = shuffledColors.slice(0, 4)
  
  displayedBottles.value = selected.map((post, idx) => ({
    ...post,
    style: generateBottleStyle(idx, selectedColors[idx]),
    color: selectedColors[idx], // ★ 色情報を保持
  }))
}

// データ取得
const fetchPosts = async () => {
  isLoading.value = true
  try {
    const posts = await getThanksPosts()
    allPosts.value = posts
    selectRandomBottles()
    
    setTimeout(() => {
      initBottlePhysics()
    }, 100)
  } catch (err) {
    console.error('投稿の取得に失敗:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await fetchPosts()
})

watch(user, (newUser, oldUser) => {
  if (newUser?.uid !== oldUser?.uid) {
    fetchPosts()
  }
})

const openModal = () => {
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedId.value = null
}

const handleBottleClick = (bottle) => {
  selectedId.value = bottle.id
  isModalOpen.value = true
}

const onCardClicked = (postId) => {
  selectedId.value = postId
}

const isDimmed = computed(() => isModalOpen.value)

onMounted(() => {
  return () => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId)
  }
})
</script>

<template>
  <div class="main-view">
    <div class="ocean-container" :class="{ dimmed: isDimmed }">

      <div class="shore-waves">
        <div class="wave-layer wave-layer-1"></div>
        <div class="wave-layer wave-layer-2"></div>
        <div class="wave-layer wave-layer-3"></div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="wave-icon">🌊🌊🌊</div>
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
              <span 
                v-for="(tag, i) in bottle.tags.slice(0, 2)" 
                :key="i" 
                class="simple-tag"
                :style="{
                  backgroundColor: bottle.color.bg,
                  borderColor: bottle.color.border,
                  color: '#2C2C2C',
                  boxShadow: `0 2px 8px ${bottle.color.shadow}`
                }"
              >
                #{{ tag }}
              </span>
              <span 
                v-if="bottle.tags.length > 2" 
                class="tag-more"
                :style="{
                  backgroundColor: bottle.color.bg,
                  borderColor: bottle.color.border,
                }"
              >
                +{{ bottle.tags.length - 2 }}
              </span>
            </div>
          </div>
          
        </div>
      </div>
    </div>

    <button
      class="refresh-btn"
      @click="fetchPosts"
      title="別のボトルを探す"
      aria-label="別のボトルを探す"
    >
      別のボトルを探す
    </button>

    <button
      v-if="!isModalOpen"
      class="floating-toggle open-btn"
      @click="openModal"
      title="ボトルメールの詳細を見る"
      aria-label="ボトルメールの詳細を見る"
    >
      ボトルメールの詳細を見る
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
                :bottle-color="b.color"
                :is-selected="selectedId === b.id"
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
.cards-grid .thanks-card.highlighted {
  transform: scale(1.02);
  transition: all 0.2s ease-out;
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

.ocean-container {
  position: relative;
  flex: 1;
  background: linear-gradient(
    to bottom,
    #1E5A7A 0%,
    #2975A0 10%,
    #006994 25%,
    #005A82 40%,
    #00738F 55%,
    #008FA5 68%,
    #C2B280 80%,
    #E8D4B0 90%,
    #EDD9B8 95%,
    #F2DFC0 100%
  );
  transition: filter 0.3s ease;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.ocean-container.dimmed { 
  filter: brightness(0.7); 
}

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
  padding: 2rem 1rem 0 1rem;
  z-index: 4;
}

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
  
  transform: translate(
    calc(var(--repel-x, 0px)), 
    calc(var(--repel-y, 0px))
  );
  transition: transform 0.3s ease-out;
}

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

.bottle-tags {
  position: absolute;
  top: 55%;
  left: 58%;
  transform: translateX(calc(-50% + 25px)) translateY(calc(-50% + 60px)) rotate(8deg);
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: flex-start;
  z-index: 2;
  pointer-events: none;
}

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

.simple-tag {
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  font-family: "游明朝", "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "HG明朝E", "MS P明朝", "MS PMincho", serif;
  border: 2px solid;
  white-space: nowrap;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}

.tag-more {
  font-size: 0.9rem;
  font-weight: 500;
  font-family: "游明朝", "Yu Mincho", "YuMincho", "Hiragino Mincho ProN", "HG明朝E", "MS P明朝", "MS PMincho", serif;
  border-radius: 4px;
  padding: 3px 6px;
  border: 2px solid;
}

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
.open-btn {
  background: #FF8C42;
  width: auto; /* コンテンツに合わせて幅を自動調整 */
  padding: 10px 20px; /* 左右にパディングを追加して楕円形にする */
  border-radius: 25px; /* 丸みを大きくして楕円形にする */
  writing-mode: horizontal-tb; /* テキストを横書きにする */
  text-orientation: mixed; /* 縦書き時の文字の向きをリセット */
  
  /* === refresh-btn から抜粋したフォント設定 === */
  color: white;
  font-weight: 600;
  font-size: 1rem;
  white-space: nowrap; /* テキストを折り返さない */
}

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

.refresh-btn {
  position: fixed;
  bottom: 1.8rem;
  left: 1.8rem;
  padding: 14px 28px;
  border-radius: 999px;
  background: #FF8C42;
  color: white;
  font-weight: 600;
  font-size: 0.95rem;
  border: none;
  cursor: pointer;
  z-index: 110;
  box-shadow: 0 4px 14px rgba(0,0,0,0.18);
  transition: all 0.25s ease;
  white-space: nowrap;
}

.refresh-btn:hover {
  transform: scale(1.08);
  background: #FF8C42;
  box-shadow: 0 6px 18px rgba(0,0,0,0.25);
}

.detail-overlay {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  top: 0;
  background-color: rgba(0,0,0,0.25); /* ★ さらに透過率を上げる */
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.detail-container {
  width: 100%;
  max-height: 90vh;
  background-color: rgba(255, 250, 245, 0.7); /* ★ 0.95 → 0.7 に変更 */
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  padding: 15px;
  box-shadow: 0 -4px 24px rgba(0,0,0,0.2);
  overflow-y: auto;
  backdrop-filter: blur(10px); /* ★ ぼかしを強化 */
}
.modal-handle {
  width: 48px;
  height: 6px;
  background: #ddd;
  border-radius: 6px;
  margin: 0 auto 12px auto;
}
.modal-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #2b2b2b;
  text-align: center;
  margin-bottom: 1rem;
}
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 10px;
}

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
  
  .bottle-tags {
    top: 50%;
    left: 50%;
    transform: translateX(calc(-50% + 15px)) translateY(calc(-50% + 10px)) rotate(8deg); 
  }
  
  .refresh-btn {
    padding: 12px 20px;
    font-size: 0.85rem;
    bottom: 1.5rem;
    left: 1.5rem;
  }
}
</style>