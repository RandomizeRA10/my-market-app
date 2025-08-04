//src/components/PurchaseButton.jsx

import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { purchaseMarketplaceItem } from '../services/playfabService';

export default function PurchaseButton({ listing, user, sessionTicket }) {
  const [loading, setLoading] = useState(false);
  
  const handlePurchase = async () => {
    // window.confirm()を使用してESLintエラーを回避
    if (!window.confirm(`${listing.title}を${listing.price}円で購入しますか？`)) {
      return;
    }
    
    setLoading(true);
    
    try {
      // 1. PlayFabで購入処理を実行
      const playFabResult = await purchaseMarketplaceItem({
        sessionTicket,
        listingId: listing.playFabListingId,
        playFabItemId: listing.playFabItemId
      });
      
      if (!playFabResult.success) {
        throw new Error(playFabResult.message || '購入処理に失敗しました');
      }
      
      // 2. Firestoreの出品情報を更新
      await updateDoc(doc(db, 'listings', listing.id), {
        purchased: true,
        buyer: user.uid,
        purchasedAt: serverTimestamp()
      });
      
      alert(`${listing.title}を購入しました！`);
    } catch (error) {
      console.error('購入処理エラー:', error);
      alert(`購入エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <button
      onClick={handlePurchase}
      disabled={loading}
      className="purchase-button"
    >
      {loading ? '処理中...' : '購入する'}
    </button>
  );
}