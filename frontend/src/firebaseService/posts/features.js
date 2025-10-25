import {
  getDocs,
  query,
  where,
  orderBy,
  limit,
  // collection // collection をインポート
} from "firebase/firestore";
// config.js から db と postsCollection をインポートする想定
import { postsCollection } from '../config';


/**
 * 繋いだ数（actionCount）に基づいたランキング投稿を取得する関数【最終版】
 * @param {string} period - ランキングの集計期間 ('daily', 'weekly', 'monthly')
 * @returns {Promise<Array>} ランキング順にソートされた投稿の配列
 */
export const fetchRankingPosts = async (period) => {
  const now = new Date();
  let startDate;

  // 期間の計算ロジックをカレンダー基準に修正
  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'weekly':{
      startDate = new Date(now);
      const dayOfWeek = now.getDay(); // 0=日, 1=月, ..., 6=土
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 月曜始まり
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  // クエリ以降の処理
  const q = query(
    postsCollection,
    where("type", "==", "thanks"), // Thanks投稿のみを対象
    where("timestamp", ">=", startDate), // 指定期間以降
    orderBy("timestamp", "desc"), // 新しい順 (念のため)
    limit(50) // 取得件数を制限 (パフォーマンスのため)
  );

  const querySnapshot = await getDocs(q);
  const posts = [];
  querySnapshot.forEach((doc) => {
    posts.push({ id: doc.id, ...doc.data() });
  });

  // actionCount でソートして上位10件を返す
  const sortedPosts = posts.sort((a, b) => {
    const countA = a.actionCount || 0;
    const countB = b.actionCount || 0;
    // actionCount が同じ場合は、新しい投稿を優先する (任意)
    if (countB === countA) {
      return (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0);
    }
    return countB - countA;
  });

  return sortedPosts.slice(0, 10);
};


/**
 * タグまたは内容で投稿を検索する関数
 * @param {string} queryText - 検索する文字列
 * @param {string} type - 検索タイプ ('tag' or 'content')
 * @returns {Promise<Array>} 検索結果の投稿配列
 */
export const searchPosts = async (queryText, type) => {
  const trimmedQuery = queryText.trim();
  if (!trimmedQuery) {
    return []; // 検索文字列が空なら空配列を返す
  }

  // 投稿を新しい順で並べておくベースクエリ
  const baseQuery = query(postsCollection, orderBy("timestamp", "desc"));

  // 1. タグ検索の場合
  if (type === 'tag') {
    const searchQuery = query(baseQuery, where("tags", "array-contains", trimmedQuery));
    const querySnapshot = await getDocs(searchQuery);
    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    return posts;
  }

  // 2. 内容検索の場合
  if (type === 'content') {
    // Firestoreに全文検索はないので、一度全投稿を取得してから絞り込み
    // 注意: 投稿数が増えるとパフォーマンスが落ちる可能性あり
    // TODO: 将来的にはAlgoliaなどの外部検索サービス連携を検討
    const querySnapshot = await getDocs(baseQuery); // limit を設けることも検討
    const allPosts = [];
    querySnapshot.forEach((doc) => {
      allPosts.push({ id: doc.id, ...doc.data() });
    });

    // JavaScriptでフィルタリング (大文字小文字を区別しない)
    const lowerCaseQuery = trimmedQuery.toLowerCase();
    const filteredPosts = allPosts.filter(post =>
      post.text && post.text.toLowerCase().includes(lowerCaseQuery)
    );
    return filteredPosts;
  }

  // 該当するタイプがなければ空の配列を返す
  console.warn(`Unknown search type: ${type}`);
  return [];
};
