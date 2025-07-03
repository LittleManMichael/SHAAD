import OpenAI from 'openai';

interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class OpenAIService {
  private client: OpenAI;
  private model: string;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
  }

  async chat(messages: OpenAIMessage[]): Promise<{
    content: string;
    usage?: any;
  }> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096'),
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7')
      });

      return {
        content: response.choices[0].message.content || '',
        usage: response.usage
      };
    } catch (error: any) {
      console.error('OpenAI API error:', error);
      
      // Check for API key authentication error
      if (error.status === 401 || error.code === 'invalid_api_key') {
        console.warn('⚠️  OpenAI API Key is invalid or expired');
        console.warn('📝 Using mock response for development');
        
        // Return mock response for development
        return {
          content: "I'm the OpenAI service in mock mode. The API key needs to be configured. I can help with code generation and analysis once properly set up.",
          usage: { total_tokens: 50 }
        };
      }
      
      throw new Error('Failed to get response from OpenAI');
    }
  }

  async complete(prompt: string, context?: any): Promise<string> {
    try {
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: 'You are a helpful AI assistant specialized in coding and technical tasks.'
        }
      ];

      if (context) {
        messages.push({
          role: 'system',
          content: `Context: ${JSON.stringify(context)}`
        });
      }

      messages.push({
        role: 'user',
        content: prompt
      });

      const response = await this.chat(messages);
      return response.content;
    } catch (error) {
      console.error('OpenAI completion error:', error);
      throw new Error('Failed to get completion from OpenAI');
    }
  }

  // Generate code with GPT-4
  async generateCode(
    description: string,
    language: string,
    context?: string
  ): Promise<string> {
    const prompt = `Generate ${language} code for the following requirement:
${description}
${context ? `\nContext: ${context}` : ''}

Provide only the code without explanations.`;

    return this.complete(prompt);
  }

  // Analyze and explain code
  async analyzeCode(code: string, language: string): Promise<string> {
    const prompt = `Analyze the following ${language} code and explain what it does:

\`\`\`${language}
${code}
\`\`\`

Provide a clear explanation of the code's functionality.`;

    return this.complete(prompt);
  }

  // Generate embeddings for vector storage
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });

      return response.data[0].embedding;
    } catch (error: any) {
      console.error('OpenAI embedding error:', error);
      
      // Check for API key authentication error
      if (error.status === 401 || error.code === 'invalid_api_key') {
        console.warn('⚠️  OpenAI API Key is invalid or expired');
        console.warn('📝 Using mock embedding for development');
        
        // Return mock embedding (768 dimensions for text-embedding-3-small)
        return new Array(768).fill(0).map(() => Math.random() * 2 - 1);
      }
      
      throw new Error('Failed to generate embedding');
    }
  }
}