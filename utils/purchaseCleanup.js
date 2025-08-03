import { collection, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Purchased items should be deleted from the listings collection
 * This utility removes any purchased items from the listings collection
 */
export async function cleanupPurchasedListings() {
  try {
    // Find all listings where purchased=true
    const q = query(collection(db, 'listings'), where('purchased', '==', true));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('No purchased listings found to clean up');
      return { deleted: 0 };
    }
    
    const deletePromises = [];
    snapshot.forEach(doc => {
      console.log(`Deleting purchased listing: ${doc.id}`);
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    console.log(`Deleted ${deletePromises.length} purchased listings`);
    return { deleted: deletePromises.length };
  } catch (error) {
    console.error('Error cleaning up purchased listings:', error);
    throw error;
  }
}