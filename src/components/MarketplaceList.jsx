import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import StripeCheckoutButton from './StripeCheckoutButton';
import MockPurchaseButton from './MockPurchaseButton';
import SellerOnboarding from './SellerOnboarding';
import { getAuth } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function MarketplaceList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState(false);
  const [user, setUser] = useState(null);
  const [sellerStatus, setSellerStatus] = useState({ hasAccount: false, isComplete: false });
  const [showSellerSetup, setShowSellerSetup] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        checkSellerStatus(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadProducts();
  }, []);

  const checkSellerStatus = async (user) => {
    try {
      const functions = getFunctions();
      const checkStatus = httpsCallable(functions, 'checkSellerStatus');
      const result = await checkStatus();
      setSellerStatus(result.data);
    } catch (error) {
      console.error('Status check failed:', error);
      setSellerStatus({ hasAccount: false, isComplete: false, needsSetup: true });
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'listings'),
        where('purchased', '==', false),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(items);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 完全修正：未ログインでも直接Stripe登録
  const handleSellerButtonClick = async () => {
    if (!user) {
      // 🎯 未ログインユーザー：直接Stripe Connect新規登録
      console.log('🚀 Opening Stripe Connect for new seller registration...');
      
      // Stripe Connectの新規アカウント作成（日本語）
      const stripeConnectUrl = 'https://connect.stripe.com/express/oauth/authorize?' + 
        'client_id=ca_test_12345&' +  // 実際のStripe Connect Client IDに変更
        'scope=read_write&' +
        'response_type=code&' +
        'redirect_uri=' + encodeURIComponent(window.location.origin + '/stripe-callback') +
        '&state=' + Math.random().toString(36).substring(2);
      
      // 新しいタブで開く
      window.open(stripeConnectUrl, '_blank');
      return;
    }
    
    // 🎯 既存ログインユーザーの場合のみCloud Functions使用
    try {
      if (!sellerStatus?.hasAccount) {
        setShowSellerSetup(true);
      } else if (sellerStatus?.needsOnboarding) {
        const functions = getFunctions();
        const startOnboarding = httpsCallable(functions, 'startOnboardingProcess');
        const result = await startOnboarding();
        
        if (result.data.success && result.data.onboardingUrl) {
          window.location.href = result.data.onboardingUrl;
        } else {
          throw new Error(result.data.message || 'オンボーディングURLの取得に失敗しました');
        }
      } else if (sellerStatus?.isComplete) {
        setShowSellerSetup(!showSellerSetup);
      }
    } catch (error) {
      console.error('Seller button click error:', error);
      alert(`エラーが発生しました: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="marketplace-container">
        <div className="loading-state">
          <p>商品を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="marketplace-container">
      <header className="marketplace-header">
        <h2>マーケットプレイス</h2>
        
        <div className="user-actions" style={{ marginTop: '10px' }}>
          {/* 販売者登録ボタン - 誰でもクリック可能 */}
          <button 
            onClick={handleSellerButtonClick}
            style={{ 
              background: '#28a745',  // 常に緑（新規歓迎）
              color: 'white', 
              padding: '12px 20px', 
              border: 'none', 
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1e7e34'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#28a745'}
          >
            {user 
              ? (sellerStatus?.isComplete ? '✅ 販売者設定完了' : '💼 販売者設定を続ける')
              : '🚀 Stripe販売者になる'
            }
          </button>
          
          {/* 説明文 */}
          <div style={{ 
            marginTop: '8px', 
            fontSize: '14px', 
            color: '#666', 
            textAlign: 'center',
            lineHeight: '1.4'
          }}>
            {!user ? (
              <>
                💰 Stripeで安全に販売者登録<br />
                <small>Firebase/PlayFabアカウント不要</small>
              </>
            ) : (
              '🎯 販売者登録で商品を出品できます'
            )}
          </div>
        </div>
      </header>

      {/* 既存ユーザー向けセットアップパネル */}
      {showSellerSetup && user && (
        <div className="seller-setup-panel">
          <SellerOnboarding 
            user={user}
            onStatusUpdate={(newStatus) => {
              setSellerStatus(newStatus);
              if (newStatus.isComplete) {
                setShowSellerSetup(false);
              }
            }}
          />
        </div>
      )}

      {/* テストモード */}
      {process.env.NODE_ENV === 'development' && (
        <div className="test-controls">
          <label>
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
            />
            テストモード
          </label>
        </div>
      )}

      {/* 商品一覧 */}
      <div className="products-section">
        {products.length === 0 ? (
          <div className="no-products">
            <p>現在出品中の商品はありません</p>
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <p style={{ color: '#666', fontSize: '14px' }}>
                🎯 販売者として商品を出品してみませんか？<br />
                上の「Stripe販売者になる」ボタンから今すぐ開始
              </p>
            </div>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(item => (
              <ProductCard 
                key={item.id} 
                item={item} 
                user={user}
                testMode={testMode}
                onPurchaseSuccess={loadProducts}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ item, user, testMode, onPurchaseSuccess }) {
  const isOwnListing = user && item.owner === user.uid;

  return (
    <div className="product-card">
      <div className="product-header">
        <h3>{item.title}</h3>
        <div className="price">¥{item.price?.toLocaleString()}</div>
      </div>
      
      {item.description && (
        <p className="description">{item.description}</p>
      )}
      
      <div className="product-footer">
        {isOwnListing ? (
          <div className="own-listing">
            <span>あなたの出品</span>
          </div>
        ) : !user ? (
          <div className="login-required">
            <span>ログインが必要です</span>
          </div>
        ) : testMode ? (
          <MockPurchaseButton 
            listing={item} 
            user={user} 
            onSuccess={onPurchaseSuccess}
          />
        ) : (
          <StripeCheckoutButton 
            item={item}
            onSuccess={onPurchaseSuccess}
          />
        )}
      </div>
    </div>
  );
}