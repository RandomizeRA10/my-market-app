import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import SellerRegistration from './SellerRegistration';

export default function SellerOnboarding({ user, onStatusUpdate }) {
  const [sellerStatus, setSellerStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRegistration, setShowRegistration] = useState(false);

  useEffect(() => {
    if (user) {
      checkSellerStatus();
    }
  }, [user]);

  const checkSellerStatus = async () => {
    try {
      const functions = getFunctions();
      const checkStatus = httpsCallable(functions, 'checkSellerStatus');
      const result = await checkStatus();
      setSellerStatus(result.data);
      
      if (onStatusUpdate) {
        onStatusUpdate(result.data);
      }
    } catch (error) {
      console.error('Status check failed:', error);
      setSellerStatus({ needsSetup: true });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueVerification = async () => {
    try {
      setLoading(true);
      const functions = getFunctions();
      const continueOnboarding = httpsCallable(functions, 'continueSellerOnboarding');
      const result = await continueOnboarding();
      
      if (result.data.onboardingUrl) {
        window.location.href = result.data.onboardingUrl;
      }
    } catch (error) {
      alert('エラー: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="seller-status">読み込み中...</div>;
  }

  // 登録フォーム表示
  if (showRegistration) {
    return (
      <SellerRegistration
        user={user}
        onSuccess={() => {
          setShowRegistration(false);
          checkSellerStatus();
        }}
        onCancel={() => setShowRegistration(false)}
      />
    );
  }

  // 設定が必要
  if (sellerStatus?.needsSetup) {
    return (
      <div className="seller-onboarding">
        <div className="onboarding-welcome">
          <h3>販売者になる</h3>
          <p>商品を販売して収益を得ませんか？</p>
          
          <div className="benefits">
            <div className="benefit-item">
              <span className="icon">💰</span>
              <div>
                <h4>売上の90%があなたの収益</h4>
                <p>手数料はわずか10%</p>
              </div>
            </div>
            
            <div className="benefit-item">
              <span className="icon">🏦</span>
              <div>
                <h4>自動振込</h4>
                <p>売上は毎月自動で振り込まれます</p>
              </div>
            </div>
            
            <div className="benefit-item">
              <span className="icon">📱</span>
              <div>
                <h4>簡単出品</h4>
                <p>写真と説明を追加するだけで出品完了</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowRegistration(true)}
            className="btn-primary large"
          >
            販売者登録を始める
          </button>
        </div>
      </div>
    );
  }

  // 本人確認が必要
  if (sellerStatus?.requiresVerification) {
    return (
      <div className="seller-onboarding">
        <div className="verification-required">
          <h3>本人確認が必要です</h3>
          <p>販売を開始するために、本人確認を完了してください。</p>
          
          <div className="verification-steps">
            <div className="step">
              <span className="step-number">1</span>
              <span>身分証明書をアップロード</span>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <span>銀行口座情報を入力</span>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <span>審査完了（1-3営業日）</span>
            </div>
          </div>
          
          <button 
            onClick={handleContinueVerification}
            className="btn-primary"
            disabled={loading}
          >
            {loading ? '処理中...' : '本人確認を続ける'}
          </button>
        </div>
      </div>
    );
  }

  // 審査中
  if (sellerStatus?.underReview) {
    return (
      <div className="seller-onboarding">
        <div className="under-review">
          <h3>審査中</h3>
          <p>本人確認書類を審査中です。1-3営業日でメールにてご連絡いたします。</p>
          
          <div className="review-status">
            <div className="status-item completed">
              <span className="icon">✓</span>
              <span>基本情報登録完了</span>
            </div>
            <div className="status-item completed">
              <span className="icon">✓</span>
              <span>本人確認書類提出完了</span>
            </div>
            <div className="status-item pending">
              <span className="icon">⏳</span>
              <span>審査中</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 完了済み
  if (sellerStatus?.isComplete) {
    return (
      <div className="seller-onboarding">
        <div className="onboarding-complete">
          <h3>✅ 販売者設定完了</h3>
          <p>販売者登録が完了しました。商品を出品できます。</p>
          
          <div className="next-steps">
            <h4>次のステップ</h4>
            <ul>
              <li>商品の写真を撮影</li>
              <li>商品の説明を作成</li>
              <li>適切な価格を設定</li>
              <li>出品ボタンをクリック</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return null;

}