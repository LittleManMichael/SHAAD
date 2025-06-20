import Anthropic from '@anthropic-ai/sdk';

interface ClaudeMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ClaudeResponse {
  content: string;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

export class ClaudeService {
  private client: Anthropic;
  private model: string;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    
    this.model = process.env.CLAUDE_MODEL || 'claude-3-opus-20240229';
  }

  async chat(messages: ClaudeMessage[]): Promise<ClaudeResponse> {
    try {
      // Convert system message to user message with Claude's format
      const formattedMessages = this.formatMessages(messages);
      
      const response = await this.client.messages.create({
        model: this.model,
        messages: formattedMessages,
        max_tokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '4096'),
        temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7')
      });

      return {
        content: response.content[0].type === 'text' ? response.content[0].text : '',
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens,
          total_tokens: response.usage.input_tokens + response.usage.output_tokens
        }
      };
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to get response from Claude');
    }
  }

  async complete(prompt: string, maxTokens: number = 1024): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.7')
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error('Failed to get completion from Claude');
    }
  }

  private formatMessages(messages: ClaudeMessage[]): any[] {
    const formatted = [];
    let systemPrompt = '';

    for (const message of messages) {
      if (message.role === 'system') {
        // Claude doesn't have a system role, prepend to first user message
        systemPrompt += message.content + '\n\n';
      } else if (message.role === 'user') {
        const content = systemPrompt ? systemPrompt + message.content : message.content;
        formatted.push({ role: 'user', content });
        systemPrompt = ''; // Clear system prompt after using it
      } else {
        formatted.push({ role: message.role, content: message.content });
      }
    }

    return formatted;
  }

  // Analyze capabilities for task delegation
  async analyzeCapabilities(task: string): Promise<{
    canHandle: boolean;
    confidence: number;
    reason?: string;
  }> {
    const prompt = `Analyze if you can handle this task effectively:
Task: ${task}

Respond with:
1. Can you handle this task? (yes/no)
2. Confidence level (0-100)
3. Brief reason

Format: canHandle|confidence|reason`;

    try {
      const response = await this.complete(prompt, 200);
      const [canHandle, confidence, reason] = response.split('|').map(s => s.trim());
      
      return {
        canHandle: canHandle.toLowerCase() === 'yes',
        confidence: parseInt(confidence) || 0,
        reason
      };
    } catch (error) {
      return {
        canHandle: true, // Default to handling it
        confidence: 75,
        reason: 'Default capability assessment'
      };
    }
  }
}