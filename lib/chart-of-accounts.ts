import type { ManagerialCategory } from "./financial-db";

export interface COANode {
  code: string;
  description: string;
  managerialCategory?: ManagerialCategory;
}

function level(code: string): number {
  const parts = code.split(".");
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] !== "0") return i + 1;
  }
  return 0;
}

export function coaLevel(code: string) { return level(code); }
export function coaIsLeaf(code: string) { return level(code) === 6; }

export function coaParent(code: string): string | null {
  const parts = code.split(".");
  const lv = level(code);
  if (lv <= 1) return null;
  const p = [...parts];
  p[lv - 1] = "0";
  return p.join(".");
}

// Full Plano de Contas — 2.x (Passivo + Patrimônio Líquido)
// Leaf nodes (level 6) include managerialCategory for DRE integration
export const CHART_OF_ACCOUNTS: COANode[] = [
  // ── Root ─────────────────────────────────────────────────────────────────
  { code: "2.0.0.0.0.0", description: "PASSIVO + PATRIMÔNIO LÍQUIDO" },
  { code: "2.1.0.0.0.0", description: "PASSIVO CIRCULANTE (<12 meses)" },

  // ── 2.1.1 — Fornecedores & Prestadores ───────────────────────────────────
  { code: "2.1.1.0.0.0", description: "FORNECEDORES & PRESTADORES SERVIÇOS" },

  // 2.1.1.1 — Nacionais / Serviços
  { code: "2.1.1.1.0.0", description: "FORNECEDORES NACIONAIS — SERVIÇOS" },

  // Freelancers
  { code: "2.1.1.1.1.0", description: "AP — FREELANCERS (Labor Direto)" },
  { code: "2.1.1.1.1.1",  description: "Freelancers — Designers (Graphic)",      managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.2",  description: "Freelancers — Designers (Motion)",       managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.3",  description: "Freelancers — Designers (UI/UX)",        managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.4",  description: "Freelancers — Copywriters (BR)",         managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.5",  description: "Freelancers — Copywriters (EN)",         managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.6",  description: "Freelancers — Video Editors",            managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.7",  description: "Freelancers — Video Producers",          managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.8",  description: "Freelancers — Photographers",            managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.9",  description: "Freelancers — Developers (Frontend)",    managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.10", description: "Freelancers — Developers (Backend)",     managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.11", description: "Freelancers — Developers (Mobile)",      managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.12", description: "Freelancers — QA/Testing",               managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.13", description: "Freelancers — DevOps",                   managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.14", description: "Freelancers — Data Analysts",            managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.15", description: "Freelancers — Project Managers",         managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.16", description: "Freelancers — Translators",              managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.17", description: "Freelancers — Voice Over Artists",       managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.18", description: "Freelancers — Animators (2D)",           managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.19", description: "Freelancers — Animators (3D)",           managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.1.20", description: "Freelancers — Sound Designers",          managerialCategory: "freelancer_terceiro" },

  // Offshore
  { code: "2.1.1.1.2.0", description: "AP — OFFSHORE TEAM (Revelo/Turing)" },
  { code: "2.1.1.1.2.1", description: "Offshore — Designers (Colômbia)",         managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.2.2", description: "Offshore — Developers (Argentina)",       managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.2.3", description: "Offshore — VAs (Filipinas)",              managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.2.4", description: "Offshore — Customer Support (México)",    managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.1.2.5", description: "Offshore — Content Writers (Índia)",      managerialCategory: "freelancer_terceiro" },

  // Agências
  { code: "2.1.1.1.3.0", description: "AP — AGÊNCIAS/PARCEIROS" },
  { code: "2.1.1.1.3.1", description: "Agência PR/Comunicação",                  managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.1.3.2", description: "Agência Media Buying",                    managerialCategory: "marketing_midia" },
  { code: "2.1.1.1.3.3", description: "Agência SEO/Performance",                 managerialCategory: "marketing_midia" },
  { code: "2.1.1.1.3.4", description: "Produtoras Video (White-Label)",          managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.1.3.5", description: "Estúdios Gravação/Locação",               managerialCategory: "fornecedor_operacional" },

  // Produção Criativa
  { code: "2.1.1.1.4.0", description: "AP — PRODUÇÃO CRIATIVA" },
  { code: "2.1.1.1.4.1", description: "Stock Photos (Shutterstock)",             managerialCategory: "marketing_midia" },
  { code: "2.1.1.1.4.2", description: "Stock Video (Pond5, Storyblocks)",        managerialCategory: "marketing_midia" },
  { code: "2.1.1.1.4.3", description: "Stock Music (Epidemic Sound)",            managerialCategory: "marketing_midia" },
  { code: "2.1.1.1.4.4", description: "Fonts/Typography Licenses",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.1.4.5", description: "Icons/Illustrations (Licenses)",          managerialCategory: "software_assinatura" },
  { code: "2.1.1.1.4.6", description: "Templates (After Effects, Premiere)",     managerialCategory: "software_assinatura" },

  // 2.1.1.2 — Tecnologia
  { code: "2.1.1.2.0.0", description: "FORNECEDORES — TECNOLOGIA" },

  // Infraestrutura
  { code: "2.1.1.2.1.0", description: "AP — INFRAESTRUTURA (Hosting/Cloud)" },
  { code: "2.1.1.2.1.1", description: "AWS (EC2, S3, RDS, CloudFront)",          managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.1.2", description: "Google Cloud Platform",                   managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.1.3", description: "Vercel (Frontend Hosting)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.1.4", description: "Heroku (App Hosting)",                    managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.1.5", description: "Cloudflare (CDN, Security)",              managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.1.6", description: "DigitalOcean (Droplets)",                 managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.1.7", description: "MongoDB Atlas (Database)",                managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.1.8", description: "Supabase (Backend-as-Service)",           managerialCategory: "software_assinatura" },

  // Produtividade
  { code: "2.1.1.2.2.0", description: "AP — PRODUTIVIDADE" },
  { code: "2.1.1.2.2.1",  description: "Google Workspace (Gmail, Drive, Docs)",  managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.2.2",  description: "Microsoft 365 (Office Suite)",           managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.2.3",  description: "Notion (Knowledge Base)",                managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.2.4",  description: "Coda (Docs & Workflows)",                managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.2.5",  description: "Airtable (Database)",                    managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.2.6",  description: "Monday.com (Project Management)",        managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.2.7",  description: "Asana (Task Management)",                managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.2.8",  description: "ClickUp (All-in-One)",                   managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.2.9",  description: "Jira (Dev Project Management)",          managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.2.10", description: "Linear (Issue Tracking)",                managerialCategory: "software_assinatura" },

  // Comunicação
  { code: "2.1.1.2.3.0", description: "AP — COMUNICAÇÃO & COLABORAÇÃO" },
  { code: "2.1.1.2.3.1", description: "Slack (Team Chat)",                       managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.3.2", description: "Discord (Community)",                     managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.3.3", description: "Zoom (Video Conferencing)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.3.4", description: "Google Meet (Video)",                     managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.3.5", description: "Microsoft Teams",                         managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.3.6", description: "Loom (Async Video)",                      managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.3.7", description: "Miro (Whiteboarding)",                    managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.3.8", description: "Figma (Design Collaboration)",            managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.3.9", description: "FigJam (Brainstorming)",                  managerialCategory: "software_assinatura" },

  // Design Tools
  { code: "2.1.1.2.4.0",  description: "AP — DESIGN & CREATIVE TOOLS" },
  { code: "2.1.1.2.4.1",  description: "Adobe Creative Cloud (Full Suite)",      managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.2",  description: "Adobe Photoshop (Individual)",           managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.3",  description: "Adobe Illustrator",                      managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.4",  description: "Adobe Premiere Pro",                     managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.5",  description: "Adobe After Effects",                    managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.6",  description: "Adobe XD",                               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.7",  description: "Figma (Design Platform)",                managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.8",  description: "Sketch (Mac Design Tool)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.9",  description: "Canva Pro (Templates)",                  managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.10", description: "Final Cut Pro",                          managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.11", description: "DaVinci Resolve Studio",                 managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.12", description: "Cinema 4D (3D Animation)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.4.13", description: "Blender (Open-source, donations)",       managerialCategory: "software_assinatura" },

  // Desenvolvimento
  { code: "2.1.1.2.5.0",  description: "AP — DESENVOLVIMENTO" },
  { code: "2.1.1.2.5.1",  description: "GitHub (Code Repository)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.5.2",  description: "GitLab (DevOps Platform)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.5.3",  description: "Bitbucket",                              managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.5.4",  description: "Vercel (Deployment)",                    managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.5.5",  description: "Netlify (Static Hosting)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.5.6",  description: "Postman (API Testing)",                  managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.5.7",  description: "Sentry (Error Tracking)",                managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.5.8",  description: "Datadog (Monitoring)",                   managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.5.9",  description: "New Relic (APM)",                        managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.5.10", description: "PagerDuty (Incident Management)",        managerialCategory: "software_assinatura" },

  // CRM & Sales
  { code: "2.1.1.2.6.0", description: "AP — CRM & SALES" },
  { code: "2.1.1.2.6.1", description: "Salesforce (CRM Platform)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.6.2", description: "HubSpot (Marketing + CRM)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.6.3", description: "Pipedrive (Sales Pipeline)",              managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.6.4", description: "Close.com (Sales CRM)",                   managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.6.5", description: "Apollo.io (Prospecting)",                 managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.6.6", description: "LinkedIn Sales Navigator",                managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.6.7", description: "ZoomInfo (B2B Data)",                     managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.6.8", description: "Clearbit (Enrichment)",                   managerialCategory: "software_assinatura" },

  // Analytics
  { code: "2.1.1.2.7.0", description: "AP — ANALYTICS & DATA" },
  { code: "2.1.1.2.7.1", description: "Google Analytics 360",                    managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.7.2", description: "Mixpanel (Product Analytics)",            managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.7.3", description: "Amplitude (User Analytics)",              managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.7.4", description: "Segment (Data Infrastructure)",           managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.7.5", description: "Looker (BI Platform)",                    managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.7.6", description: "Tableau (Visualization)",                 managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.7.7", description: "Metabase (Open BI)",                      managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.7.8", description: "Heap Analytics",                          managerialCategory: "software_assinatura" },

  // Marketing Automation
  { code: "2.1.1.2.8.0",  description: "AP — MARKETING & AUTOMATION" },
  { code: "2.1.1.2.8.1",  description: "HubSpot Marketing Hub",                  managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.8.2",  description: "Marketo (Marketing Automation)",         managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.8.3",  description: "ActiveCampaign (Email Marketing)",       managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.8.4",  description: "Mailchimp (Email)",                      managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.8.5",  description: "SendGrid (Transactional Email)",         managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.8.6",  description: "Klaviyo (Ecommerce Email)",              managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.8.7",  description: "Intercom (Customer Messaging)",          managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.8.8",  description: "Drift (Conversational Marketing)",       managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.8.9",  description: "Hotjar (Heatmaps, Surveys)",             managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.8.10", description: "Typeform (Forms & Surveys)",             managerialCategory: "software_assinatura" },

  // Customer Support
  { code: "2.1.1.2.9.0", description: "AP — CUSTOMER SUCCESS & SUPPORT" },
  { code: "2.1.1.2.9.1", description: "Zendesk (Support Ticketing)",             managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.9.2", description: "Freshdesk (Customer Support)",            managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.9.3", description: "Help Scout (Email Support)",              managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.9.4", description: "Gorgias (Ecommerce Support)",             managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.9.5", description: "ChurnZero (CS Platform)",                 managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.9.6", description: "Gainsight (CS Platform)",                 managerialCategory: "software_assinatura" },

  // Security
  { code: "2.1.1.2.10.0", description: "AP — SECURITY & COMPLIANCE" },
  { code: "2.1.1.2.10.1", description: "1Password (Password Manager)",           managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.10.2", description: "LastPass (Password Manager)",            managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.10.3", description: "Okta (Identity Management)",             managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.10.4", description: "Auth0 (Authentication)",                 managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.10.5", description: "Vanta (Compliance Automation)",          managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.10.6", description: "Drata (SOC 2 Compliance)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.10.7", description: "Norton/McAfee (Antivirus)",              managerialCategory: "software_assinatura" },

  // Payment Processing
  { code: "2.1.1.2.11.0", description: "AP — PAYMENT PROCESSING" },
  { code: "2.1.1.2.11.1", description: "Stripe (Payment Gateway)",               managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.2.11.2", description: "PayPal (Payment Processing)",            managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.2.11.3", description: "Pagar.me (Brasil Gateway)",              managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.2.11.4", description: "PagSeguro (Brasil)",                     managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.2.11.5", description: "Mercado Pago (LatAm)",                   managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.2.11.6", description: "Square (POS + Payments)",                managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.2.11.7", description: "Adyen (Global Payments)",                managerialCategory: "tarifa_bancaria" },

  // Accounting Tools
  { code: "2.1.1.2.12.0", description: "AP — ACCOUNTING & FINANCE TOOLS" },
  { code: "2.1.1.2.12.1", description: "QuickBooks Online",                      managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.12.2", description: "Xero (Accounting)",                      managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.12.3", description: "Conta Azul (Brasil Accounting)",         managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.12.4", description: "Netsuite (ERP)",                         managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.12.5", description: "Expensify (Expense Management)",         managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.12.6", description: "Brex (Corporate Card + Spend Mgmt)",     managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.12.7", description: "Ramp (Corporate Card)",                  managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.12.8", description: "Bill.com (AP Automation)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.12.9", description: "Ramp (Expense Management)",              managerialCategory: "software_assinatura" },

  // HR Systems
  { code: "2.1.1.2.13.0",  description: "AP — HR & PAYROLL SYSTEMS" },
  { code: "2.1.1.2.13.1",  description: "Gusto (Payroll US)",                    managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.13.2",  description: "ADP (Payroll)",                         managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.13.3",  description: "Rippling (HR Platform)",                managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.13.4",  description: "BambooHR (HR Management)",              managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.13.5",  description: "Workday (Enterprise HCM)",              managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.13.6",  description: "Deel (Global Payroll)",                 managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.13.7",  description: "Remote.com (Global Employment)",        managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.13.8",  description: "Oyster HR (Global HR)",                 managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.13.9",  description: "Flash (Brasil RH/Folha)",               managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.13.10", description: "Gupy (Brasil Recrutamento)",             managerialCategory: "software_assinatura" },

  // Outros Software
  { code: "2.1.1.2.14.0", description: "AP — OUTROS SOFTWARE" },
  { code: "2.1.1.2.14.1", description: "DocuSign (E-Signature)",                 managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.14.2", description: "PandaDoc (Document Automation)",         managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.14.3", description: "Zapier (Automation)",                    managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.14.4", description: "Make (Integromat - Automation)",         managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.14.5", description: "IFTTT (Applet Automation)",              managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.14.6", description: "Calendly (Scheduling)",                  managerialCategory: "software_assinatura" },
  { code: "2.1.1.2.14.7", description: "Cal.com (Open Scheduling)",              managerialCategory: "software_assinatura" },

  // ── 2.1.1.3 — Marketing & Mídia ──────────────────────────────────────────
  { code: "2.1.1.3.0.0", description: "FORNECEDORES — MARKETING & MÍDIA" },

  // Paid Media
  { code: "2.1.1.3.1.0",  description: "AP — PAID MEDIA (Ads)" },
  { code: "2.1.1.3.1.1",  description: "Google Ads (Search, Display, YouTube)",  managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.2",  description: "Meta Ads (Facebook, Instagram)",         managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.3",  description: "LinkedIn Ads (B2B)",                     managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.4",  description: "Twitter/X Ads",                          managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.5",  description: "TikTok Ads",                             managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.6",  description: "Reddit Ads",                             managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.7",  description: "Pinterest Ads",                          managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.8",  description: "Snapchat Ads",                           managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.9",  description: "Programmatic Display (DV360, TradeDesk)",managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.10", description: "Spotify Ads",                            managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.11", description: "Podcast Advertising",                    managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.1.12", description: "Native Ads (Taboola, Outbrain)",         managerialCategory: "marketing_midia" },

  // SEO Tools
  { code: "2.1.1.3.2.0", description: "AP — SEO & CONTENT TOOLS" },
  { code: "2.1.1.3.2.1", description: "SEMrush (SEO Suite)",                     managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.2.2", description: "Ahrefs (SEO & Backlinks)",                managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.2.3", description: "Moz Pro (SEO)",                           managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.2.4", description: "Surfer SEO (Content Optimization)",       managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.2.5", description: "Clearscope (Content Intelligence)",       managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.2.6", description: "Grammarly Business (Writing Assistant)",  managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.2.7", description: "Jasper AI (AI Copywriting)",              managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.2.8", description: "Copy.ai (AI Content)",                    managerialCategory: "software_assinatura" },

  // Social Media Tools
  { code: "2.1.1.3.3.0", description: "AP — SOCIAL MEDIA TOOLS" },
  { code: "2.1.1.3.3.1", description: "Hootsuite (Social Management)",           managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.3.2", description: "Buffer (Social Scheduling)",              managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.3.3", description: "Sprout Social (Enterprise Social)",       managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.3.4", description: "Later (Instagram Scheduling)",            managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.3.5", description: "Brandwatch (Social Listening)",           managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.3.6", description: "Mention (Media Monitoring)",              managerialCategory: "software_assinatura" },

  // Eventos
  { code: "2.1.1.3.4.0", description: "AP — EVENTOS & SPONSORSHIPS" },
  { code: "2.1.1.3.4.1", description: "Eventbrite (Event Platform)",             managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.4.2", description: "Hopin (Virtual Events)",                  managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.4.3", description: "CASE Conference Sponsorship",             managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.4.4", description: "ABAP Events Sponsorship",                 managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.4.5", description: "RD Summit Sponsorship",                   managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.4.6", description: "Web Summit (International)",              managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.4.7", description: "Booth Setup/Design",                      managerialCategory: "marketing_midia" },
  { code: "2.1.1.3.4.8", description: "Swag/Giveaways Production",               managerialCategory: "marketing_midia" },

  // PR
  { code: "2.1.1.3.5.0", description: "AP — PR & COMUNICAÇÃO" },
  { code: "2.1.1.3.5.1", description: "Assessoria Imprensa (Retainer)",          managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.3.5.2", description: "Press Release Distribution",              managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.3.5.3", description: "Media Monitoring Service",                managerialCategory: "software_assinatura" },
  { code: "2.1.1.3.5.4", description: "Influencer Marketing Platform",           managerialCategory: "marketing_midia" },

  // Content Production
  { code: "2.1.1.3.6.0", description: "AP — CONTENT PRODUCTION" },
  { code: "2.1.1.3.6.1", description: "Blog Writers (External)",                 managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.3.6.2", description: "Video Production (External)",             managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.3.6.3", description: "Podcast Production",                      managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.3.6.4", description: "Graphic Design (External)",               managerialCategory: "freelancer_terceiro" },
  { code: "2.1.1.3.6.5", description: "Photography (External)",                  managerialCategory: "freelancer_terceiro" },

  // ── 2.1.1.4 — Profissionais ───────────────────────────────────────────────
  { code: "2.1.1.4.0.0", description: "FORNECEDORES — PROFISSIONAIS" },

  // Contabilidade
  { code: "2.1.1.4.1.0", description: "AP — CONTABILIDADE" },
  { code: "2.1.1.4.1.1", description: "Escritório Contábil (Monthly Retainer)",  managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.1.2", description: "Contabilidade — Serviços Especiais",      managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.1.3", description: "Declarações Fiscais (IRPJ, ECF)",         managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.1.4", description: "Consultoria Tributária",                  managerialCategory: "servicos_contabeis_juridicos" },

  // Advocacia
  { code: "2.1.1.4.2.0", description: "AP — ADVOCACIA/JURÍDICO" },
  { code: "2.1.1.4.2.1", description: "Escritório Advocacia — Retainer",         managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.2.2", description: "Advocacia — M&A Transactions",            managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.2.3", description: "Advocacia — Trabalhista",                 managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.2.4", description: "Advocacia — Societário",                  managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.2.5", description: "Advocacia — Propriedade Intelectual",     managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.2.6", description: "Advocacia — Contratos",                   managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.2.7", description: "Advocacia — Litigation",                  managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.2.8", description: "Registro Marcas (INPI)",                  managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.2.9", description: "Notário/Cartório",                        managerialCategory: "servicos_contabeis_juridicos" },

  // Auditoria
  { code: "2.1.1.4.3.0", description: "AP — AUDITORIA" },
  { code: "2.1.1.4.3.1", description: "Auditoria Externa (Big 4)",               managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.3.2", description: "Auditoria Interna",                       managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.3.3", description: "Due Diligence (M&A)",                     managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.3.4", description: "Valuation Services",                      managerialCategory: "servicos_contabeis_juridicos" },

  // Consultoria
  { code: "2.1.1.4.4.0", description: "AP — CONSULTORIA" },
  { code: "2.1.1.4.4.1", description: "Consultoria Estratégica (McKinsey, BCG)", managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.4.4.2", description: "Consultoria Tecnologia",                  managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.4.4.3", description: "Consultoria RH/Organizacional",           managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.4.4.4", description: "Consultoria Financeira",                  managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.4.4.5", description: "Consultoria M&A (Investment Banks)",      managerialCategory: "servicos_contabeis_juridicos" },

  // Recrutamento
  { code: "2.1.1.4.5.0", description: "AP — RECRUTAMENTO" },
  { code: "2.1.1.4.5.1", description: "Headhunters Executive (20-30% fee)",      managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.4.5.2", description: "Recrutamento Sênior (15-20%)",            managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.4.5.3", description: "Recrutamento Júnior/Pleno",               managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.4.5.4", description: "Job Boards (LinkedIn, Gupy)",             managerialCategory: "software_assinatura" },
  { code: "2.1.1.4.5.5", description: "Background Check Services",               managerialCategory: "fornecedor_operacional" },

  // Outros Profissionais
  { code: "2.1.1.4.6.0", description: "AP — OUTROS PROFISSIONAIS" },
  { code: "2.1.1.4.6.1", description: "Coach Executivo (Miguel)",                 managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.4.6.2", description: "Mentoria/Advisors (Retainer)",            managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.4.6.3", description: "Tradutor Juramentado",                    managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.4.6.4", description: "Despachante",                             managerialCategory: "fornecedor_operacional" },

  // ── 2.1.1.5 — Infraestrutura ──────────────────────────────────────────────
  { code: "2.1.1.5.0.0", description: "FORNECEDORES — INFRAESTRUTURA" },

  // Imóveis
  { code: "2.1.1.5.1.0", description: "AP — IMÓVEIS" },
  { code: "2.1.1.5.1.1", description: "Aluguel Escritório São Paulo",             managerialCategory: "aluguel_locacao" },
  { code: "2.1.1.5.1.2", description: "Aluguel Escritório Rio (Se houver)",       managerialCategory: "aluguel_locacao" },
  { code: "2.1.1.5.1.3", description: "Condomínio Escritório",                    managerialCategory: "aluguel_locacao" },
  { code: "2.1.1.5.1.4", description: "IPTU",                                     managerialCategory: "imposto_tributo" },
  { code: "2.1.1.5.1.5", description: "Seguro Incêndio Escritório",               managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.5.1.6", description: "Corretagem Imobiliária",                   managerialCategory: "fornecedor_operacional" },

  // Utilidades
  { code: "2.1.1.5.2.0", description: "AP — UTILIDADES" },
  { code: "2.1.1.5.2.1", description: "Energia Elétrica (Light, Enel)",           managerialCategory: "energia_agua_internet" },
  { code: "2.1.1.5.2.2", description: "Água e Esgoto (Sabesp, Cedae)",            managerialCategory: "energia_agua_internet" },
  { code: "2.1.1.5.2.3", description: "Gás (Se aplicável)",                       managerialCategory: "energia_agua_internet" },
  { code: "2.1.1.5.2.4", description: "Internet Fibra (Vivo, Claro, Oi)",         managerialCategory: "energia_agua_internet" },
  { code: "2.1.1.5.2.5", description: "Telefonia Fixa",                           managerialCategory: "energia_agua_internet" },
  { code: "2.1.1.5.2.6", description: "Telefonia Móvel Corporativo",              managerialCategory: "energia_agua_internet" },
  { code: "2.1.1.5.2.7", description: "Link Dedicado (Backup Internet)",          managerialCategory: "energia_agua_internet" },

  // Manutenção
  { code: "2.1.1.5.3.0", description: "AP — MANUTENÇÃO & LIMPEZA" },
  { code: "2.1.1.5.3.1", description: "Limpeza Escritório (Serviço Terceiro)",    managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.5.3.2", description: "Manutenção Predial",                       managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.5.3.3", description: "Manutenção Ar Condicionado",               managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.5.3.4", description: "Dedetização/Controle Pragas",              managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.5.3.5", description: "Jardinagem (Se houver)",                   managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.5.3.6", description: "Manutenção Equipamentos TI",               managerialCategory: "fornecedor_operacional" },

  // Segurança
  { code: "2.1.1.5.4.0", description: "AP — SEGURANÇA" },
  { code: "2.1.1.5.4.1", description: "Segurança Patrimonial (Vigilância)",       managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.5.4.2", description: "Monitoramento Câmeras (24/7)",             managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.5.4.3", description: "Alarme/Sensores",                          managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.5.4.4", description: "Seguro Roubo/Furto",                       managerialCategory: "fornecedor_operacional" },

  // Mobiliário
  { code: "2.1.1.5.5.0", description: "AP — MOBILIÁRIO & EQUIPAMENTOS" },
  { code: "2.1.1.5.5.1", description: "Leasing Mobiliário Escritório",            managerialCategory: "aluguel_locacao" },
  { code: "2.1.1.5.5.2", description: "Leasing Equipamentos TI",                  managerialCategory: "aluguel_locacao" },
  { code: "2.1.1.5.5.3", description: "Manutenção Impressoras (Contrato)",        managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.5.5.4", description: "Aluguel Copiadoras/Scanners",              managerialCategory: "aluguel_locacao" },

  // ── 2.1.1.6 — Viagens & T&E ──────────────────────────────────────────────
  { code: "2.1.1.6.0.0", description: "FORNECEDORES — VIAGENS & T&E" },

  // Transporte Aéreo
  { code: "2.1.1.6.1.0", description: "AP — TRANSPORTE AÉREO" },
  { code: "2.1.1.6.1.1", description: "Passagens Aéreas Nacionais",              managerialCategory: "viagem_hospedagem" },
  { code: "2.1.1.6.1.2", description: "Passagens Aéreas Internacionais",         managerialCategory: "viagem_hospedagem" },
  { code: "2.1.1.6.1.3", description: "Taxas Aeroportuárias",                    managerialCategory: "viagem_hospedagem" },
  { code: "2.1.1.6.1.4", description: "Bagagem Adicional",                       managerialCategory: "viagem_hospedagem" },
  { code: "2.1.1.6.1.5", description: "Upgrade Classe Executiva",                managerialCategory: "viagem_hospedagem" },

  // Hospedagem
  { code: "2.1.1.6.2.0", description: "AP — HOSPEDAGEM" },
  { code: "2.1.1.6.2.1", description: "Hotéis Nacionais",                        managerialCategory: "viagem_hospedagem" },
  { code: "2.1.1.6.2.2", description: "Hotéis Internacionais",                   managerialCategory: "viagem_hospedagem" },
  { code: "2.1.1.6.2.3", description: "Airbnb (Estadias curtas)",                managerialCategory: "viagem_hospedagem" },
  { code: "2.1.1.6.2.4", description: "Apart-Hotel (Longa duração)",             managerialCategory: "viagem_hospedagem" },

  // Transporte Terrestre
  { code: "2.1.1.6.3.0", description: "AP — TRANSPORTE TERRESTRE" },
  { code: "2.1.1.6.3.1", description: "Uber/99 (Transporte Executivo)",          managerialCategory: "deslocamento_combustivel" },
  { code: "2.1.1.6.3.2", description: "Táxi",                                    managerialCategory: "deslocamento_combustivel" },
  { code: "2.1.1.6.3.3", description: "Aluguel Carros (Localiza, Movida)",       managerialCategory: "deslocamento_combustivel" },
  { code: "2.1.1.6.3.4", description: "Transfer Aeroporto",                      managerialCategory: "deslocamento_combustivel" },
  { code: "2.1.1.6.3.5", description: "Estacionamento",                          managerialCategory: "deslocamento_combustivel" },
  { code: "2.1.1.6.3.6", description: "Pedágios",                                managerialCategory: "deslocamento_combustivel" },
  { code: "2.1.1.6.3.7", description: "Combustível (Reembolso)",                 managerialCategory: "deslocamento_combustivel" },

  // Refeições
  { code: "2.1.1.6.4.0", description: "AP — REFEIÇÕES & ENTRETENIMENTO" },
  { code: "2.1.1.6.4.1", description: "Refeições Viagens (Per Diem)",            managerialCategory: "alimentacao_representacao" },
  { code: "2.1.1.6.4.2", description: "Refeições Clientes (Business Meals)",     managerialCategory: "alimentacao_representacao" },
  { code: "2.1.1.6.4.3", description: "Coffee Meetings (Prospecção)",            managerialCategory: "alimentacao_representacao" },
  { code: "2.1.1.6.4.4", description: "Entretenimento Clientes (Eventos)",       managerialCategory: "alimentacao_representacao" },
  { code: "2.1.1.6.4.5", description: "Happy Hours Time (Team Building)",        managerialCategory: "alimentacao_representacao" },

  // Outros T&E
  { code: "2.1.1.6.5.0", description: "AP — OUTROS T&E" },
  { code: "2.1.1.6.5.1", description: "Seguro Viagem",                           managerialCategory: "viagem_hospedagem" },
  { code: "2.1.1.6.5.2", description: "Visto/Documentação",                      managerialCategory: "viagem_hospedagem" },
  { code: "2.1.1.6.5.3", description: "Roaming Internacional",                   managerialCategory: "energia_agua_internet" },
  { code: "2.1.1.6.5.4", description: "Lavanderia (Viagens longas)",             managerialCategory: "viagem_hospedagem" },

  // ── 2.1.1.7 — M&A Due Diligence ──────────────────────────────────────────
  { code: "2.1.1.7.0.0", description: "FORNECEDORES — M&A DUE DILIGENCE" },

  { code: "2.1.1.7.1.0", description: "AP — DD FINANCEIRA" },
  { code: "2.1.1.7.1.1", description: "Consultoria Financeira DD (Big 4)",       managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.7.1.2", description: "Quality of Earnings (QoE)",               managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.7.1.3", description: "Working Capital Analysis",                managerialCategory: "servicos_contabeis_juridicos" },

  { code: "2.1.1.7.2.0", description: "AP — DD LEGAL" },
  { code: "2.1.1.7.2.1", description: "Legal DD (Advocacia M&A)",                managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.7.2.2", description: "Litigation Search",                       managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.7.2.3", description: "Compliance Review",                       managerialCategory: "servicos_contabeis_juridicos" },

  { code: "2.1.1.7.3.0", description: "AP — DD OPERACIONAL" },
  { code: "2.1.1.7.3.1", description: "Operational DD (Consultoria)",            managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.7.3.2", description: "Technology DD (CTO-as-Service)",          managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.7.3.3", description: "Commercial DD (Customer Interviews)",     managerialCategory: "fornecedor_operacional" },

  { code: "2.1.1.7.4.0", description: "AP — DD OUTROS" },
  { code: "2.1.1.7.4.1", description: "Valuation Specialists",                   managerialCategory: "servicos_contabeis_juridicos" },
  { code: "2.1.1.7.4.2", description: "Background Checks (Founders)",            managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.7.4.3", description: "Industry Reports/Research",               managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.7.4.4", description: "Data Room Setup (Virtual)",               managerialCategory: "software_assinatura" },

  // ── 2.1.1.8 — Seguros ────────────────────────────────────────────────────
  { code: "2.1.1.8.0.0", description: "FORNECEDORES — SEGUROS" },

  { code: "2.1.1.8.1.0", description: "AP — SEGUROS OPERACIONAIS" },
  { code: "2.1.1.8.1.1", description: "Seguro E&O (Errors & Omissions)",         managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.8.1.2", description: "Seguro D&O (Directors & Officers)",       managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.8.1.3", description: "Seguro Responsabilidade Civil Geral",     managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.8.1.4", description: "Seguro Cyber (Data Breach)",              managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.8.1.5", description: "Seguro Propriedade (Escritório)",         managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.8.1.6", description: "Seguro Equipamentos (Tech)",              managerialCategory: "fornecedor_operacional" },

  { code: "2.1.1.8.2.0", description: "AP — SEGUROS PESSOAS" },
  { code: "2.1.1.8.2.1", description: "Seguro Vida Chave (Miguel R$25M)",        managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.8.2.2", description: "Seguro Vida Grupo (Employees)",           managerialCategory: "folha_remuneracao" },
  { code: "2.1.1.8.2.3", description: "Seguro Acidentes Pessoais",               managerialCategory: "folha_remuneracao" },
  { code: "2.1.1.8.2.4", description: "Seguro Viagem Executivo",                 managerialCategory: "viagem_hospedagem" },

  // ── 2.1.1.9 — Outros ─────────────────────────────────────────────────────
  { code: "2.1.1.9.0.0", description: "FORNECEDORES — OUTROS" },

  // Tarifas Bancárias
  { code: "2.1.1.9.1.0", description: "AP — BANCO (Tarifas)" },
  { code: "2.1.1.9.1.1", description: "Tarifas Bancárias Itaú",                  managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.9.1.2", description: "Tarifas Votorantim",                      managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.9.1.3", description: "Tarifas TED/DOC",                         managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.9.1.4", description: "Tarifas Wire Transfer Internacional",     managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.9.1.5", description: "Tarifas Cartão Corporativo",              managerialCategory: "tarifa_bancaria" },
  { code: "2.1.1.9.1.6", description: "Anuidade Cartões",                        managerialCategory: "tarifa_bancaria" },

  // Courier
  { code: "2.1.1.9.2.0", description: "AP — CORREIOS & COURIER" },
  { code: "2.1.1.9.2.1", description: "Correios (Sedex, PAC)",                   managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.9.2.2", description: "FedEx (Internacional)",                   managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.9.2.3", description: "DHL (Express)",                           managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.9.2.4", description: "Motoboy/Courier Local",                   managerialCategory: "fornecedor_operacional" },

  // Material
  { code: "2.1.1.9.3.0", description: "AP — MATERIAL ESCRITÓRIO" },
  { code: "2.1.1.9.3.1", description: "Papelaria (Kalunga, etc)",                managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.9.3.2", description: "Material Impressão (Toner, papel)",       managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.9.3.3", description: "Material Pantry (Café, água, snacks)",    managerialCategory: "alimentacao_representacao" },
  { code: "2.1.1.9.3.4", description: "Material Higiene/Limpeza",                managerialCategory: "fornecedor_operacional" },

  // Associações
  { code: "2.1.1.9.4.0", description: "AP — ASSOCIAÇÕES & ANUIDADES" },
  { code: "2.1.1.9.4.1", description: "CENP (Anuidade)",                         managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.9.4.2", description: "ABAP (Associação)",                       managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.9.4.3", description: "Câmara Comércio Brasil-EUA",              managerialCategory: "fornecedor_operacional" },
  { code: "2.1.1.9.4.4", description: "Associações Profissionais (PMI, etc)",    managerialCategory: "fornecedor_operacional" },

  // Brindes
  { code: "2.1.1.9.5.0", description: "AP — BRINDES & SWAG" },
  { code: "2.1.1.9.5.1", description: "Produção Swag (Camisetas, canecas)",      managerialCategory: "marketing_midia" },
  { code: "2.1.1.9.5.2", description: "Brindes Corporativos",                    managerialCategory: "marketing_midia" },
  { code: "2.1.1.9.5.3", description: "Welcome Kits (New Hires)",                managerialCategory: "folha_remuneracao" },
  { code: "2.1.1.9.5.4", description: "Client Gifts (Presentes executivos)",     managerialCategory: "marketing_midia" },

  // Diversos
  { code: "2.1.1.9.6.0", description: "AP — DIVERSOS" },
  { code: "2.1.1.9.6.1", description: "Multas/Penalidades (Não-Fiscais)",        managerialCategory: "juros_multa_iof" },
  { code: "2.1.1.9.6.2", description: "Doações (Não-Dedutíveis)",               managerialCategory: "despesa_ambigua" },
  { code: "2.1.1.9.6.3", description: "Perdas Diversas",                         managerialCategory: "despesa_ambigua" },
  { code: "2.1.1.9.6.4", description: "Outros Fornecedores",                     managerialCategory: "fornecedor_operacional" },

  // ── 2.1.2 — Obrigações Trabalhistas ──────────────────────────────────────
  { code: "2.1.2.0.0.0", description: "OBRIGAÇÕES TRABALHISTAS (Payroll)" },

  // Salários
  { code: "2.1.2.1.0.0", description: "SALÁRIOS & PRÓ-LABORE A PAGAR" },

  { code: "2.1.2.1.1.0", description: "EXECUTIVOS (C-Level)" },
  { code: "2.1.2.1.1.1", description: "Pró-Labore Miguel (CEO)",                 managerialCategory: "prolabore_retirada" },
  { code: "2.1.2.1.1.2", description: "Salário COO",                             managerialCategory: "prolabore_retirada" },
  { code: "2.1.2.1.1.3", description: "Salário CFO",                             managerialCategory: "prolabore_retirada" },
  { code: "2.1.2.1.1.4", description: "Salário CTO",                             managerialCategory: "prolabore_retirada" },

  { code: "2.1.2.1.2.0", description: "MANAGERS (VP/Directors)" },
  { code: "2.1.2.1.2.1", description: "Salário VP M&A",                          managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.2.2", description: "Salário VP Marketing",                    managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.2.3", description: "Salário Head of Product",                 managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.2.4", description: "Salário Head of Engineering",             managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.2.5", description: "Salário Head of Sales",                   managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.1.3.0",  description: "INDIVIDUAL CONTRIBUTORS" },
  { code: "2.1.2.1.3.1",  description: "Salário — BDRs/Sales",                  managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.2",  description: "Salário — Account Managers",            managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.3",  description: "Salário — Customer Success",            managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.4",  description: "Salário — Product Managers",            managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.5",  description: "Salário — Engineers (Senior)",          managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.6",  description: "Salário — Engineers (Mid-Level)",       managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.7",  description: "Salário — Engineers (Junior)",          managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.8",  description: "Salário — Designers",                   managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.9",  description: "Salário — Marketing Specialists",       managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.10", description: "Salário — Finance Team",                managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.11", description: "Salário — HR/People Ops",               managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.12", description: "Salário — Operations",                  managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.3.13", description: "Salário — Administrativo",              managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.1.4.0", description: "OFFSHORE TEAM (Payroll)" },
  { code: "2.1.2.1.4.1", description: "Salário Offshore — Designers",            managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.4.2", description: "Salário Offshore — Developers",           managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.4.3", description: "Salário Offshore — CS Reps",              managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.4.4", description: "Salário Offshore — Content Writers",      managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.1.5.0", description: "ESTAGIÁRIOS & TRAINEES" },
  { code: "2.1.2.1.5.1", description: "Bolsa Estágio — Tech",                    managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.5.2", description: "Bolsa Estágio — Marketing",               managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.5.3", description: "Bolsa Estágio — Finance",                 managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.1.5.4", description: "Programa Trainee",                        managerialCategory: "folha_remuneracao" },

  // Provisões Trabalhistas
  { code: "2.1.2.2.0.0", description: "ENCARGOS & PROVISÕES TRABALHISTAS" },

  { code: "2.1.2.2.1.0", description: "PROVISÃO 13º SALÁRIO" },
  { code: "2.1.2.2.1.1", description: "Provisão 13º — Executivos",               managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.1.2", description: "Provisão 13º — Managers",                 managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.1.3", description: "Provisão 13º — ICs",                      managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.1.4", description: "Provisão 13º — Offshore",                 managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.2.2.0", description: "PROVISÃO FÉRIAS" },
  { code: "2.1.2.2.2.1", description: "Provisão Férias — Executivos",            managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.2.2", description: "Provisão Férias — Managers",              managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.2.3", description: "Provisão Férias — ICs",                   managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.2.4", description: "Provisão Férias — Offshore (PTO)",        managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.2.3.0", description: "PROVISÃO 1/3 FÉRIAS" },
  { code: "2.1.2.2.3.1", description: "Provisão 1/3 Férias — Executivos",        managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.3.2", description: "Provisão 1/3 Férias — Managers",          managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.3.3", description: "Provisão 1/3 Férias — ICs",               managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.2.4.0", description: "PROVISÃO FGTS (8% Salário)" },
  { code: "2.1.2.2.4.1", description: "Provisão FGTS — Executivos",              managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.4.2", description: "Provisão FGTS — Managers",                managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.4.3", description: "Provisão FGTS — ICs",                     managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.2.5.0", description: "PROVISÃO RESCISÕES" },
  { code: "2.1.2.2.5.1", description: "Provisão Aviso Prévio",                   managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.5.2", description: "Provisão Multa FGTS (40%)",               managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.5.3", description: "Provisão Férias Proporcionais",           managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.2.5.4", description: "Provisão 13º Proporcional",               managerialCategory: "folha_remuneracao" },

  // Encargos Sociais
  { code: "2.1.2.3.0.0", description: "ENCARGOS SOCIAIS A RECOLHER" },

  { code: "2.1.2.3.1.0", description: "INSS A RECOLHER" },
  { code: "2.1.2.3.1.1", description: "INSS Empresa (20% Folha)",                managerialCategory: "imposto_tributo" },
  { code: "2.1.2.3.1.2", description: "INSS Empregado (7.5-14% Descontado)",     managerialCategory: "imposto_tributo" },
  { code: "2.1.2.3.1.3", description: "INSS Terceiros (5.8% — SESC, etc)",       managerialCategory: "imposto_tributo" },
  { code: "2.1.2.3.1.4", description: "INSS RAT (1-3% — Risco Acidente)",        managerialCategory: "imposto_tributo" },

  { code: "2.1.2.3.2.0", description: "FGTS A RECOLHER (8% + 0.5%)" },
  { code: "2.1.2.3.2.1", description: "FGTS Depósito (8%)",                      managerialCategory: "imposto_tributo" },
  { code: "2.1.2.3.2.2", description: "FGTS Contrib Social (0.5%)",              managerialCategory: "imposto_tributo" },

  { code: "2.1.2.3.3.0", description: "PIS FOLHA A RECOLHER (1%)" },
  { code: "2.1.2.3.3.1", description: "PIS s/ Folha de Pagamento",               managerialCategory: "imposto_tributo" },

  { code: "2.1.2.3.4.0", description: "CONTRIBUIÇÕES SINDICAIS" },
  { code: "2.1.2.3.4.1", description: "Contrib Sindical Patronal",               managerialCategory: "imposto_tributo" },
  { code: "2.1.2.3.4.2", description: "Contrib Sindical Empregado (Desc)",       managerialCategory: "imposto_tributo" },
  { code: "2.1.2.3.4.3", description: "Contrib Confederativa",                   managerialCategory: "imposto_tributo" },
  { code: "2.1.2.3.4.4", description: "Contrib Assistencial",                    managerialCategory: "imposto_tributo" },

  // Benefícios
  { code: "2.1.2.4.0.0", description: "BENEFÍCIOS A PAGAR" },

  { code: "2.1.2.4.1.0", description: "VALE REFEIÇÃO/ALIMENTAÇÃO" },
  { code: "2.1.2.4.1.1", description: "VR — Executivos (R$50/dia)",              managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.1.2", description: "VR — Managers (R$45/dia)",                managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.1.3", description: "VR — ICs (R$40/dia)",                     managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.1.4", description: "VR — Flash/Alelo/Sodexo (Fornecedor)",   managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.4.2.0", description: "VALE TRANSPORTE" },
  { code: "2.1.2.4.2.1", description: "VT — Metrô/Ônibus (Riocard, BOM)",       managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.2.2", description: "VT — Uber Vouchers (Remote workers)",    managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.4.3.0", description: "PLANO DE SAÚDE" },
  { code: "2.1.2.4.3.1", description: "Plano Saúde — Executivos (Premium)",      managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.3.2", description: "Plano Saúde — Managers",                  managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.3.3", description: "Plano Saúde — ICs",                       managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.3.4", description: "Plano Saúde — Dependentes",               managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.3.5", description: "Co-participação Empregado (Desconto)",    managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.4.4.0", description: "PLANO ODONTOLÓGICO" },
  { code: "2.1.2.4.4.1", description: "Plano Dental — Titular",                  managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.4.2", description: "Plano Dental — Dependentes",              managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.4.5.0", description: "SEGURO DE VIDA" },
  { code: "2.1.2.4.5.1", description: "Seguro Vida Grupo (All Employees)",       managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.5.2", description: "Seguro Acidentes Pessoais",               managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.4.6.0", description: "VALE CULTURA" },
  { code: "2.1.2.4.6.1", description: "Vale Cultura (R$50/mês por empregado)",   managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.4.7.0", description: "GYMPASS / WELLHUB" },
  { code: "2.1.2.4.7.1", description: "Gympass Subscription (Academia)",         managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.4.8.0", description: "AUXÍLIO HOME OFFICE" },
  { code: "2.1.2.4.8.1", description: "Auxílio Internet (R$100/mês)",            managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.8.2", description: "Auxílio Cadeira/Monitor (One-time)",      managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.4.9.0", description: "OUTROS BENEFÍCIOS" },
  { code: "2.1.2.4.9.1", description: "Auxílio Creche/Babá",                     managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.9.2", description: "Previdência Privada (Matching)",          managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.9.3", description: "Auxílio Educação (Cursos, MBA)",          managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.4.9.4", description: "Cestas Básicas",                          managerialCategory: "folha_remuneracao" },

  // PLR
  { code: "2.1.2.5.0.0", description: "PARTICIPAÇÃO NOS LUCROS (PLR)" },

  { code: "2.1.2.5.1.0", description: "PLR — ANUAL" },
  { code: "2.1.2.5.1.1", description: "PLR Executivos (30-50% Salário Anual)",   managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.5.1.2", description: "PLR Managers (20-30%)",                   managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.5.1.3", description: "PLR ICs (10-20%)",                        managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.5.2.0", description: "PROVISÃO PLR (Monthly Accrual)" },
  { code: "2.1.2.5.2.1", description: "Provisão PLR — Acumulada Ano Corrente",   managerialCategory: "folha_remuneracao" },

  // Comissões
  { code: "2.1.2.6.0.0", description: "COMISSÕES & BÔNUS" },

  { code: "2.1.2.6.1.0", description: "COMISSÕES VENDAS" },
  { code: "2.1.2.6.1.1", description: "Comissão BDRs (% Deal Closed)",           managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.6.1.2", description: "Comissão AEs (% Quota Attainment)",       managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.6.1.3", description: "Comissão Sales VP (% Team Quota)",        managerialCategory: "folha_remuneracao" },

  { code: "2.1.2.6.2.0", description: "BÔNUS PERFORMANCE" },
  { code: "2.1.2.6.2.1", description: "Bônus Trimestral (OKRs)",                 managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.6.2.2", description: "Bônus Spot (One-time Recognition)",       managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.6.2.3", description: "Retention Bonus (Golden Handcuffs)",      managerialCategory: "folha_remuneracao" },
  { code: "2.1.2.6.2.4", description: "Sign-On Bonus (New Hires)",               managerialCategory: "folha_remuneracao" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const byCode = new Map(CHART_OF_ACCOUNTS.map(n => [n.code, n]));

export function getCoaNode(code: string): COANode | undefined {
  return byCode.get(code);
}

export function getLeafNodes(): COANode[] {
  return CHART_OF_ACCOUNTS.filter(n => coaIsLeaf(n.code));
}

export function searchCOA(query: string): COANode[] {
  const q = query.toLowerCase().trim();
  if (!q) return getLeafNodes().slice(0, 20);
  return CHART_OF_ACCOUNTS.filter(n =>
    coaIsLeaf(n.code) &&
    (n.description.toLowerCase().includes(q) || n.code.includes(q))
  ).slice(0, 30);
}

export function coaPath(code: string): COANode[] {
  const path: COANode[] = [];
  let current: string | null = code;
  while (current) {
    const node = byCode.get(current);
    if (node) path.unshift(node);
    current = coaParent(current);
  }
  return path;
}
