import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp, doc, getDoc, deleteDoc } from 'firebase/firestore';

export interface Query {
  id: string;
  userId: string;
  userFullName?: string;
  query: string;
  status: string;
  createdAt: any;
}

export interface QueryWithUser extends Query {
  userFullName: string;
  userEmail?: string;
}

export const QueryService = {
  // Submit a new query
  async submitQuery(userId: string, queryText: string): Promise<void> {
    try {
      await addDoc(collection(db, 'queries'), {
        userId,
        query: queryText.trim(),
        status: 'open',
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error submitting query:', error);
      throw error;
    }
  },

  // Fetch queries with user information for admin dashboard
  async getQueriesWithUsers(limitCount: number = 10): Promise<QueryWithUser[]> {
    try {
      const queriesQuery = query(
        collection(db, 'queries'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const queriesSnapshot = await getDocs(queriesQuery);
      const queriesWithUsers: QueryWithUser[] = [];

      for (const queryDoc of queriesSnapshot.docs) {
        const queryData = queryDoc.data();
        
        // Get user information
        let userFullName = 'Unknown User';
        let userEmail = '';
        
        try {
          const userDoc = await getDoc(doc(db, 'users', queryData.userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            userFullName = userData.fullName || 'Unknown User';
            userEmail = userData.email || '';
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }

        // Only add valid queries
        if (queryDoc.id && queryDoc.id !== 'queries' && queryData.query) {
          queriesWithUsers.push({
            id: queryDoc.id,
            userId: queryData.userId,
            userFullName,
            userEmail,
            query: queryData.query,
            status: queryData.status,
            createdAt: queryData.createdAt,
          });
        }
      }

      return queriesWithUsers;
    } catch (error) {
      console.error('Error fetching queries with users:', error);
      throw error;
    }
  },

  // Get total query count
  async getQueryCount(): Promise<number> {
    try {
      const queriesSnapshot = await getDocs(collection(db, 'queries'));
      return queriesSnapshot.size;
    } catch (error) {
      console.error('Error getting query count:', error);
      return 0;
    }
  },

  // Get queries by status
  async getQueriesByStatus(status: string): Promise<QueryWithUser[]> {
    try {
      const queriesQuery = query(
        collection(db, 'queries'),
        orderBy('createdAt', 'desc')
      );
      
      const queriesSnapshot = await getDocs(queriesQuery);
      const filteredQueries: QueryWithUser[] = [];

      for (const queryDoc of queriesSnapshot.docs) {
        const queryData = queryDoc.data();
        
        if (queryData.status === status) {
          // Get user information
          let userFullName = 'Unknown User';
          let userEmail = '';
          
          try {
            const userDoc = await getDoc(doc(db, 'users', queryData.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              userFullName = userData.fullName || 'Unknown User';
              userEmail = userData.email || '';
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }

          filteredQueries.push({
            id: queryDoc.id,
            userId: queryData.userId,
            userFullName,
            userEmail,
            query: queryData.query,
            status: queryData.status,
            createdAt: queryData.createdAt,
          });
        }
      }

      return filteredQueries;
    } catch (error) {
      console.error('Error fetching queries by status:', error);
      throw error;
    }
  },

  // Delete a query
  async deleteQuery(queryId: string): Promise<void> {
    try {
      console.log('QueryService: Attempting to delete query with ID:', queryId);
      await deleteDoc(doc(db, 'queries', queryId));
      console.log('QueryService: Successfully deleted query with ID:', queryId);
    } catch (error) {
      console.error('QueryService: Error deleting query:', error);
      throw error;
    }
  }
};
