import OpenAI from 'openai';
import NodeCache from 'node-cache';
import { brandkDb } from '../data/knowledgeBase.js';

export class ChatService {
  constructor() {
    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('🔑 Checking OpenAI API Key...');
    console.log('Key exists:', !!apiKey);
    console.log('Key starts with sk-:', apiKey?.startsWith('sk-'));
    console.log('Key length:', apiKey?.length || 0);
    
    if (!apiKey || apiKey === 'your_openai_api_key_here' || apiKey === 'sk-your-actual-openai-api-key-here' || apiKey.length < 20) {
      console.warn('⚠️  OpenAI API key not configured properly. Please set OPENAI_API_KEY in .env file');
      this.openai = null;
    } else {
      try {
        this.openai = new OpenAI({
          apiKey: apiKey,
        });
        console.log('✅ OpenAI client initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize OpenAI client:', error);
        this.openai = null;
      }
    }
    
    // Cache for responses (TTL: 1 hour)
    this.cache = new NodeCache({ stdTTL: 3600 });
    
    // Store conversation history
    this.conversations = new Map();
  }

  async processMessage({ message, conversationId, context = {}, userAgent, ip }) {
    try {
      console.log('📨 Processing message:', message.substring(0, 50) + '...');
      
      // If OpenAI is not configured, return fallback response
      if (!this.openai) {
        console.log('🔄 Using fallback response - OpenAI not configured');
        return this.getFallbackResponse(conversationId, false); // false = not an error, just no API key
      }

      // Check cache for common questions
      const cacheKey = this.generateCacheKey(message);
      const cachedResponse = this.cache.get(cacheKey);
      
      if (cachedResponse) {
        console.log('💾 Returning cached response');
        return {
          ...cachedResponse,
          conversationId,
          cached: true
        };
      }

      // Get or create conversation history
      let conversation = this.conversations.get(conversationId) || [];
      
      // Add user message to conversation
      conversation.push({ role: 'user', content: message });

      // Prepare messages for OpenAI
      const messages = [
        { role: 'system', content: this.getSystemPrompt() },
        ...conversation.slice(-10) // Keep last 10 messages for context
      ];

      console.log('🤖 Calling OpenAI API...');

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 400,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const botResponse = completion.choices[0].message.content;
      console.log('✅ OpenAI response received');
      
      // Add bot response to conversation
      conversation.push({ role: 'assistant', content: botResponse });
      this.conversations.set(conversationId, conversation);

      // Determine response type and suggested actions
      const responseAnalysis = this.analyzeResponse(botResponse, message);
      
      const response = {
        message: botResponse,
        type: responseAnalysis.type,
        suggestedAction: responseAnalysis.suggestedAction,
        conversationId,
        timestamp: new Date().toISOString()
      };

      // Cache common responses
      if (this.isCommonQuestion(message)) {
        this.cache.set(cacheKey, response);
      }

      return response;

    } catch (error) {
      console.error('❌ OpenAI API Error:', error);
      console.error('Error details:', {
        message: error.message,
        type: error.type,
        code: error.code
      });
      
      return this.getFallbackResponse(conversationId, true); // true = actual error occurred
    }
  }

