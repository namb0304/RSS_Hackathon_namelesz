/**
 * Firebase永続テストスクリプト（データは削除されません）
 * 使い方: node tests/firebase-complete-test.js
 * * 実行後、以下の固定アカウントとデータが残ります。
 * Email: test-user@example.com
 * Pass: testpass123
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore'; // setDoc をインポート

// --- ▼▼▼ 必要なインポート ▼▼▼ ---
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ESM形式で __dirname を再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// --- ▲▲▲ 必要なインポート ▲▲▲ ---

// .env.localを読み込む
dotenv.config({ path: resolve(__dirname, '../.env.local') });

// .envから設定を読み込み
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- ▼▼▼ 固定テストデータ ▼▼▼ ---
const testEmail = `test-user@example.com`;
const testPassword = 'testpass123';
const testUsername = '固定テストユーザー';
// --- ▲▲▲ 固定テストデータ ▲▲▲ ---

let testUserId = null;
let testPostId = null;
let testTaskId = null;

// ========================================
// ユーティリティ関数
// ========================================

const log = (emoji, message) => console.log(`${emoji} ${message}`);
const success = (message) => log('✅', message);
const error = (message) => log('❌', message);
const info = (message) => log('ℹ️', message);
const separator = () => console.log('\n' + '='.repeat(60) + '\n');

// ========================================
// テスト関数
// ========================================

async function test1_AuthConnection() {
  separator();
  info('テスト1: Firebase認証接続テスト');
  
  try {
    if (!auth) throw new Error('Auth初期化失敗');
    success('Firebase認証に接続成功');
    return true;
  } catch (err) {
    error(`認証接続失敗: ${err.message}`);
    return false;
  }
}

async function test2_FirestoreConnection() {
  separator();
  info('テスト2: Firestore接続テスト');
  
  try {
    if (!db) throw new Error('Firestore初期化失敗');
    
    // 接続テスト用の書き込み
    const testRef = await addDoc(collection(db, '_test_connection'), {
      timestamp: new Date(),
      message: 'connection test'
    });
    
    // すぐに削除
    await deleteDoc(testRef);
    
    success('Firestoreに接続成功');
    return true;
  } catch (err) {
    error(`Firestore接続失敗: ${err.message}`);
    return false;
  }
}

async function test3_UserRegistration() {
  separator();
  info('テスト3: ユーザー登録テスト（固定ユーザー）');
  info(`テストメール: ${testEmail}`);
  
  try {
    // まず登録を試みる
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    testUserId = userCredential.user.uid;
    success(`ユーザー登録成功! UID: ${testUserId}`);
    
    // usersコレクションにプロフィール作成 (UIDをIDにする)
    const userDocRef = doc(db, 'users', testUserId);
    await setDoc(userDocRef, {
      uid: testUserId,
      displayName: testUsername,
      email: testEmail,
      createdAt: new Date(),
    });
    success('ユーザープロフィール作成成功');
    return true;

  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      success('ユーザーは既に登録済みです（テスト続行）');
      // 既存ユーザーのUIDを取得するためにログインを試みる
      try {
        const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
        testUserId = userCredential.user.uid;
        success(`既存ユーザーのUID取得成功: ${testUserId}`);
        
        // プロフィールが万が一ない場合のためにsetDoc (マージはしない)
        const userDocRef = doc(db, 'users', testUserId);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            uid: testUserId,
            displayName: testUsername,
            email: testEmail,
            createdAt: new Date(),
          });
          info('既存ユーザーのプロフィールが見当たらなかったため、作成しました。');
        }

        return true;
      } catch (loginErr) {
        error(`既存ユーザーのログインに失敗: ${loginErr.message}。パスワードが違う可能性があります。`);
        return false;
      }
    }
    error(`ユーザー登録失敗: ${err.message}`);
    return false;
  }
}

async function test4_UserLogin() {
  separator();
  info('テスト4: ログインテスト');
  
  try {
    // 一度ログアウト
    if (auth.currentUser) {
      await auth.signOut();
      info('一旦ログアウトしました');
    }
    
    // 再ログイン
    const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    
    if (!testUserId) {
        testUserId = userCredential.user.uid;
    }
    
    success(`ログイン成功! UID: ${userCredential.user.uid}`);
    return true;
  } catch (err) {
    error(`ログイン失敗: ${err.message}`);
    return false;
  }
}

async function test5_CreateThanksPost() {
  separator();
  info('テスト5: Thanks投稿作成テスト（重複チェックあり）');
  
  // このテキストを持つ投稿が既に存在するかチェックする
  const fixedPostText = '【固定テスト投稿】: 電車で席を譲ってもらいました';
  
  try {
    // 既存の投稿を検索
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', testUserId),
      where('text', '==', fixedPostText)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      info('固定テスト投稿が存在しないため、新規作成します');
      const postData = {
        type: 'thanks',
        text: fixedPostText, // 固定テキスト
        feeling: '嬉しい',
        tags: ['電車', '優しさ', 'テスト'],
        authorId: testUserId,
        isAnonymous: false,
        timestamp: new Date(),
        likeCount: 0,
        actionCount: 0,
        depth: 0,
        likedBy: [],
        likesMap: {},
        savedAsTasks: [],
      };
      
      const docRef = await addDoc(collection(db, 'posts'), postData);
      testPostId = docRef.id;
      success(`Thanks投稿作成成功! ID: ${testPostId}`);
      info(`内容: ${postData.text}`);
    } else {
      testPostId = querySnapshot.docs[0].id;
      success('既存のThanks投稿を発見（テスト続行）');
      info(`既存ID: ${testPostId}`);
    }
    return true;
  } catch (err) {
    error(`投稿処理失敗: ${err.message}`);
    return false;
  }
}

async function test6_ReadPost() {
  separator();
  info('テスト6: 投稿読み取りテスト');

  if (!testPostId) {
    error('Post ID (testPostId) が未設定のため、読み取りをスキップします');
    return false;
  }
  
  try {
    const postRef = doc(db, 'posts', testPostId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      throw new Error('投稿が見つかりません');
    }
    
    const postData = postSnap.data();
    success('投稿読み取り成功!');
    info(`タイプ: ${postData.type}`);
    info(`内容: ${postData.text}`);
    info(`タグ: ${postData.tags.join(', ')}`);
    return true;
  } catch (err) {
    error(`投稿読み取り失敗: ${err.message}`);
    return false;
  }
}

async function test7_CreateNextAction() {
  separator();
  info('テスト7: Next Action作成テスト');
  
  // Note: このテストは実行のたびにActionが増え続けます
  
  try {
    const actionData = {
      type: 'action',
      text: `テストAction (${new Date().toLocaleString('ja-JP')}): 私も誰かに席を譲りました!`,
      feeling: '温かい',
      tags: ['電車', '優しさ', '連鎖', 'テスト'],
      authorId: testUserId,
      isAnonymous: false,
      timestamp: new Date(),
      likeCount: 0,
      actionCount: 0,
      depth: 1,
      parentPostId: testPostId,
      rootPostId: testPostId,
      parentAuthorId: testUserId, // 本来は親投稿のauthorId
      likedBy: [],
      likesMap: {},
      savedAsTasks: [],
    };
    
    const docRef = await addDoc(collection(db, 'posts'), actionData);
    
    success(`Next Action作成成功! ID: ${docRef.id}`);
    return true;
  } catch (err) {
    error(`Action作成失敗: ${err.message}`);
    return false;
  }
}

async function test8_CreateTask() {
  separator();
  info('テスト8: Task作成テスト（重複チェックあり）');
  
  if (!testPostId) {
    error('Post ID (testPostId) が未設定のため、Taskを作成できません');
    return false;
  }
  
  try {
    // 既存のタスクを検索
    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', testUserId),
      where('postId', '==', testPostId)
    );
    
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      info('固定テストTaskが存在しないため、新規作成します');
      const taskData = {
        userId: testUserId,
        postId: testPostId,
        postType: 'thanks',
        postText: '【固定テスト投稿】: 電車で席を譲ってもらいました',
        postFeeling: '嬉しい',
        postTags: ['電車', '優しさ', 'テスト'],
        postAuthorId: testUserId, // 本来は親投稿のauthorId
        status: 'pending',
        savedAt: new Date(),
        completedAt: null,
        completedActionId: null,
      };
      
      const docRef = await addDoc(collection(db, 'tasks'), taskData);
      testTaskId = docRef.id;
      success(`Task作成成功! ID: ${testTaskId}`);
    } else {
      testTaskId = querySnapshot.docs[0].id;
      success('既存のTaskを発見（テスト続行）');
      info(`既存ID: ${testTaskId}`);
    }
    return true;
  } catch (err) {
    error(`Task作成失敗: ${err.message}`);
    return false;
  }
}


async function test9_ReadTask() {
  separator();
  info('テスト9: Task読み取りテスト');
  
  if (!testTaskId) {
    error('Task ID (testTaskId) が未設定のため、読み取りをスキップします');
    return false;
  }

  try {
    const taskRef = doc(db, 'tasks', testTaskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Taskが見つかりません');
    }
    
    const taskData = taskSnap.data();
    success('Task読み取り成功!');
    info(`ステータス: ${taskData.status}`);
    info(`元投稿: ${taskData.postText}`);
    return true;
  } catch (err) {
    error(`Task読み取り失敗: ${err.message}`);
    return false;
  }
}

async function test10_HiddenPost() {
  separator();
  info('テスト10: 非表示投稿テスト');
  
  if (!testPostId) {
    error('Post ID (testPostId) が未設定のため、スキップします');
    return false;
  }

  try {
    const hiddenData = {
      postId: testPostId,
      hiddenAt: new Date(),
    };
    
    // users/{userId}/hiddenPosts/{postId} にデータをセット
    const hiddenRef = doc(db, `users/${testUserId}/hiddenPosts`, testPostId);
    await setDoc(hiddenRef, hiddenData);
    
    success('非表示投稿作成成功（または上書き）!');
    return true;
  } catch (err) {
    error(`非表示投稿失敗: ${err.message}`);
    return false;
  }
}

async function test11_QueryPosts() {
  separator();
  info('テスト11: 投稿クエリテスト');
  
  try {
    // 自分の投稿を取得
    const q = query(
      collection(db, 'posts'),
      where('authorId', '==', testUserId),
      where('type', '==', 'thanks')
    );
    
    const querySnapshot = await getDocs(q);
    
    success(`投稿クエリ成功! 取得件数: ${querySnapshot.size}件`);
    
    querySnapshot.forEach((doc) => {
      info(`  - ${doc.data().text.substring(0, 30)}...`);
    });
    
    return true;
  } catch (err) {
    error(`投稿クエリ失敗: ${err.message}`);
    return false;
  }
}

// ========================================
// クリーンアップ (実行しない)
// ========================================

// async function cleanup() { ... } // 削除

// ========================================
// メイン実行
// ========================================

async function runAllTests() {
  console.log('\n');
  console.log('🔥 Firebase 永続テスト開始 (データは削除されません) 🔥');
  console.log('='.repeat(60));
  
  const results = [];
  
  // テスト実行
  results.push(await test1_AuthConnection());
  results.push(await test2_FirestoreConnection());
  results.push(await test3_UserRegistration());
  
  // ユーザー登録が成功した場合のみ後続のテストを実行
  if (results[2]) {
    results.push(await test4_UserLogin());
    results.push(await test5_CreateThanksPost());
    
    // 投稿作成が成功した場合のみ後続のテストを実行
    if (results[4]) {
      results.push(await test6_ReadPost());
      results.push(await test7_CreateNextAction());
      results.push(await test8_CreateTask());
      
      // Task作成が成功した場合のみTask読み取りを実行
      if (results[7]) {
        results.push(await test9_ReadTask());
      } else {
        results.push(false); // Task読み取りテストはスキップ
      }
      
      results.push(await test10_HiddenPost());
      results.push(await test11_QueryPosts());
    } else {
      // 投稿作成失敗時は関連テストをスキップ
      error('投稿作成失敗のため、関連するテスト (6, 7, 8, 9, 10, 11) をスキップします。');
      results.push(false, false, false, false, false, false);
    }
  } else {
    // ユーザー登録失敗時は関連テストをスキップ
    error('ユーザー登録失敗のため、関連するテスト (4〜11) をスキップします。');
    results.push(false, false, false, false, false, false, false, false);
  }
  
  // --- ▼▼▼ クリーンアップを削除 ▼▼▼ ---
  // await cleanup();
  
  separator();
  info('クリーンアップ処理はスキップされました（データは保持されます）');
  // --- ▲▲▲ クリーンアップを削除 ▲▲▲ ---
  
  
  // 結果サマリー
  separator();
  const total = results.length;
  const passed = results.filter(r => r).length;
  
  console.log('📊 テスト結果サマリー');
  console.log('='.repeat(60));
  console.log(`合格: ${passed}/${total}`);
  console.log(`成功率: ${Math.round((passed / total) * 100)}%`);
  
  if (passed === total) {
    success('すべてのテストに合格しました! 🎉');
  } else {
    error(`${total - passed}個のテストが失敗しました`);
  }
  
  console.log('\n');
  process.exit(passed === total ? 0 : 1);
}

// 実行
runAllTests().catch((err) => {
  error(`致命的なエラー: ${err.message}`);
  console.error(err);
  // 致命的なエラーが発生した場合もクリーンアップは実行しない
  process.exit(1);
});

