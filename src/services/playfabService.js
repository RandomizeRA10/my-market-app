const TITLE_ID = "12F999";

// PlayFabにログインする関数
export async function loginWithEmail(email, password) {
  const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/LoginWithEmailAddress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TitleId: TITLE_ID,
      Email: email,
      Password: password,
      InfoRequestParameters: { GetUserAccountInfo: true }
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.errorMessage || "認証エラー");
  }
  
  return data.data;
}

// PlayFabに新規登録する関数
export async function registerWithEmail(email, password) {
  const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/RegisterPlayFabUser`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      TitleId: TITLE_ID,
      Email: email,
      Password: password,
      RequireBothUsernameAndEmail: false
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.errorMessage || "登録エラー");
  }
  
  return data.data;
}

// インベントリを取得する関数
export async function getUserInventory(sessionTicket) {
  const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/GetUserInventory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Authorization": sessionTicket
    },
    body: JSON.stringify({})
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.errorMessage || "インベントリ取得エラー");
  }
  
  return data.data.Inventory;
}

// 出品アイテムを購入する関数
export async function purchaseMarketplaceItem(params) {
  const { sessionTicket, listingId, playFabItemId } = params;
  
  try {
    console.log('購入リクエスト送信:', { listingId, playFabItemId });
    
    const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/ExecuteCloudScript`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": sessionTicket
      },
      body: JSON.stringify({
        FunctionName: "purchaseMarketplaceItem",
        FunctionParameter: {
          listingId,
          itemId: playFabItemId
        },
        GeneratePlayStreamEvent: true
      })
    });
    
    const data = await response.json();
    console.log('PlayFab購入応答:', data);
    
    if (data.error) {
      throw new Error(data.error.errorMessage || "購入エラー");
    }
    
    // CloudScript実行エラーの詳細なチェック
    if (data.data.Error) {
      const errorDetails = typeof data.data.Error === 'object' 
        ? JSON.stringify(data.data.Error) 
        : data.data.Error;
      throw new Error(`CloudScriptエラー: ${errorDetails}`);
    }
    
    // FunctionResultが存在することを確認
    if (!data.data.FunctionResult) {
      throw new Error("PlayFabから応答がありませんでした。購入処理は完了していない可能性があります。");
    }
    
    // FunctionResultのsuccessが明示的にfalseの場合
    if (data.data.FunctionResult.success === false) {
      const errorMsg = data.data.FunctionResult.message || "購入処理に失敗しました";
      throw new Error(`Error purchasing item: ${errorMsg}`);
    }
    
    return {
      success: true,
      message: data.data.FunctionResult.message || "購入が完了しました",
      ...data.data.FunctionResult
    };
  } catch (err) {
    console.error('購入エラー詳細:', err);
    throw err;
  }
}

// 出品を取り消す関数
export async function cancelMarketplaceListing(params) {
  const { sessionTicket, listingId } = params;
  
  const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/ExecuteCloudScript`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Authorization": sessionTicket
    },
    body: JSON.stringify({
      FunctionName: "cancelMarketplaceListing",
      FunctionParameter: {
        listingId
      },
      GeneratePlayStreamEvent: true
    })
  });
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error.errorMessage || "出品取り消しエラー");
  }
  
  if (!data.data.FunctionResult || !data.data.FunctionResult.success) {
    throw new Error(data.data.FunctionResult?.message || "出品取り消し処理に失敗しました");
  }
  
  return data.data.FunctionResult;
}

// PlayFabセッションを取得する関数（Firebase認証と連携用）
export async function fetchPlayFabSession() {
  // 既に認証済みのセッションチケットがあればそれを返す
  // 実際の実装ではFirebase認証情報を使ってPlayFabに認証する処理が必要
  const sessionTicket = localStorage.getItem('playfab_session_ticket');
  const playFabId = localStorage.getItem('playfab_player_id');
  
  if (!sessionTicket || !playFabId) {
    throw new Error('PlayFabセッションがありません。再ログインしてください。');
  }
  
  return { sessionTicket, playFabId };
}



// アイテムを出品する関数 - 更新
export async function listItemOnPlayFab(params) {
  const { sessionTicket, itemInstanceId, price, description } = params;
  
  console.log('PlayFab出品リクエスト送信:', { itemInstanceId, price, description });
  
  try {
    const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/ExecuteCloudScript`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": sessionTicket
      },
      body: JSON.stringify({
        FunctionName: "listItemOnMarketplace",
        FunctionParameter: {
          itemInstanceId,
          price,
          description: description || '',
          removeFromInventory: true  // インベントリから削除するフラグを追加
        },
        GeneratePlayStreamEvent: true
      })
    });
    
    const data = await response.json();
    console.log('PlayFab出品応答:', data);
    
    if (data.error) {
      throw new Error(data.error.errorMessage || "出品エラー");
    }
    
    if (!data.data.FunctionResult || !data.data.FunctionResult.success) {
      throw new Error(data.data.FunctionResult?.message || "出品処理に失敗しました");
    }
    
    return data.data.FunctionResult;
  } catch (err) {
    console.error('PlayFab出品エラー:', err);
    throw err;
  }
}

