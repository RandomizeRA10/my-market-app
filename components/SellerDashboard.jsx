import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useNavigate } from 'react-router-dom';

export default function SellerDashboard() {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState(null);
  const [sellerStatus, setSellerStatus] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      navigate('/');
      return;
    }

    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const functions = getFunctions();
      
      // 販売者ステータス確認
      const checkStatus = httpsCallable(functions, 'checkStripeConnectStatus');
      const statusResult = await checkStatus();
      setSellerStatus(statusResult.data);
      
      // 売上情報取得
      if (statusResult.data.hasAccount) {
        const getSalesInfo = httpsCallable(functions, 'getUserSalesInfo');
        const salesResult = await getSalesInfo();
        setSalesData(salesResult.data);
      }
      
    } catch (err) {
      console.error('Dashboard data fetch failed:', err);
      setError('ダッシュボードデータの取得に失敗しました: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="seller-dashboard">
        <div className="loading-state">
          <h2>ダッシュボードを読み込み中...</h2>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="seller-dashboard">
        <div className="error-state">
          <h2>エラーが発生しました</h2>
          <p className="error-message">{error}</p>
          <button onClick={fetchDashboardData} className="retry-button">
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (!sellerStatus?.hasAccount) {
    return (
      <div className="seller-dashboard">
        <div className="no-account-state">
          <h2>販売者アカウントが必要です</h2>
          <p>売上ダッシュボードを利用するには、まず販売者登録を完了してください。</p>
          <button 
            onClick={() => navigate('/')}
            className="setup-button"
          >
            販売者登録を開始
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-dashboard">
      <header className="dashboard-header">
        <h1>販売者ダッシュボード</h1>
        <button 
          onClick={() => navigate('/')}
          className="back-button"
        >
          マーケットプレイスに戻る
        </button>
      </header>

      {/* アカウント状態 */}
      <div className="account-status-card">
        <h3>アカウント状態</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="label">アカウントID:</span>
            <span className="value">{sellerStatus.accountId}</span>
          </div>
          <div className="status-item">
            <span className="label">詳細情報:</span>
            <span className={`value ${sellerStatus.detailsSubmitted ? 'complete' : 'incomplete'}`}>
              {sellerStatus.detailsSubmitted ? '✅ 提出済み' : '❌ 未提出'}
            </span>
          </div>
          <div className="status-item">
            <span className="label">振込設定:</span>
            <span className={`value ${sellerStatus.payoutsEnabled ? 'enabled' : 'disabled'}`}>
              {sellerStatus.payoutsEnabled ? '✅ 有効' : '❌ 未設定'}
            </span>
          </div>
          <div className="status-item">
            <span className="label">決済受付:</span>
            <span className={`value ${sellerStatus.chargesEnabled ? 'enabled' : 'disabled'}`}>
              {sellerStatus.chargesEnabled ? '✅ 有効' : '❌ 無効'}
            </span>
          </div>
        </div>
      </div>

      {/* 売上サマリー */}
      {salesData && (
        <div className="sales-summary-card">
          <h3>売上サマリー</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">総売上:</span>
              <span className="value">¥{salesData.totalAmount?.toLocaleString() || 0}</span>
            </div>
            <div className="summary-item">
              <span className="label">プラットフォーム手数料:</span>
              <span className="value">¥{salesData.totalFees?.toLocaleString() || 0}</span>
            </div>
            <div className="summary-item total">
              <span className="label">受取金額:</span>
              <span className="value">¥{salesData.netAmount?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Stripe残高 */}
      {salesData?.accountBalance !== null && (
        <div className="account-balance-card">
          <h3>Stripe残高</h3>
          <div className="balance-amount">
            ¥{salesData.accountBalance?.toLocaleString() || 0}
          </div>
          <p className="payout-info">
            {sellerStatus.payoutsEnabled 
              ? '💰 振込は毎週月曜日に自動的に行われます' 
              : '⚠️ 振込を受け取るにはStripe Connectの設定を完了してください'}
          </p>
        </div>
      )}

      {/* 販売履歴 */}
      {salesData?.sales?.length > 0 ? (
        <div className="sales-history-card">
          <h3>販売履歴</h3>
          <div className="sales-table-container">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>日時</th>
                  <th>商品</th>
                  <th>金額</th>
                  <th>手数料</th>
                  <th>受取</th>
                  <th>状態</th>
                </tr>
              </thead>
              <tbody>
                {salesData.sales.map(sale => (
                  <tr key={sale.id}>
                    <td>{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td>{sale.itemTitle}</td>
                    <td>¥{sale.amount?.toLocaleString()}</td>
                    <td>¥{sale.applicationFeeAmount?.toLocaleString()}</td>
                    <td>¥{sale.netAmount?.toLocaleString()}</td>
                    <td>
                      <span className="status-badge complete">完了</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="no-sales-card">
          <h3>販売履歴</h3>
          <p>まだ販売実績がありません。商品を出品して売上を伸ばしましょう！</p>
        </div>
      )}
    </div>
  );
}