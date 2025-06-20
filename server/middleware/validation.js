export const validateChatInput = (req, res, next) => {
  const { message, conversationId } = req.body;
  
  if (!message || typeof message !== 'string') {
    return res.status(400).json({
      error: 'Message is required and must be a string'
    });
  }
  
  if (message.length > 1000) {
    return res.status(400).json({
      error: 'Message too long. Please keep it under 1000 characters.'
    });
  }
  
  if (!conversationId || typeof conversationId !== 'string') {
    return res.status(400).json({
      error: 'Conversation ID is required'
    });
  }
  
  // Sanitize message (basic XSS prevention)
  req.body.message = message.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  next();
};

export const validateBookingInput = (req, res, next) => {
  const { name, email } = req.body;
  
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({
      error: 'Valid name is required'
    });
  }
  
  if (!email || typeof email !== 'string' || !isValidEmail(email)) {
    return res.status(400).json({
      error: 'Valid email address is required'
    });
  }
  
  next();
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};