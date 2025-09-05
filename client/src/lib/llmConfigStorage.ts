// Local storage utilities for LLM configuration

export interface LLMConfig {
  provider: string;
  model: string;
  endpoint?: string;
  apiKey?: string;
}

const LLM_CONFIG_KEY = 'llm_integration_config';

export const llmConfigStorage = {
  // Get LLM configuration from localStorage
  get(): LLMConfig | null {
    try {
      const stored = localStorage.getItem(LLM_CONFIG_KEY);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse LLM config from localStorage:', error);
      return null;
    }
  },

  // Save LLM configuration to localStorage
  set(config: LLMConfig): void {
    try {
      localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save LLM config to localStorage:', error);
      throw error;
    }
  },

  // Remove LLM configuration from localStorage
  remove(): void {
    try {
      localStorage.removeItem(LLM_CONFIG_KEY);
    } catch (error) {
      console.error('Failed to remove LLM config from localStorage:', error);
    }
  },

  // Check if configuration exists
  exists(): boolean {
    return localStorage.getItem(LLM_CONFIG_KEY) !== null;
  },

  // Get default/fallback configuration
  getDefault(): LLMConfig {
    return {
      provider: 'ollama',
      model: 'llama3.2:1b',
      endpoint: 'https://88c46355da8c.ngrok-free.app'
    };
  }
};