<script setup>
import { defineProps, ref, onMounted, computed } from 'vue'
import { getUserProfile, getChain, likePost } from '../firebaseService'
import { isPostFormModalOpen, replyToPost } from '../store/modal'
import { user } from '../store/user'
import { RouterLink, useRouter } from 'vue-router'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const router = useRouter()
const authorName = ref('匿名ユーザー')
const authorAvatar = ref(null)
const actionPreviews = ref([])
const isLoadingActions = ref(true)
const allChildActions = ref([])

onMounted(async () => {
  if (!props.post.isAnonymous) {
    try {
      const profile = await getUserProfile(props.post.authorId)
      if (profile) {
        authorName.value = profile.displayName || '名前未設定のユーザー'
        authorAvatar.value = profile.photoURL || null
      }
    } catch (error) {
      console.error("ユーザープロフィールの取得に失敗:", error)
    }
  }

  if (props.post.actionCount > 0) {
    try {
      const actions = await getChain(props.post.id);
      if (actions) {
        allChildActions.value = actions
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

const avatarInitial = computed(() => authorName.value.charAt(0).toUpperCase());
const rootId = computed(() => props.post.rootPostId || props.post.id);

const goToDetail = () => {
  router.push({ name: 'chain', params: { id: rootId.value } })
}

const handleReplyClick = (event) => {
  event.stopPropagation();
  replyToPost.value = props.post;
  isPostFormModalOpen.value = true;
};

const remainingActions = computed(() => {
  const total = allChildActions.value.length;
  const shown = actionPreviews.value.length;
  return total > shown ? total - shown : 0;
});

const myLikeCount = computed(() => {
  if (!user.value || !props.post.likesMap) return 0;
  return props.post.likesMap[user.value.uid] || 0;
});

const handleLike = async (event) => {
  event.stopPropagation();
  if (!user.value) { alert("いいねするにはログインが必要です。"); return; }
  if (myLikeCount.value >= 10) { alert("いいねは一投稿につき10回までです！"); return; }
  try {
    if (props.post.likeCount === undefined) props.post.likeCount = 0;
    props.post.likeCount++;
    if (!props.post.likesMap) props.post.likesMap = {};
    if (!props.post.likesMap[user.value.uid]) props.post.likesMap[user.value.uid] = 0;
    props.post.likesMap[user.value.uid]++;
    await likePost(props.post.id, user.value.uid);
  } catch (error) {
    console.error("いいね処理中にエラー:", error)
    props.post.likeCount--;
    props.post.likesMap[user.value.uid]--;
    alert("いいねに失敗しました。");
  }
}
</script>

<template>
  <div class="card action-card">
    <div class="card-clickable-area" @click="goToDetail">
      <div class="card-header">
        <div class="avatar" :style="authorAvatar ? `background-image: url(${authorAvatar})` : ''">
          <template v-if="!authorAvatar">{{ avatarInitial }}</template>
        </div>
        <div class="user-info">
          <div class="name">{{ authorName }}</div>
          <div class="id">@{{ authorName.toLowerCase().replace(/\s/g, '') }} · {{ formatTimestamp(props.post.timestamp) }}</div>
        </div>
        <span class="post-type action-badge">Next Action</span>
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

      <div class="branch-preview" v-if="allChildActions.length > 0">
        <div class="preview-title">
          <span class="preview-icon">🔄</span>
          <span>Next Action ({{ allChildActions.length }})</span>
        </div>

        <div v-if="isLoadingActions" class="preview-loading">
          <div class="loading-spinner"></div>
          <span>Loading...</span>
        </div>

        <div v-else-if="actionPreviews.length > 0" class="action-previews">
          <div v-for="action in actionPreviews" :key="action.id" class="action-preview-item">
            {{ action.text }}
          </div>

          <RouterLink
            v-if="remainingActions > 0"
            :to="{ name: 'chain', params: { id: rootId } }"
            class="more-actions-link"
            @click.stop
          >
            他{{ remainingActions }}件のアクションを見る
          </RouterLink>
        </div>

        <div v-else class="no-actions">
          <p>アクションの読み込みに失敗しました</p>
        </div>
      </div>
    </div>

    <div class="card-footer">
      <div class="metrics">
        <button @click="handleLike" class="like-button" :title="`10回までいいねできます`">
          <span>❤️ {{ props.post.likeCount || 0 }}</span>
          <span v-if="myLikeCount > 0" class="my-like-count-indicator">
            ({{ myLikeCount }}/10)
          </span>
        </button>
      </div>
      <button @click="handleReplyClick" class="reply-button">この投稿に続ける</button>
    </div>
  </div>
</template>

<style scoped>
.card { background-color: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: transform 0.2s ease, box-shadow 0.2s ease; margin-bottom: 16px; display: flex; flex-direction: column; }
.card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
.card-clickable-area { padding: 16px; cursor: pointer; flex-grow: 1; }
.card-header { display: flex; align-items: center; margin-bottom: 12px; }
.avatar { width: 40px; height: 40px; border-radius: 50%; background-color: #f0f0f0; margin-right: 12px; display: flex; justify-content: center; align-items: center; color: #555; font-weight: bold; background-size: cover; background-position: center; }
.user-info { flex-grow: 1; }
.name { font-weight: bold; color: #333; font-size: 1rem; }
.id { color: #666; font-size: 0.8rem; }
.post-type { color: white; padding: 3px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold; }
.card-body { margin-bottom: 16px; }
.card-body p { color: #333; line-height: 1.5; margin-top: 0; margin-bottom: 12px; }
.tags-container { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.tag { background-color: #f0f2f5; color: #666; padding: 3px 8px; border-radius: 12px; font-size: 0.8rem; }
.card-footer { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background-color: #f9fafb; border-top: 1px solid #f0f0f0; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
.metrics { display: flex; gap: 16px; align-items: center; }
.like-button { background: none; border: none; padding: 0; margin: 0; font-family: inherit; cursor: pointer; display: flex; align-items: center; color: #666; font-size: 0.9rem; }
.like-button:hover { color: #e74c3c; }
.my-like-count-indicator { font-size: 0.75rem; color: #9ca3af; margin-left: 6px; font-weight: normal; background-color: #f3f4f6; padding: 2px 6px; border-radius: 8px; }
.reply-button { background-color: #2196F3; color: white; border: none; border-radius: 16px; padding: 6px 16px; font-size: 0.9rem; font-weight: bold; cursor: pointer; transition: background-color 0.2s; }
.reply-button:hover { background-color: #4dabf5; }
.action-card { border-left: 4px solid #2196F3; }
.action-badge { background-color: #2196F3; }
.feeling-quote { font-style: italic; color: #555; margin: 12px 0; border-left: 3px solid #2196F3; padding-left: 12px; }
.branch-preview { background-color: #f9f9f9; border-radius: 8px; padding: 12px; margin-top: 12px; }
.preview-title { display: flex; align-items: center; margin-bottom: 12px; font-weight: 500; color: #444; }
.preview-icon { margin-right: 6px; }
.preview-loading { display: flex; align-items: center; justify-content: center; padding: 10px 0; color: #666; font-size: 0.9rem; }
.loading-spinner { width: 16px; height: 16px; border: 2px solid #f3f3f3; border-top: 2px solid #2196F3; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
.action-previews { margin-bottom: 8px; }
.action-preview-item { background-color: white; padding: 10px 12px; border-radius: 8px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); line-height: 1.4; border-left: 3px solid #90A4AE; font-size: 0.95rem; color: #333; }
.more-actions-link { display: block; text-align: center; color: #2196F3; font-size: 0.85rem; padding: 6px; text-decoration: none; }
.more-actions-link:hover { text-decoration: underline; }
.no-actions { text-align: center; padding: 10px; color: #666; font-style: italic; font-size: 0.9rem; }
</style>
