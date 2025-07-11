import { Mail, TrendingUp, Image, Users, Target, Camera, Megaphone, UserPlus, Shield, Palette } from "lucide-react";

export interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  status: "active" | "coming-soon";
  requireAuth: boolean;
}

export const assistants: Assistant[] = [
  // Marketing & Publicidade
  {
    id: "email-subject-xn",
    name: "Email Subject XN",
    description: "Especialista em criar assuntos de e-mail que aumentam drasticamente as taxas de abertura",
    icon: Mail,
    category: "marketing",
    status: "coming-soon",
    requireAuth: true,
  },
  {
    id: "ecommerce-campaign-planner",
    name: "Planeador de Campanhas para E-commerce",
    description: "Planeador de campanhas para E-commerce da FormulaXN",
    icon: TrendingUp,
    category: "marketing",
    status: "coming-soon",
    requireAuth: true,
  },
  {
    id: "carousel-genius",
    name: "CarouselGenius",
    description: "Criador de carrosséis impactantes para redes sociais",
    icon: Image,
    category: "marketing",
    status: "coming-soon",
    requireAuth: true,
  },
  {
    id: "promotional-ad-wizard",
    name: "Assistente de Criativos Promocionais",
    description: "Assistente de Criativos de Anúncios Promocionais para E-commerce",
    icon: Megaphone,
    category: "marketing",
    status: "coming-soon",
    requireAuth: true,
  },
  {
    id: "lead-capture-ads",
    name: "Criador de Criativos para Captura de Leads",
    description: "Criador de Criativos para Anúncios focados em captura de leads",
    icon: UserPlus,
    category: "marketing",
    status: "coming-soon",
    requireAuth: true,
  },

  // Criação de Conteúdo
  {
    id: "ugc_creator",
    name: "Gerador de Imagens UGC",
    description: "Gerador de Imagens UGC para Anúncios e Publicações",
    icon: Camera,
    category: "content",
    status: "active",
    requireAuth: true,
  },

  // Ferramentas de Estratégia Empresarial
  {
    id: "persona-creator",
    name: "Criador de Personas para E-commerce",
    description: "Criador de Personas para E-commerce",
    icon: Users,
    category: "business",
    status: "coming-soon",
    requireAuth: true,
  },
  {
    id: "value-proposition-creator",
    name: "Criador de Propostas de Valor Únicas",
    description: "Criador de Propostas de Valor Únicas",
    icon: Target,
    category: "business",
    status: "coming-soon",
    requireAuth: true,
  },
  {
    id: "logo-maker-gpt",
    name: "LogoMakerGPT",
    description: "LogoMakerGPT – Criação de Logotipo com IA",
    icon: Palette,
    category: "business",
    status: "coming-soon",
    requireAuth: true,
  },

  // Legal e Conformidade
  {
    id: "legal-policies-creator",
    name: "Criador de Políticas Legais",
    description: "Criação de Políticas de Privacidade, Cookies e Obrigações Legais",
    icon: Shield,
    category: "legal",
    status: "coming-soon",
    requireAuth: true,
  },
];

export const categories = [
  {
    id: "marketing",
    name: "Marketing e Publicidade",
    description: "Ferramentas para optimizar campanhas, criar anúncios e aumentar conversões",
    icon: Megaphone,
  },
  {
    id: "content",
    name: "Criação de Conteúdo",
    description: "Gere conteúdo visual e criativo para as suas campanhas e redes sociais",
    icon: Camera,
  },
  {
    id: "business",
    name: "Ferramentas de Estratégia Empresarial",
    description: "Desenvolva estratégias, personas e propostas de valor para o seu negócio",
    icon: Target,
  },
  {
    id: "legal",
    name: "Centro Legal e de Conformidade",
    description: "Crie documentos legais e políticas de conformidade para o seu e-commerce",
    icon: Shield,
  },
];