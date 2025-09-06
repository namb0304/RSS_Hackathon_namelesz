<script setup>
import { defineProps, ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getUserProfile, likePost } from '../firebase'
import { isPostFormModalOpen, replyToPost } from '../store/modal'
import { user } from '../store/user'

const props = defineProps({
  post: {
    type: Object,
    required: true
  }
})

const router = useRouter()

const authorName = ref('匿名ユーザー')

onMounted(async () => {
  if (props.post.isAnonymous) return
  if (!props.post.authorId) {
    authorName.value = '不明なユーザー'
    return
  }
  const profile = await getUserProfile(props.post.authorId)
  if (profile && profile.displayName) {
    authorName.value = profile.displayName
  } else {
    authorName.value = '名前未設定のユーザー'
  }
})

const formatTimestamp = (timestamp) => {
  if (!timestamp || !timestamp.toDate) return '---';
  const date = timestamp.toDate();
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Intl.DateTimeFormat('ja-JP', options).format(date);
};

const handleReplyClick = () => {
  replyToPost.value = props.post
  isPostFormModalOpen.value = true
}

const myLikeCount = computed(() => {
  if (props.post.likesMap && user.value) {
    return props.post.likesMap[user.value.uid] || 0;
  }
  return 0;
});

// ★★★ ここが新しい「いいね」の処理です ★★★
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
    // まず、ローカルのデータを先に更新して画面に即時反映させる
    // 1. 全体のいいね数を1増やす
    if (props.post.likeCount === undefined) props.post.likeCount = 0;
    props.post.likeCount++;

    // 2. 自分のいいね数を1増やす
    if (!props.post.likesMap) props.post.likesMap = {};
    if (!props.post.likesMap[user.value.uid]) props.post.likesMap[user.value.uid] = 0;
    props.post.likesMap[user.value.uid]++;

    // 次に、裏側でデータベースの更新を呼び出す
    await likePost(props.post.id, user.value.uid);

  } catch (error) {
    console.error("いいね処理中にエラー:", error)
    // もしエラーが起きたら、画面の表示を元に戻す
    props.post.likeCount--;
    props.post.likesMap[user.value.uid]--;
    alert("いいねに失敗しました。");
  }
}
</script>

<template>
  <div class="thanks-card">
    <div class="chain-connector">
      <div class="line top-line" v-if="props.post.type === 'action'"></div>
      <div class="dot"></div>
      <div class="line bottom-line" v-if="props.post.actionCount > 0 || props.post.type === 'action'"></div>
      <div class="line end-line" v-else></div>
    </div>

    <div class="card-content">
      <div class="card-header">
        <span class="post-type" :class="props.post.type">{{ props.post.type === 'thanks' ? 'Thanks' : 'Next Action' }}</span>
        <span class="timestamp">{{ formatTimestamp(props.post.timestamp) }}</span>
      </div>

      <RouterLink :to="`/chain/${post.id}`" class="card-link">
        <p class="post-text">{{ props.post.text }}</p>

        <p v-if="props.post.feeling" class="post-feeling">
          "{{ props.post.feeling }}"
        </p>

        <div v-if="props.post.tags && props.post.tags.length > 0" class="post-tags">
          <span v-for="(tag, index) in props.post.tags" :key="index" class="tag">
            #{{ tag }}
          </span>
        </div>
      </RouterLink>

      <div class="card-footer">
        <span class="author">{{ authorName }}</span>
          <div class="actions">
            <button @click="handleLike" class="like-button" :disabled="myLikeCount >= 10" title="10回までいいねできます">
              ❤️
              <span class="count">{{ props.post.likeCount || 0 }}</span>
              <span v-if="myLikeCount > 0" class="my-like-badge">+{{ myLikeCount }}</span>
            </button>
            
            <button @click="handleReplyClick" class="reply-button">
              続ける
            </button>
            </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 既存のスタイルはそのまま */
.thanks-card {
  display: flex;
  gap: 1.5rem;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.08);
  padding: 1.8rem;
  transition: transform 0.2s ease-in-out;
  overflow: hidden;
  border: 1px solid #fdeee0;
}
.thanks-card:hover {
  transform: translateY(-5px);
}
.chain-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 6px;
}
.dot {
  width: 10px;
  height: 10px;
  background-color: #f7c9aa;
  border-radius: 50%;
  flex-shrink: 0;
  border: 5px solid #fff;
  outline: 2px solid #f7c9aa;
  outline-offset: -2px;
  box-shadow: 0 0 0 1px #f7c9aa;
}
.line {
  width: 2px;
  background-color: #fbe5d6;
}
.top-line {
  height: 6rem;
  margin-bottom: 0.5rem;
}
.bottom-line {
  flex-grow: 1;
  min-height: 4rem;
  margin-top: 0.5rem;
}
.end-line {
  height: 12rem;
  margin-top: 0.5rem;
}
.card-content {
  flex-grow: 1;
  min-width: 0;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.card-link {
  text-decoration: none;
  color: inherit;
  display: block; /* クリック範囲を広げる */
}
.post-type {
  font-weight: bold;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  color: white;
  font-size: 0.8rem;
}
.post-type.thanks { background-color: #ee965fff; }
.post-type.action { background-color: #6c757d; }
.timestamp { font-size: 0.85rem; color: #a0a0a0; }

.post-text {
  font-size: 1.1rem;
  line-height: 1.7;
  color: #333;
  margin-top: 0;
  margin-bottom: 1rem;
}
.post-feeling {
  font-style: italic;
  color: #555;
  margin: 1.5rem 0;
  border-left: 3px solid #fdeee0;
  padding-left: 1rem;
  font-size: 1rem;
}
.post-tags {
  margin-bottom: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.tag {
  background-color: #f7f7f7;
  color: #777;
  padding: 0.3rem 0.7rem;
  border-radius: 15px;
  font-size: 0.8rem;
}
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}
.author { font-weight: bold; color: #666; font-size: 0.9rem; }
.actions { display: flex; gap: 0.8rem; align-items: center; }

.reply-button {
  background-color: transparent;
  color: #ee965f;
  border: 1px solid #ee965f;
  border-radius: 20px;
  padding: 0.4rem 1rem; /* 少し大きく */
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
}
.reply-button:hover { background-color: #ee965f; color: white; }

/* ★★★ いいねボタン用のスタイルを追加 ★★★ */
.like-button {
  position: relative; /* バッジの位置の基準 */
  background-color: #f5f5f5;
  border: 1px solid #eee;
  padding: 0.4rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: bold;
  color: #555;
  transition: all 0.2s;
}
.like-button:hover {
  background-color: #fff2e8;
  border-color: #fdeee0;
}
.like-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background-color: #f5f5f5;
}
.like-button .count {
  color: #e53935;
}
.my-like-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background-color: #dc8144ff;
  color: white;
  font-size: 0.7rem;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px solid white;
}
</style>