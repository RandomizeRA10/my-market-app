import React, { useState, useEffect } from 'react';
import './App.css';
import { loginWithEmail, registerWithEmail, getUserInventory, getMockInventory } from './services/playfabService';
import ListingModal from './components/ListingModal';
import MarketplaceList from './components/MarketplaceList';
import InventoryList from './components/InventoryList';
import './components/ItemStatus.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [sessionTicket, setSessionTicket] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [playFabId, setPlayFabId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshFlag, setRefreshFlag] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // モーダル関連の状態
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // インベントリを取得する関数
  const fetchInventory = async (ticket) => {
    setLoading(true);
    try {
      const items = await getUserInventory(ticket || sessionTicket);
      
      // 開発環境の場合、モックインベントリアイテムを追加
      if (process.env.NODE_ENV === 'development') {
        const mockItems = getMockInventory(user?.uid);
        console.log('モックインベントリアイテム:', mockItems);
        
        if (mockItems.length > 0) {
          // リアルとモックを混合
          setInventory([...items, ...mockItems]);
        } else {
          setInventory(items);
        }
      } else {
        setInventory(items);
      }
    } catch (err) {
      setError(`インベントリ取得エラー: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // ログイン状態を確認
  useEffect(() => {
    const ticket = localStorage.getItem('playfab_session_ticket');
    const id = localStorage.getItem('playfab_player_id');
    const email = localStorage.getItem('user_email');
    
    if (ticket && id) {
      setSessionTicket(ticket);
      setPlayFabId(id);
      setUser({ uid: id, email });
      setIsLoggedIn(true);
      
      // インベントリ取得
      fetchInventory(ticket);
    }
  }, []);
  
  // 認証処理
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const email = e.target.email.value;
      const password = e.target.password.value;
      
      let response;
      
      if (isRegistering) {
        response = await registerWithEmail(email, password);
        alert("登録が完了しました！ログインしてください。");
        setIsRegistering(false);
        setLoading(false);
        return;
      } else {
        response = await loginWithEmail(email, password);
      }
      
      // セッション情報を保存
      setSessionTicket(response.SessionTicket);
      setPlayFabId(response.PlayFabId);
      setUser({ uid: response.PlayFabId, email });
      setIsLoggedIn(true);
      
      // ローカルストレージに保存
      localStorage.setItem('playfab_session_ticket', response.SessionTicket);
      localStorage.setItem('playfab_player_id', response.PlayFabId);
      localStorage.setItem('user_email', email);
      
      // インベントリ取得
      const items = await getUserInventory(response.SessionTicket);
      setInventory(items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // ログアウト処理
  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setSessionTicket('');
    setPlayFabId('');
    setInventory([]);
    localStorage.removeItem('playfab_session_ticket');
    localStorage.removeItem('playfab_player_id');
    localStorage.removeItem('user_email');
  };
  
  // 登録/ログインモード切替
  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
  };
  
  // 出品モーダルを開く
  const openListingModal = (item) => {
    setSelectedItem(item);
    setShowModal(true);
  };
  
  // 出品後のリフレッシュ処理
  const handleNewListing = () => {
    fetchInventory();
    setRefreshFlag(prev => prev + 1);
  };
  
  // インベントリアイテムを表示
  const renderInventory = () => {
    if (!isLoggedIn) return null;
    
    return (
      <div className="section">
        <h2>あなたのインベントリ</h2>
        <InventoryList
          items={inventory}
          onListItem={openListingModal}
          loading={loading}
          onRefresh={() => fetchInventory()} // インベントリ更新関数を追加
        />
      </div>
    );
  };
  
  return (
    <div className="container">
      <h1>PlayFab マーケットプレイス</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      {/* 認証UI */}
      {!isLoggedIn ? (
        <div className="section">
          <h2>{isRegistering ? '新規登録' : 'ログイン'}</h2>
          <form onSubmit={handleAuthSubmit}>
            <div className="form-group">
              <label htmlFor="email">メールアドレス</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="form-group">
              <label htmlFor="password">パスワード</label>
              <input type="password" id="password" name="password" required />
            </div>
            <div className="auth-actions">
              <button type="submit" disabled={loading}>
                {loading ? (isRegistering ? '登録中...' : 'ログイン中...') : (isRegistering ? '登録する' : 'ログイン')}
              </button>
              <button type="button" onClick={toggleAuthMode} className="secondary-button">
                {isRegistering ? 'ログイン画面へ' : '新規登録はこちら'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="user-info">
            <p>ログイン中: {user.email}</p>
            <button onClick={handleLogout} className="logout-button">ログアウト</button>
          </div>
          
          {/* インベントリ表示 */}
          {renderInventory()}
          
          {/* マーケットプレイス */}
          <MarketplaceList 
            user={user} 
            refreshFlag={refreshFlag}
            sessionTicket={sessionTicket}
            onSuccess={handleNewListing} // 出品取り消し後にインベントリ更新するために追加
          />
          
          {/* 出品モーダル */}
          <ListingModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            selectedItem={selectedItem}
            user={user}
            sessionTicket={sessionTicket}
            onSuccess={handleNewListing}
          />
        </>
      )}
    </div>
  );
}

export default App;