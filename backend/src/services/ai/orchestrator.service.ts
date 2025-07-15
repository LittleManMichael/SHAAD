import { ClaudeService } from './claude.service';
import { OpenAIService } from './openai.service';
import { N8NService } from '../n8n.service';
import { VectorDBService } from '../vectordb.service';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at?: Date;
}

interface AIResponse {
  content: string;
  metadata?: any;
  tokensUsed?: number;
  provider?: string;
  actions?: any[];
}

export class AIOrchestrator {
  private claudeService: ClaudeService;
  private openaiService: OpenAIService;
  private n8nService: N8NService;
  private vectorDBService: VectorDBService;

  constructor() {
    this.claudeService = new ClaudeService();
    this.openaiService = new OpenAIService();
    this.n8nService = new N8NService();
    this.vectorDBService = new VectorDBService();
  }

  async processMessage(
    content: string,
    history: Message[],
    userId: string,
    model: 'claude' | 'gpt' = 'claude'
  ): Promise<AIResponse> {
    try {
      // Retrieve relevant context from vector database
      const relevantContext = await this.vectorDBService.searchSimilar(content, userId);
      
      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(relevantContext);
      
      // Analyze intent and determine if workflow is needed
      const intent = await this.analyzeIntent(content, history);
      
      // Main AI processing with selected model
      const aiService = model === 'gpt' ? this.openaiService : this.claudeService;
      const response = await aiService.chat([
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content }
      ]);
      
      // Check if we need to execute any workflows
      const actions = await this.extractActions(response.content);
      
      let workflowResults: any[] = [];
      if (actions.length > 0) {
        // Execute workflows via n8n
        workflowResults = await this.executeWorkflows(actions, userId);
        
        // Enhance response with workflow results
        response.content = await this.enhanceResponseWithResults(
          response.content,
          workflowResults
        );
      }
      
      // Store interaction in vector database for future context
      await this.vectorDBService.storeInteraction(
        content,
        response.content,
        userId
      );
      
      return {
        content: response.content,
        metadata: {
          intent,
          actions: actions.length,
          contextUsed: relevantContext.length > 0
        },
        tokensUsed: response.usage?.total_tokens,
        provider: model,
        actions: workflowResults
      };
    } catch (error) {
      console.error('AI Orchestrator error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw new Error(`Failed to process message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildSystemPrompt(context: any[]): string {
    const basePrompt = `You are SHAAD, a helpful AI assistant with access to various tools and workflows.
You can help with tasks, answer questions, and execute actions through integrated workflows.
You should be conversational, helpful, and proactive in suggesting relevant actions.

Available capabilities:
- General conversation and assistance
- Task execution via workflows
- Information retrieval
- Home automation control
- Scheduling and reminders

When a user asks for something that requires an action, respond naturally while indicating what action you'll take.
Use action tags like [ACTION: workflow_name, params] to indicate needed workflows.`;

    if (context.length > 0) {
      const contextInfo = context.map(c => c.content).join('\n');
      return `${basePrompt}\n\nRelevant context from previous interactions:\n${contextInfo}`;
    }
    
    return basePrompt;
  }

  private async analyzeIntent(content: string, history: Message[]): Promise<string> {
    // Simple intent analysis - can be enhanced with more sophisticated NLP
    const lowerContent = content.toLowerCase();
    
    if (lowerContent.includes('schedule') || lowerContent.includes('remind')) {
      return 'scheduling';
    } else if (lowerContent.includes('turn on') || lowerContent.includes('turn off')) {
      return 'home_automation';
    } else if (lowerContent.includes('send') || lowerContent.includes('message')) {
      return 'communication';
    } else if (lowerContent.includes('search') || lowerContent.includes('find')) {
      return 'information_retrieval';
    } else if (lowerContent.includes('code') || lowerContent.includes('write')) {
      return 'code_generation';
    }
    
    return 'general_conversation';
  }

  private async extractActions(response: string): Promise<any[]> {
    const actions = [];
    const actionRegex = /\[ACTION:\s*([^,\]]+)(?:,\s*([^\]]+))?\]/g;
    let match;
    
    while ((match = actionRegex.exec(response)) !== null) {
      actions.push({
        workflow: match[1].trim(),
        params: match[2] ? JSON.parse(match[2].trim()) : {}
      });
    }
    
    return actions;
  }

  private async executeWorkflows(actions: any[], userId: string): Promise<any[]> {
    const results = [];
    
    for (const action of actions) {
      try {
        const result = await this.n8nService.executeWorkflow(
          action.workflow,
          action.params,
          userId
        );
        results.push({
          ...action,
          result,
          status: 'success'
        });
      } catch (error: any) {
        results.push({
          ...action,
          error: error.message || 'Unknown error',
          status: 'failed'
        });
      }
    }
    
    return results;
  }

  private async enhanceResponseWithResults(
    originalResponse: string,
    workflowResults: any[]
  ): Promise<string> {
    // Remove action tags from response
    let enhancedResponse = originalResponse.replace(/\[ACTION:[^\]]+\]/g, '');
    
    // Add workflow results summary if needed
    const failedWorkflows = workflowResults.filter(w => w.status === 'failed');
    if (failedWorkflows.length > 0) {
      enhancedResponse += '\n\nNote: Some actions could not be completed. Please try again or contact support if the issue persists.';
    }
    
    return enhancedResponse.trim();
  }

  // Delegate specific tasks to OpenAI when needed
  async delegateToOpenAI(task: string, context: any): Promise<string> {
    return await this.openaiService.complete(task, context);
  }
}