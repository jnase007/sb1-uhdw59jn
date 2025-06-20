import OpenAI from 'openai';
import NodeCache from 'node-cache';
import { brandkDb } from '../data/knowledgeBase.js';

export class ChatService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Cache for responses (TTL: 1 hour)
    this.cache = new NodeCache({ stdTTL: 3600 });
    
    // Store conversation history
    this.conversations = new Map();
  }

  async processMessage({ message, conversationId, context = {}, userAgent, ip }) {
    try {
      // Check cache for common questions
      const cacheKey = this.generateCacheKey(message);
      const cachedResponse = this.cache.get(cacheKey);
      
      if (cachedResponse) {
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

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      const botResponse = completion.choices[0].message.content;
      
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
      console.error('OpenAI API Error:', error);
      return this.getFallbackResponse(conversationId);
    }
  }

  getSystemPrompt() {
    return `You are a friendly, professional chatbot for Brandastic, a leading digital marketing and web design agency. 

ABOUT BRANDASTIC:
${brandkDb.services}

YOUR ROLE:
- Provide accurate, concise answers about Brandastic's services
- Use a professional yet friendly, conversational tone
- Always prioritize booking consultation calls for detailed discussions
- For pricing questions, always suggest booking a call for custom quotes
- Keep responses under 150 words when possible

KEY SERVICES:
• Digital Marketing (PPC, Social Media, Email Marketing)
• SEO & Content Marketing
• Web Design & Development
• E-commerce Solutions
• Branding & Creative Services

RESPONSE GUIDELINES:
- For pricing: "Costs vary based on project scope. Let's book a call to discuss your specific needs!"
- For complex questions: Provide brief answer + suggest booking call
- Always be helpful and guide toward consultation booking
- Use "we" when referring to Brandastic
- End responses with a question when appropriate to keep conversation flowing

BOOKING CALLS:
When users show interest in services or ask about pricing, proactively suggest booking a consultation call. Say something like "Would you like to schedule a quick call to discuss this further?"`;
  }

  analyzeResponse(botResponse, userMessage) {
    const lowerResponse = botResponse.toLowerCase();
    const lowerMessage = userMessage.toLowerCase();
    
    // Check if response suggests booking a call
    const bookingKeywords = ['book', 'call', 'schedule', 'consultation', 'discuss'];
    const suggestsBooking = bookingKeywords.some(keyword => lowerResponse.includes(keyword));
    
    // Check if user is asking about pricing
    const pricingKeywords = ['cost', 'price', 'pricing', 'expensive', 'budget', 'fee'];
    const askingAboutPricing = pricingKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (suggestsBooking || askingAboutPricing) {
      return {
        type: 'service_inquiry',
        suggestedAction: 'book_call'
      };
    }
    
    // Check if it's a general service question
    const serviceKeywords = ['service', 'seo', 'marketing', 'website', 'design', 'ecommerce'];
    const isServiceQuestion = serviceKeywords.some(keyword => lowerMessage.includes(keyword));
    
    if (isServiceQuestion) {
      return {
        type: 'service_info',
        suggestedAction: 'learn_more'
      };
    }
    
    return {
      type: 'general',
      suggestedAction: null
    };
  }

  getFallbackResponse(conversationId) {
    return {
      message: "I'm having a bit of trouble right now, but I'd love to help you learn about Brandastic's services! Let's schedule a quick call so we can discuss your needs directly.",
      type: 'error',
      suggestedAction: 'book_call',
      conversationId,
      timestamp: new Date().toISOString()
    };
  }

  generateCacheKey(message) {
    return message.toLowerCase().replace(/[^\w\s]/gi, '').substring(0, 50);
  }

  isCommonQuestion(message) {
    const commonPhrases = [
      'what services',
      'how much',
      'pricing',
      'about brandastic',
      'what do you do',
      'how long',
      'ecommerce',
      'seo'
    ];
    
    const lowerMessage = message.toLowerCase();
    return commonPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  clearConversation(conversationId) {
    this.conversations.delete(conversationId);
  }
}