// 【改良版】開発環境用のモックテスト購入関数 - 更新
export async function mockTestPurchase(params) {
  const { listing, user, customData: explicitCustomData } = params;
  
  console.log('モックテスト購入を実行:', { listing, buyer: user.uid });
  
  try {
    // カタログアイテムIDとカスタムデータを取得
    const catalogItemId = listing.catalogItemId || listing.itemDetails?.itemId || "unknown_item";
    
    // カスタムデータの優先順位: 明示的に渡されたデータ -> リスティングのitemDetails内のデータ
    const customData = explicitCustomData || listing.itemDetails?.customData || {};
    
    console.log('使用するカスタムデータ:', customData);
    
    const catalogVersion = listing.catalogVersion || "main";
    
    // セッションチケットを取得
    const sessionTicket = localStorage.getItem('playfab_session_ticket');
    
    // モックアイテムID（デフォルト）
    let newItemId = "mock_" + Math.random().toString(36).substring(2, 10);
    let realItemGranted = false;
    
    // PlayFab API直接呼び出し
    if (sessionTicket && catalogItemId && catalogItemId !== "unknown_item") {
      try {
        console.log('実際のアイテム付与を試行:', {
          itemId: catalogItemId,
          customData: customData
        });
        
        // サーバーエンドポイント直接呼び出し - simplePurchaseItem
        const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/ExecuteCloudScript`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Authorization": sessionTicket
          },
          body: JSON.stringify({
            FunctionName: "simplePurchaseItem",
            FunctionParameter: {
              itemId: catalogItemId,
              customData: customData,
              catalogVersion: catalogVersion
            },
            GeneratePlayStreamEvent: true
          })
        });
        
        const data = await response.json();
        
        // デバッグ情報を詳細に表示
        if (data.data && data.data.Logs) {
          console.log('PlayFab CloudScript ログ:', data.data.Logs);
        }
        
        if (data.data && data.data.FunctionResult && data.data.FunctionResult.success) {
          console.log('PlayFab アイテム付与成功:', data.data.FunctionResult);
          if (data.data.FunctionResult.newItemId) {
            newItemId = data.data.FunctionResult.newItemId;
            realItemGranted = true;
            
            // カスタムデータをアイテムに直接設定（追加）
            if (Object.keys(customData).length > 0) {
              try {
                // API 呼び出しでカスタムデータを直接設定
                await fetch(`https://${TITLE_ID}.playfabapi.com/Client/UpdateUserInventoryItemCustomData`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "X-Authorization": sessionTicket
                  },
                  body: JSON.stringify({
                    ItemInstanceId: newItemId,
                    Data: customData
                  })
                });
                console.log('カスタムデータを設定しました:', customData);
              } catch (e) {
                console.warn('カスタムデータ設定エラー:', e);
              }
            }
          }
        } else {
          console.warn('アイテム付与に失敗:', data);
        }
      } catch (grantError) {
        console.warn('アイテム付与エラー:', grantError);
      }
    }
    
    // モックのインベントリアイテムを生成
    const mockItem = {
      ItemInstanceId: newItemId,
      ItemId: catalogItemId,
      DisplayName: listing.title || "購入アイテム",
      // リスティングのカスタムデータをコピー
      CustomData: customData
    };
    
    // ローカルストレージに一時的にモックアイテムを保存
    const mockInventoryKey = `mock_inventory_${user.uid}`;
    const currentMockInventory = JSON.parse(localStorage.getItem(mockInventoryKey) || '[]');
    currentMockInventory.push(mockItem);
    localStorage.setItem(mockInventoryKey, JSON.stringify(currentMockInventory));
    
    // Firestore更新のトリガー情報を返す
    return {
      success: true,
      message: realItemGranted ? "アイテムを実際に購入しました" : "モック購入が完了しました",
      mockData: !realItemGranted,
      newItemId: mockItem.ItemInstanceId,
      mockItem,
      shouldUpdateFirestore: true, // Firestoreを更新すべきフラグを追加
      listingId: listing.id // リスティングIDを明示的に含める
    };
  } catch (error) {
    // エラーハンドリング
    console.error('モック購入エラー:', error);
    return {
      success: false,
      message: error.message || 'モック購入に失敗しました',
      error
    };
  }
}

