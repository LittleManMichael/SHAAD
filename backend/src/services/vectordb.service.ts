import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIService } from './ai/openai.service';
import { v4 as uuidv4 } from 'uuid';

interface VectorSearchResult {
  id: string;
  content: string;
  metadata: any;
  score: number;
}

export class VectorDBService {
  private client: QdrantClient;
  private openAIService: OpenAIService;
  private collectionName: string = 'shaad_memory';

  constructor() {
    this.client = new QdrantClient({
      host: process.env.QDRANT_HOST || 'localhost',
      port: parseInt(process.env.QDRANT_PORT || '6333'),
    });
    
    this.openAIService = new OpenAIService();
    this.initializeCollection();
  }

  private async initializeCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections.some(
        col => col.name === this.collectionName
      );

      if (!exists) {
        // Create collection with OpenAI embedding dimensions (1536 for text-embedding-3-small)
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 1536,
            distance: 'Cosine'
          }
        });
        console.log(`Created Qdrant collection: ${this.collectionName}`);
      }
    } catch (error) {
      console.error('Failed to initialize Qdrant collection:', error);
    }
  }

  // Store a conversation interaction
  async storeInteraction(
    userMessage: string,
    assistantResponse: string,
    userId: string,
    metadata?: any
  ): Promise<void> {
    try {
      // Combine messages for context
      const content = `User: ${userMessage}\nAssistant: ${assistantResponse}`;
      
      // Generate embedding
      const embedding = await this.openAIService.generateEmbedding(content);
      
      // Store in Qdrant
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: uuidv4(),
            vector: embedding,
            payload: {
              user_id: userId,
              user_message: userMessage,
              assistant_response: assistantResponse,
              content: content,
              timestamp: new Date().toISOString(),
              ...metadata
            }
          }
        ]
      });
    } catch (error) {
      console.error('Failed to store interaction:', error);
    }
  }

  // Search for similar interactions
  async searchSimilar(
    query: string,
    userId: string,
    limit: number = 5
  ): Promise<VectorSearchResult[]> {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.openAIService.generateEmbedding(query);
      
      // Search with user filter
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        filter: {
          must: [
            {
              key: 'user_id',
              match: { value: userId }
            }
          ]
        },
        limit,
        with_payload: true
      });

      return searchResult.map(result => ({
        id: result.id as string,
        content: result.payload?.content as string || '',
        metadata: result.payload,
        score: result.score
      }));
    } catch (error) {
      console.error('Failed to search similar:', error);
      return [];
    }
  }

  // Store general knowledge or facts
  async storeKnowledge(
    category: string,
    fact: string,
    userId: string,
    metadata?: any
  ): Promise<void> {
    try {
      const content = `${category}: ${fact}`;
      const embedding = await this.openAIService.generateEmbedding(content);
      
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: uuidv4(),
            vector: embedding,
            payload: {
              user_id: userId,
              type: 'knowledge',
              category,
              fact,
              content,
              timestamp: new Date().toISOString(),
              ...metadata
            }
          }
        ]
      });
    } catch (error) {
      console.error('Failed to store knowledge:', error);
    }
  }

  // Store user preferences
  async storePreference(
    preferenceType: string,
    value: any,
    userId: string
  ): Promise<void> {
    try {
      const content = `User preference - ${preferenceType}: ${JSON.stringify(value)}`;
      const embedding = await this.openAIService.generateEmbedding(content);
      
      await this.client.upsert(this.collectionName, {
        wait: true,
        points: [
          {
            id: `pref_${userId}_${preferenceType}`,
            vector: embedding,
            payload: {
              user_id: userId,
              type: 'preference',
              preference_type: preferenceType,
              value,
              content,
              timestamp: new Date().toISOString()
            }
          }
        ]
      });
    } catch (error) {
      console.error('Failed to store preference:', error);
    }
  }

  // Get user's recent interactions
  async getRecentInteractions(
    userId: string,
    limit: number = 10
  ): Promise<any[]> {
    try {
      const result = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: 'user_id',
              match: { value: userId }
            },
            {
              key: 'type',
              match: { value: 'interaction' }
            }
          ]
        },
        limit,
        with_payload: true
      });

      return result.points
        .map(point => point.payload)
        .sort((a, b) => {
          const aTime = typeof a?.timestamp === 'string' ? new Date(a.timestamp).getTime() : 0;
          const bTime = typeof b?.timestamp === 'string' ? new Date(b.timestamp).getTime() : 0;
          return bTime - aTime;
        });
    } catch (error) {
      console.error('Failed to get recent interactions:', error);
      return [];
    }
  }

  // Delete old interactions (privacy/cleanup)
  async cleanupOldInteractions(userId: string, daysToKeep: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      // First, find points to delete
      const result = await this.client.scroll(this.collectionName, {
        filter: {
          must: [
            {
              key: 'user_id',
              match: { value: userId }
            }
          ]
        },
        with_payload: true
      });

      const pointsToDelete = result.points
        .filter(point => {
          const timestamp = new Date(point.payload?.timestamp as string || 0);
          return timestamp < cutoffDate;
        })
        .map(point => point.id);

      if (pointsToDelete.length > 0) {
        await this.client.delete(this.collectionName, {
          points: pointsToDelete
        });
        console.log(`Deleted ${pointsToDelete.length} old interactions for user ${userId}`);
      }
    } catch (error) {
      console.error('Failed to cleanup old interactions:', error);
    }
  }

  // Semantic search across all user data
  async semanticSearch(
    query: string,
    userId: string,
    options: {
      includeKnowledge?: boolean;
      includePreferences?: boolean;
      includeInteractions?: boolean;
      limit?: number;
    } = {}
  ): Promise<VectorSearchResult[]> {
    const {
      includeKnowledge = true,
      includePreferences = true,
      includeInteractions = true,
      limit = 10
    } = options;

    try {
      const queryEmbedding = await this.openAIService.generateEmbedding(query);
      
      // Build type filters
      const typeConditions = [];
      if (includeInteractions) typeConditions.push({ key: 'type', match: { value: 'interaction' } });
      if (includeKnowledge) typeConditions.push({ key: 'type', match: { value: 'knowledge' } });
      if (includePreferences) typeConditions.push({ key: 'type', match: { value: 'preference' } });

      const filter: any = {
        must: [
          { key: 'user_id', match: { value: userId } }
        ]
      };

      if (typeConditions.length > 0 && typeConditions.length < 3) {
        filter.should = typeConditions;
      }

      const searchResult = await this.client.search(this.collectionName, {
        vector: queryEmbedding,
        filter,
        limit,
        with_payload: true
      });

      return searchResult.map(result => ({
        id: result.id as string,
        content: result.payload?.content as string || '',
        metadata: result.payload,
        score: result.score
      }));
    } catch (error) {
      console.error('Failed to perform semantic search:', error);
      return [];
    }
  }
}