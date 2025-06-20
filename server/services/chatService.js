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
        max_tokens: 400,
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
    return `You are Justin's AI assistant for Brandastic, a leading digital marketing and web design agency. You represent Justin (the president) and the Brandastic team.

ABOUT BRANDASTIC:
${brandkDb.services}

DETAILED PRICING INFORMATION:
DIGITAL MARKETING:
- Search Engine Marketing: Starting at $3,500/month
- Social Media Marketing: Starting at $3,500/month  
- Programmatic Marketing: Starting at $3,500/month
- Content Marketing: Starting at $3,500/month
- Most monthly retainers: $3,500 - $20,000/month

WEB DEVELOPMENT:
- Shopify Development: Starting at $15,000
- WordPress Development: Starting at $15,000
- UI/UX Design: $200/hour project-based
- SEO Services: $200/hour project-based
- Website Hosting: Starting at $500/year

BRAND DEVELOPMENT:
- Discovery & Strategy: $15,000 - $25,000
- Branding Projects: Typically $3,000 - $9,000
- Photography/Videography: Starting at $1,750
- Marketing Collateral: $200/hour project-based

CONSULTING:
- Strategic Consulting: $200/hour

YOUR ROLE:
- Provide accurate, specific pricing when asked
- Use a professional yet friendly, conversational tone as Justin's representative
- Always prioritize booking consultation calls for detailed discussions
- Share specific pricing ranges and investment levels
- Keep responses under 200 words when possible
- Be direct about budget requirements - we work with serious businesses ready to invest

KEY MESSAGING:
- We work with businesses ready to make meaningful investments in growth
- Our website projects start at $15K, marketing retainers typically $3,500-$20K/month
- We provide premium services with premium results
- Every business is different - custom quotes provided after consultation

RESPONSE GUIDELINES:
- For pricing: Give specific ranges from our pricing structure
- For complex questions: Provide detailed answer + suggest booking call
- Always be helpful and guide toward consultation booking
- Use "we" when referring to Brandastic
- Mention Justin and the team when appropriate
- Be upfront about investment levels - this qualifies serious prospects

BOOKING CALLS:
When users show interest in services or ask about pricing, proactively suggest booking a consultation call. Say something like "Would you like to schedule a call with Justin and our team to discuss your specific needs and budget?"

QUALIFICATION:
Help qualify prospects by understanding their budget and timeline. Our services require meaningful investment, so it's important to set proper expectations upfront.`;
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
    
    if (suggestsBooking || askingAboutPricing) {
      return {
        type: 'service_inquiry',
        suggestedAction: 'book_call'
      };
    }
    
    if (askingAboutServices) {
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
      message: "I'm having a bit of trouble right now, but I'd love to help you learn about Brandastic's services! Let's schedule a quick call with Justin and our team so we can discuss your needs and budget directly.",
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
      'website cost',
      'marketing cost',
      'branding cost',
      'shopify',
      'wordpress',
      'retainer',
      'monthly',
      'budget',
      'investment'
    ];
    
    const lowerMessage = message.toLowerCase();
    return commonPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  clearConversation(conversationId) {
    this.conversations.delete(conversationId);
  }
}