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
  onSnapshot,
  limit, // ← これを追加！
  arrayUnion,
  arrayRemove
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
    actionCount: 0,
    depth: 0,
    likedBy: [], // ★★★ likedBy配列を追加 ★★★
  });
};


/**
 * Next Action を投稿する関数 (トランザクションの読み書き順序を修正)
 */
// addNextAction 関数を、この最終版のコードで完全に置き換えてください

export const addNextAction = async ({ text, feeling, tags, authorId, isAnonymous, parentPost }) => {
  const parentPostRef = doc(db, "posts", parentPost.id);
  const rootId = parentPost.type === 'thanks' ? parentPost.id : parentPost.rootPostId;
  const rootPostRef = doc(db, "posts", rootId);

  await runTransaction(db, async (transaction) => {
    const parentDoc = await transaction.get(parentPostRef);
    if (!parentDoc.exists()) throw "Parent document does not exist!";

    let rootDoc = null;
    if (parentPost.id !== rootId) {
      rootDoc = await transaction.get(rootPostRef);
      if (!rootDoc.exists()) throw "Root document does not exist!";
    }

    // ★★★ この newActionData に parentAuthorId を含めるのが重要です ★★★
    const newActionData = {
      type: "action", text, feeling: feeling || null, tags: tags || [],
      authorId, isAnonymous,
      timestamp: serverTimestamp(),
      likeCount: 0,
      actionCount: 0,
      depth: parentDoc.data().depth + 1,
      parentPostId: parentPost.id,
      rootPostId: rootId,
      parentAuthorId: parentDoc.data().authorId, // ← これが記録されるようになります！
      likedBy: [],
    };

    const newParentActionCount = (parentDoc.data().actionCount || 0) + 1;
    transaction.update(parentPostRef, { actionCount: newParentActionCount });

    if (rootDoc) {
      const newRootActionCount = (rootDoc.data().actionCount || 0) + 1;
      transaction.update(rootPostRef, { actionCount: newRootActionCount });
    }

    const newActionRef = doc(collection(db, 'posts'));
    transaction.set(newActionRef, newActionData);
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

// 既存の likePost 関数を、この新しいバージョンに置き換えてください

// likePost 関数を、この最終版のコードで完全に置き換えてください

/**
 * 投稿に「いいね」を追加する（1ユーザー10回まで／一覧表示対応版）
 */
export const likePost = async (postId, userId) => {
  const docRef = doc(db, "posts", postId);

  try {
    await runTransaction(db, async (transaction) => {
      const postDoc = await transaction.get(docRef);
      if (!postDoc.exists()) {
        throw "投稿が見つかりません";
      }

      const postData = postDoc.data();
      const currentUserLikeCount = postData.likesMap?.[userId] || 0;

      if (currentUserLikeCount < 10) {
        const userLikesField = `likesMap.${userId}`;
        
        // ★★★ ここからが変更点 ★★★
        const updateData = {
          [userLikesField]: increment(1), // ユーザー個人のカウントを+1
          likeCount: increment(1)       // 投稿全体の合計カウントも+1
        };

        // このユーザーからの「いいね」が初回の場合のみ、likedBy配列にIDを追加する
        if (currentUserLikeCount === 0) {
          updateData.likedBy = arrayUnion(userId);
        }
        // ★★★ ここまでが変更点 ★★★

        transaction.update(docRef, updateData);

      } else {
        console.log("いいねは10回までです。");
      }
    });
  } catch (error) {
    console.error("いいね処理に失敗しました:", error);
  }
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

// 既存の fetchRankingPosts 関数を、以下の最終版コードに差し替えてください

/**
 * 繋いだ数（actionCount）に基づいたランキング投稿を取得する関数【最終版】
 * @param {string} period - ランキングの集計期間 ('daily', 'weekly', 'monthly')
 * @returns {Promise<Array>} ランキング順にソートされた投稿の配列
 */
export const fetchRankingPosts = async (period) => {
  const now = new Date();
  let startDate;

  // ★★★ 期間の計算ロジックをカレンダー基準に修正 ★★★
  switch (period) {
    case 'daily':
      // 「今日」の始まり（午前0時）を計算
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      break;
    case 'weekly':
      // 「今週」の始まり（月曜日の午前0時）を計算
      startDate = new Date(now);
      const dayOfWeek = now.getDay(); // 0=日, 1=月, ..., 6=土
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // 日曜を週初めとする場合は `dayOfWeek`
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      // 「今月」の始まり（1日の午前0時）を計算
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;
    default:
      // デフォルトは今日の投稿
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }

  // クエリ以降の処理は変更ありません
  const q = query(
    postsCollection,
    where("type", "==", "thanks"),
    where("timestamp", ">=", startDate),
    orderBy("timestamp", "desc"),
    limit(50)
  );

  const querySnapshot = await getDocs(q);
  const posts = [];
  querySnapshot.forEach((doc) => {
    posts.push({ id: doc.id, ...doc.data() });
  });

  const sortedPosts = posts.sort((a, b) => {
    const countA = a.actionCount || 0;
    const countB = b.actionCount || 0;
    return countB - a.actionCount;
  });

  return sortedPosts.slice(0, 10);
};

// この関数を firebase.js の一番下に追加してください

/**
 * タグまたは内容で投稿を検索する関数
 * @param {string} queryText - 検索する文字列
 * @param {string} type - 検索タイプ ('tag' or 'content')
 * @returns {Promise<Array>} 検索結果の投稿配列
 */
export const searchPosts = async (queryText, type) => {
  // 投稿を新しい順で並べておきます
  const baseQuery = query(postsCollection, orderBy("timestamp", "desc"));
  
  // 1. タグ検索の場合
  if (type === 'tag') {
    // Firestoreの 'array-contains' を使って、tags配列に検索文字が含まれるものを探します
    const searchQuery = query(baseQuery, where("tags", "array-contains", queryText));
    const querySnapshot = await getDocs(searchQuery);
    const posts = [];
    querySnapshot.forEach((doc) => {
      posts.push({ id: doc.id, ...doc.data() });
    });
    return posts;
  }

  // 2. 内容検索の場合
  if (type === 'content') {
    // Firestoreに全文検索はないので、一度全投稿を取得してから絞り込みます
    // 注意: 投稿数が増えるとパフォーマンスが落ちる可能性があります
    const querySnapshot = await getDocs(baseQuery);
    const allPosts = [];
    querySnapshot.forEach((doc) => {
      allPosts.push({ id: doc.id, ...doc.data() });
    });

    // JavaScriptで、投稿のtextに検索文字が含まれるものをフィルタリング
    const filteredPosts = allPosts.filter(post => 
      post.text && post.text.toLowerCase().includes(queryText.toLowerCase())
    );
    return filteredPosts;
  }
  
  // 該当するタイプがなければ空の配列を返す
  return [];
};

// 以下のマイページ用関数を firebase.js の一番下に追加・または確認してください

/**
 * [マイページ用] 統計情報（リレーした数、された数）を取得【修正版】
 */
export const getMyPageStats = async (uid) => {
  // リレーした数: 自分が他人にしたNext Actionの数
  const relaysGivenQuery = query(postsCollection, where("authorId", "==", uid), where("type", "==", "action"));
  const relaysGivenSnap = await getDocs(relaysGivenQuery);

  // リレーされた数: "自分以外の他人"が"自分の投稿"にしてくれたNext Actionの数
  const relaysReceivedQuery = query(
    postsCollection,
    where("parentAuthorId", "==", uid), // 自分の投稿へのActionで、
    where("authorId", "!=", uid)         // ★★★ 作者が自分ではないもの ★★★
  );
  const relaysReceivedSnap = await getDocs(relaysReceivedQuery);
  
  return { relaysGiven: relaysGivenSnap.size, relaysReceived: relaysReceivedSnap.size };
};
/**
 * [マイページ用] 自分が投稿したThanksを取得
 */
export const getMyPosts = async (uid) => {
  // typeが"thanks"の投稿に絞り込む
  const q = query(postsCollection, where("authorId", "==", uid), where("type", "==", "thanks"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  const posts = [];
  querySnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
  return posts;
};

/**
 * [マイページ用] 自分が「繋げた」（Next Actionした）投稿を取得
 */
export const getMyConnectedPosts = async (uid) => {
  // typeが"action"の投稿に絞り込む
  const q = query(postsCollection, where("authorId", "==", uid), where("type", "==", "action"), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  const posts = [];
  querySnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
  return posts;
};

/**
 * [マイページ用] 自分が「いいね」した投稿を全て取得
 */
export const getMyLikedPosts = async (uid) => {
  const q = query(postsCollection, where("likedBy", "array-contains", uid), orderBy("timestamp", "desc"));
  const querySnapshot = await getDocs(q);
  const posts = [];
  querySnapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
  return posts;
};