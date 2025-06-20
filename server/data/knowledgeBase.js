import { salesProcess, pricingStructure } from './salesProcess.js';
import { detailedServices, industryExpertise } from './detailedServices.js';

export const brandkDb = {
  services: `
BRANDASTIC SERVICES OVERVIEW:

DIGITAL MARKETING:
- Pay-Per-Click (PPC) Advertising on Google, Facebook, Instagram
- Social Media Marketing & Management
- Email Marketing Campaigns
- Content Marketing Strategy
- Conversion Rate Optimization

SEO & CONTENT:
- Search Engine Optimization (Local & National)
- Content Strategy & Creation
- Technical SEO Audits
- Link Building Campaigns
- Analytics & Reporting

WEB DESIGN & DEVELOPMENT:
- Custom Website Design
- WordPress Development
- E-commerce Websites (Shopify, WooCommerce)
- Mobile-Responsive Design
- Website Maintenance & Support

E-COMMERCE SOLUTIONS:
- Shopify Store Setup & Optimization
- WooCommerce Development
- Product Photography
- Inventory Management Integration
- Payment Gateway Setup

BRANDING & CREATIVE:
- Logo Design & Brand Identity
- Brand Strategy Development
- Print & Digital Design
- Marketing Collateral
- Brand Guidelines

INDUSTRIES WE SERVE:
- Healthcare & Medical
- Professional Services
- E-commerce & Retail
- Real Estate
- Technology & SaaS
- Restaurants & Hospitality
- Manufacturing
`,

  pricing: {
    webDesign: pricingStructure.webDesign,
    digitalMarketing: pricingStructure.digitalMarketing,
    packages: pricingStructure.packages
  },

  salesProcess: salesProcess,
  detailedServices: detailedServices,
  industryExpertise: industryExpertise,

  faqs: {
    "what services do you offer": "We offer comprehensive digital marketing services including SEO, PPC advertising, web design, e-commerce solutions, and branding. Our goal is to help businesses grow their online presence and drive results.",
    
    "how much do your services cost": "Our pricing varies based on your specific needs and project scope. For example, business websites range from $2,500-$5,000, while our digital marketing packages start at $2,500/month. Let's schedule a call to discuss your goals and provide a tailored quote!",
    
    "website pricing": "Website pricing depends on complexity: Business websites ($2,500-$5,000), Advanced websites ($5,000-$10,000), and E-commerce sites ($7,500-$15,000). All include mobile-responsive design, SEO setup, and support.",
    
    "digital marketing pricing": "Our digital marketing services include PPC management ($1,500-$3,000/month plus ad spend), SEO ($1,200-$2,500/month), and social media management ($800-$2,000/month). We also offer package deals starting at $2,500/month.",
    
    "how long does it take to build a website": "Website timelines depend on complexity: Business websites (2-4 weeks), Advanced websites (4-6 weeks), E-commerce sites (6-8 weeks). We'll provide a detailed timeline during our consultation.",
    
    "do you work with ecommerce businesses": "Absolutely! We specialize in e-commerce solutions including Shopify and WooCommerce development, product photography, inventory management, and conversion optimization. Our e-commerce websites range from $7,500-$15,000.",
    
    "what makes brandastic different": "We combine creative design with data-driven marketing strategies. Our team focuses on measurable results, transparent reporting, and building long-term partnerships with our clients. We've helped businesses achieve an average 150% increase in leads.",
    
    "do you offer seo services": "Yes! We provide comprehensive SEO services ($1,200-$2,500/month) including technical audits, content optimization, local SEO, link building, and ongoing monitoring. Most clients see results within 3-6 months.",
    
    "what is your sales process": "Our process includes: 1) Discovery consultation (30-60 min), 2) Strategy development (3-5 days), 3) Proposal presentation, 4) Onboarding (1-2 weeks), 5) Execution with ongoing optimization. We start with understanding your goals and budget.",
    
    "do you work with my industry": "We have extensive experience across multiple industries including healthcare, professional services, e-commerce, real estate, and more. Each industry has unique needs, and we tailor our approach accordingly.",
    
    "what results can i expect": "Results vary by service and industry, but our clients typically see: 150% increase in leads, 40% improvement in online visibility, and 25% increase in conversions. We set realistic expectations and provide regular reporting.",
    
    "do you offer packages": "Yes! We offer three main packages: Digital Starter ($2,500/month), Business Growth ($4,500/month), and Enterprise (custom pricing). Each includes different service combinations with 6-month minimum commitments."
  }
};