import { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function StripeCheckoutButton({ item, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onClick = async () => {
    if (!item || !item.id || loading) return;
    
    setLoading(true);
    setError('');

    try {
      const user = getAuth().currentUser;
      if (!user) {
        throw new Error('ログインしてください');
      }

      if (item.owner === user.uid) {
        throw new Error('自分の商品は購入できません');
      }

      // 商品の最新状態確認
      const itemDoc = await getDoc(doc(db, 'listings', item.id));
      if (!itemDoc.exists() || itemDoc.data().purchased) {
        throw new Error('この商品は既に購入されています');
      }

      // 新しい関数名を使用
      const functions = getFunctions(undefined, 'us-central1');
      const createPayment = httpsCallable(functions, 'createPaymentSession');

      const result = await createPayment({
        listingId: item.id,
        amount: item.price,
        title: item.title,
        description: item.description || `${item.title}の購入`
      });

      if (result.data && result.data.url) {
        window.location.href = result.data.url;
      } else {
        throw new Error('決済URLの取得に失敗しました');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || '決済処理に失敗しました');
      alert(`決済エラー: ${err.message || '決済処理に失敗しました'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stripe-checkout-container">
      <button 
        onClick={onClick} 
        disabled={loading || !item || !item.id}
        className="stripe-checkout-button"
      >
        {loading ? (
          <>
            <span className="loading-spinner-small"></span>
            処理中…
          </>
        ) : (
          <>
            💳 ¥{item.price?.toLocaleString()}で購入
          </>
        )}
      </button>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}