<script setup>
import { computed } from 'vue'
defineOptions({ name: 'ChainNode' })

const props = defineProps({
  node: Object,
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
})

// レイアウト用の定数
const levelHeight = 100   // 階層の高さ
const branchWidth = 120   // 枝の横の長さ
const nodeWidth = 80      // 投稿表示部分の幅
const nodeHeight = 40     // 投稿表示部分の高さ

// 子ノードのレイアウトを計算
const childrenLayout = computed(() => {
  return props.node.children.map((child, index) => {
    // 左右交互に配置
    const side = index % 2 === 0 ? -1 : 1
    // 同じサイドが続く場合は少しずらす
    const xOffset = side * (branchWidth + Math.floor(index / 2) * 40)
    return {
      childNode: child,
      x: props.x + xOffset,
      y: props.y + levelHeight
    }
  })
})
</script>

<template>
  <g>
    <rect 
      :x="x - (node.post.type === 'thanks' ? 60 : nodeWidth / 2)" 
      :y="y - (node.post.type === 'thanks' ? 20 : nodeHeight / 2)"
      :width="node.post.type === 'thanks' ? 120 : nodeWidth" 
      :height="node.post.type === 'thanks' ? 30 : nodeHeight"
      :fill="node.post.type === 'thanks' ? '#d4b499' : '#fff'"
      :stroke="node.post.type === 'thanks' ? 'none' : '#fdeee0'"
      rx="5"
    />

    <g v-for="child in childrenLayout" :key="child.childNode.post.id">
      <path 
        :d="`
          M ${x} ${y + (node.post.type === 'thanks' ? 10 : nodeHeight / 2)} 
          V ${y + levelHeight - nodeHeight / 2} 
          H ${child.x}
        `"
        stroke="#d4b499" 
        stroke-width="3" 
        fill="none" 
      />
      <ChainNode 
        :node="child.childNode" 
        :x="child.x" 
        :y="child.y"
      />
    </g>
  </g>
</template>