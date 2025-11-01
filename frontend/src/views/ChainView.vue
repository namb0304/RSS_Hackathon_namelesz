<script setup>
import { ref, onMounted, onUnmounted, onBeforeUnmount, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPostChain, getUserProfile } from '../firebaseService'
import { user } from '../store/user'
import Panzoom from 'panzoom'
import ChainPostList from '../components/ChainPostList.vue'
import nodeImage from '../assets/node-image.png'
import flagImage from '../assets/flag.png'

const route = useRoute()
const router = useRouter()
const chainPosts = ref([])
const isLoading = ref(true)
const highlightedPostIndex = ref(0)
const authorProfiles = ref({})
const mapContainer = ref(null)
const mapViewport = ref(null)
let panzoomInstance = null
const isPostListOpen = ref(false)

// 投稿チェーンを読み込む
onMounted(async () => {
  // bodyのスクロールを防止
  document.body.style.overflow = 'hidden'
  document.body.style.height = '100vh'
  document.body.style.width = '100vw'

  const postId = route.params.id
  try {
    const posts = await getPostChain(postId)
    if (posts && posts.length > 0) {
      chainPosts.value = posts

      // デバッグ: 投稿データの構造を確認
      console.log('📝 投稿データサンプル:', posts[0])
      console.log('📅 createdAt存在:', posts[0]?.createdAt)

      await loadAuthorProfiles(posts)

      // クリックされた投稿のインデックスを見つける
      const clickedIndex = posts.findIndex(p => p.id === postId)
      if (clickedIndex !== -1) {
        highlightedPostIndex.value = clickedIndex
      }

      // マップの初期化（データ読み込み後）
      initPanzoom()
    }
  } catch (error) {
    console.error("チェーンの取得に失敗しました:", error)
  } finally {
    isLoading.value = false
  }
})

// Panzoomの初期化
const initPanzoom = () => {
  // 次のTickでDOMが更新されるのを待つ
  setTimeout(() => {
    if (mapContainer.value && mapViewport.value) {
      panzoomInstance = Panzoom(mapContainer.value, {
        maxScale: 3,
        minScale: 0.3,
        startScale: 1,
        cursor: 'move',
        canvas: true,
      })

      // マウスホイールでズーム
      mapViewport.value.addEventListener('wheel', panzoomInstance.zoomWithWheel)

      // 初期ズームと位置を設定
      setTimeout(() => {
        if (panzoomInstance) {
          // zoomAbsで1.5倍にズーム（画面中心を基準に）
          const viewportCenterX = mapViewport.value.offsetWidth / 2
          const viewportCenterY = mapViewport.value.offsetHeight / 2
          panzoomInstance.zoomAbs(viewportCenterX, viewportCenterY, 1.5)

          centerOnHighlightedNode()
        }
      }, 100)
    }
  }, 100)
}

// 選択されたノードを画面中央に配置
const centerOnHighlightedNode = () => {
  if (!panzoomInstance || !mapViewport.value || chainPosts.value.length === 0) return

  setTimeout(() => {
    // ハイライトされた投稿のノード位置を取得
    const targetPost = chainPosts.value[highlightedPostIndex.value]
    if (!targetPost) return

    const depth = targetPost.depth || 0
    const postsByDepth = chainPosts.value.reduce((acc, post) => {
      const d = post.depth || 0
      if (!acc[d]) acc[d] = []
      acc[d].push(post)
      return acc
    }, {})

    const levelNodes = postsByDepth[depth]
    const indexInLevel = levelNodes.findIndex(p => p.id === targetPost.id)

    // ノードの実際の位置を計算（パーセンテージから）
    const nodeLeftPercent = (100 / (levelNodes.length + 1)) * (indexInLevel + 1)
    const nodeTop = 100 + depth * 800

    // コンテナの実際の幅を取得
    const containerWidth = mapContainer.value.offsetWidth
    const nodeLeft = (containerWidth * nodeLeftPercent) / 100

    // ノードのサイズを考慮（ルートノードは380px、それ以外は300px）
    const nodeSize = depth === 0 ? 380 : 300
    const nodeHalfSize = nodeSize / 2

    // ビューポートの中心座標
    const viewportCenterX = mapViewport.value.offsetWidth / 2
    const viewportCenterY = mapViewport.value.offsetHeight / 2

    // 現在のズームレベルを取得
    const transform = panzoomInstance.getTransform()
    const scale = transform.scale

    // ノードを中央に配置するために必要なパン量を計算
    const nodeCenterX = nodeLeft
    const nodeCenterY = nodeTop + nodeHalfSize

    const panX = viewportCenterX - (nodeCenterX * scale)
    const panY = viewportCenterY - (nodeCenterY * scale)

    // デバッグログ（必要に応じてコメントアウト）
    if (false) { // デバッグ時はtrueに変更
      console.log('=== centerOnHighlightedNode Debug ===')
      console.log('選択された投稿:', targetPost.id, targetPost.text?.substring(0, 20))
      console.log('階層 (depth):', depth, '同階層内の位置:', indexInLevel, '/', levelNodes.length)
      console.log('ノードサイズ:', nodeSize, 'px')
      console.log('ノード位置:', nodeLeft.toFixed(2), 'px (', nodeLeftPercent.toFixed(2), '%)')
      console.log('ビューポート中心:', viewportCenterX.toFixed(2), 'px,', viewportCenterY.toFixed(2), 'px')
      console.log('ズーム倍率:', scale)
      console.log('パン:', panX.toFixed(2), 'px,', panY.toFixed(2), 'px')
      console.log('=====================================')
    }

    // パンを適用
    panzoomInstance.moveTo(panX, panY)
  }, 150)
}