// モックインベントリを取得する関数（開発時のみ使用）
export function getMockInventory(userId) {
  if (!userId) return [];
  const mockInventoryKey = `mock_inventory_${userId}`;
  return JSON.parse(localStorage.getItem(mockInventoryKey) || '[]');
}

// シンプルなアイテム付与関数の呼び出し
export async function simpleGrantItem(params) {
  const { sessionTicket, itemId, customData = {}, catalogVersion = "main" } = params;
  
  try {
    console.log('アイテム付与リクエスト:', { itemId, customData });
    
    const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/ExecuteCloudScript`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": sessionTicket
      },
      body: JSON.stringify({
        FunctionName: "simpleGrantItem",
        FunctionParameter: {
          itemId,
          customData,
          catalogVersion
        },
        GeneratePlayStreamEvent: true
      })
    });
    
    const data = await response.json();
    console.log('アイテム付与応答:', data);
    
    if (data.error) {
      throw new Error(data.error.errorMessage || "API呼び出しエラー");
    }
    
    // CloudScriptログの表示（デバッグ情報として有用）
    if (data.data.Logs && data.data.Logs.length > 0) {
      console.log('CloudScript実行ログ:');
      data.data.Logs.forEach(log => {
        console.log(`[${log.Level}] ${log.Message}`);
      });
    }
    
    if (data.data.Error) {
      const errorDetails = typeof data.data.Error === 'object' 
        ? JSON.stringify(data.data.Error) 
        : data.data.Error;
      throw new Error(`CloudScriptエラー: ${errorDetails}`);
    }
    
    if (!data.data.FunctionResult) {
      throw new Error("PlayFabから応答がありませんでした");
    }
    
    if (data.data.FunctionResult.success === false) {
      throw new Error(data.data.FunctionResult.message || "アイテム付与に失敗しました");
    }
    
    return {
      success: true,
      ...data.data.FunctionResult
    };
  } catch (err) {
    console.error('アイテム付与エラー詳細:', err);
    throw err;
  }
}

// CloudScript接続テスト関数
export async function testCloudScriptConnection(sessionTicket) {
  try {
    console.log('超シンプルなテスト実行...');
    
    const response = await fetch(`https://${TITLE_ID}.playfabapi.com/Client/ExecuteCloudScript`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Authorization": sessionTicket
      },
      body: JSON.stringify({
        FunctionName: "ultraSimpleTest",
        GeneratePlayStreamEvent: true
      })
    });
    
    const data = await response.json();
    console.log('テスト応答:', data);
    
    if (data.error) {
      throw new Error(data.error.errorMessage || "API呼び出しエラー");
    }
    
    if (data.data.Error) {
      throw new Error(`CloudScriptエラー: ${JSON.stringify(data.data.Error)}`);
    }
    
    // 成功結果を表示
    console.log('CloudScript結果:', data.data.FunctionResult);
    alert(`テスト成功: ${JSON.stringify(data.data.FunctionResult)}`);
    
    return data.data.FunctionResult;
  } catch (err) {
    console.error('テストエラー:', err);
    alert(`テストエラー: ${err.message}`);
    throw err;
  }

}