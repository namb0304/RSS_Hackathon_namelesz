<script setup>
import { ref, onMounted } from 'vue'
import ThanksCard from '../components/ThanksCard.vue'
import { getThanksPosts } from '../firebase.js'

const posts = ref([])

onMounted(async () => {
  // ★★★ この2行を追加 ★★★
  console.log("これからFirebaseからデータを取得します...")
  // ★★★ ここまで ★★★

  const firebasePosts = await getThanksPosts()

  // ★★★ この1行を追加 ★★★
  console.log("取得したデータ:", firebasePosts)
  // ★★★ ここまで ★★★

  posts.value = firebasePosts
})
</script>

<template>
  <main>
    <h1>Onde タイムライン</h1>
    
    <div class="timeline">
      <ThanksCard 
        v-for="post in posts" 
        :key="post.id" 
        :post="post" 
      />
    </div>
  </main>
</template>

<style scoped>
.timeline {
  margin-top: 20px;
}
</style>