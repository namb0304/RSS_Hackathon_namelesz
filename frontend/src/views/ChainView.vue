<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPostChain, getUserProfile, likePost } from '../firebase'
import { isPostFormModalOpen, replyToPost } from '../store/modal'
import { user } from '../store/user'

const route = useRoute()
const router = useRouter()
const chainPosts = ref([])
const isLoading = ref(true)
const highlightedPostIndex = ref(0)
const authorProfiles = ref({}) // 著者情報をキャッシュ

// 投稿チェーンを読み込む
onMounted(async () => {
  const postId = route.params.id
  try {
    const posts = await getPostChain(postId)
    if (posts && posts.length > 0) {
      chainPosts.value = posts
      await loadAuthorProfiles(posts)
    }
  } catch (error) {
    console.error("チェーンの取得に失敗しました:", error)
  } finally {
    isLoading.value = false
  }
})

// 全著者のプロフィール情報を取得a
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

// いいね機能の追加
const handleLike = async (post, event) => {
  event.stopPropagation();
  if (!user.value) { 
    alert("いいねするにはログインが必要です。"); 
    return; 
  }
  
  const myLikeCount = getMyLikeCount(post);
  if (myLikeCount >= 10) { 
    alert("いいねは一投稿につき10回までです！"); 
    return; 
  }
  
  try {
    if (post.likeCount === undefined) post.likeCount = 0;
    post.likeCount++;
    if (!post.likesMap) post.likesMap = {};
    if (!post.likesMap[user.value.uid]) post.likesMap[user.value.uid] = 0;
    post.likesMap[user.value.uid]++;
    await likePost(post.id, user.value.uid);
  } catch (error) {
    console.error("いいね処理中にエラー:", error)
    post.likeCount--;
    post.likesMap[user.value.uid]--;
    alert("いいねに失敗しました。");
  }
}

/**
 * 指定された投稿に対して返信モーダルを開きます。
 * @param {object} post - 返信対象の投稿オブジェクト
 * @param {Event} event - クリックイベント
 */
const handleReply = (post, event) => {
  event.stopPropagation(); // 親要素のクリックイベント（ハイライト処理）が発火するのを防ぐ
  replyToPost.value = post;
  isPostFormModalOpen.value = true;
};

const getMyLikeCount = (post) => {
  if (!user.value || !post.likesMap) return 0;
  return post.likesMap[user.value.uid] || 0;
}

// 階層ごとの色を取得する関数 (変更なし)
const getColorByDepth = (depth) => {
  const colors = ['#FF8C42', '#2196F3', '#4CAF50', '#9C27B0', '#FF5722', '#795548', '#607D8B']
  return colors[(depth || 0) % colors.length]
}

/**
 * 家系図のレイアウト（ノードの位置と親子を結ぶ線）を計算します。
 */
