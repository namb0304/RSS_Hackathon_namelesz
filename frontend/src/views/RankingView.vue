<script setup>
import { ref, onMounted, watch } from 'vue'
// Firebaseからランキングデータを取得する関数（この関数は別途作成する必要があります）
import { fetchRankingPosts } from '../firebaseService'
import ThanksCard from '../components/ThanksCard.vue'

// リアクティブな状態変数
const posts = ref([])
const isLoading = ref(true)
const selectedPeriod = ref('daily') // 'daily', 'weekly', 'monthly' のいずれか

/**
 * 指定された期間のランキングデータを非同期で読み込む関数っす。
 * @param {string} period - 取得する期間 ('daily', 'weekly', 'monthly')
 */
const loadRanking = async (period) => {
  isLoading.value = true
  try {
    // firebase.js に実装するであろう、期間に応じた投稿を
    // 「繋いだ数」でソートして返す関数を呼び出します。
    const rankedPosts = await fetchRankingPosts(period)
    posts.value = rankedPosts
  } catch (error) {
    console.error('ランキングの取得に失敗しました:', error)
    posts.value = [] // エラーが発生したらリストを空にします。
  } finally {
    isLoading.value = false
  }
}

// 期間を選択するための関数
const selectPeriod = (period) => {
  selectedPeriod.value = period
}

// コンポーネントが最初に表示された時、まず日刊ランキングを読み込みます。
onMounted(() => {
  loadRanking(selectedPeriod.value)
})

// selectedPeriod の値が変わったら（＝タブがクリックされたら）、
// 新しい期間でランキングを再読み込みします。
watch(selectedPeriod, (newPeriod) => {
  loadRanking(newPeriod)
})
</script>

<template>
  <div class="page-container">
    <h2>ランキング</h2>

    <nav class="ranking-tabs">
      <a
        href="#"
        @click.prevent="selectPeriod('daily')"
        :class="{ active: selectedPeriod === 'daily' }"
      >
        日刊
      </a>
      <a
        href="#"
        @click.prevent="selectPeriod('weekly')"
        :class="{ active: selectedPeriod === 'weekly' }"
      >
        週刊
      </a>
      <a
        href="#"
        @click.prevent="selectPeriod('monthly')"
        :class="{ active: selectedPeriod === 'monthly' }"
      >
        月刊
      </a>
    </nav>

    <div v-if="isLoading" class="message">
      <p>ランキングを集計中...</p>
    </div>

    <div v-else-if="posts.length > 0" class="ranking-list">
      <div
        v-for="(post, index) in posts"
        :key="post.id"
        class="ranking-item"
      >
        <div class="rank-badge">{{ index + 1 }}</div>
        <ThanksCard :post="post" />
      </div>
    </div>

    <div v-else class="message">
      <p>ランキング対象の投稿がまだありません。</p>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 800px;
  margin: 2rem auto;
  padding: 0 1rem;
}

h2 {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2rem;
  font-family: 'Nunito', sans-serif;
  font-weight: 800;
  /* ランキング用にちょっとゴージャスなグラデーションにしてみました */
  background: linear-gradient(45deg, #FFD700, #FF8C42);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
}

/* 期間選択タブのスタイル */
.ranking-tabs {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2.5rem;
}

.ranking-tabs a {
  padding: 0.6rem 1.8rem;
  text-decoration: none;
  color: #888;
  font-weight: bold;
  border: 2px solid #eee;
  border-radius: 999px; /* 角を丸くしてカプセル型に */
  transition: all 0.3s ease;
  cursor: pointer;
}

.ranking-tabs a:hover {
  background-color: #f7f7f7;
  border-color: #ddd;
}

/* 選択中のタブのスタイル */
.ranking-tabs a.active {
  background-color: #dc8144ff;
  color: #fff;
  border-color: #dc8144ff;
  box-shadow: 0 4px 10px rgba(220, 129, 68, 0.3);
}

/* ランキングリスト全体のスタイル */
.ranking-list {
  display: grid;
  gap: 2.5rem;
}

.ranking-item {
  position: relative;
  /* 順位バッジを配置するために左に余白を確保 */
  padding-left: 60px;
}

/* 順位を表示するバッジのスタイル */
.rank-badge {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 45px;
  height: 45px;
  background-color: #f0f0f0;
  color: #555;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: bold;
  font-family: 'Nunito', sans-serif;
  border: 2px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 1位から3位までのバッジの色を特別にします */
.ranking-item:nth-child(1) .rank-badge {
  background-color: #FFD700; /* Gold */
  color: #fff;
  border-color: #e6c200;
}
.ranking-item:nth-child(2) .rank-badge {
  background-color: #C0C0C0; /* Silver */
  color: #fff;
  border-color: #adadad;
}
.ranking-item:nth-child(3) .rank-badge {
  background-color: #CD7F32; /* Bronze */
  color: #fff;
  border-color: #b8722d;
}

.message {
  text-align: center;
  color: #666;
  margin-top: 3rem;
  font-size: 1.1rem;
}
</style>
