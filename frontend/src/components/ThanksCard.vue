<script setup>
import { defineProps, ref, onMounted, computed } from 'vue'
import { getUserProfile, getChain, likePost } from '../firebase' // ★ likePost をインポート
import { isPostFormModalOpen, replyToPost } from '../store/modal'
import { user } from '../store/user' // ★ ユーザー情報をインポート
// ★ useRouter をインポート
import { RouterLink, useRouter } from 'vue-router'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

// ★ router インスタンスを取得
const router = useRouter()

const authorName = ref('匿名ユーザー')
const authorAvatar = ref(null)
const actionPreviews = ref([])
const isLoadingActions = ref(true)

// 著者のプロフィールをキャッシュするオブジェクト
const authorProfiles = ref({})

onMounted(async () => {
  // 投稿者の情報を取得
  if (!props.post.isAnonymous) {
    try {
      const profile = await getUserProfile(props.post.authorId)
      if (profile) {
        authorName.value = profile.displayName || '名前未設定のユーザー'
        authorAvatar.value = profile.photoURL || null
        authorProfiles.value[props.post.authorId] = profile
      }
    } catch (error) {
      console.error("ユーザープロフィールの取得に失敗:", error)
    }
  }
  
  // NextActionデータの取得（最大2件まで）
  if (props.post.actionCount > 0) {
    try {
      const actions = await getChain(props.post.id)
      if (actions && actions.length > 0) {
        // 最新の2件を取得
        actionPreviews.value = actions.slice(0, 2)
      }
    } catch (error) {
      console.error("アクションの取得に失敗:", error)
    } finally {
      isLoadingActions.value = false
    }
  } else {
    isLoadingActions.value = false
  }
})

const formatTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '---';
  const date = timestamp.toDate();
  const now = new Date();
  
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return '数秒前';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Intl.DateTimeFormat('ja-JP', options).format(date);
};

// アバターの頭文字を取得
const avatarInitial = computed(() => {
  return authorName.value.charAt(0).toUpperCase();
});

// ★ カードがクリックされたら詳細ページへ遷移する
const goToDetail = () => {
  router.push({ name: 'chain', params: { id: props.post.id } })
}

// 「続ける」ボタンが押された時の処理
const handleReplyClick = () => {
  // どの投稿への返信かをストアに保存
  replyToPost.value = props.post;
  // モーダルを開く
  isPostFormModalOpen.value = true;
};

// 残りのアクション数
const remainingActions = computed(() => {
  const total = props.post.actionCount || 0;
  const shown = actionPreviews.value.length;
  return total > shown ? total - shown : 0;
});

// ★★★ ここからが「いいね」関連の処理です ★★★

// ログイン中のユーザーがいいねした回数を計算する
const myLikeCount = computed(() => {
  if (!user.value || !props.post.likesMap) {
    return 0;
  }
  return props.post.likesMap[user.value.uid] || 0;
});

// いいねボタンが押された時の処理
const handleLike = async () => {
  if (!user.value) {
    alert("いいねするにはログインが必要です。");
    return;
  }
  if (myLikeCount.value >= 10) {
    alert("いいねは一投稿につき10回までです！");
    return;
  }
  
  try {
    // 楽観的UI更新：まずローカルのデータを先に更新して画面に即時反映
    if (props.post.likeCount === undefined) props.post.likeCount = 0;
    props.post.likeCount++;
    
    if (!props.post.likesMap) props.post.likesMap = {};
    if (!props.post.likesMap[user.value.uid]) props.post.likesMap[user.value.uid] = 0;
    props.post.likesMap[user.value.uid]++;
    
    // 裏側でデータベースの更新を呼び出す
    await likePost(props.post.id, user.value.uid);

  } catch (error) {
    console.error("いいね処理中にエラー:", error)
    // エラーが起きたら、画面の表示を元に戻す
    props.post.likeCount--;
    props.post.likesMap[user.value.uid]--;
    alert("いいねに失敗しました。");
  }
}
</script>

