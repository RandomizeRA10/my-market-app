// サーバーAPIを呼び出してアイテムを付与
export async function grantItemToPlayer(playerId, itemId, customData = {}) {
  try {
    const response = await fetch('/api/playfab/grant-item', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        playerId,
        itemId,
        customData
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "アイテム付与エラー");
    }
    
    return await response.json();
  } catch (error) {
    console.error('アイテム付与エラー:', error);
    throw error;
  }
}