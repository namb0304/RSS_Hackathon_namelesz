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
  runTransaction ,
  onSnapshot
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
 * 新しいThanksを投稿する関数 (feelingとtagsを追加)
 */
export const addThanksPost = async ({ text, feeling, tags, authorId, isAnonymous }) => {
  await addDoc(postsCollection, {
    type: "thanks",
    text, feeling: feeling || null, tags: tags || [],
    authorId, isAnonymous,
    timestamp: serverTimestamp(),
    likeCount: 0,
    actionCount: 0, // ← どの投稿にもactionCountを持たせる
    depth: 0,       // ← Thanksは深さ0
  });
};


/**
 * Next Action を投稿する関数 (トランザクションの読み書き順序を修正)
 */
export const addNextAction = async ({ text, feeling, tags, authorId, isAnonymous, parentPost }) => {
  const parentPostRef = doc(db, "posts", parentPost.id);
  const rootId = parentPost.type === 'thanks' ? parentPost.id : parentPost.rootPostId;
  const rootPostRef = doc(db, "posts", rootId);

  await runTransaction(db, async (transaction) => {
    // --- 1. まず全ての「読み取り(get)」を先に行う ---
    const parentDoc = await transaction.get(parentPostRef);
    if (!parentDoc.exists()) throw "Parent document does not exist!";

    let rootDoc = null;
    // 親と大元が違う場合のみ、大元のドキュメントも読み取る
    if (parentPost.id !== rootId) {
      rootDoc = await transaction.get(rootPostRef);
      if (!rootDoc.exists()) throw "Root document does not exist!";
    }

    // --- 2. 読み取ったデータを使って、全ての「書き込み(update, set)」を行う ---

    // a. 直接の親のactionCountを1増やす
    const newParentActionCount = (parentDoc.data().actionCount || 0) + 1;
    transaction.update(parentPostRef, { actionCount: newParentActionCount });

    // b. (親がThanksでなければ) 大元の投稿のactionCountも1増やす
    if (rootDoc) { // rootDocを読み取った場合のみ実行
      const newRootActionCount = (rootDoc.data().actionCount || 0) + 1;
      transaction.update(rootPostRef, { actionCount: newRootActionCount });
    }

    // c. 新しいNext Actionを追加
    const newActionRef = collection(db, 'posts');
    transaction.set(doc(newActionRef), {
      type: "action",
      text, feeling: feeling || null, tags: tags || [],
      authorId, isAnonymous,
      timestamp: serverTimestamp(),
      likeCount: 0,
      actionCount: 0,
      depth: parentDoc.data().depth + 1,
      parentPostId: parentPost.id,
      rootPostId: rootId,
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


/**
 * ユーザーIDからユーザープロフィールを取得する
 * @param {string} uid - ユーザーID
 * @returns {Promise<object|null>} ユーザープロフィール情報
 */
export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const userRef = doc(db, "users", uid);
  const userDoc = await getDoc(userRef);
  return userDoc.exists() ? userDoc.data() : null;
};

/**
 * 全ての投稿（ThanksとNext Action）を新しい順で取得する関数
 * @returns {Promise<Array>} 全ての投稿の配列
 */
export const getAllPosts = async () => {
  // whereによる絞り込みをせず、timestampで並び替えるだけ
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
  
  // onSnapshotでリスナーを設置
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    callback(posts); // 変更があるたびに、このコールバック関数が新しい投稿リストを渡す
  });

  return unsubscribe; // リスナーを解除する関数を返す
};

/**
 * 特定の投稿が属するチェーン全体の投稿を取得する (バグ修正版)
 * @param {string} postId - 起点となる投稿のID
 * @returns {Promise<Array|null>} チェーンに属する全投稿の配列
 */
export const getPostChain = async (postId) => {
  const startPostRef = doc(db, "posts", postId);
  const startPostSnap = await getDoc(startPostRef);

  if (!startPostSnap.exists()) {
    console.error("起点となる投稿が見つかりません。");
    return null;
  }

  const startPost = startPostSnap.data();
  // 起点となるThanks投稿のIDを正しく取得
  const rootId = startPost.type === 'thanks' ? startPostSnap.id : startPost.rootPostId;

  if (!rootId) {
    console.error("チェーンの起点(rootId)が見つかりません。");
    // Thanks単体の場合でも配列で返す
    return [{ id: startPostSnap.id, ...startPost }];
  }

  // --- チェーン全体の投稿を取得するロジックを修正 ---
  
  // 1. まず起点となるThanks投稿を取得
  const rootPostRef = doc(db, "posts", rootId);
  const rootPostSnap = await getDoc(rootPostRef);
  if (!rootPostSnap.exists()) {
    console.error("起点となるThanks投稿の実体が見つかりません。");
    return null;
  }
  
  const posts = [{ id: rootPostSnap.id, ...rootPostSnap.data() }];
  
  // 2. 次にそれに続くActionを全て取得
  const q = query(postsCollection, where("rootPostId", "==", rootId));
  const querySnapshot = await getDocs(q);

  querySnapshot.forEach((doc) => {
    posts.push({ id: doc.id, ...doc.data() });
  });

  // depth（階層）でソートして返す
  return posts.sort((a, b) => a.depth - b.depth);
};