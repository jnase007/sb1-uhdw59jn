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

PRICING INFORMATION:
WEB DESIGN:
- Business Website: $2,500 - $5,000 (2-4 weeks)
- Advanced Website: $5,000 - $10,000 (4-6 weeks)  
- E-commerce Website: $7,500 - $15,000 (6-8 weeks)

DIGITAL MARKETING:
- PPC Management: $1,500 - $3,000/month (plus ad spend)
- SEO Services: $1,200 - $2,500/month
- Social Media Management: $800 - $2,000/month

PACKAGES:
- Digital Starter: $2,500/month (6-month minimum)
- Business Growth: $4,500/month (6-month minimum)
- Enterprise: Custom pricing

SALES PROCESS:
1. Discovery Consultation (30-60 minutes) - FREE
2. Strategy Development (3-5 business days)
3. Proposal & Agreement (1-2 business days)
4. Onboarding & Setup (1-2 weeks)
5. Execution & Optimization (ongoing)

YOUR ROLE:
- Provide accurate, specific pricing when asked
- Use a professional yet friendly, conversational tone as Justin's representative
- Always prioritize booking consultation calls for detailed discussions
- Share specific results and success stories when relevant
- Keep responses under 200 words when possible

KEY RESULTS TO MENTION:
- Average 150% increase in patient inquiries (healthcare)
- 40% improvement in online visibility
- 25% increase in appointment bookings

RESPONSE GUIDELINES:
- For pricing: Give specific ranges and suggest booking a call for custom quotes
- For complex questions: Provide detailed answer + suggest booking call
- Always be helpful and guide toward consultation booking
- Use "we" when referring to Brandastic
- Mention Justin and the team when appropriate
- End responses with a question when appropriate to keep conversation flowing

BOOKING CALLS:
When users show interest in services or ask about pricing, proactively suggest booking a consultation call. Say something like "Would you like to schedule a quick call with Justin and our team to discuss this further?"

INDUSTRY EXPERTISE:
We specialize in healthcare, professional services, e-commerce, real estate, and more. Mention relevant industry experience when applicable.`;
  }

  analyzeResponse(botResponse, userMessage) {
    const lowerResponse = botResponse.toLowerCase();
    const lowerMessage = userMessage.toLowerCase();
    
    // Check if response suggests booking a call
    const bookingKeywords = ['book', 'call', 'schedule', 'consultation', 'discuss', 'justin'];
    const suggestsBooking = bookingKeywords.some(keyword => lowerResponse.includes(keyword));
    
    // Check if user is asking about pricing
    const pricingKeywords = ['cost', 'price', 'pricing', 'expensive', 'budget', 'fee', 'how much'];
    const askingAboutPricing = pricingKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Check if asking about specific services
    const serviceKeywords = ['website', 'seo', 'ppc', 'social media', 'marketing', 'design', 'ecommerce'];
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
      message: "I'm having a bit of trouble right now, but I'd love to help you learn about Brandastic's services! Let's schedule a quick call with Justin and our team so we can discuss your needs directly.",
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
      'seo',
      'website cost',
      'marketing cost',
      'sales process'
    ];
    
    const lowerMessage = message.toLowerCase();
    return commonPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  clearConversation(conversationId) {
    this.conversations.delete(conversationId);
  }
}