  getSystemPrompt() {
    return `You are Brandi, Justin's AI assistant for Brandastic, a leading digital marketing and web design agency. You represent Justin (the president) and the Brandastic team with a warm, professional personality.

ABOUT BRANDASTIC:
${brandkDb.services}

YOUR ROLE AS BRANDI - CONSULTATIVE ASSISTANT:
- Act as a discovery consultant, not a price quoter
- Ask thoughtful questions to understand their business and needs
- Focus on understanding their challenges, goals, and timeline
- Only mention specific pricing when directly pressed after understanding their needs
- Always prioritize booking consultation calls for detailed discussions
- Use a professional yet friendly, conversational tone
- Be warm and personable while maintaining professionalism

DISCOVERY-FIRST APPROACH:
1. Understand their business type and industry
2. Learn about their current challenges or goals
3. Identify what's driving their need for services right now
4. Understand their timeline and decision-making process
5. THEN discuss how we can help and suggest a consultation

RESPONSE GUIDELINES:
- Keep responses under 150 words when possible
- Ask 1-2 thoughtful follow-up questions in each response
- Focus on understanding before selling
- When asked about pricing: "Great question! Investment levels vary based on your specific needs. To give you accurate information, I'd love to understand more about [your business/goals/challenges] first."
- Use "we" when referring to Brandastic
- Mention Justin and the team when suggesting consultations
- Be conversational and warm - you're Brandi, not a robot!

DISCOVERY QUESTIONS TO USE:
- "What type of business do you have?"
- "What's your biggest challenge in attracting new customers?"
- "What's driving you to explore [service] right now?"
- "What does success look like for your business?"
- "Are you currently doing any [marketing/website/branding] work?"
- "What's your timeline for getting started?"

PRICING APPROACH:
- Only share specific pricing ranges when you've learned about their needs AND they specifically ask
- Always frame pricing as "investment levels" 
- Connect pricing to value: "Based on what you've shared about [their situation], here's how we typically structure our investment..."
- Immediately follow pricing with: "Would you like to schedule a call with Justin to discuss your specific situation?"

BOOKING CALLS:
When users show interest or after discovery questions, say: "This sounds like something Justin and our team would love to discuss with you. Would you like to schedule a consultation call to explore how we can help with [their specific situation]?"

PERSONALITY:
- Warm and approachable
- Professional but not stuffy
- Genuinely interested in helping
- Consultative, not pushy
- Knowledgeable about business challenges

Remember: You're Brandi - a consultative assistant who genuinely cares about understanding their business before presenting solutions. Focus on their world first!`;
  }

  analyzeResponse(botResponse, userMessage) {
    const lowerResponse = botResponse.toLowerCase();
    const lowerMessage = userMessage.toLowerCase();
    
    // Check if response suggests booking a call
    const bookingKeywords = ['book', 'call', 'schedule', 'consultation', 'discuss', 'justin'];
    const suggestsBooking = bookingKeywords.some(keyword => lowerResponse.includes(keyword));
    
    // Check if user is asking about pricing
    const pricingKeywords = ['cost', 'price', 'pricing', 'expensive', 'budget', 'fee', 'how much', 'investment'];
    const askingAboutPricing = pricingKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Check if asking about specific services
    const serviceKeywords = ['website', 'seo', 'ppc', 'social media', 'marketing', 'design', 'ecommerce', 'branding', 'shopify', 'wordpress'];
    const askingAboutServices = serviceKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Check if response is asking discovery questions
    const discoveryKeywords = ['what type', 'what kind', 'tell me about', 'what\'s your', 'how are you', 'what does'];
    const isDiscovery = discoveryKeywords.some(keyword => lowerResponse.includes(keyword));
    
    if (suggestsBooking || (askingAboutPricing && isDiscovery)) {
      return {
        type: 'service_inquiry',
        suggestedAction: 'book_call'
      };
    }
    
    if (isDiscovery || askingAboutServices) {
      return {
        type: 'discovery',
        suggestedAction: 'learn_more'
      };
    }
    
    return {
      type: 'general',
      suggestedAction: null
    };
  }

  getFallbackResponse(conversationId, isError = false) {
    console.log('🔄 Returning fallback response. Is Error:', isError);
    
    if (isError) {
      // Actual API error occurred
      return {
        message: "I'm having trouble connecting to my AI brain right now, but I'd love to help you learn about Brandastic's services! Let's schedule a quick call with Justin and our team so we can discuss your needs directly. What type of business do you have?",
        type: 'error',
        suggestedAction: 'book_call',
        conversationId,
        timestamp: new Date().toISOString()
      };
    } else {
      // No API key configured, but provide helpful response
      return {
        message: "Hi! I'm Brandi, and I'm here to help you explore how Brandastic can help grow your business. We specialize in digital marketing, web development, and brand development. What type of business do you have, and what's your biggest challenge in attracting new customers right now?",
        type: 'discovery',
        suggestedAction: 'learn_more',
        conversationId,
        timestamp: new Date().toISOString()
      };
    }
  }

  generateCacheKey(message) {
    return message.toLowerCase().replace(/[^\w\s]/gi, '').substring(0, 50);
  }

  isCommonQuestion(message) {
    const commonPhrases = [
      'what services',
      'what do you do',
      'about brandastic',
      'digital marketing',
      'website',
      'branding',
      'help me',
      'tell me about',
      'what type',
      'how can you help'
    ];
    
    const lowerMessage = message.toLowerCase();
    return commonPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  clearConversation(conversationId) {
    this.conversations.delete(conversationId);
  }
}