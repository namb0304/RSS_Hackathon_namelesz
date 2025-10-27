import {
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  arrayUnion,
  runTransaction,
  query,
  where,
  orderBy,
  collection,
} from "firebase/firestore";
import { db, postsCollection } from './config';

const tasksCollection = collection(db, 'tasks');

/**
 * 投稿をTaskとして保存
 * @param {string} postId - 保存する投稿のID
 * @param {string} userId - 保存するユーザーのID
 * @returns {Promise<string>} 作成されたtaskのID
 */
export const saveAsTask = async (postId, userId) => {
  const postRef = doc(postsCollection, postId);

  try {
    return await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(postRef);
      
      if (!postDoc.exists()) {
        throw new Error("投稿が見つかりません");
      }

      const postData = postDoc.data();

      // 既にこのユーザーがTaskとして保存済みかチェック
      const savedAsTasks = postData.savedAsTasks || [];
      if (savedAsTasks.includes(userId)) {
        throw new Error("既にTaskとして保存されています");
      }

      // tasksコレクションに新規ドキュメント作成
      const newTaskRef = doc(tasksCollection);
      const taskData = {
        userId,
        postId,
        postType: postData.type,
        // スナップショット
        postText: postData.text,
        postFeeling: postData.feeling || null,
        postTags: postData.tags || [],
        postAuthorId: postData.authorId,
        // ステータス
        status: "pending",
        savedAt: serverTimestamp(),
        completedAt: null,
        completedActionId: null,
      };

      transaction.set(newTaskRef, taskData);

      // postsコレクションのsavedAsTasksに追加
      transaction.update(postRef, {
        savedAsTasks: arrayUnion(userId)
      });

      return newTaskRef.id;
    });
  } catch (error) {
    console.error("Taskの保存に失敗しました:", error);
    throw error;
  }
};

/**
 * Taskを完了にする
 * @param {string} taskId - 完了するTaskのID
 * @param {string} actionId - 完了時に投稿したActionのID
 */
export const completeTask = async (taskId, actionId) => {
  const taskRef = doc(tasksCollection, taskId);

  try {
    const taskDoc = await getDoc(taskRef);
    if (!taskDoc.exists()) {
      throw new Error("Taskが見つかりません");
    }

    await updateDoc(taskRef, {
      status: "completed",
      completedAt: serverTimestamp(),
      completedActionId: actionId,
    });
  } catch (error) {
    console.error("Taskの完了に失敗しました:", error);
    throw error;
  }
};

/**
 * Taskを削除
 * @param {string} taskId - 削除するTaskのID
 */
export const deleteTask = async (taskId) => {
  const taskRef = doc(tasksCollection, taskId);
  
  try {
    await deleteDoc(taskRef);
  } catch (error) {
    console.error("Taskの削除に失敗しました:", error);
    throw error;
  }
};

/**
 * ユーザーのTaskを取得
 * @param {string} userId - ユーザーID
 * @param {string} status - "pending" | "completed" | "all"
 * @returns {Promise<Array>} Taskの配列
 */
export const getMyTasks = async (userId, status = "all") => {
  if (!userId) return [];

  try {
    let q;
    
    if (status === "all") {
      q = query(
        tasksCollection,
        where("userId", "==", userId),
        orderBy("savedAt", "desc")
      );
    } else {
      q = query(
        tasksCollection,
        where("userId", "==", userId),
        where("status", "==", status),
        orderBy("savedAt", "desc")
      );
    }

    const querySnapshot = await getDocs(q);
    const tasks = [];
    
    querySnapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    return tasks;
  } catch (error) {
    console.error("Taskの取得に失敗しました:", error);
    return [];
  }
};

/**
 * 特定の投稿を既にTaskとして保存しているか確認
 * @param {string} postId - 投稿ID
 * @param {string} userId - ユーザーID
 * @returns {Promise<boolean>} 保存済みならtrue
 */
export const isPostSavedAsTask = async (postId, userId) => {
  if (!postId || !userId) return false;

  try {
    const q = query(
      tasksCollection,
      where("userId", "==", userId),
      where("postId", "==", postId)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error("Task確認に失敗しました:", error);
    return false;
  }
};