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
    } catch (error) {
      console.error('OpenAI API error:', error);
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
    } catch (error) {
      console.error('OpenAI embedding error:', error);
      throw new Error('Failed to generate embedding');
    }
  }
}