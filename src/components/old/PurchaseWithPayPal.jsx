// src/components/PurchaseWithPayPal.jsx

import React, { useEffect, useRef, useState } from "react";
import { auth } from "../firebase";              // 既存の src/firebase.js で export されている auth
import { useNavigate } from "react-router-dom";

const PurchaseWithPayPal = ({
  listingId,
  onSuccess,    // (任意) 購入成功時に親コンポーネントで実行したい処理
  onError,      // (任意) エラー時のコールバック
  onCancel,     // (任意) キャンセル時のコールバック
}) => {
  const paypalRef = useRef(null);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // ================================
  // Firebase Authentication から ID トークンを取得するヘルパー
  // ================================
  const awaitFirebaseIdToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("ユーザーがログインしていません");
    return await user.getIdToken();
  };

  useEffect(() => {
    // PayPal SDK が読み込まれているかチェック
    if (!window.paypal) {
      console.error(
        "PayPal SDK が読み込まれていません。public/index.html の <script> を確認してください。"
      );
      return;
    }

    // PayPal ボタンをレンダリング
    window.paypal
      .Buttons({
        // ===================================================================
        // 1) createOrder: PayPal 上に Order を作成（最低 $0.01 まで対応）
        // ===================================================================
        createOrder: async (data, actions) => {
          try {
            const idToken = await awaitFirebaseIdToken();

            const res = await fetch(
              "https://us-central1-puzzlecraft-b58c1.cloudfunctions.net/api/create-paypal-order",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ listingId }),
              }
            );

            const body = await res.json();
            if (!res.ok) {
              console.error("create-paypal-order エラー:", body);
              throw new Error(body.error || "createOrder に失敗しました");
            }

            // PayPal に渡すべき orderID を返す
            return body.id;
          } catch (err) {
            console.error("createOrder 例外:", err);
            // throw すると PayPal SDK がエラーを表示
            throw err;
          }
        },

        // ===================================================================
        // 2) onApprove: 承認後にキャプチャ処理を実行 → Firestore の purchased フラグを true
        // ===================================================================
        onApprove: async (data, actions) => {
          try {
            const idToken = await awaitFirebaseIdToken();

            // Order をキャプチャし、Firestore の listing.purchased = true にセット
            const res = await fetch(
              "https://us-central1-puzzlecraft-b58c1.cloudfunctions.net/api/capture-paypal-order",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                  orderID: data.orderID,
                  listingId,
                }),
              }
            );

            const body = await res.json();
            if (!res.ok) {
              console.error("capture-paypal-order エラー:", body);
              throw new Error(body.error || "capture に失敗しました");
            }

            // Cloud Functions 側で Firestore の purchased フラグは更新済みの想定
            // 必要に応じて body を使って UI を更新

            // 親コンポーネントへ通知
            if (onSuccess) {
              onSuccess(body);
            }

            // 購入完了後に購入履歴ページへ遷移（必要に応じて変更）
            navigate("/purchases");
          } catch (err) {
            console.error("onApprove 例外:", err);
            if (onError) onError(err);
          }
        },

        // ===================================================================
        // 3) onError: エラーが起きたとき
        // ===================================================================
        onError: (err) => {
          console.error("PayPal 処理中にエラー:", err);
          if (onError) onError(err);
        },

        // ===================================================================
        // 4) onCancel: ユーザーが購入をキャンセルしたとき
        // ===================================================================
        onCancel: (data) => {
          console.log("PayPal 購入キャンセル:", data);
          if (onCancel) onCancel(data);
        },
      })
      .render(paypalRef.current) // レンダリング先の <div ref={paypalRef} />
      .then(() => {
        // ボタン読み込み完了
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("PayPal Buttons のレンダリング失敗:", err);
        setIsLoading(false);
      });
  }, [listingId, onSuccess, onError, onCancel, navigate]);

  return (
    <div>
      {isLoading && <p>PayPal ボタンを読み込み中…</p>}
      <div ref={paypalRef} />
    </div>
  );
};

export default PurchaseWithPayPal;