// クリーンアップ（コンポーネント破棄前）
onBeforeUnmount(() => {
  console.log('🧹 onBeforeUnmount - クリーンアップ開始')

  // bodyのスクロールを元に戻す
  document.body.style.overflow = ''
  document.body.style.height = ''
  document.body.style.width = ''

  if (panzoomInstance) {
    panzoomInstance.dispose()
  }

  console.log('✅ onBeforeUnmount - クリーンアップ完了')
})

// クリーンアップ（コンポーネント破棄後）
onUnmounted(() => {
  console.log('🧹 onUnmounted - 最終クリーンアップ開始')

  // bodyのスクロールを元に戻す（念のため再度実行）
  document.body.style.overflow = ''
  document.body.style.height = ''
  document.body.style.width = ''

  if (panzoomInstance) {
    panzoomInstance.dispose()
  }

 console.log('✅ onUnmounted - 最終クリーンアップ完了')
})

// 全著者のプロフィール情報を取得
const loadAuthorProfiles = async (posts) => {
  const authorIds = [...new Set(
    posts
      .filter(post => post.authorId && !post.isAnonymous)
      .map(post => post.authorId)
  )];

  for (const authorId of authorIds) {
    try {
      if (!authorProfiles.value[authorId]) {
        const profile = await getUserProfile(authorId)
        if (profile) {
          authorProfiles.value[authorId] = profile
        }
      }
    } catch (error) {
      console.error(`著者情報の取得に失敗: ${authorId}`, error)
    }
  }
}

// 階層ごとの色を取得する関数
// 家系図のレイアウト計算
const treeLayout = computed(() => {
  const nodes = [];
  const connectors = [];
  if (chainPosts.value.length === 0) {
    return { nodes, connectors, containerHeight: 400 };
  }

  const postsByDepth = chainPosts.value.reduce((acc, post) => {
    const depth = post.depth || 0;
    if (!acc[depth]) {
      acc[depth] = [];
    }
    acc[depth].push(post);
    return acc;
  }, {});

  const nodePositions = new Map();

  chainPosts.value.forEach((post, originalIndex) => {
    const depth = post.depth || 0;
    const levelNodes = postsByDepth[depth];
    const indexInLevel = levelNodes.findIndex(p => p.id === post.id);

    const top = 100 + depth * 800;
    const left = (100 / (levelNodes.length + 1)) * (indexInLevel + 1);

    const nodeData = {
      ...post,
      originalIndex,
      style: {
        top: `${top}px`,
        left: `${left}%`
      },
      isRoot: depth === 0
    };
    nodes.push(nodeData);
    nodePositions.set(post.id, { top, left });
  });

  nodes.forEach(node => {
    if (node.replyTo) {
      const parentPos = nodePositions.get(node.replyTo);
      const childPos = nodePositions.get(node.id);

      if (parentPos && childPos) {
        connectors.push({
          id: `${node.replyTo}-${node.id}`,
          x1: parentPos.left,
          y1: parentPos.top,
          x2: childPos.left,
          y2: childPos.top,
        });
      }
    }
  });

  const maxDepth = Math.max(...chainPosts.value.map(p => p.depth || 0), 0);
  const containerHeight = 300 + maxDepth * 800;

  return { nodes, connectors, containerHeight };
});

