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

  // デバッグ用ログ - これが表示されるか確認
  console.log('🔥🔥🔥 MarketplaceList component loaded');

  useEffect(() => {
    console.log('🔥 Auth useEffect running');
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      console.log('🔥 Auth state changed:', currentUser?.email || 'No user');
      setUser(currentUser);
      if (currentUser) {
        console.log('🔥 User exists, checking seller status...');
        checkSellerStatus(currentUser);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    console.log('🔥 Products useEffect running');
    loadProducts();
  }, []);

  const checkSellerStatus = async (user) => {
    try {
      console.log('🔥 Checking seller status for:', user.uid);
      const functions = getFunctions();
      const checkStatus = httpsCallable(functions, 'checkSellerStatus');
      const result = await checkStatus();
      console.log('🔥 Seller status result:', result.data);
      setSellerStatus(result.data);
    } catch (error) {
      console.error('🔥 Status check failed:', error);
      // エラーでもボタンを表示するためのデフォルト値
      setSellerStatus({ hasAccount: false, isComplete: false, needsSetup: true });
    }
  };

  const loadProducts = async () => {
    console.log('🔥 Loading products...');
    setLoading(true);
    try {
      const q = query(
        collection(db, 'listings'),
        where('purchased', '==', false),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      console.log('🔥 Products loaded:', items.length);
      setProducts(items);
    } catch (err) {
      console.error('🔥 Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  };

  // 毎回レンダリング時のデバッグ
  console.log('🔥 Render state:', { 
    user: user?.email, 
    sellerStatus, 
    showSellerSetup,
    userExists: !!user
  });

  if (loading) {
    console.log('🔥 Showing loading state');
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
        
        {/* 強制表示テスト */}
        <div className="user-actions" style={{ marginTop: '10px' }}>
          <div style={{ 
            padding: '10px', 
            background: '#f0f0f0', 
            borderRadius: '4px',
            marginBottom: '10px',
            fontSize: '12px'
          }}>
            <div>🔥 DEBUG INFO:</div>
            <div>User: {user ? `${user.email} (${user.uid})` : 'Not logged in'}</div>
            <div>SellerStatus: {JSON.stringify(sellerStatus)}</div>
            <div>ShowSellerSetup: {showSellerSetup.toString()}</div>
          </div>
          
          {user ? (
            <button 
              onClick={() => {
                console.log('🔥 Button clicked! Current showSellerSetup:', showSellerSetup);
                setShowSellerSetup(!showSellerSetup);
                console.log('🔥 Setting showSellerSetup to:', !showSellerSetup);
              }}
              style={{ 
                background: '#007cba', 
                color: 'white', 
                padding: '12px 20px', 
                border: 'none', 
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              {sellerStatus?.isComplete ? '✅ 販売者' : '💼 販売者になる'}
            </button>
          ) : (
            <div style={{ padding: '12px', color: '#666', fontSize: '16px' }}>
              ログインが必要です
            </div>
          )}
        </div>
      </header>

      {showSellerSetup && (
        <div className="seller-setup-panel" style={{ 
          background: '#f8f9fa', 
          border: '2px solid #007cba', 
          borderRadius: '8px', 
          padding: '20px', 
          marginBottom: '30px' 
        }}>
          <h3>🎉 販売者登録パネル</h3>
          <p>販売者登録機能をテスト中...</p>
          <SellerOnboarding 
            user={user}
            connectStatus={sellerStatus}
            onStatusUpdate={() => checkSellerStatus(user)}
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