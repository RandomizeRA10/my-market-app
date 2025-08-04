import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const PurchaseHistory = ({ user }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPurchases([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "listings"),
      where("buyer", "==", user.uid),
      where("purchased", "==", true)
    );
    getDocs(q)
      .then((snap) => {
        const data = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPurchases(data);
      })
      .catch((err) => {
        console.error("購入履歴取得エラー:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  if (!user) {
    return <p>購入履歴を見るにはログインが必要です</p>;
  }
  if (loading) {
    return <div>読み込み中...</div>;
  }
  return (
    <div>
      <h2>購入履歴</h2>
      {purchases.length === 0 ? (
        <p>購入履歴はありません。</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {purchases.map((item) => (
            <li key={item.id} style={{ marginBottom: 8 }}>
              {item.title} — ¥{item.price}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PurchaseHistory;
