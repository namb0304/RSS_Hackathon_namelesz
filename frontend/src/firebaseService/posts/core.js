import {
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  increment,
  runTransaction,
  arrayUnion,
} from "firebase/firestore";
// config.js から db と postsCollection をインポートする想定
import { db, postsCollection } from '../config';
// users.js から getUserProfile をインポートする必要がある場合 (例: getPostChain で使う可能性)
// import { getUserProfile } from '../users'; // 必要に応じてコメント解除

/**
 * 新しいThanksを投稿する関数 (feelingとtagsを追加)
 */
export const addThanksPost = async ({ text, feeling, tags, authorId, isAnonymous }) => {
  await addDoc(postsCollection, {
    type: "thanks",
    text, feeling: feeling || null, tags: tags || [],
    authorId, isAnonymous,
    timestamp: serverTimestamp(),
    likeCount: 0,
    actionCount: 0,
    depth: 0,
    likedBy: [], // likedBy配列を追加
  });
};

/**
 * Next Action を投稿する関数 (トランザクションの読み書き順序を修正)
 */
export const addNextAction = async ({ text, feeling, tags, authorId, isAnonymous, parentPost }) => {
  const parentPostRef = doc(db, "posts", parentPost.id); // doc() には db が必要
  const rootId = parentPost.type === 'thanks' ? parentPost.id : parentPost.rootPostId;
  const rootPostRef = doc(db, "posts", rootId); // doc() には db が必要

  await runTransaction(db, async (transaction) => { // runTransaction には db が必要
    const parentDoc = await transaction.get(parentPostRef);
    if (!parentDoc.exists()) throw "Parent document does not exist!";

    let rootDoc = null;
    if (parentPost.id !== rootId) {
      rootDoc = await transaction.get(rootPostRef);
      if (!rootDoc.exists()) throw "Root document does not exist!";
    }

    // newActionData に parentAuthorId を含める
    const newActionData = {
      type: "action", text, feeling: feeling || null, tags: tags || [],
      authorId, isAnonymous,
      timestamp: serverTimestamp(),
      likeCount: 0,
      actionCount: 0,
      depth: parentDoc.data().depth + 1,
      parentPostId: parentPost.id,
      rootPostId: rootId,
      parentAuthorId: parentDoc.data().authorId, // これが記録される
      likedBy: [],
    };

    const newParentActionCount = (parentDoc.data().actionCount || 0) + 1;
    transaction.update(parentPostRef, { actionCount: newParentActionCount });

    if (rootDoc) {
      const newRootActionCount = (rootDoc.data().actionCount || 0) + 1;
      transaction.update(rootPostRef, { actionCount: newRootActionCount });
    }

    // postsCollection を使って新しいドキュメント参照を作成
    const newActionRef = doc(postsCollection);
    transaction.set(newActionRef, newActionData);
  });
};


/**
 * 投稿に「いいね」を追加する（1ユーザー10回まで／一覧表示対応版）
 */
export const likePost = async (postId, userId) => {
  const docRef = doc(db, "posts", postId); // doc() には db が必要

  try {
    await runTransaction(db, async (transaction) => { // runTransaction には db が必要
      const postDoc = await transaction.get(docRef);
      if (!postDoc.exists()) {
        throw "投稿が見つかりません";
      }

      const postData = postDoc.data();
      const currentUserLikeCount = postData.likesMap?.[userId] || 0;

      if (currentUserLikeCount < 10) {
        const userLikesField = `likesMap.${userId}`;

        const updateData = {
          [userLikesField]: increment(1), // ユーザー個人のカウントを+1
          likeCount: increment(1)       // 投稿全体の合計カウントも+1
        };

        // このユーザーからの「いいね」が初回の場合のみ、likedBy配列にIDを追加する
        if (currentUserLikeCount === 0) {
          updateData.likedBy = arrayUnion(userId);
        }

        transaction.update(docRef, updateData);

      } else {
        console.log("いいねは10回までです。");
      }
    });
  } catch (error) {
    console.error("いいね処理に失敗しました:", error);
    // エラーハンドリング: フロントエンド側でUIを元に戻すなどの処理が必要になる場合がある
    throw error; // エラーを再スローして呼び出し元に伝える
  }
};

/**
 * 投稿をIDで指定して削除する関数 (主にテスト用)
 */
export const deletePost = async (postId) => {
  const docRef = doc(db, "posts", postId); // doc() には db が必要
  await deleteDoc(docRef);
};
