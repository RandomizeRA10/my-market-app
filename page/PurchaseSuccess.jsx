import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, getDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function PurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    async function verifyPurchase() {
      try {
        const sessionId = searchParams.get('session_id');
        if (!sessionId) {
          setError('セッションIDが見つかりません');
          setStatus('error');
          return;
        }

        // Find transaction by Stripe session ID
        const transactionQuery = query(
          collection(db, 'transactions'), 
          where('stripeSessionId', '==', sessionId)
        );
        
        const transactionSnapshot = await getDocs(transactionQuery);

        if (transactionSnapshot.empty) {
          // Transaction might not be updated in Firestore yet, wait and retry
          setTimeout(verifyPurchase, 2000);
          return;
        }

        const transactionData = transactionSnapshot.docs[0].data();
        setTransaction(transactionData);
        
        // If transaction is completed, show success
        if (transactionData.status === 'completed') {
          setStatus('success');
        } else {
          // Transaction is still processing, wait and retry
          setTimeout(verifyPurchase, 2000);
        }
      } catch (err) {
        console.error('Purchase verification error:', err);
        setError('購入の確認中にエラーが発生しました: ' + err.message);
        setStatus('error');
      }
    }

    verifyPurchase();
  }, [searchParams]);

  if (status === 'loading') {
    return (
      <div className="purchase-success-container">
        <h2>購入処理を確認中...</h2>
        <p>しばらくお待ちください</p>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="purchase-success-container error">
        <h2>エラーが発生しました</h2>
        <p className="error-message">{error}</p>
        <div className="action-buttons">
          <Link to="/" className="button">トップページへ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="purchase-success-container">
      <div className="success-icon">✓</div>
      <h2>購入が完了しました！</h2>
      
      {transaction && (
        <div className="transaction-details">
          <p className="amount">金額: {transaction.amount}円</p>
          <p className="date">日時: {transaction.completedAt?.toDate().toLocaleString()}</p>
        </div>
      )}
      
      <p>アイテムがあなたのインベントリに追加されました。</p>
      
      <div className="action-buttons">
        <Link to="/" className="button primary">トップページへ</Link>
        <Link to="/inventory" className="button">インベントリを確認</Link>
      </div>
    </div>
  );
}