const highlightedFamilyIds = computed(() => {
  const family = { parent: null, self: null, children: [] };
  if (highlightedPostIndex.value < 0 || highlightedPostIndex.value >= chainPosts.value.length) {
    return family;
  }

  const selectedPost = chainPosts.value[highlightedPostIndex.value];
  if (!selectedPost) return family;

  family.self = selectedPost.id;
  family.parent = selectedPost.replyTo || null;
  family.children = chainPosts.value
    .filter(p => p.replyTo === selectedPost.id)
    .map(p => p.id);

  return family;
});

const highlightThread = (index) => {
  highlightedPostIndex.value = index
  // ノードをクリックしたらポップアップを自動で開く
  if (!isPostListOpen.value) {
    isPostListOpen.value = true
  }
  // 選択されたノードを中央に表示
  centerOnHighlightedNode()
}

const actionPosts = computed(() => {
  return chainPosts.value.filter(post => post.type === 'action')
})

const getAuthorName = (post) => {
  if (!post || !post.authorId) return '読み込み中...';
  if (post.isAnonymous) return '匿名ユーザー'

  const profile = authorProfiles.value[post.authorId]
  return profile?.displayName || '名前未設定のユーザー'
}

// 日付を「2025年10月27日 21:18」形式にフォーマット
const formatDate = (post) => {
  // timestampまたはcreatedAtを取得
  const timestamp = post?.timestamp || post?.createdAt

  if (!timestamp) return '日付なし'
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    if (isNaN(date.getTime())) return '日付なし'
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}年${month}月${day}日 ${hours}:${minutes}`
  } catch (error) {
    console.error('日付のフォーマットエラー:', error)
    return '日付なし'
  }
}

// この投稿から繋がった人数（子投稿数）を取得
const getChildrenCount = (postId) => {
  return chainPosts.value.filter(post => post.replyTo === postId).length
}

// 最大階層数を取得
const getMaxDepth = () => {
  return Math.max(...chainPosts.value.map(p => p.depth || 0), 0)
}

// タグを12文字以内に制限して取得（#を含む）
const getLimitedTags = (tags) => {
  if (!tags || tags.length === 0) return []

  const limitedTags = []
  let totalLength = 0
  const maxLength = 12

  for (let i = 0; i < tags.length; i++) {
    const tag = tags[i]
    const tagWithHash = `#${tag}`
    // 2つ目以降のタグにはスペース分を追加
    const spaceLength = i > 0 ? 1 : 0
    const newLength = totalLength + tagWithHash.length + spaceLength

    console.log(`タグ: ${tagWithHash}, 文字数: ${tagWithHash.length}, 累計: ${newLength}`)

    if (newLength <= maxLength) {
      limitedTags.push(tag)
      totalLength = newLength
    } else {
      console.log(`❌ 12文字超過のため "${tagWithHash}" をスキップ`)
      break
    }
  }

  console.log(`✅ 表示タグ:`, limitedTags, `合計文字数: ${totalLength}`)
  return limitedTags
}

const handleBack = () => {
  console.log('🔙 handleBack called - bodyスタイルをリセットします')

  // 遷移前に必ずbodyスタイルをリセット
  document.body.style.overflow = ''
  document.body.style.height = ''
  document.body.style.width = ''

  console.log('✅ bodyスタイルリセット完了:', {
    overflow: document.body.style.overflow || 'デフォルト',
    height: document.body.style.height || 'デフォルト',
    width: document.body.style.width || 'デフォルト'
  })

  // Panzoomインスタンスも破棄（正しいメソッドはdispose）
  if (panzoomInstance) {
    panzoomInstance.dispose()
    console.log('✅ Panzoomインスタンス破棄完了')
  }

  router.push('/')
}
</script>

