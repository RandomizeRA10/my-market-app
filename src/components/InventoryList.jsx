import React from 'react';
import PropTypes from 'prop-types';
import { getItemCustomData } from '../utils/itemDataUtils';

export default function InventoryList({ items, onListItem, loading, onRefresh }) {
  // アイテムをフィルタリングして、出品中でないものだけ表示
  const availableItems = items.filter(item => {
    const customData = getItemCustomData(item);
    return customData.isListed !== "true";
  });

  if (loading) {
    return <p>読み込み中...</p>;
  }
  
  return (
    <div>
      <div className="inventory-controls">
        <button onClick={onRefresh} className="refresh-button">
          インベントリを更新
        </button>
      </div>
      
      <h3>利用可能なアイテム</h3>
      {availableItems.length === 0 ? (
        <p>利用可能なアイテムがありません。</p>
      ) : (
        <div className="inventory-grid">
          {availableItems.map((item) => (
            <div className="item-card" key={item.ItemInstanceId}>
              <div className="item-name">{item.DisplayName || item.ItemId}</div>
              <div className="item-details">
                {renderItemCustomData(item)}
                {item.RemainingUses !== undefined && (
                  <p>残り使用回数: {item.RemainingUses}</p>
                )}
              </div>
              <div className="item-actions">
                <button 
                  onClick={() => onListItem(item)}
                  className="list-item-btn"
                >
                  出品する
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function renderItemCustomData(item) {
  const customData = getItemCustomData(item);
  const filteredData = Object.entries(customData).filter(([key]) => 
    !['isListed', 'listingPrice', 'listingId', 'listingTime'].includes(key)
  );
  
  if (filteredData.length === 0) return null;
  
  return (
    <div className="custom-data">
      {filteredData.map(([key, value]) => (
        <div key={key} className="item-status">
          <span className="status-key">{key}:</span>
          <span className="status-value">
            {typeof value === 'object' 
              ? JSON.stringify(value).substring(0, 30) 
              : String(value)}
          </span>
        </div>
      ))}
    </div>
  );
}

InventoryList.propTypes = {
  items: PropTypes.array,
  onListItem: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  onRefresh: PropTypes.func
};