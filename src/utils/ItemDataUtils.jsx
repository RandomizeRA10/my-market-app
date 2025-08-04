/**
 * アイテムのカスタムデータを安全に取得する
 * 
 * @param {Object} item - PlayFabから取得したアイテムオブジェクト
 * @returns {Object} パース済みまたは抽出したカスタムデータオブジェクト
 */
export function getItemCustomData(item) {
  if (!item) return {};

  try {
    // 文字列としてのCustomData
    if (typeof item.CustomData === 'string') {
      return JSON.parse(item.CustomData);
    }

    // CustomData プロパティがオブジェクトの場合
    if (item.CustomData && typeof item.CustomData === 'object') {
      return { ...item.CustomData }; // コピーして返す
    }

    // UDF (User Defined Fields) もチェック（代替カスタムデータ形式）
    if (item.UDF && typeof item.UDF === 'object') {
      return { ...item.UDF };
    }

    // Firestore保存時のcustomDataプロパティ（小文字）
    if (item.customData && typeof item.customData === 'object') {
      return { ...item.customData };
    }

    // itemDetails.customDataの形式
    if (item.itemDetails && item.itemDetails.customData && typeof item.itemDetails.customData === 'object') {
      return { ...item.itemDetails.customData };
    }
  } catch (err) {
    console.warn('カスタムデータのパースに失敗:', err);
  }

  // 何も見つからない場合は空オブジェクトを返す
  return {};
}

/**
 * カスタムデータからレアリティ情報を安全に抽出する関数
 * 
 * @param {Object} customData - アイテムのカスタムデータ
 * @returns {string} レアリティ文字列、または 'Unknown'
 */
export function getRarityFromCustomData(customData) {
  if (!customData) return 'Unknown';

  // 一般的なレアリティフィールド名のリスト
  const rarityFields = ['rarity', 'Rarity', 'RARITY', 'itemRarity', 'rarityLevel'];

  for (const field of rarityFields) {
    if (customData[field] !== undefined) {
      return String(customData[field]);
    }
  }
  return 'Unknown';
}

/**
 * アイテムのカスタムデータを整形して返す関数
 * （デバッグやUI表示用）
 *
 * @param {Object} item - PlayFabから返されたアイテムオブジェクト
 * @returns {Object} フォーマットされたカスタムデータ
 */
export function getFormattedItemData(item) {
  const customData = getItemCustomData(item);
  const rarity = getRarityFromCustomData(customData);

  return {
    id: item?.ItemId || 'unknown',
    instanceId: item?.ItemInstanceId || 'unknown',
    name: getItemDisplayName ? getItemDisplayName(item) : (item?.DisplayName || item?.ItemId || 'Unknown Item'),
    rarity: rarity,
    customData: customData,
  };
}

/**
 * アイテムの表示名を取得する
 * @param {Object} item アイテムオブジェクト
 * @return {String} アイテムの表示名
 */
export function getItemDisplayName(item) {
  if (!item) return 'アイテム';
  return item.DisplayName || item.title || item.ItemId || '名称不明';
}