<template>
  <div class="detail-page">
    <div v-if="isLoading" class="loading-container">
      <p>読み込み中...</p>
    </div>

    <div v-else-if="chainPosts.length > 0" class="detail-container">
      <div ref="mapViewport" class="map-viewport">
        <div
          ref="mapContainer"
          class="tree-container"
          :style="{ height: `${treeLayout.containerHeight}px`, width: `${treeLayout.containerHeight* 3}px` }"
          :class="{ 'has-selection': !!highlightedFamilyIds.self }"
        >
          <svg class="tree-svg-connectors">
            <defs>
              <marker
                id="arrowhead"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#ccc" />
              </marker>

              <marker
                id="arrowhead-highlight"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF8C42" />
              </marker>
            </defs>

 <line
              v-for="line in treeLayout.connectors"
              :key="line.id"
              :x1="`${line.x1}%`"
              :y1="line.y1 + 150"
              :x2="`${line.x2}%`"
              :y2="line.y2 + 150"
              class="tree-connector-line"
              :class="{
                'is-family-connector':
                  (line.id === `${highlightedFamilyIds.parent}-${highlightedFamilyIds.self}`) ||
                  (highlightedFamilyIds.children.some(childId => line.id === `${highlightedFamilyIds.self}-${childId}`))
              }"
              marker-end="url(#arrowhead)"
            />
          </svg>

          <div
            v-for="node in treeLayout.nodes"
            :key="node.id"
            class="tree-node"
            :class="{
              active: highlightedPostIndex === node.originalIndex,
              root: node.isRoot,
              'is-family': node.id === highlightedFamilyIds.parent ||
                           node.id === highlightedFamilyIds.self ||
                           highlightedFamilyIds.children.includes(node.id)
            }"
            :style="node.style"
            @click="highlightThread(node.originalIndex)"
          >
            <img :src="flagImage" class="flag-image" alt="flag" />

            <!-- 旗の中の情報表示 -->
            <div class="flag-content">
              <div class="flag-author">{{ getAuthorName(node) }}</div>
              <div class="flag-date">{{ formatDate(node) }}</div>
              <div class="flag-divider"></div>
              <div class="flag-tags" v-if="node.tags && node.tags.length > 0">
                <span v-for="tag in getLimitedTags(node.tags)" :key="tag" class="flag-tag">#{{ tag }}</span>
              </div>
              <div class="flag-stats">
                <span class="flag-badge">{{ (node.depth || 0) }}/{{ getMaxDepth() }}層</span>
                <span class="flag-badge">❤️ {{ node.likeCount || 0 }}</span>
                <span class="flag-badge">→{{ getChildrenCount(node.id) }}</span>
              </div>
            </div>

            <img :src="nodeImage" class="node-image" alt="node" />
            <span class="node-tooltip">{{ node.text.substring(0, 20) }}...</span>
          </div>
        </div>

        <!-- 統計情報オーバーレイ -->
        <div class="stats-overlay">
          <div class="stat-item">
            <div class="stat-icon">📊</div>
            <div class="stat-content">
              <div class="stat-label">階層の深さ</div>
              <div class="stat-value">{{ Math.max(...chainPosts.map(p => p.depth || 0), 0) }}</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">🔄</div>
            <div class="stat-content">
              <div class="stat-label">アクション数</div>
              <div class="stat-value">{{ actionPosts.length }}</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">❤️</div>
            <div class="stat-content">
              <div class="stat-label">総いいね数</div>
              <div class="stat-value">{{ chainPosts.reduce((sum, post) => sum + (post.likeCount || 0), 0) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 投稿リストポップアップ -->
      <ChainPostList
        :chainPosts="chainPosts"
        :authorProfiles="authorProfiles"
        :highlightedPostIndex="highlightedPostIndex"
        v-model:isOpen="isPostListOpen"
        @selectPost="highlightThread"
      />

      <!-- 戻るボタン（独立した要素として配置） -->
      <button @click="handleBack" class="back-button">
        ← メイン画面に戻る
      </button>
    </div>

    <div v-else class="empty-container">
      <p>投稿が見つかりませんでした。</p>
      <button class="back-btn" @click="handleBack">メイン画面に戻る</button>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  background-color: #006994;
  height: 100vh;
  width: 100vw;
  padding: 0;
  margin: 0;
  overflow: hidden;
  position: fixed;
  top: 0;
  left: 0;
}

.detail-container {
  width: 100%;
  height: 100vh;
  padding: 0;
  margin: 0;
  overflow: hidden;
  position: relative;
}

.map-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background: linear-gradient(to bottom, #1a8fbd 0%, #006994 50%, #004d6b 100%);
  cursor: grab;
}

.tree-container {
  position: relative;
  min-height: 400px;
  width: 100%;
  transform-origin: 0 0;
  touch-action: none;
  z-index: 1;
}

.tree-svg-connectors {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  overflow: visible;
}

.tree-connector-line {
  stroke: #ccc;
  stroke-width: 3px;
  transition: all 0.3s ease-in-out;
}

.tree-node {
  position: absolute;
  width: 300px;
  height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2;
  cursor: pointer;
  transition: all 0.2s ease;
  transform: translateX(-50%);
  background: none !important;
  box-shadow: none;
}

.flag-image {
  position: absolute;
  top: -20%;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 1;
  pointer-events: none;
}

.flag-content {
  position: absolute;
  top: 7%;
  left: 59%;
  transform: translateX(-50%);
  width: 50%;
  z-index: 3;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 5px 8px;
  font-size: 9px;
  color: #333;
}

.flag-author {
  font-size: 11px;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flag-date {
  font-size: 9px;
  color: #666;
  line-height: 1.2;
}

.flag-divider {
  width: 70%;
  height: 1px;
  background: #ddd;
  margin: 1px 0;
}

.flag-tags {
  font-size: 9px;
  color: #FF8C42;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.flag-tag {
  margin-right: 3px;
}

.flag-stats {
  display: flex;
  gap: 3px;
  margin-top: 1px;
  flex-wrap: wrap;
}

.flag-badge {
  background: rgba(255, 255, 255, 0);
  border: 1px solid #FF8C42;
  color: #333;
  padding: 1px 4px;
  border-radius: 6px;
  font-size: 9px;
  font-weight: normal;
  white-space: nowrap;
}

.node-image {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 2;
}

.tree-container.has-selection .tree-node:not(.is-family) {
  opacity: 0.3;
  transform: translateX(-50%) scale(0.95);
}

.tree-container.has-selection .tree-connector-line:not(.is-family-connector) {
  opacity: 0.15;
}

.tree-connector-line.is-family-connector {
  stroke: #FF8C42;
  stroke-width: 4px;
  marker-end: url(#arrowhead-highlight);
}

.tree-node:hover {
  transform: translateX(-50%) scale(1.15);
}

.tree-node.active {
  transform: translateX(-50%) scale(1.2);
}

.tree-node.root {
  width: 380px;
  height: 380px;
}

.tree-node.root .node-image {
  width: 100%;
  height: 100%;
}

.tree-node.root .flag-content {
  width: 63%;
  left: 65%;
  padding: 6px 10px;
  gap: 2.5px;
}

.tree-node.root .flag-author {
  font-size: 14px;
}

.tree-node.root .flag-date {
  font-size: 11px;
}

.tree-node.root .flag-tags {
  font-size: 11px;
}

.tree-node.root .flag-divider {
  width: 60%;
}

.tree-node.root .flag-badge {
  font-size: 11px;
  padding: 2px 5px;
}

.node-tooltip {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0,0,0,0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
  pointer-events: none;
}

.tree-node:hover .node-tooltip {
  opacity: 1;
  visibility: visible;
}

.tree-levels {
  position: absolute;
  top: 0;
  left: -5px;
  height: 100%;
  width: 100%;
  z-index: 0;
  pointer-events: none;
}

.level-marker {
  position: absolute;
  font-size: 0.8rem;
  color: #ffffff;;
  background: rgba(26, 143, 189, 0.6);
  padding: 2px 5px;
  border-radius: 4px;
}

.stats-overlay {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 180px;
}

.back-button {
  position: fixed !important;
  top: 80px !important;
  left: 20px !important;
  background: #ffffff !important;
  border: 2px solid #FF8C42 !important;
  color: #333 !important;
  font-size: 1rem !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  padding: 14px 24px !important;
  border-radius: 8px !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  z-index: 99999 !important;
  transition: all 0.2s ease !important;
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  pointer-events: auto !important;
  opacity: 1 !important;
  visibility: visible !important;
}

.back-button:hover {
  background: #FF8C42 !important;
  color: white !important;
  transform: translateY(-2px) !important;
  box-shadow: 0 6px 16px rgba(255, 140, 66, 0.4) !important;
}

.back-button:active {
  transform: translateY(0) !important;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stat-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.stat-content {
  flex-grow: 1;
}

.stat-label {
  font-size: 0.75rem;
  color: #666;
  margin-bottom: 2px;
  font-weight: 500;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
  line-height: 1;
}

.loading-container,
.empty-container {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  padding: 40px 20px;
  background: white;
  max-width: 600px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1001;
}

.back-btn {
  background-color: #FF8C42;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  margin-top: 15px;
  cursor: pointer;
  font-weight: bold;
}

.back-btn:hover {
  background-color: #EE965F;
}
</style>

<style>
/* グローバルスタイル：ChainViewページでのスクロール防止 */
body:has(.detail-page) {
  overflow: hidden;
  height: 100vh;
  width: 100vw;
}
</style>
