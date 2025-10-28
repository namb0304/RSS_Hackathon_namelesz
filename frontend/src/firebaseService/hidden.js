import {
  setDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  collection,
} from "firebase/firestore";
import { db, postsCollection } from './config';

/**
 * 投稿を非表示にする（投稿の詳細情報をスナップショット保存）
 * @param {string} postId - 非表示にする投稿のID
 * @param {string} userId - ユーザーのID
 */
export const hidePost = async (postId, userId) => {
  if (!postId || !userId) {
    throw new Error("postIdとuserIdは必須です");
  }

  try {
    // 投稿の詳細情報を取得
    const postRef = doc(postsCollection, postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      throw new Error("投稿が見つかりません");
    }

    const postData = postSnap.data();

    // ユーザー情報も取得（オプション）
    let authorProfile = null;
    if (postData.authorId && !postData.isAnonymous) {
      try {
        const authorRef = doc(db, 'users', postData.authorId);
        const authorSnap = await getDoc(authorRef);
        if (authorSnap.exists()) {
          authorProfile = authorSnap.data();
        }
      } catch (error) {
        console.warn("著者情報の取得に失敗:", error);
      }
    }

    // 非表示情報を保存（投稿のスナップショット付き）
    const hiddenPostRef = doc(db, `users/${userId}/hiddenPosts/${postId}`);
    await setDoc(hiddenPostRef, {
      // 基本情報
      postId,
      hiddenAt: serverTimestamp(),

      // 投稿のスナップショット（フィルタリング用）
      postSnapshot: {
        type: postData.type,
        text: postData.text,
        feeling: postData.feeling || null,
        tags: postData.tags || [],
        authorId: postData.authorId,
        isAnonymous: postData.isAnonymous || false,
        timestamp: postData.timestamp,
        depth: postData.depth || 0,
      },

      // 著者情報のスナップショット（現状のデータ構造に合わせる）
      authorSnapshot: authorProfile ? {
        displayName: authorProfile.displayName || '名前未設定',
        email: authorProfile.email || null,
      } : null,
    });

    console.log("投稿を非表示にしました（詳細情報付き）:", postId);
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
    console.log("非表示を解除しました:", postId);
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
 * 非表示にした投稿の詳細情報を含むリストを取得
 * @param {string} userId - ユーザーID
 * @returns {Promise<Array<Object>>} 非表示投稿の詳細情報配列
 */
export const getHiddenPostsWithDetails = async (userId) => {
  if (!userId) return [];

  const hiddenPostsRef = collection(db, `users/${userId}/hiddenPosts`);

  try {
    const querySnapshot = await getDocs(query(hiddenPostsRef));
    const hiddenPosts = [];

    querySnapshot.forEach((doc) => {
      hiddenPosts.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return hiddenPosts;
  } catch (error) {
    console.error("非表示投稿の詳細取得に失敗しました:", error);
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

/**
 * 特定のタグを含む投稿をすべて非表示にする
 * @param {string} userId - ユーザーID
 * @param {string} tag - 非表示にするタグ
 * @returns {Promise<number>} 非表示にした投稿数
 */
export const hidePostsByTag = async (userId, tag) => {
  if (!userId || !tag) {
    throw new Error("userIdとtagは必須です");
  }

  try {
    // タグを含む投稿を検索
    const q = query(
      postsCollection,
      where("tags", "array-contains", tag)
    );

    const querySnapshot = await getDocs(q);
    let count = 0;

    for (const postDoc of querySnapshot.docs) {
      try {
        await hidePost(postDoc.id, userId);
        count++;
      } catch (error) {
        console.warn(`投稿 ${postDoc.id} の非表示に失敗:`, error);
      }
    }

    return count;
  } catch (error) {
    console.error("タグによる非表示処理に失敗しました:", error);
    throw error;
  }
};

/**
 * 特定の著者の投稿をすべて非表示にする
 * @param {string} userId - ユーザーID
 * @param {string} authorId - 非表示にする著者のID
 * @returns {Promise<number>} 非表示にした投稿数
 */
export const hidePostsByAuthor = async (userId, authorId) => {
  if (!userId || !authorId) {
    throw new Error("userIdとauthorIdは必須です");
  }

  if (userId === authorId) {
    throw new Error("自分の投稿は非表示にできません");
  }

  try {
    // 著者の投稿を検索
    const q = query(
      postsCollection,
      where("authorId", "==", authorId)
    );

    const querySnapshot = await getDocs(q);
    let count = 0;

    for (const postDoc of querySnapshot.docs) {
      try {
        await hidePost(postDoc.id, userId);
        count++;
      } catch (error) {
        console.warn(`投稿 ${postDoc.id} の非表示に失敗:`, error);
      }
    }

    return count;
  } catch (error) {
    console.error("著者による非表示処理に失敗しました:", error);
    throw error;
  }
};

/**
 * タグでフィルタリングされた非表示投稿を取得
 * @param {string} userId - ユーザーID
 * @param {string} tag - フィルタリングするタグ
 * @returns {Promise<Array<Object>>} 該当する非表示投稿の配列
 */
export const getHiddenPostsByTag = async (userId, tag) => {
  if (!userId || !tag) return [];

  try {
    const hiddenPosts = await getHiddenPostsWithDetails(userId);

    // タグでフィルタリング
    return hiddenPosts.filter(post =>
      post.postSnapshot?.tags?.includes(tag)
    );
  } catch (error) {
    console.error("タグによるフィルタリングに失敗:", error);
    return [];
  }
};

/**
 * 著者IDでフィルタリングされた非表示投稿を取得
 * @param {string} userId - ユーザーID
 * @param {string} authorId - フィルタリングする著者ID
 * @returns {Promise<Array<Object>>} 該当する非表示投稿の配列
 */
export const getHiddenPostsByAuthor = async (userId, authorId) => {
  if (!userId || !authorId) return [];

  try {
    const hiddenPosts = await getHiddenPostsWithDetails(userId);

    // 著者IDでフィルタリング
    return hiddenPosts.filter(post =>
      post.postSnapshot?.authorId === authorId
    );
  } catch (error) {
    console.error("著者IDによるフィルタリングに失敗:", error);
    return [];
  }
};