const treeLayout = computed(() => {
  console.log('--- 🌳 家系図の計算を開始します ---');
  
  const nodes = [];
  const connectors = [];
  if (chainPosts.value.length === 0) {
    console.log('投稿データが空のため、計算を中断します。');
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

    const top = 50 + depth * 100;
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

  console.log('✅ ノードが生成されました:', JSON.parse(JSON.stringify(nodes)));
  console.log('🗺️ ノードの座標が保存されました:', nodePositions);

  nodes.forEach(node => {
    if (node.replyTo) {
      const parentPos = nodePositions.get(node.replyTo);
      const childPos = nodePositions.get(node.id);
      
      if (!parentPos) {
        console.warn(`❗️ 親ノードが見つかりません。投稿ID: ${node.id}, 親のID: ${node.replyTo}`);
      }

      if (parentPos && childPos) {
        console.log(`🔗 線を作成します: 親(${node.replyTo}) -> 子(${node.id})`, { parentPos, childPos });
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
  const containerHeight = 120 + maxDepth * 100;

  console.log('🏁 最終的に生成された線のデータ:', JSON.parse(JSON.stringify(connectors)));
  console.log(`--- 🌳 家系図の計算が完了しました。線は ${connectors.length} 本です ---`);

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
}
const rootPost = computed(() => {
  return chainPosts.value.find(post => post.type === 'thanks') || null
})
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
const formatTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '---';
  const date = timestamp.toDate();
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Intl.DateTimeFormat('ja-JP', options).format(date);
};
const handleBack = () => {
  router.push('/');
}
const handleNextActionClick = () => {
  if (chainPosts.value.length > 0) {
    const originalPost = chainPosts.value[highlightedPostIndex.value]
    replyToPost.value = originalPost
    isPostFormModalOpen.value = true
  }
}
</script>

<template>
  <div class="detail-page">
    <header class="app-header detail-header">
    <RouterLink to="/main/recent" class="back-link">← タイムラインに戻る</RouterLink>
    </header>

    <div v-if="isLoading" class="loading-container">
      <p>読み込み中...</p>
    </div>
      
    <div v-else-if="chainPosts.length > 0" class="detail-container">
      <div class="detail-left">
          
        <div class="thread-container">
          <div 
            v-if="rootPost" 
            class="thread-item thanks-post" 
            :class="{ highlight: highlightedPostIndex === 0 }"
            @click="highlightThread(0)"
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
                  <button @click="handleLike(rootPost, $event)" class="like-button" :title="`10回までいいねできます`">
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
            
          <div 
            v-for="(post, index) in actionPosts" 
            :key="post.id"
            class="thread-item next-action"
            :class="{ highlight: highlightedPostIndex === index + 1 }"
            :style="{ borderLeftColor: getColorByDepth(post.depth) }" @click="highlightThread(index + 1)"
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
                  <button @click="handleLike(post, $event)" class="like-button" :title="`10回までいいねできます`">
                    <span>❤️ {{ post.likeCount || 0 }}</span>
                    <span v-if="getMyLikeCount(post) > 0" class="my-like-count-indicator">
                      ({{ getMyLikeCount(post) }}/10)
                    </span>
                  </button>
                  <button @click="handleReply(post, $event)" class="reply-button">続ける</button>
                </div>
              </div>
              <div class="post-type-badge next-badge" :style="{ backgroundColor: getColorByDepth(post.depth) }"> <span class="badge-icon">🔄</span>NextAction
              </div>
            </div>
          </div>
        </div>
      </div>
        
      <div class="detail-right">
        <div class="family-tree">
          <div class="tree-title">感謝の連鎖マップ <span class="tree-subtitle">(クリックで詳細表示)</span></div>
          <div
            class="tree-container"
            :style="{ height: `${treeLayout.containerHeight}px` }"
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
                :style="{top: `${50 + (level - 1) * 100}px`}">
                Lv.{{ level - 1 }}
              </div>
            </div>
          </div>
        </div>

        <div class="chain-stats">
          <div class="stat-item">
            <div class="stat-label">階層の深さ凸</div>
            <div class="stat-value">{{ Math.max(...chainPosts.map(p => p.depth || 0), 0) }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">アクション数🔄</div>
            <div class="stat-value">{{ actionPosts.length }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">総いいね数❤️</div>
            <div class="stat-value">{{ chainPosts.reduce((sum, post) => sum + (post.likeCount || 0), 0) }}</div>
          </div>
        </div>
      </div>
    </div>
      
    <div v-else class="empty-container">
      <p>投稿が見つかりませんでした。</p>
      <button class="back-btn" @click="handleBack">タイムラインに戻る</button>
    </div>
  </div>
</template>

<style scoped>
/* (前半のスタイルは変更なしのため省略) */
.detail-page {
  background-color: #f0f2f5;
  min-height: 100vh;
  padding-bottom: 60px;
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
  top: 70px;
  z-index: 999;
}
.back-link {
  text-decoration: none;
  color: #333;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
}
.back-link:hover {
  color: #FF8C42;
}
.detail-container {
  padding: 15px;
  display: flex;
  flex-direction: column;
}
@media (min-width: 992px) {
  .detail-container {
    flex-direction: row;
    max-width: 1200px;
    margin: 0 auto;
    gap: 20px;
  }
  .detail-left {
    flex: 6;
  }
  .detail-right {
    flex: 4;
    position: sticky;
    top: 125px; 
    align-self: flex-start;
  }
}
.next-action-btn {
  background-color: #2196F3;
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 20px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 0 15px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: background-color 0.2s;
  width: 100%;
}
.next-action-btn:hover {
  background-color: #0b7dda;
}
.thread-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  overflow: hidden;
}
.thread-item {
  padding: 15px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  transition: background-color 0.2s;
}
.thread-item:last-child {
  border-bottom: none;
}
.thread-item:hover {
  background-color: #f9f9f9;
}
.thread-item.thanks-post {
  border-left: 4px solid #FF8C42;
}
.thread-item.next-action {
  border-left: 4px solid;
  margin-left: 20px;
}
.thread-item.highlight {
  background-color: #f0f8ff;
}
.thread-content {
  display: flex;
  align-items: flex-start;
}
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #ddd;
  margin-right: 10px;
  object-fit: cover;
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

/* --- ▼▼▼ ここから下が修正箇所です ▼▼▼ --- */

.thread-actions {
  display: flex;
  align-items: center;
  margin-top: 12px;
  /* justify-content: space-between; は削除 */
}

.like-button {
  background: none;
  border: none;
  padding: 4px 8px;
  margin: 0;
  font-family: inherit;
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
  font-weight: normal;
  background-color: #f3f4f6;
  padding: 2px 6px;
  border-radius: 8px;
}

/* 続けるボタンのスタイルを修正 */
.reply-button {
  background-color: #4CAF50; /* 色を緑に変更 */
  color: white;
  border: none;
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-left: auto; /* ボタンを右端に配置 */
}

.reply-button:hover {
  background-color: #45a049; /* ホバー時の色を濃い緑に変更 */
}

/* --- ▲▲▲ ここまでが修正箇所です ▲▲▲ --- */

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
  font-size: 1em;
}
.family-tree {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 20px 10px;
  margin-bottom: 20px;
  overflow-x: auto;
}
.tree-title {
  text-align: center;
  margin-bottom: 20px;
  font-weight: bold;
  color: #333;
}
.tree-subtitle {
  font-size: 0.8rem;
  font-weight: normal;
  color: #666;
}
.tree-container {
  position: relative;
  min-height: 400px;
  width: 100%;
  transition: all 0.3s ease-in-out;
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
.tree-connector-line.is-family-connector {
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
.chain-stats {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 15px;
  display: flex;
  justify-content: space-around;
}
.stat-item {
  text-align: center;
}
.stat-label {
  font-size: 0.8rem;
  color: #666;
  margin-bottom: 5px;
}
.stat-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: #333;
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
</style>