import {
  getDocs,
  query,
  where,
  orderBy,
  // collection // collection をインポート
} from "firebase/firestore";
// config.js から db と postsCollection をインポートする想定
import { postsCollection } from '../config';



/**
 * [マイページ用] 統計情報（リレーした数、された数）を取得【修正版】
 */
export const getMyPageStats = async (uid) => {
  if (!uid) return { relaysGiven: 0, relaysReceived: 0 };

  // リレーした数: 自分が authorId で type が 'action' の投稿数
  const relaysGivenQuery = query(postsCollection, where("authorId", "==", uid), where("type", "==", "action"));

  // リレーされた数: parentAuthorId が自分で、authorId が自分ではない投稿数
  const relaysReceivedQuery = query(
    postsCollection,
    where("parentAuthorId", "==", uid),
    where("authorId", "!=", uid),
    where("type", "==", "action") //念のためtypeも指定
  );

  try {
    const [relaysGivenSnap, relaysReceivedSnap] = await Promise.all([
      getDocs(relaysGivenQuery),
      getDocs(relaysReceivedQuery)
    ]);
    return { relaysGiven: relaysGivenSnap.size, relaysReceived: relaysReceivedSnap.size };
  } catch (error) {
    console.error("Error fetching my page stats:", error);
    return { relaysGiven: 0, relaysReceived: 0 }; // エラー時は0を返す
  }
};

/**
 * [マイページ用] 自分が投稿したThanksを取得
 */
export const getMyPosts = async (uid) => {
  if (!uid) return [];
  const q = query(postsCollection, where("authorId", "==", uid), where("type", "==", "thanks"), orderBy("timestamp", "desc"));
  try {
    const querySnapshot = await getDocs(q);
    const posts = [];
    querySnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
    return posts;
  } catch (error) {
    console.error("Error fetching my posts:", error);
    return [];
  }
};

/**
 * [マイページ用] 自分が「繋げた」（Next Actionした）投稿を取得
 */
export const getMyConnectedPosts = async (uid) => {
  if (!uid) return [];
  const q = query(postsCollection, where("authorId", "==", uid), where("type", "==", "action"), orderBy("timestamp", "desc"));
  try {
    const querySnapshot = await getDocs(q);
    const posts = [];
    querySnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
    return posts;
  } catch (error) {
    console.error("Error fetching my connected posts:", error);
    return [];
  }
};

/**
 * [マイページ用] 自分が「いいね」した投稿を全て取得
 */
export const getMyLikedPosts = async (uid) => {
  if (!uid) return [];
  // likedBy 配列に uid が含まれる投稿を検索
  const q = query(postsCollection, where("likedBy", "array-contains", uid), orderBy("timestamp", "desc"));
  try {
    const querySnapshot = await getDocs(q);
    const posts = [];
    querySnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
    return posts;
  } catch (error) {
    console.error("Error fetching my liked posts:", error);
    return [];
  }
};

/**
 * [マイページ用] 自分がLv.0で投稿したThanks（Root投稿）を取得
 */
export const getMyRootPosts = async (uid) => {
  if (!uid) return [];
  
  const q = query(
    postsCollection,
    where("authorId", "==", uid),
    where("type", "==", "thanks"),
    where("depth", "==", 0),
    orderBy("timestamp", "desc")
  );

  try {
    const querySnapshot = await getDocs(q);
    const posts = [];
    querySnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
    return posts;
  } catch (error) {
    console.error("Error fetching my root posts:", error);
    return [];
  }
};
