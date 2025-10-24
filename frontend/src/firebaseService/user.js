import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { usersCollection } from './config'; // db と usersCollection をインポート

export const createUserProfile = async (user, additionalData = {}) => {
  if (!user) return;
  const userRef = doc(usersCollection, user.uid); // usersCollection を使用
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    const { email } = user;
    const createdAt = serverTimestamp();
    await setDoc(userRef, {
      uid: user.uid,
      displayName: additionalData.displayName || '名無しさん',
      email,
      createdAt,
    });
  }
};

export const getUserProfile = async (uid) => {
  if (!uid) return null;
  const userRef = doc(usersCollection, uid); // usersCollection を使用
  const userDoc = await getDoc(userRef);
  return userDoc.exists() ? userDoc.data() : null;
};
