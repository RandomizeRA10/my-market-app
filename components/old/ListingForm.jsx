// src/components/ListingForm.jsx

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { fetchPlayFabSession } from "../services/playfabService";

export default function ListingForm({ user, onNewListing }) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("ログインしてください");
      return;
    }
    if (!title || !price) {
      alert("タイトルと価格を入力してください");
      return;
    }

    try {
      // 1) PlayFab セッションを取得
      const { sessionTicket, playFabId } = await fetchPlayFabSession();
      console.log("PlayFab SessionTicket:", sessionTicket);
      console.log("PlayFab PlayFabId:", playFabId);

      // 2) Firestore に出品ドキュメントを作成
      await addDoc(collection(db, "listings"), {
        title,
        price: Number(price),
        owner: user.uid,
        createdAt: serverTimestamp(),
        purchased: false,
        // PlayFab 情報も保存したいなら以下を追加
        playFabId,
        sessionTicket
      });

      // 3) フォームをリセットして親をリフレッシュ
      setTitle("");
      setPrice("");
      onNewListing();
    } catch (err) {
      console.error("出品エラー:", err);
      alert("出品に失敗しました: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
      <div>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="アイテム名"
          style={{ marginRight: 8 }}
        />
        <input
          type="number"
          value={price}
          onChange={e => setPrice(e.target.value)}
          placeholder="価格"
          style={{ marginRight: 8 }}
        />
        <button type="submit">出品</button>
      </div>
    </form>
  );
}
