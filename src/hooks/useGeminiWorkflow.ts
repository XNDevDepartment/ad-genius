import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  startGeminiConversation, 
  sendImageToGemini, 
  generateGeminiScenarios,
  converseWithGemini
} from '@/api/gemini-chat';
import { useConversationStorage } from '@/hooks/useConversationStorage';

interface AIScenario {
  idea: string;
  description: string;
  'small-description': string;
}

interface GeminiWorkflowState {
  conversationId: string | null;
  isInitializing: boolean;
  isAnalyzingImage: boolean;
  isLoadingScenarios: boolean;
  productAnalysis: string;
  scenarios: AIScenario[];
}

export const useGeminiWorkflow = () => {
  const { toast } = useToast();
  const { saveMessage } = useConversationStorage();

  const [state, setState] = useState<GeminiWorkflowState>({
    conversationId: null,
    isInitializing: false,
    isAnalyzingImage: false,
    isLoadingScenarios: false,
    productAnalysis: '',
    scenarios: []
  });

  const parseScenarios = useCallback((responseText: string): AIScenario[] => {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.scenarios || [];
      }
      
      const lines = responseText.split('\n').filter(line => line.trim());
      const scenarios: AIScenario[] = [];
      
      for (const line of lines) {
        if (/^\d+\./.test(line.trim())) {
          const content = line.replace(/^\d+\.\s*/, '').trim();
          if (content) {
            scenarios.push({
              idea: content.split(':')[0] || content,
              description: content,
              'small-description': content.substring(0, 100) + '...'
            });
          }
        }
      }
      
      return scenarios.slice(0, 6);
    } catch (error) {
      console.error('Error parsing scenarios:', error);
      return [];
    }
  }, []);

  const initializeConversation = useCallback(async (niche?: string, audience?: string) => {
    setState(prev => ({ ...prev, isInitializing: true }));
    
    try {
      const result = await startGeminiConversation(niche, audience);
      
      setState(prev => ({ 
        ...prev, 
        conversationId: result.conversationId,
        isInitializing: false 
      }));

      console.log('Gemini workflow initialized:', result.conversationId);
      return result.conversationId;
    } catch (error) {
      console.error('Failed to initialize Gemini workflow:', error);
      setState(prev => ({ ...prev, isInitializing: false }));
      
      toast({
        title: "Initialization Error",
        description: "Failed to start conversation with AI assistant. Please try again.",
        variant: "destructive",
      });
      
      throw error;
    }
  }, [toast]);

  const analyzeImage = useCallback(async (file: File, prompt?: string) => {
    if (!state.conversationId) {
      throw new Error('Conversation not initialized');
    }

    setState(prev => ({ ...prev, isAnalyzingImage: true }));

    try {
      const reader = new FileReader();
      
      return new Promise<string>((resolve, reject) => {
        reader.onload = async () => {
          try {
            const base64 = reader.result as string;
            
            const analysis = await sendImageToGemini(
              state.conversationId!,
              base64,
              file.name,
              prompt || 'Please analyze this product image for UGC content creation purposes.'
            );

            // Save interaction to conversation history
            await saveMessage({
              conversationId: state.conversationId!,
              role: 'user',
              content: `Image uploaded: ${file.name}${prompt ? ` - ${prompt}` : ''}`,
              metadata: { hasImage: true, fileName: file.name }
            });

            await saveMessage({
              conversationId: state.conversationId!,
              role: 'assistant',
              content: analysis,
              metadata: { analysisType: 'image_analysis' }
            });

            setState(prev => ({ 
              ...prev, 
              productAnalysis: analysis,
              isAnalyzingImage: false 
            }));

            console.log('Image analysis completed');
            resolve(analysis);
          } catch (error) {
            setState(prev => ({ ...prev, isAnalyzingImage: false }));
            reject(error);
          }
        };

        reader.onerror = () => {
          setState(prev => ({ ...prev, isAnalyzingImage: false }));
          reject(new Error('Failed to read image file'));
        };

        reader.readAsDataURL(file);
      });
    } catch (error) {
      setState(prev => ({ ...prev, isAnalyzingImage: false }));
      throw error;
    }
  }, [state.conversationId, saveMessage]);

  const generateScenarios = useCallback(async (niche: string, audience?: string, count: number = 6) => {
    if (!state.conversationId) {
      throw new Error('Conversation not initialized');
    }

    setState(prev => ({ ...prev, isLoadingScenarios: true }));

    try {
      const responseText = await generateGeminiScenarios(
        state.conversationId,
        niche,
        audience || '',
        count
      );

      const scenarios = parseScenarios(responseText);

      // Save interaction to conversation history
      await saveMessage({
        conversationId: state.conversationId,
        role: 'user',
        content: `Generate ${count} UGC scenarios for niche: ${niche}${audience ? `, targeting: ${audience}` : ''}`,
        metadata: { requestType: 'scenario_generation', niche, audience }
      });

      await saveMessage({
        conversationId: state.conversationId,
        role: 'assistant',
        content: responseText,
        metadata: { 
          scenarioCount: scenarios.length,
          requestType: 'scenario_generation_response'
        }
      });

      setState(prev => ({ 
        ...prev, 
        scenarios,
        isLoadingScenarios: false 
      }));

      toast({
        title: "Scenarios Generated",
        description: `Generated ${scenarios.length} UGC scenario ideas.`,
      });

      console.log('Scenarios generated:', scenarios.length);
      return scenarios;
    } catch (error) {
      setState(prev => ({ ...prev, isLoadingScenarios: false }));
      
      toast({
        title: "Error",
        description: "Failed to generate scenarios. Please try again.",
        variant: "destructive",
      });
      
      throw error;
    }
  }, [state.conversationId, parseScenarios, saveMessage, toast]);

  const conversWithAI = useCallback(async (message: string) => {
    if (!state.conversationId) {
      throw new Error('Conversation not initialized');
    }

    try {
      const reply = await converseWithGemini(state.conversationId, message);
      
      console.log('AI conversation completed');
      return reply;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to communicate with AI assistant.",
        variant: "destructive",
      });
      
      throw error;
    }
  }, [state.conversationId, toast]);

  const resetWorkflow = useCallback(() => {
    setState({
      conversationId: null,
      isInitializing: false,
      isAnalyzingImage: false,
      isLoadingScenarios: false,
      productAnalysis: '',
      scenarios: []
    });
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    initializeConversation,
    analyzeImage,
    generateScenarios,
    conversWithAI,
    resetWorkflow,
    
    // Utilities
    parseScenarios
  };
};