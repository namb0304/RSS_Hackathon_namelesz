import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch } from "firebase/firestore";

// --- ここにあなたのfirebaseConfigを直接貼り付けてください ---
const firebaseConfig = {
  apiKey: "AIzaSyDRktpqTw26wef8mfEZim2-t3zYhU-WOSg",
  authDomain: "thanks-relay-hackathon.firebaseapp.com",
  projectId: "thanks-relay-hackathon",
  storageBucket: "thanks-relay-hackathon.firebasestorage.app",
  messagingSenderId: "857905442350",
  appId: "1:857905442350:web:c58e61c8c17fc8045239bf"
};
// ---------------------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const postsCollection = collection(db, 'posts');

async function deleteAllPosts() {
  console.log("Firestoreの'posts'コレクションから全てのドキュメントを削除します...");
  
  try {
    const querySnapshot = await getDocs(postsCollection);
    
    if (querySnapshot.empty) {
      console.log("削除するドキュメントはありませんでした。");
      return;
    }

    // 複数のドキュメントをまとめて削除するためのバッチ処理
    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // バッチ処理を実行
    await batch.commit();

    console.log(`✅ 成功: ${querySnapshot.size}件のドキュメントを全て削除しました。`);

  } catch (error) {
    console.error("❌ エラー: ドキュメントの削除中にエラーが発生しました。", error);
  }
}

// 実行
deleteAllPosts();