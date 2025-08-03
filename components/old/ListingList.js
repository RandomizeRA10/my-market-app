//ListingList

import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  deleteDoc,
  doc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const ListingList = ({ user, refreshFlag }) => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    console.log("[ListingList] useEffect triggered. user:", user);
    if (!user) {
      console.log("[ListingList] user is null, skipping fetch");
      setListings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMsg("");

    const q = query(
      collection(db, "listings"),
      where("purchased", "==", false),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        console.log("[ListingList] fetched items:", items);
        setListings(items);
        setLoading(false);
      },
      (err) => {
        console.error("[ListingList] snapshot error:", err);
        setErrorMsg("一覧取得に失敗しました: " + err.message);
        setLoading(false);
      }
    );

    return () => {
      console.log("[ListingList] unsubscribing snapshot");
      unsub();
    };
  }, [user, refreshFlag]);

  const handlePurchase = (id) => {
    console.log("[ListingList] navigate to purchase", id);
    navigate(`/purchase/${id}`);
  };

  const handleDelete = async (id) => {
    console.log("[ListingList] delete requested", id);
    if (!window.confirm("本当にこの出品を取り消しますか？")) return;
    try {
      await deleteDoc(doc(db, "listings", id));
      alert("出品を取り消しました");
    } catch (err) {
      console.error("[ListingList] delete error:", err);
      alert("取り消しに失敗しました: " + err.message);
    }
  };

  if (!user) {
    return <p>一覧を見るにはログインが必要です。</p>;
  }
  if (loading) {
    return <p>読み込み中...</p>;
  }

  return (
    <div>
      <h2>出品一覧</h2>
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>アイテム名</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>価格</th>
            <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>アクション</th>
          </tr>
        </thead>
        <tbody>
          {listings.length > 0 ? (
            listings.map((listing) => (
              <tr key={listing.id}>
                <td style={{ padding: 8 }}>{listing.title}</td>
                <td style={{ padding: 8 }}>¥{listing.price}</td>
                <td style={{ padding: 8, display: "flex", gap: "8px" }}>
                  {console.log(
                    "[ListingList] listing.owner, user.uid:",
                    listing.owner,
                    user.uid
                  )}
                  {listing.owner === user.uid ? (
                    <button
                      onClick={() => handleDelete(listing.id)}
                      style={{ background: '#e53e3e', color: '#fff' }}
                    >
                      取り消し
                    </button>
                  ) : (
                    <button onClick={() => handlePurchase(listing.id)}>
                      購入
                    </button>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} style={{ textAlign: "center", padding: 16, color: "#666" }}>
                未購入のアイテムはありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ListingList;
