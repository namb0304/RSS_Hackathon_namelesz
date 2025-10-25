<script setup>
import { ref, defineEmits } from 'vue'
import { addThanksPost, addNextAction } from '../firebaseService'
import { user } from '../store/user'
import { replyToPost } from '../store/modal'

const emit = defineEmits(['post-success'])

const text = ref('')
const feeling = ref('')
const tags = ref([{ id: 1, value: '' }]) // ← タグの入力方式を戻しました
const isAnonymous = ref(false)

// タグ入力欄の追加・削除
const addTagInput = () => tags.value.push({ id: Date.now(), value: '' })
const removeTagInput = (id) => tags.value = tags.value.filter(tag => tag.id !== id)


const handleSubmit = async () => {
  if (!user.value) {
    alert('投稿するにはログインが必要です。');
    return;
  }
  if (!text.value.trim()) {
    alert('投稿内容を入力してください。');
    return;
  }

  try {
    const validTags = tags.value.map(tag => tag.value.trim()).filter(tagValue => tagValue !== '');

    // 「続ける」モードか「新規投稿」モードかで処理を分岐
    if (replyToPost.value) {
      // 「続ける」場合のデータを作成
      const postData = {
        text: text.value,
        feeling: feeling.value,
        tags: validTags,
        authorId: user.value.uid,
        isAnonymous: isAnonymous.value,
        parentPost: replyToPost.value // ← 親投稿オブジェクトをそのまま渡す
      };
      await addNextAction(postData);

    } else {
      // 「新規投稿」の場合のデータを作成
      const postData = {
        text: text.value,
        feeling: feeling.value,
        tags: validTags,
        authorId: user.value.uid,
        isAnonymous: isAnonymous.value,
      };
      await addThanksPost(postData);
    }

    emit('post-success');

  } catch (error) {
    console.error('投稿エラー:', error);
    alert('投稿に失敗しました。');
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit" class="post-form">
    <h3>{{ replyToPost ? 'この感謝に続ける' : '新しい感謝を投稿する' }}</h3>

    <div class="form-group">
      <label for="text">感謝された出来事</label>
      <textarea id="text" v-model="text" rows="4" placeholder="誰かに感謝された出来事を書きましょう。"></textarea>
    </div>

    <div class="form-group">
      <label for="feeling">その時の気持ち（一言）<span class="optional">任意</span></label>
      <input type="text" id="feeling" v-model="feeling" placeholder="「やってよかった！」「誰かの役に立てた」">
    </div>

    <div class="form-group">
      <label>タグ <span class="optional">任意</span></label>
      <!-- <div v-for="(tag, index) in tags" :key="tag.id" class="tag-input-group"> -->
      <div v-for="tag in tags" :key="tag.id" class="tag-input-group">
        <input type="text" v-model="tag.value" placeholder="例: 職場">
        <button type="button" @click="removeTagInput(tag.id)" v-if="tags.length > 1" class="remove-tag-btn">&times;</button>
      </div>
      <button type="button" @click="addTagInput" class="add-tag-btn">+ タグを追加</button>
    </div>

    <div class="form-group-inline">
      <input type="checkbox" id="isAnonymous" v-model="isAnonymous" />
      <label for="isAnonymous">匿名で投稿する</label>
    </div>

    <button type="submit">{{ replyToPost ? '続けて投稿する' : '投稿する' }}</button>
  </form>
</template>

<style scoped>
.post-form {
  background-color: transparent; /* モーダルの背景色を活かす */
  padding: 2rem 1.5rem 1.5rem;
  margin-bottom: 0;
}
.form-group {
  margin-bottom: 1.5rem;
}
.form-group-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.form-group-inline input[type="checkbox"] {
  width: auto;
}
.form-group-inline label {
  margin-bottom: 0;
  font-weight: normal;
}
.tag-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.remove-tag-btn, .add-tag-btn {
  background: none;
  border: 1px solid #ddd;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: #888;
}
.add-tag-btn {
  border-style: dashed;
  margin-top: 0.5rem;
  width: auto;
  padding: 0.3rem 1rem;
  border-radius: 20px;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: #555;
}
input, textarea {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 5px;
  box-sizing: border-box;
}
.optional {
  font-size: 0.8rem;
  font-weight: normal;
  color: #999;
  margin-left: 0.5rem;
}
button {
  width: 100%;
  padding: 0.8rem;
  font-size: 1rem;
  font-weight: bold;
  color: white;
  background-color: #ee965fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.2s;
}
button:hover {
  filter: brightness(1.1);
}
</style>