<template>
  <!-- ★ カード全体にクリックイベントを追加 -->
  <div class="card" @click="goToDetail">
    <div class="card-header">
      <div class="avatar" :style="authorAvatar ? `background-image: url(${authorAvatar})` : ''">
        <template v-if="!authorAvatar">{{ avatarInitial }}</template>
      </div>
      <div class="user-info">
        <div class="name">{{ authorName }}</div>
        <div class="id">@{{ authorName.toLowerCase().replace(/\s/g, '') }} · {{ formatTimestamp(props.post.timestamp) }}</div>
      </div>
      <span class="post-type">Thanks</span>
    </div>
    
    <div class="card-body">
      <p>{{ props.post.text }}</p>
      <div v-if="props.post.feeling" class="feeling-quote">
        "{{ props.post.feeling }}"
      </div>
      <div v-if="props.post.tags && props.post.tags.length > 0" class="tags-container">
        <span v-for="tag in props.post.tags" :key="tag" class="tag">#{{ tag }}</span>
      </div>
    </div>
    
    <div class="branch-preview" v-if="props.post.actionCount > 0">
      <div class="preview-title">
        <span class="preview-icon">🔄</span>
        <span>次のアクション ({{ props.post.actionCount }})</span>
      </div>
      
      <!-- ローディング表示 -->
      <div v-if="isLoadingActions" class="preview-loading">
        <div class="loading-spinner"></div>
        <span>読み込み中...</span>
      </div>
      
      <!-- シンプルなアクションプレビュー -->
      <div v-else-if="actionPreviews.length > 0" class="action-previews">
        <div v-for="action in actionPreviews" :key="action.id" class="action-preview-item">
          {{ action.text }}
        </div>
        
        <!-- 残りのアクションがある場合 -->
        <!-- ★ クリックイベントの伝播を .stop で防ぐ -->
        <RouterLink 
          v-if="remainingActions > 0"
          :to="{ name: 'chain', params: { id: props.post.id } }" 
          class="more-actions-link"
          @click.stop
        >
          他{{ remainingActions }}件のアクションを見る
        </RouterLink>
      </div>
      
      <!-- アクションがない場合 -->
      <div v-else class="no-actions">
        <p>アクションの読み込みに失敗しました</p>
      </div>
    </div>
    
    <div class="card-footer">
      <div class="metrics">
        <!-- ★ いいねボタンのクリックイベントの伝播を .stop で防ぐ -->
        <button @click.stop="handleLike" class="like-button" :title="`10回までいいねできます (現在: ${myLikeCount}回)`">
          ❤️ {{ props.post.likeCount || 0 }}
        </button>
        <span class="action-count">🔄 {{ props.post.actionCount || 0 }}</span>
      </div>
      <!-- ★ 続けるボタンのクリックイベントの伝播を .stop で防ぐ -->
      <button @click.stop="handleReplyClick" class="reply-button">続ける</button>
    </div>
  </div>
</template>

<style scoped>
/* ★ カード全体がクリック可能であることを示すカーソルを追加 */
.card {
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  padding: 16px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: 16px;
  cursor: pointer;
}

.card:hover {
  transform: translateY(-3px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

/* カードヘッダー */
.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f0f0f0;
  margin-right: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #555;
  font-weight: bold;
  background-size: cover;
  background-position: center;
}

.user-info {
  flex-grow: 1;
}

.name {
  font-weight: bold;
  color: #333;
  font-size: 1rem;
}

.id {
  color: #666;
  font-size: 0.8rem;
}

.post-type {
  background-color: #FF8C42;
  color: white;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: bold;
}

/* カード本文 */
.card-body {
  margin-bottom: 16px;
}

.card-body p {
  color: #333;
  line-height: 1.5;
  margin-top: 0;
  margin-bottom: 12px;
}

.feeling-quote {
  font-style: italic;
  color: #555;
  margin: 12px 0;
  border-left: 3px solid #FF8C42;
  padding-left: 12px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.tag {
  background-color: #f0f2f5;
  color: #666;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

/* ブランチプレビュー */
.branch-preview {
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
}

.preview-title {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  color: #444;
}

.preview-icon {
  margin-right: 6px;
}

/* ローディング表示 */
.preview-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 0;
  color: #666;
  font-size: 0.9rem;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #FF8C42;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* シンプルなアクションプレビュー */
.action-previews {
  margin-bottom: 8px;
}

.action-preview-item {
  background-color: white;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  line-height: 1.4;
  border-left: 3px solid #2196F3;
  font-size: 0.95rem;
  color: #333;
}

.more-actions-link {
  display: block;
  text-align: center;
  color: #2196F3;
  font-size: 0.85rem;
  padding: 6px;
  text-decoration: none;
}

.more-actions-link:hover {
  text-decoration: underline;
}

.no-actions {
  text-align: center;
  padding: 10px;
  color: #666;
  font-style: italic;
  font-size: 0.9rem;
}

/* カードフッター */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #eee;
  margin-top: 8px;
}

.metrics {
  display: flex;
  gap: 16px;
}

.like-button, .action-count {
  color: #666;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  cursor: pointer;
}

/* ★ like-button を button タグ用に調整 */
.like-button {
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font-family: inherit;
}

.like-button:hover {
  color: #e74c3c;
}

.reply-button {
  background-color: #FF8C42;
  color: white;
  border: none;
  border-radius: 16px;
  padding: 6px 16px;
  font-size: 0.9rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reply-button:hover {
  background-color: #EE965F;
}
</style>

