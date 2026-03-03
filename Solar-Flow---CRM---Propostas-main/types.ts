
export enum LeadStatus {
  NEW = 'NEW',
  QUALIFICATION = 'QUALIFICATION',
  SIZING = 'SIZING',
  PROPOSAL_SENT = 'PROPOSAL_SENT',
  NEGOTIATION = 'NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

export interface KitItem {
  id: string;
  equipmentId?: string;
  name: string;
  quantity: number;
  type: 'MODULE' | 'INVERTER' | 'STRUCTURE' | 'CABLE' | 'OTHER';
}

export interface City {
  id: string;
  name: string;
  uf: string;
  hsp: number; // Horas de Sol Pleno (kWh/m²/dia)
}

export interface Equipment {
  id: string;
  type: 'MODULE' | 'INVERTER' | 'STRUCTURE' | 'CABLE' | 'OTHER';
  manufacturer: string;
  model: string;
  power: number; // Watts (Module) or kW (Inverter)
  price?: number; // Cost Price
  warranty?: string; // Product Warranty
  
  // Module Specifics
  efficiencyWarranty?: string; // Performance Warranty (e.g. 25 years 80%)
  width?: number; // mm
  height?: number; // mm

  // Inverter Specifics
  voltage?: string; // e.g., "220V", "380V"
  inverterPhase?: 'MONO' | 'TRI'; // Monofásico or Trifásico
  inverterType?: 'STRING' | 'MICRO'; // String or Microinverter
}

export interface AnnualProjection {
  year: number; // 1 to 25
  calendarYear: number; // e.g., 2025, 2026...
  generation: number; // kWh (considering degradation)
  tariff: number; // R$ (considering inflation)
  savings: number; // R$ (Net savings after Fio B)
  billWithoutSolar: number; // R$ (Original Bill)
  billWithSolar: number; // R$ (New Bill)
  fioBCost: number; // R$ (Amount paid in Fio B tax)
  icmsCost: number; // R$ (Amount paid in ICMS tax)
  accumulatedSavings: number; // R$
}

export interface SharedUnit {
  id: string;
  name: string;
  type: 'MONO' | 'BIFASICO' | 'TRIFASICO';
  consumption: number; // kWh/month
}

export interface GeneratingUnit {
  type: 'MONO' | 'BIFASICO' | 'TRIFASICO';
  consumption: number; // kWh/month
}

export interface SolarSimulation {
  avgConsumption: number; // kWh/month (Total System Consumption)
  city: string;
  uf: string;
  hsp: number; // Irradiação utilizada no cálculo
  
  // Tariff Composition
  te?: number; // Tarifa de Energia específica do lead
  tusd?: number; // Tarifa de Uso específica do lead
  tariff: number; // Total (Calculated TE + TUSD)
  
  connectionType: 'MONO' | 'BIFASICO' | 'TRIFASICO';
  roofOrientation: 'NORTH' | 'EAST_WEST' | 'OTHER';
  
  selfConsumption: number; // % (0-100) - Fator de Simultaneidade
  
  // Shared Generation
  hasSharedGeneration?: boolean;
  generatingUnit?: GeneratingUnit;
  beneficiaryUnits?: SharedUnit[];

  systemSize: number; // kWp
  estimatedGeneration: number; // kWh/month
  estimatedSavings: number; // R$/month
  payback: number; // years
  totalPrice: number;
  kitItems: KitItem[];
  notes?: string;
  conditions?: string;
  
  // Financial Module
  financialProjection?: AnnualProjection[];
}

export interface ProposalHistory {
  id: string;
  name: string; // e.g., "Proposta Inicial", "Revisão 1"
  date: string;
  systemSize: number; // kWp
  totalPrice: number; // R$
  monthlyProduction: number; // kWh
  modulesCount: number;
  inverterCount: number;
  payback: number;
}

export type Role = 'ADMIN' | 'SALESPERSON';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  userId?: string; // Owner of the lead
  name: string; // Nome Completo (PF) ou Razão Social (PJ)
  clientType: 'PF' | 'PJ';
  document?: string; // CPF ou CNPJ
  contactName?: string; // Nome do responsável (apenas PJ)
  phone: string; // WhatsApp
  email?: string;
  status: string; // Changed from LeadStatus enum to string to support dynamic columns
  tags?: string[]; // 'Quente', 'Frio', 'Morno', 'Desqualificado'
  notes?: string; // Observations
  createdAt: string;
  updatedAt: string;
  lossReason?: string;
  simulation?: SolarSimulation;
  proposalHistory?: ProposalHistory[];
}

export interface AppSettings {
  // Company Profile
  companyName: string;
  companyCnpj?: string;
  contactPhone: string;
  contactEmail: string;
  website?: string;
  socialInstagram?: string;
  
  // Address
  addressZip?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressCity?: string;
  addressState?: string;

  // Branding
  logoUrl?: string; // Base64 string
  primaryColor: string; // Hex code

  // Proposal Settings
  proposalValidityDays: number; // Validity period in days
  installationWarranty?: string; // Installation warranty (e.g. "12 meses", "5 anos")
  aboutUs?: string; // Quem somos

  // Regulatory / Energy
  te: number; // Tarifa de Energia (R$/kWh)
  tusd: number; // Tarifa de Uso do Sistema de Distribuição - Fatura (R$/kWh)
  tusdAneel: number; // TUSD de referência ANEEL (R$/kWh)
  icmsOnTusd: boolean; // Check if ICMS is charged on TUSD
  icmsTaxPercentage?: number; // % ICMS charged on TUSD (e.g. 18, 25)
  
  defaultTariff: number; // Calculated: TE + TUSD
  fioBPercentage: number; // Calculated: (TUSD Aneel / Total) * 100
  defaultSelfConsumption: number; // % Default simultaneity factor (0-100)
  energyInflation: number; // % Annual energy inflation rate (e.g. 6%)

  // Sizing Parameters (Orientation Efficiency Factors 0-1)
  effNorth: number;     // Default 1.0
  effEastWest: number;  // Default 0.85
  effSouth: number;     // Default 0.75 (OTHER)
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
}
