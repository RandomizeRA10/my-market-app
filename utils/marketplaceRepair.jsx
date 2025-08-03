import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 既存の出品データを修復する
 * @param {string} sessionTicket - PlayFabのセッションチケット
 */
export async function repairListings(sessionTicket) {
  // すべての出品を取得
  const listingsSnapshot = await getDocs(collection(db, 'listings'));
  
  const updates = [];
  
  listingsSnapshot.forEach((docSnap) => {
    const listing = { id: docSnap.id, ...docSnap.data() };
    
    // listingIdが正しい形式かチェック
    if (!listing.playFabListingId || !listing.playFabListingId.startsWith('marketplace_')) {
      // 形式を修正
      const newListingId = `marketplace_${listing.playFabItemId}_${Date.now()}`;
      updates.push({
        id: listing.id,
        oldId: listing.playFabListingId,
        newId: newListingId
      });
      
      // Firestoreを更新
      updateDoc(doc(db, 'listings', listing.id), {
        playFabListingId: newListingId
      });
    }
  });
  
  return updates;
}