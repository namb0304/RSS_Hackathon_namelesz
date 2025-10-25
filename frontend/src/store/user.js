import { ref } from 'vue'
// firebase.jsから「ログイン状態を監視する機能(onAuth)」と
// 「プロフィールを取得する機能(getUserProfile)」をインポートします
import { onAuth } from '../firebaseService'
import { getUserProfile } from '../firebaseService'

// アプリ全体で共有する「ユーザー情報」の掲示板
export const user = ref(null)

// onAuthを使って、Firebaseのログイン状態の変更を常に監視します
onAuth(async (firebaseUser) => {
  if (firebaseUser) {
    // 【ログインした時の処理】
    // 1. Firestoreデータベースから、このユーザーのプロフィール情報（名前など）を取得します
    const profile = await getUserProfile(firebaseUser.uid)

    // 2. 認証情報とプロフィール情報を合体させて、掲示板に書き込みます
    user.value = {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      // プロフィールがあればその名前を、なければ'ゲスト'という名前を使います
      displayName: profile ? profile.displayName : 'ゲスト'
    }

  } else {
    // 【ログアウトした時の処理】
    // 掲示板を空っぽにします
    user.value = null
  }
})

