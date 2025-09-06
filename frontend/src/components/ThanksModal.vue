<script setup>
import { ref } from 'vue'
// バックエンド担当が作ったaddThanksPost関数を読み込む
import { addThanksPost } from '../firebase.js'

// 親コンポーネントに「閉じて」と伝えるための準備
const emit = defineEmits(['close'])

// フォームの入力内容を保存するための変数
const postText = ref('')
const isAnonymous = ref(false)
const isLoading = ref(false)

// 「投稿する」ボタンが押されたときの処理
const submitPost = async () => {
  if (!postText.value.trim()) {
    alert('感謝の気持ちを入力してください。')
    return
  }
  
  isLoading.value = true // ローディング開始

  try {
    // firebase.jsの関数を呼び出して、データをFirebaseに送信
    await addThanksPost({
      text: postText.value,
      authorId: 'user_placeholder_id', // TODO: 将来的にログイン機能と連携
      isAnonymous: isAnonymous.value,
    })
    
    // 成功したら、親に「閉じて」と伝える
    emit('close')

  } catch (error) {
    console.error("投稿エラー:", error)
    alert("投稿に失敗しました。")
  } finally {
    isLoading.value = false // ローディング終了
  }
}
</script>

<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <h2>感謝を投稿する</h2>
      <textarea
        v-model="postText"
        placeholder="今日あった嬉しいこと、感謝したことは何ですか？"
        rows="5"
      ></textarea>
      
      <div class="options">
        <label>
          <input type="checkbox" v-model="isAnonymous" />
          匿名で投稿する
        </label>
      </div>
      
      <div class="buttons">
        <button @click="$emit('close')" class="btn-cancel">キャンセル</button>
        <button @click="submitPost" class="btn-submit" :disabled="isLoading">
          {{ isLoading ? '投稿中...' : '投稿する' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.modal-content {
  background-color: white;
  padding: 24px;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
}
textarea {
  width: 100%;
  padding: 8px;
  margin: 16px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}
.options {
  margin-bottom: 24px;
}
.buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
button {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
.btn-submit {
  background-color: #42b883;
  color: white;
}
.btn-submit:disabled {
  background-color: #aaa;
}
.btn-cancel {
  background-color: #f0f0f0;
}
</style>