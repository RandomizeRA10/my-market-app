import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { mockTestPurchase } from '../services/playfabService';

export default function MockPurchaseButton({ listing, user, sessionTicket, onSuccess }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handlePurchase = async () => {
    if (!user || !listing || processing) return;

    // 自分の出品かチェック
    if (listing.owner === user.uid) {
      alert('自分の出品したアイテムは購入できません');
      return;
    }

    if (!window.confirm(`「${listing.title}」を${listing.price?.toLocaleString()}円で購入しますか？\n\n※これはテストモードです。実際の決済は行われません。`)) {
      return;
    }

    setProcessing(true);
    setError('');
    
    try {
      console.log('モック購入処理開始:', listing);

      // アイテムがまだ購入可能かチェック
      const listingDoc = await getDoc(doc(db, 'listings', listing.id));
      if (!listingDoc.exists()) {
        throw new Error('この商品は既に削除されています');
      }
      
      const currentListing = listingDoc.data();
      if (currentListing.purchased) {
        throw new Error('この商品は既に購入されています');
      }

      // PlayFabで模擬購入処理を実行
      const purchaseResult = await mockTestPurchase({
        listing,
        user,
        sessionTicket,
        customData: listing.itemDetails?.customData
      });

      console.log('モック購入結果:', purchaseResult);

      if (purchaseResult.success) {
        // 成功した場合は、Firestoreのリスティングを更新してから削除
        // まず購入済みとしてマーク
        await updateDoc(doc(db, 'listings', listing.id), {
          purchased: true,
          isActive: false,
          buyer: user.uid,
          purchasedAt: new Date(),
          paymentMethod: 'mock_test'
        });

        // 少し待ってから削除（ログ確認のため）
        setTimeout(async () => {
          try {
            await deleteDoc(doc(db, 'listings', listing.id));
            console.log('購入済みリスティングを削除しました:', listing.id);
          } catch (deleteError) {
            console.warn('リスティング削除に失敗:', deleteError);
          }
        }, 1000);
        
        alert(`🎉 「${listing.title}」を購入しました！\n\nインベントリに追加されました。\n購入金額: ¥${listing.price?.toLocaleString()}\n\n※テストモードでの購入です`);
        
        // 親コンポーネントに成功を通知（マーケットプレイスリストを更新するため）
        if (onSuccess) {
          onSuccess();
        }
      } else {
        throw new Error(purchaseResult.message || '購入処理に失敗しました');
      }
    } catch (error) {
      console.error('モック購入エラー:', error);
      setError(error.message);
      alert(`購入処理中にエラーが発生しました: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mock-purchase-container">
      <button
        className={`mock-purchase-button ${processing ? 'processing' : ''}`}
        onClick={handlePurchase}
        disabled={processing}
      >
        {processing ? (
          <>
            <span className="loading-spinner-small"></span>
            処理中...
          </>
        ) : (
          <>
            🧪 ¥{listing.price?.toLocaleString()}でテスト購入
          </>
        )}
      </button>
      
      {error && (
        <div className="error-message mock-error">
          {error}
        </div>
      )}
      
      <div className="payment-info">
        <small>⚠️ テストモード - 実際の決済は行われません</small>
      </div>
    </div>
  );
}

MockPurchaseButton.propTypes = {
  listing: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  sessionTicket: PropTypes.string,
  onSuccess: PropTypes.func
};