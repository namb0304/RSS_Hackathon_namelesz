import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  orderBy, 
  doc, 
  deleteDoc,
  runTransaction 
} from "firebase/firestore";

// .env.localファイルからAPIキーを安全に読み込みます
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebaseを初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const postsCollection = collection(db, 'posts');

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
 * 新しいThanksを投稿する関数
 */
export const addThanksPost = async ({ text, authorId, isAnonymous }) => {
  await addDoc(postsCollection, {
    type: "thanks", text, authorId, isAnonymous,
    timestamp: serverTimestamp(), likeCount: 0, actionCount: 0,
  });
};

/**
 * Next Action を投稿し、元のThanksのactionCountを更新する関数
 */
export const addNextAction = async ({ text, authorId, isAnonymous, parentPostId, parentThanksText, parentAuthorId }) => {
  const parentThanksRef = doc(db, "posts", parentPostId);
  await runTransaction(db, async (transaction) => {
    const parentThanksDoc = await transaction.get(parentThanksRef);
    if (!parentThanksDoc.exists()) {
      throw "Parent document does not exist!";
    }
    const newActionCount = (parentThanksDoc.data().actionCount || 0) + 1;
    transaction.update(parentThanksRef, { actionCount: newActionCount });
    const newActionRef = collection(db, 'posts');
    transaction.set(doc(newActionRef), {
      type: "action", text, authorId, isAnonymous,
      timestamp: serverTimestamp(), likeCount: 0,
      parentPostId, parentThanksText, parentAuthorId,
    });
  });
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
 * 投稿をIDで指定して削除する関数
 * @param {string} postId - 削除したい投稿のID
 */
export const deletePost = async (postId) => {
  // 削除したいドキュメントへの参照を作成
  const docRef = doc(db, "posts", postId);
  
  try {
    // ドキュメントを削除
    await deleteDoc(docRef);
    console.log(`Document with ID: ${postId} has been deleted successfully.`);
  } catch (error) {
    console.error("Error deleting document: ", error);
  }
};