import {
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
// config.js から db と postsCollection をインポートする想定
import { db, postsCollection } from '../config';


/**
 * 全ての投稿（ThanksとNext Action）を新しい順で取得する関数
 * @returns {Promise<Array>} 全ての投稿の配列
 */
export const getAllPosts = async () => {
  const q = query(postsCollection, orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  const posts = [];
  querySnapshot.forEach((doc) => {
    posts.push({ id: doc.id, ...doc.data() });
  });
  return posts;
};

/**
 * 全ての投稿をリアルタイムで購読する関数
 * @param {function} callback - データが更新されるたびに呼び出される関数
 * @returns {function} 購読を停止するためのunsubscribe関数
 */
export const subscribeToAllPosts = (callback) => {
  const q = query(postsCollection, orderBy("timestamp", "desc"));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    callback(posts); // 変更があるたびにコールバックを実行
  }, (error) => {
    console.error("Error subscribing to posts:", error);
    // エラーハンドリングを追加（例: callback(null, error) のようにエラーを通知）
    callback([], error); // 空配列とエラーを渡す例
  });

  return unsubscribe; // リスナーを解除する関数を返す
};




/**
 * Thanks投稿をすべて取得する関数
 */
export const getThanksPosts = async () => {
  const q = query(postsCollection, where("type", "==", "thanks"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  const posts = [];
  querySnapshot.forEach((doc) => {
    posts.push({ id: doc.id, ...doc.data() });
  });
  return posts;
};



/**
 * 特定のThanksに紐づくActionのチェーンを取得する関数
 */
export const getChain = async (postId) => {
  const q = query(postsCollection, where("parentPostId", "==", postId), orderBy("timestamp", "asc"));
  const querySnapshot = await getDocs(q);
  const actions = [];
  querySnapshot.forEach((doc) => {
    actions.push({ id: doc.id, ...doc.data() });
  });
  return actions;
};


/**
 * 特定の投稿が属するチェーン全体の投稿を取得する (バグ修正版)
 * @param {string} postId - 起点となる投稿のID
 * @returns {Promise<Array|null>} チェーンに属する全投稿の配列
 */
export const getPostChain = async (postId) => {
  const startPostRef = doc(db, "posts", postId); // doc() には db が必要
  const startPostSnap = await getDoc(startPostRef);

  if (!startPostSnap.exists()) {
    console.error("起点となる投稿が見つかりません。");
    return null;
  }

  const startPost = startPostSnap.data();
  const rootId = startPost.type === 'thanks' ? startPostSnap.id : startPost.rootPostId;

  if (!rootId) {
    console.error("チェーンの起点(rootId)が見つかりません。");
    // 起点が見つからない場合でも、起点となった投稿だけは返す（単独のActionの場合など）
    return [{ id: startPostSnap.id, ...startPost, replyTo: startPost.parentPostId || null }];
  }

  const rootPostRef = doc(db, "posts", rootId); // doc() には db が必要
  const rootPostSnap = await getDoc(rootPostRef);
  if (!rootPostSnap.exists()) {
    console.error("起点となるThanks投稿の実体が見つかりません。");
    // 起点が見つからなくても、辿れた投稿だけ返す方が親切かもしれない
    return [{ id: startPostSnap.id, ...startPost, replyTo: startPost.parentPostId || null }];
  }

  // Thanks投稿を配列の最初に追加。replyToは無いのでnull
  const posts = [{ id: rootPostSnap.id, ...rootPostSnap.data(), replyTo: null }];

  // rootId に紐づく Action 投稿を取得
  const q = query(postsCollection, where("rootPostId", "==", rootId));
  const querySnapshot = await getDocs(q);

  // Action投稿を配列に追加する際、parentPostIdをreplyToにマッピング
  querySnapshot.forEach((doc) => {
    const postData = doc.data();
    posts.push({
      id: doc.id,
      ...postData,
      replyTo: postData.parentPostId || null // これが重要！
    });
  });

  // depth（階層）でソートして返す
  return posts.sort((a, b) => (a.depth || 0) - (b.depth || 0));
};
