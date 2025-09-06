import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
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
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  increment,
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
export const auth = getAuth(app);
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
// ★★★ authorName も受け取るように変更 ★★★
export const addThanksPost = async ({ text, authorId, authorName, isAnonymous }) => {
  await addDoc(postsCollection, {
    type: "thanks", text, authorId, authorName, isAnonymous,
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
    if (!parentThanksDoc.exists()) throw "Parent document does not exist!";
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
 * 投稿に「いいね」を追加する（likeCountを1増やす）
 */
export const likePost = async (postId) => {
  const docRef = doc(db, "posts", postId);
  await updateDoc(docRef, {
    likeCount: increment(1)
  });
};

/**
 * 投稿をIDで指定して削除する関数
 */
export const deletePost = async (postId) => {
  const docRef = doc(db, "posts", postId);
  await deleteDoc(docRef);
};

/**
 * 匿名でサインインする関数
 */
export const signIn = async () => {
  return await signInAnonymously(auth);
};

/**
 * ユーザーのログイン状態を監視する関数
 */
export const onAuth = (callback) => {
  return onAuthStateChanged(auth, (user) => {
    callback(user);
  });
};

/**
 * メールアドレスとパスワードで新規ユーザーを登録する関数
 */
export const registerWithEmail = async (email, password) => {
  return await createUserWithEmailAndPassword(auth, email, password);
};

/**
 * usersコレクションにユーザー情報を作成・更新する
 */
export const createUserProfile = async (user, additionalData = {}) => {
  if (!user) return; 

  const userRef = doc(db, "users", user.uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    const { email } = user;
    const createdAt = serverTimestamp();
    await setDoc(userRef, {
      uid: user.uid,
      // ★★★ additionalDataからdisplayNameを正しく受け取るように修正 ★★★
      displayName: additionalData.displayName || '名無しさん',
      email,
      createdAt,
    });
  }
};
/**
 * メールアドレスとパスワードでログインする関数
 * @param {string} email
 * @param {string} password
 * @returns {Promise<UserCredential>} ユーザー情報
 */
export const loginWithEmail = async (email, password) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

/**
 * ログアウトする関数
 */
export const logout = async () => {
  return await signOut(auth);
};


// ★★★ この関数をファイルの末尾などに追加 ★★★
/**
 * usersコレクションから指定したユーザーのプロフィールを取得する
 * @param {string} uid - ユーザーID
 */
export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const userRef = doc(db, "users", uid);
  const userDoc = await getDoc(userRef);
  return userDoc.exists() ? userDoc.data() : null;
};

