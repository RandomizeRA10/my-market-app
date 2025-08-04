// my-market-app/src/firebase.js

import { initializeApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider
} from "firebase/auth";
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Firebase設定
const firebaseConfig = {
  apiKey:            process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain:        process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.REACT_APP_FIREBASE_APP_ID,
};

const app         = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

// エミュレータ
if (
  process.env.NODE_ENV === "development" &&
  window.location.hostname === "localhost"
) {
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFirestoreEmulator(db, "localhost", 8080);
}

// PlayFab TITLE_IDは環境変数から
const TITLE_ID = process.env.REACT_APP_PLAYFAB_TITLE_ID;

// 出品処理関数 item, price, description, user, sessionTicket, playFabPlayerIdを引数に明示
export async function handleListItem(item, price, description, user, sessionTicket, playFabPlayerId, listItemOnPlayFab) {
  try {
    // Step 1: PlayFabに出品（listItemOnPlayFabは呼び出し元で用意する必要あり）
    const playFabResult = await listItemOnPlayFab({
      sessionTicket,
      itemInstanceId: item.ItemInstanceId,
      price,
      description
    });

    if (!playFabResult.success) {
      throw new Error(playFabResult.message || "PlayFabでの出品に失敗しました");
    }
    
    // Step 2: Firestoreにも保存
    await addDoc(collection(db, "listings"), {
      title: item.DisplayName || item.ItemId,
      price: Number(price),
      owner: user.uid,
      playFabItemId: item.ItemInstanceId,
      playFabSellerId: playFabPlayerId,
      createdAt: serverTimestamp(),
      purchased: false,
      description: description || ""
    });
    
    return { success: true, message: "アイテムを出品しました" };
  } catch (error) {
    console.error("出品処理エラー:", error);
    return { success: false, message: error.message };
  }
}

// 出品キャンセル
export async function cancelMarketplaceListing(sessionTicket, listingId) {
  const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/ExecuteCloudScript`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Authorization": sessionTicket
    },
    body: JSON.stringify({
      FunctionName: "cancelMarketplaceListing",
      FunctionParameter: {
        listingId
      },
      GeneratePlayStreamEvent: true
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.errorMessage || "取り消しエラー");
  }
  if (!data.data.FunctionResult || !data.data.FunctionResult.success) {
    throw new Error(data.data.FunctionResult?.message || "取り消し処理に失敗しました");
  }
  return data.data.FunctionResult;
}

// インベントリ強制更新
export async function refreshInventory(sessionTicket) {
  const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/ExecuteCloudScript`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Authorization": sessionTicket
    },
    body: JSON.stringify({
      FunctionName: "refreshInventory",
      GeneratePlayStreamEvent: true
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.errorMessage || "インベントリ更新エラー");
  }

  if (!data.data.FunctionResult || !data.data.FunctionResult.success) {
    throw new Error(data.data.FunctionResult?.message || "インベントリ更新処理に失敗しました");
  }

  return data.data.FunctionResult.inventory || [];
}

// Firebase SDK v9 互換レイヤー（v8形式のAPIをサポート）
export const firebase = {
  firestore: () => db,
  auth: () => auth,
  functions: () => functions,
  app: app
};