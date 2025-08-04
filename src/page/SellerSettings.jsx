import React, { useState, useEffect } from 'react';
import { firebase } from '../firebase';
import { useNavigate } from 'react-router-dom';
import '../styles/SellerSettings.css';

export default function SellerSettings({ user }) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    checkStripeAccountStatus();
  }, [user, navigate]);

  const checkStripeAccountStatus = async () => {
    try {
      setLoading(true);
      const checkConnectAccountStatus = firebase.functions().httpsCallable('checkConnectAccountStatus');
      const result = await checkConnectAccountStatus();
      
      setStatus(result.data);
      setLoading(false);
    } catch (err) {
      console.error('Stripe account status check failed:', err);
      setError('アカウント情報の取得に失敗しました: ' + err.message);
      setLoading(false);
    }
  };

  const handleCreateConnectAccount = async () => {
    try {
      setLoading(true);
      const createConnectAccount = firebase.functions().httpsCallable('createConnectAccount');
      const result = await createConnectAccount({
        email: user.email,
        domain: window.location.origin
      });
      
      if (result.data && result.data.url) {
        // Stripe Connect オンボーディングページにリダイレクト
        window.location.href = result.data.url;
      } else if (result.data.success) {
        // すでに設定済みの場合
        alert('Stripeアカウントは既に設定されています');
        checkStripeAccountStatus();
      } else {
        throw new Error('アカウント作成に失敗しました');
      }
    } catch (err) {
      console.error('Connect account creation failed:', err);
      setError('Stripeアカウントの作成に失敗しました: ' + err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="seller-settings container">
      <h2>販売者設定を読み込み中...</h2>
      <div className="loading-spinner"></div>
    </div>;
  }

  return (
    <div className="seller-settings container">
      <h2>販売者設定</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="status-card">
        <h3>Stripe Connect アカウント状態</h3>
        
        {status?.needsSetup ? (
          <div className="account-setup">
            <p>出品した商品が売れた際に入金を受け取るには、Stripe Connectアカウントの設定が必要です。</p>
            <button 
              className="primary-button" 
              onClick={handleCreateConnectAccount}
            >
              Stripeアカウントを設定する
            </button>
          </div>
        ) : (
          <div className="account-info">
            <div className="status-item">
              <span className="label">アカウントID:</span>
              <span className="value">{status?.accountId}</span>
            </div>
            
            <div className="status-item">
              <span className="label">登録状態:</span>
              <span className={`value ${status?.detailsSubmitted ? 'complete' : 'incomplete'}`}>
                {status?.detailsSubmitted ? '完了' : '未完了'}
              </span>
            </div>
            
            <div className="status-item">
              <span className="label">振込設定:</span>
              <span className={`value ${status?.payoutsEnabled ? 'enabled' : 'disabled'}`}>
                {status?.payoutsEnabled ? '有効' : '未設定'}
              </span>
            </div>
            
            {!status?.detailsSubmitted && (
              <button 
                className="primary-button" 
                onClick={handleCreateConnectAccount}
              >
                登録を完了する
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* 売上情報 */}
      <SalesInfo user={user} />
    </div>
  );
}

// 売上情報コンポーネント
function SalesInfo({ user }) {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!user) return;
    
    fetchSalesInfo();
  }, [user]);
  
  const fetchSalesInfo = async () => {
    try {
      setLoading(true);
      const getUserSalesInfo = firebase.functions().httpsCallable('getUserSalesInfo');
      const result = await getUserSalesInfo();
      
      setSalesData(result.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch sales info:', err);
      setError('売上情報の取得に失敗しました: ' + err.message);
      setLoading(false);
    }
  };
  
  if (loading) {
    return <div className="sales-info">
      <h3>売上情報を読み込み中...</h3>
      <div className="loading-spinner"></div>
    </div>;
  }
  
  if (error) {
    return <div className="sales-info">
      <h3>売上情報</h3>
      <div className="error-message">{error}</div>
      <button onClick={fetchSalesInfo} className="secondary-button">再試行</button>
    </div>;
  }
  
  return (
    <div className="sales-info">
      <h3>売上情報</h3>
      
      <div className="sales-summary">
        <div className="summary-item">
          <span className="label">総売上:</span>
          <span className="value">¥{salesData?.totalAmount || 0}</span>
        </div>
        <div className="summary-item">
          <span className="label">手数料:</span>
          <span className="value">¥{salesData?.totalFees || 0}</span>
        </div>
        <div className="summary-item total">
          <span className="label">受取金額:</span>
          <span className="value">¥{salesData?.netAmount || 0}</span>
        </div>
      </div>
      
      {salesData?.accountBalance !== null && (
        <div className="account-balance">
          <h4>Stripe残高</h4>
          <p className="balance">¥{salesData.accountBalance || 0}</p>
          <p className="payout-status">
            {salesData.payoutsEnabled 
              ? '振込は毎月1日に自動的に行われます' 
              : '振込を受け取るにはStripe Connectの設定を完了してください'}
          </p>
        </div>
      )}
      
      <h4>販売履歴</h4>
      {salesData?.sales?.length > 0 ? (
        <div className="sales-history">
          <table>
            <thead>
              <tr>
                <th>日時</th>
                <th>金額</th>
                <th>手数料</th>
                <th>受取</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {salesData.sales.map(sale => (
                <tr key={sale.id}>
                  <td>{new Date(sale.createdAt).toLocaleString()}</td>
                  <td>¥{sale.amount}</td>
                  <td>¥{sale.applicationFeeAmount}</td>
                  <td>¥{sale.netAmount}</td>
                  <td>完了</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-data">販売履歴はありません</p>
      )}
    </div>
  );
}