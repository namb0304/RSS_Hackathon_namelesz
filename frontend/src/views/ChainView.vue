<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPostChain, getUserProfile } from '../firebase'
import { isPostFormModalOpen, replyToPost } from '../store/modal'

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
      
      // 全投稿の著者情報を読み込む
      await loadAuthorProfiles(posts)
    }
  } catch (error) {
    console.error("チェーンの取得に失敗しました:", error)
  } finally {
    isLoading.value = false
  }
})

// 全著者のプロフィール情報を取得
const loadAuthorProfiles = async (posts) => {
  // ★ 修正点: 先に匿名でない投稿をフィルタリングしてから、著者IDのリストを作成します
  const authorIds = [...new Set(
    posts
      .filter(post => post.authorId && !post.isAnonymous)
      .map(post => post.authorId)
  )];

  for (const authorId of authorIds) {
    try {
      if (!authorProfiles.value[authorId]) { // まだ取得していない場合のみ取得
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

// 投稿ノードをクリックしたときのハイライト処理
const highlightThread = (index) => {
  highlightedPostIndex.value = index
}

// 元の投稿 (ルート) を計算
const rootPost = computed(() => {
  return chainPosts.value.find(post => post.type === 'thanks') || null
})

// 表示対象のNextAction投稿をフィルター
const actionPosts = computed(() => {
  return chainPosts.value.filter(post => post.type === 'action')
})

// 投稿の著者名を取得
const getAuthorName = (post) => {
  if (!post || !post.authorId) return '読み込み中...';
  if (post.isAnonymous) return '匿名ユーザー'
  
  const profile = authorProfiles.value[post.authorId]
  return profile?.displayName || '名前未設定のユーザー'
}

// アバター表示用の頭文字を取得
const getAvatarInitial = (post) => {
  if (!post) return '';
  const name = getAuthorName(post)
  return name.charAt(0).toUpperCase()
}

// タイムスタンプのフォーマット
const formatTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '---';
  const date = timestamp.toDate();
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Intl.DateTimeFormat('ja-JP', options).format(date);
};

// 戻るボタンのハンドラー
const handleBack = () => {
  router.push('/');
}

// NextActionボタンのハンドラー
const handleNextActionClick = () => {
  if (chainPosts.value.length > 0) {
    const originalPost = chainPosts.value[highlightedPostIndex.value]
    replyToPost.value = originalPost
    isPostFormModalOpen.value = true
  }
}

// 階層（depth）ごとの色を取得
const getColorByDepth = (depth) => {
  const colors = ['#FF8C42', '#2196F3', '#4CAF50', '#9C27B0', '#FF5722']
  return colors[(depth || 0) % colors.length]
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
      <!-- 左側：スレッド表示 -->
      <div class="detail-left">
        <button class="next-action-btn" @click="handleNextActionClick">
        この体験に触発されてあなたがしたアクションを投稿する
        </button>
         
        <div class="thread-container">
          <!-- きっかけ投稿 (ルート) -->
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
              </div>
              <div class="post-type-badge thanks-badge">
                <span class="badge-icon">🙏</span>感謝
              </div>
            </div>
          </div>
           
          <!-- NextAction投稿 -->
          <div 
            v-for="(post, index) in actionPosts" 
            :key="post.id"
            class="thread-item next-action"
            :class="{ highlight: highlightedPostIndex === index + 1 }"
            @click="highlightThread(index + 1)"
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
              </div>
              <div class="post-type-badge next-badge">
                <span class="badge-icon">🔄</span>NextAction
              </div>
            </div>
          </div>
        </div>
      </div>
       
      <!-- 右側：家系図・ツリー表示 -->
      <div class="detail-right">
        <div class="family-tree">
          <div class="tree-title">感謝の連鎖マップ <span class="tree-subtitle">(クリックで詳細表示)</span></div>
          <div class="tree-container">
            <!-- ルートノード (感謝投稿) -->
            <div 
              v-if="rootPost"
              class="tree-node root" 
              :class="{ active: highlightedPostIndex === 0 }"
              :style="{ top: '50px', left: '50%', backgroundColor: getColorByDepth(0) }"
              @click="highlightThread(0)"
            >
              {{ getAvatarInitial(rootPost) }}
              <span class="node-tooltip">{{ rootPost.text.substring(0, 20) }}...</span>
            </div>
             
            <!-- NextActionノード (動的配置) -->
            <template v-for="(post, index) in actionPosts" :key="post.id">
              <div 
                class="tree-node" 
                :class="{ active: highlightedPostIndex === index + 1 }"
                :style="{ 
                  top: `${120 + Math.floor(index / 3) * 80}px`, 
                  left: `${(index % 3 * 30) + 20}%`,
                  backgroundColor: getColorByDepth(post.depth)
                }"
                @click="highlightThread(index + 1)"
              >
                {{ getAvatarInitial(post) }}
                <span class="node-tooltip">{{ post.text.substring(0, 20) }}...</span>
              </div>
               
              <!-- 接続線 -->
              <div 
                class="tree-connector" 
                :style="{
                  top: `${85 + Math.floor((index - 1) / 3) * 80}px`,
                  left: '50%', 
                  width: `${Math.abs((index % 3 * 30) + 20 - 50) * 2}px`,
                  transform: `rotate(${(index % 3 * 30) + 20 < 50 ? 45 : -45}deg) scaleX(${Math.abs((index % 3 * 30) + 20 - 50) / 50})`
                }"
              ></div>
            </template>

            <!-- 階層表示 -->
            <div class="tree-levels">
              <div class="level-marker" style="top: 50px; left: 10px;">Lv.0</div>
              <div v-for="level in Math.max(...chainPosts.map(p => p.depth || 0), 0)" :key="level" 
                   class="level-marker" 
                   :style="{top: `${120 + (level-1) * 80}px`, left: '10px'}">
                Lv.{{ level }}
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
/* 詳細ページ全体のスタイル */
.detail-page {
  background-color: #f0f2f5;
  min-height: 100vh;
  padding-bottom: 60px;
}

/* ヘッダースタイル */
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
  z-index: 1000;
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

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.icon {
  cursor: pointer;
  color: #666;
  font-size: 0.9rem;
}

/* 詳細コンテナ */
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
    top: 80px;
    align-self: flex-start;
  }
}

/* 次のアクションボタン */
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

.btn-icon {
  margin-right: 6px;
  font-size: 1.1em;
}

/* スレッドコンテナ */
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

/* 投稿種類による分類 */
.thread-item.thanks-post {
  border-left: 4px solid #FF8C42;
}

.thread-item.next-action {
  border-left: 4px solid #2196F3;
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

/* タイプバッジ */
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

.next-badge {
  background-color: #2196F3;
}

.badge-icon {
  margin-right: 4px;
  font-size: 1em;
}

/* 家系図スタイル */
.family-tree {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  padding: 20px 10px;
  margin-bottom: 20px;
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
  height: 400px;
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
  transform: translateX(-50%); /* 中心を基準に配置 */
}

.tree-node:hover {
  transform: translateX(-50%) scale(1.05);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
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

.tree-connector {
  position: absolute;
  height: 2px;
  background-color: #ccc;
  z-index: 1;
  transform-origin: 0 0;
}

.tree-levels {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  z-index: 0;
}

.level-marker {
  position: absolute;
  font-size: 0.8rem;
  color: #888;
  background: rgba(255,255,255,0.8);
  padding: 2px 5px;
  border-radius: 4px;
}

/* 連鎖の統計情報 */
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

/* ローディングとエラー表示 */
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
