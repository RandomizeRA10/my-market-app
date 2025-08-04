import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { mockTestPurchase } from '../services/playfabService';

export default function MockPurchaseButton({ listing, user, sessionTicket, onSuccess }) {
  const [processing, setProcessing] = useState(false);

  const handlePurchase = async () => {
    if (!user || !listing || processing) return;

    if (!window.confirm(`「${listing.title}」を${listing.price}円で購入しますか？`)) {
      return;
    }

    setProcessing(true);
    try {
      console.log('購入処理開始:', listing);

      // PlayFabで模擬購入処理を実行
      const purchaseResult = await mockTestPurchase({
        listing,
        user,
        customData: listing.itemDetails?.customData
      });

      console.log('購入結果:', purchaseResult);

      if (purchaseResult.success) {
        // 成功した場合は、Firestoreのリスティングを削除する
        // (以前は purchased: true と設定していたが、削除する方が適切)
        await deleteDoc(doc(db, 'listings', listing.id));
        
        alert(`「${listing.title}」を購入しました！インベントリに追加されました。`);
        
        // 親コンポーネントに成功を通知（インベントリを更新するため）
        if (onSuccess) onSuccess();
      } else {
        throw new Error(purchaseResult.message || '購入処理に失敗しました');
      }
    } catch (error) {
      console.error('購入エラー:', error);
      alert(`購入処理中にエラーが発生しました: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <button
      className="mock-purchase-button"
      onClick={handlePurchase}
      disabled={processing}
    >
      {processing ? '処理中...' : `¥${listing.price}で購入`}
    </button>
  );
}

MockPurchaseButton.propTypes = {
  listing: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  sessionTicket: PropTypes.string,
  onSuccess: PropTypes.func
};