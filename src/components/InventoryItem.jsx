import React from 'react';
import PropTypes from 'prop-types';
import { getItemCustomData, getItemDisplayName } from '../utils/itemDataUtils';

export default function InventoryItem({ item, onList, disabled }) {
  if (!item) return null;
  
  // カスタムデータの安全な取得
  const customData = getItemCustomData(item);
  
  // 出品中かどうか
  const isListed = customData.isListed === "true";
  const listingPrice = customData.listingPrice;
  
  return (
    <div className={`item-card ${isListed ? 'listed' : ''}`}>
      <div className="item-name">{getItemDisplayName(item)}</div>
      
      <div className="item-details">
        {/* ステータス情報の表示 */}
        {Object.entries(customData).filter(([key]) => 
          key !== 'isListed' && key !== 'listingPrice' && key !== 'listingTime'
        ).map(([key, value]) => (
          <div key={key} className="item-status">
            <span className="status-key">{key}:</span> 
            <span className="status-value">
              {typeof value === 'object' 
                ? JSON.stringify(value).substring(0, 30) 
                : String(value).substring(0, 30)}
            </span>
          </div>
        ))}
        
        {/* 残り使用回数の表示 */}
        {item.RemainingUses !== undefined && (
          <div className="item-uses">
            <span className="status-key">残り使用回数:</span>
            <span className="status-value">{item.RemainingUses}</span>
          </div>
        )}
        
        {/* 出品中ステータス */}
        {isListed && (
          <div className="listing-status">
            <span className="listing-badge">出品中</span>
            <span className="listing-price">¥{listingPrice}</span>
          </div>
        )}
      </div>
      
      <div className="item-actions">
        <button 
          onClick={() => onList(item)}
          className="list-item-btn"
          disabled={disabled || isListed}
        >
          {isListed ? '出品中' : '出品する'}
        </button>
      </div>
    </div>
  );
}

InventoryItem.propTypes = {
  item: PropTypes.object,
  onList: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};