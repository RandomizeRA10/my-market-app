// utils/fixListingsData.js
import { collection, getDocs, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export async function fixExistingListings() {
  try {
    console.log('既存の出品データを修正中...');
    
    const listingsRef = collection(db, 'listings');
    const snapshot = await getDocs(listingsRef);
    
    if (snapshot.empty) {
      console.log('修正対象のリスティングが見つかりません');
      return { success: true, updated: 0 };
    }

    const batch = writeBatch(db);
    let updateCount = 0;
    const maxBatchSize = 500; // Firestoreのバッチ制限
    
    const updates = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      
      // 修正が必要な条件をチェック
      const needsUpdate = (
        data.isActive === undefined || 
        (data.purchased !== true && data.isActive !== true)
      );
      
      if (needsUpdate) {
        updates.push({
          ref: doc(db, 'listings', docSnap.id),
          data: {
            isActive: data.purchased === true ? false : true,
            updatedAt: serverTimestamp()
          }
        });
      }
    });
    
    console.log(`${updates.length} 件のリスティングを修正します`);
    
    // バッチサイズごとに分割して実行
    for (let i = 0; i < updates.length; i += maxBatchSize) {
      const batchUpdates = updates.slice(i, i + maxBatchSize);
      const currentBatch = writeBatch(db);
      
      batchUpdates.forEach(update => {
        currentBatch.update(update.ref, update.data);
      });
      
      await currentBatch.commit();
      updateCount += batchUpdates.length;
      
      console.log(`${updateCount}/${updates.length} 件完了`);
    }
    
    console.log(`修正完了: ${updateCount} 件の出品データを修正しました`);
    
    return { success: true, updated: updateCount };
  } catch (error) {
    console.error('データ修正エラー:', error);
    throw error;
  }
}

// 使用例
export async function runDataFix() {
  try {
    console.log('=== データ修正開始 ===');
    
    const result = await fixExistingListings();
    
    if (result.success) {
      alert(`データ修正が完了しました。${result.updated} 件のリスティングを修正しました。`);
    }
    
    console.log('=== データ修正完了 ===');
    return result;
  } catch (error) {
    console.error('データ修正に失敗:', error);
    alert(`データ修正に失敗しました: ${error.message}`);
    throw error;
  }
}