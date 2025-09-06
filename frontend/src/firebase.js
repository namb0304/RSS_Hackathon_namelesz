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

/**
 * 匿名でサインインする関数
 * アプリ起動時に一度だけ呼び出す
 * @returns {Promise<UserCredential>} ユーザー情報
 */
export const signIn = async () => {
  return await signInAnonymously(auth);
};

/**
 * ユーザーのログイン状態を監視する関数
 * ログイン状態が変化するたびに、指定した処理を実行する
 * @param {function} callback - ユーザー情報を受け取るコールバック関数
 */
export const onAuth = (callback) => {
  // onAuthStateChangedは、ログイン時、ログアウト時、ページ読み込み時にユーザー状態をチェックしてくれる
  return onAuthStateChanged(auth, (user) => {
    callback(user); // フロントエンドに現在のユーザー情報を渡す
  });
};

/**
 * 投稿に「いいね」を追加する（likeCountを1増やす）
 * @param {string} postId - いいねする投稿のID
 */
export const likePost = async (postId) => {
  const docRef = doc(db, "posts", postId);
  try {
    // increment(1) を使うことで、安全に数値を1増やすことができる
    await updateDoc(docRef, {
      likeCount: increment(1)
    });
  } catch (error) {
    console.error("Error liking post: ", error);
  }
};

/**
 * usersコレクションにユーザー情報を作成・更新する
 * @param {object} user - Firebase Authから取得したユーザーオブジェクト
 * @param {object} additionalData - 保存したい追加情報（例: displayName）
 */
export const createUserProfile = async (user, additionalData = {}) => {
  if (!user) return; // ユーザーがなければ何もしない

  const userRef = doc(db, "users", user.uid); // ユーザーIDをドキュメントIDとして利用
  const userDoc = await getDoc(userRef);

  // まだプロフィールが作成されていなければ、新規作成
  if (!userDoc.exists()) {
    const { displayName, email } = user;
    const createdAt = serverTimestamp();
    try {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: displayName || '名無しさん',
        email,
        createdAt,
        ...additionalData,
      });
    } catch (error) {
      console.error("Error creating user profile: ", error);
    }
  }
};