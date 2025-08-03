import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { listItemOnPlayFab, fetchPlayFabSession } from '../services/playfabService';
import { getItemCustomData } from '../utils/itemDataUtils';

export default function ListingModal({ isOpen, onClose, selectedItem, user, sessionTicket, onSuccess }) {
  const [form, setForm] = useState({
    price: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // 選択されたアイテムが変更されたらフォームをリセット
  useEffect(() => {
    if (selectedItem) {
      setForm({
        price: '',
        description: selectedItem?.CustomData?.description || ''
      });
      setErrors({});
    }
  }, [selectedItem]);
  
  if (!isOpen || !selectedItem) return null;
  
  // カスタムデータを安全に取得
  const customData = getItemCustomData(selectedItem);
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!form.price || isNaN(form.price) || Number(form.price) <= 0) {
      newErrors.price = '有効な価格を入力してください（1円以上）';
    }
    
    if (Number(form.price) > 1000000) {
      newErrors.price = '価格は1,000,000円以下で設定してください';
    }
    
    if (form.description.length > 500) {
      newErrors.description = '説明は500文字以内で入力してください';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value
    });
    
    // エラーをクリア
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!selectedItem || !form.price) {
      alert('価格を入力してください');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('出品処理開始:', {
        itemId: selectedItem.ItemId,
        instanceId: selectedItem.ItemInstanceId,
        customData: customData,
        price: form.price,
        description: form.description
      });
      
      // PlayFabのセッション情報を取得
      let playFabPlayerId = null;
      try {
        const sessionInfo = await fetchPlayFabSession();
        playFabPlayerId = sessionInfo.playFabId;
        console.log('PlayFab Player ID:', playFabPlayerId);
      } catch (err) {
        console.warn('PlayFabセッション情報の取得に失敗しました:', err);
        // PlayFab IDが取得できなくても出品は続行
      }
      
      // 1. PlayFab APIで出品
      const playFabResult = await listItemOnPlayFab({
        sessionTicket,
        itemInstanceId: selectedItem.ItemInstanceId,
        price: Number(form.price),
        description: form.description
      });
      
      console.log('PlayFab 出品結果:', playFabResult);
      
      if (!playFabResult.success) {
        throw new Error(playFabResult.message || 'PlayFabでの出品に失敗しました');
      }
      
      // PlayFabから返されたリスティングIDを必ず使用
      const playFabListingId = playFabResult.listingId;
      if (!playFabListingId) {
        throw new Error('PlayFabからリスティングIDが返されませんでした');
      }
      
      // 2. Firestore にも出品データを保存（修正: 両方のフィールドを設定）
      const listingData = {
        title: selectedItem.DisplayName || selectedItem.ItemId,
        price: Number(form.price),
        owner: user.uid,
        playFabItemId: selectedItem.ItemInstanceId,
        catalogItemId: selectedItem.ItemId,
        catalogVersion: selectedItem.CatalogVersion || "main",
        playFabListingId: playFabListingId,
        playFabSellerId: playFabPlayerId,
        description: form.description || '',
        createdAt: serverTimestamp(),
        
        // 修正: 両方のフィールドを確実に設定
        purchased: false,
        isActive: true,
        
        itemDetails: {
          itemId: selectedItem.ItemId,
          catalogVersion: selectedItem.CatalogVersion,
          customData: customData,
          displayName: selectedItem.DisplayName,
          remainingUses: selectedItem.RemainingUses
        },
        
        // 販売者情報
        sellerInfo: {
          uid: user.uid,
          email: user.email,
          playFabId: playFabPlayerId
        }
      };
      
      console.log('Firestoreに保存するデータ:', listingData);
      
      const docRef = await addDoc(collection(db, 'listings'), listingData);
      
      console.log('Firestore出品完了:', docRef.id);
      
      // 3. 成功通知と親コンポーネント更新
      alert(`「${selectedItem.DisplayName || selectedItem.ItemId}」を${Number(form.price).toLocaleString()}円で出品しました！`);
      
      if (onSuccess) {
        onSuccess();
      }
      
      onClose();
    } catch (error) {
      console.error('出品エラー:', error);
      alert(`出品エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modal">
      <div className="modal-content">
        <div className="modal-header">
          <h2>アイテムを出品する</h2>
          <span className="close-button" onClick={onClose}>&times;</span>
        </div>
        
        <form onSubmit={handleSubmit} className="listing-form">
          <div className="form-group">
            <label>アイテム名</label>
            <input
              type="text"
              value={selectedItem.DisplayName || selectedItem.ItemId || ''}
              disabled
              className="form-input disabled"
            />
          </div>
          
          {/* アイテム情報表示 */}
          {Object.keys(customData).length > 0 && (
            <div className="item-status-container">
              <h4>アイテム情報:</h4>
              <div className="item-status-grid">
                {Object.entries(customData).map(([key, value]) => (
                  <div key={key} className="item-status">
                    <span className="status-key">{key}:</span> 
                    <span className="status-value">
                      {typeof value === 'object' 
                        ? JSON.stringify(value).substring(0, 50) + '...'
                        : String(value).substring(0, 50)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 残り使用回数の表示 */}
          {selectedItem.RemainingUses !== undefined && (
            <div className="form-group">
              <label>残り使用回数</label>
              <input
                type="text"
                value={selectedItem.RemainingUses}
                disabled
                className="form-input disabled"
              />
            </div>
          )}
          
          <div className="form-group">
            <label>価格 *</label>
            <div className="price-input-container">
              <span className="currency">¥</span>
              <input
                type="number"
                name="price"
                value={form.price}
                onChange={handleChange}
                required
                min="1"
                max="1000000"
                className={`form-input ${errors.price ? 'error' : ''}`}
                placeholder="例: 1000"
              />
            </div>
            {errors.price && <div className="error-message">{errors.price}</div>}
            <small className="form-help">
              1円〜1,000,000円の間で設定してください
            </small>
          </div>
          
          <div className="form-group">
            <label>説明</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows="4"
              maxLength="500"
              className={`form-input ${errors.description ? 'error' : ''}`}
              placeholder="アイテムの詳細や特徴を記載してください（任意）"
            />
            {errors.description && <div className="error-message">{errors.description}</div>}
            <small className="form-help">
              {form.description.length}/500文字
            </small>
          </div>
          
          <div className="form-actions">
            <button 
              type="button" 
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              キャンセル
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? '出品処理中...' : '出品する'}
            </button>
          </div>
          
          {loading && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>PlayFabとFirestoreに出品情報を登録中...</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}