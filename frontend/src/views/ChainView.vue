<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPostChain, getUserProfile } from '../firebaseService'
import { user } from '../store/user'
import Panzoom from 'panzoom'
import ChainPostList from '../components/ChainPostList.vue'

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
  const postId = route.params.id
  try {
    const posts = await getPostChain(postId)
    if (posts && posts.length > 0) {
      chainPosts.value = posts
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
          panzoomInstance.zoom(1.5, { animate: false })
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
    const nodeTop = 100 + depth * 200

    // コンテナの実際の幅を取得
    const containerWidth = mapContainer.value.offsetWidth
    const nodeLeft = (containerWidth * nodeLeftPercent) / 100

    // ビューポートの中心座標
    const viewportCenterX = mapViewport.value.offsetWidth / 2
    const viewportCenterY = mapViewport.value.offsetHeight / 2

    // 現在のズームレベルを取得
    const scale = panzoomInstance.getScale()

    // ノードを中央に配置するために必要なパン量を計算
    const panX = viewportCenterX - (nodeLeft * scale)
    const panY = viewportCenterY - (nodeTop * scale)

    // パンを適用
    panzoomInstance.pan(panX, panY, { animate: true })
  }, 150)
}

// クリーンアップ
onUnmounted(() => {
  if (panzoomInstance) {
    panzoomInstance.destroy()
  }
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
const getColorByDepth = (depth) => {
  const colors = ['#FF8C42', '#2196F3', '#4CAF50', '#9C27B0', '#FF5722', '#795548', '#607D8B']
  return colors[(depth || 0) % colors.length]
}

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

    const top = 100 + depth * 200;
    const left = (100 / (levelNodes.length + 1)) * (indexInLevel + 1);

    const nodeData = {
      ...post,
      originalIndex,
      style: {
        top: `${top}px`,
        left: `${left}%`,
        backgroundColor: getColorByDepth(depth)
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
  const containerHeight = 200 + maxDepth * 200;

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

const getAvatarInitial = (post) => {
  if (!post) return '';
  const name = getAuthorName(post)
  return name.charAt(0).toUpperCase()
}

const handleBack = () => {
  router.push('/')
}
</script>

<template>
  <div class="detail-page">
    <header class="app-header detail-header">
      <button @click="handleBack" class="back-link">← タイムラインに戻る</button>
    </header>

    <div v-if="isLoading" class="loading-container">
      <p>読み込み中...</p>
    </div>

    <div v-else-if="chainPosts.length > 0" class="detail-container">
      <div ref="mapViewport" class="map-viewport">
        <div
          ref="mapContainer"
          class="tree-container"
          :style="{ height: `${treeLayout.containerHeight}px`, width: `${treeLayout.containerHeight * 1.5}px` }"
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
              :y1="line.y1 + 25"
              :x2="`${line.x2}%`"
              :y2="line.y2 + 25"
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
            {{ getAvatarInitial(node) }}
            <span class="node-tooltip">{{ node.text.substring(0, 20) }}...</span>
          </div>

          <div class="tree-levels">
            <div
              v-for="level in (Math.max(...chainPosts.map(p => p.depth || 0), 0) + 1)"
              :key="level"
              class="level-marker"
              :style="{top: `${100 + (level - 1) * 200}px`}"
            >
              Lv.{{ level - 1 }}
            </div>
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
    </div>

    <div v-else class="empty-container">
      <p>投稿が見つかりませんでした。</p>
      <button class="back-btn" @click="handleBack">タイムラインに戻る</button>
    </div>
  </div>
</template>

<style scoped>
.detail-page {
  background-color: #fafafa;
  min-height: 100vh;
  padding: 0;
  margin: 0;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: #fff;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  position: sticky;
  top: 0;
  z-index: 999;
}

.back-link {
  background: none;
  border: none;
  color: #333;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.back-link:hover {
  background-color: #f5f5f5;
  color: #FF8C42;
}

.detail-container {
  width: 100%;
  height: calc(100vh - 60px);
  padding: 0;
  margin: 0;
}

.map-viewport {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  background: #fafafa;
  cursor: grab;
}

.map-viewport:active {
  cursor: grabbing;
}

.tree-container {
  position: relative;
  min-height: 400px;
  width: 100%;
  transform-origin: 0 0;
  touch-action: none;
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
  stroke-width: 2px;
  transition: all 0.3s ease-in-out;
}

.tree-node {
  position: absolute;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1rem;
  color: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  z-index: 2;
  cursor: pointer;
  transition: all 0.2s ease;
  transform: translateX(-50%);
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
  stroke-width: 3px;
  marker-end: url(#arrowhead-highlight);
}

.tree-node:hover {
  transform: translateX(-50%) scale(1.1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}

.tree-node.active {
  box-shadow: 0 0 0 3px #fff, 0 0 0 6px #4CAF50;
}

.tree-node.root {
  width: 60px;
  height: 60px;
  font-weight: bold;
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
  color: #888;
  background: rgba(240, 242, 245, 0.8);
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
  text-align: center;
  padding: 40px 20px;
  background: white;
  margin: 20px auto;
  max-width: 600px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
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
