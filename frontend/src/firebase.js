// Firebaseから必要な機能をインポートします
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, orderBy } from "firebase/firestore";

// .env.localファイルからAPIキーを安全に読み込みます
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebaseを初期化します
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // Firestoreデータベースのインスタンスを取得
const postsCollection = collection(db, 'posts'); // 'posts'コレクションへの参照

/**
 * Thanks投稿をすべて取得する関数
 * フロントエンドはこの関数を呼び出すだけでデータを取得できます。
 * @returns {Promise<Array>} Thanks投稿のデータ配列
 */
export const getThanksPosts = async () => {
  // 'posts'コレクションから'type'が'thanks'のものを、新しい順に並べ替えて取得する命令
  const q = query(postsCollection, where("type", "==", "thanks"), orderBy("timestamp", "desc"));
  
  const querySnapshot = await getDocs(q);
  
  // 取得したデータを使いやすいように配列に変換します
  const posts = [];
  querySnapshot.forEach((doc) => {
    posts.push({ id: doc.id, ...doc.data() });
  });
  
  return posts;
};