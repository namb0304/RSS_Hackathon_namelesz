import {
  setDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  getDocs,
  query,
  collection,
} from "firebase/firestore";
import { db } from './config';

/**
 * 投稿を非表示にする
 * @param {string} postId - 非表示にする投稿のID
 * @param {string} userId - ユーザーのID
 */
export const hidePost = async (postId, userId) => {
  if (!postId || !userId) {
    throw new Error("postIdとuserIdは必須です");
  }

  const hiddenPostRef = doc(db, `users/${userId}/hiddenPosts/${postId}`);

  try {
    await setDoc(hiddenPostRef, {
      postId,
      hiddenAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("投稿の非表示に失敗しました:", error);
    throw error;
  }
};

/**
 * 投稿の非表示を解除する
 * @param {string} postId - 非表示解除する投稿のID
 * @param {string} userId - ユーザーのID
 */
export const unhidePost = async (postId, userId) => {
  if (!postId || !userId) {
    throw new Error("postIdとuserIdは必須です");
  }

  const hiddenPostRef = doc(db, `users/${userId}/hiddenPosts/${postId}`);

  try {
    await deleteDoc(hiddenPostRef);
  } catch (error) {
    console.error("非表示解除に失敗しました:", error);
    throw error;
  }
};

/**
 * ユーザーが非表示にした投稿IDの配列を取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array<string>>} 非表示投稿IDの配列
 */
export const getHiddenPostIds = async (userId) => {
  if (!userId) return [];

  const hiddenPostsRef = collection(db, `users/${userId}/hiddenPosts`);

  try {
    const querySnapshot = await getDocs(query(hiddenPostsRef));
    const hiddenIds = [];
    
    querySnapshot.forEach((doc) => {
      hiddenIds.push(doc.id); // ドキュメントIDが投稿ID
    });

    return hiddenIds;
  } catch (error) {
    console.error("非表示投稿の取得に失敗しました:", error);
    return [];
  }
};

/**
 * 特定の投稿が非表示かどうか確認
 * @param {string} postId - 投稿ID
 * @param {string} userId - ユーザーID
 * @returns {Promise<boolean>} 非表示ならtrue
 */
export const isPostHidden = async (postId, userId) => {
  if (!postId || !userId) return false;

  const hiddenIds = await getHiddenPostIds(userId);
  return hiddenIds.includes(postId);
};