
import { KanbanColumn, LeadStatus, Lead, AppSettings, City, Equipment } from './types';

// Solar Calculation Constants
export const PERFORMANCE_RATIO = 0.75; // Average system efficiency
export const DEFAULT_TARIFF = 0.95; // R$/kWh average
export const PANEL_DEGRADATION_RATE = 0.0055; // 0.55% per year degradation

export const BRAZIL_STATES = [
  { uf: 'AC', name: 'Acre' },
  { uf: 'AL', name: 'Alagoas' },
  { uf: 'AP', name: 'Amapá' },
  { uf: 'AM', name: 'Amazonas' },
  { uf: 'BA', name: 'Bahia' },
  { uf: 'CE', name: 'Ceará' },
  { uf: 'DF', name: 'Distrito Federal' },
  { uf: 'ES', name: 'Espírito Santo' },
  { uf: 'GO', name: 'Goiás' },
  { uf: 'MA', name: 'Maranhão' },
  { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' },
  { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Pará' },
  { uf: 'PB', name: 'Paraíba' },
  { uf: 'PR', name: 'Paraná' },
  { uf: 'PE', name: 'Pernambuco' },
  { uf: 'PI', name: 'Piauí' },
  { uf: 'RJ', name: 'Rio de Janeiro' },
  { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' },
  { uf: 'RO', name: 'Rondônia' },
  { uf: 'RR', name: 'Roraima' },
  { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'São Paulo' },
  { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
];

export const INITIAL_CITIES: City[] = [
  { id: '1', name: 'São Paulo', uf: 'SP', hsp: 4.45 },
  { id: '2', name: 'Campinas', uf: 'SP', hsp: 4.60 },
  { id: '3', name: 'Ribeirão Preto', uf: 'SP', hsp: 5.10 },
  { id: '4', name: 'Rio de Janeiro', uf: 'RJ', hsp: 4.65 },
  { id: '5', name: 'Belo Horizonte', uf: 'MG', hsp: 4.90 },
  { id: '6', name: 'Fortaleza', uf: 'CE', hsp: 1703.6 }, // PVOUT Anual (kWh/kWp)
  { id: '7', name: 'Salvador', uf: 'BA', hsp: 5.25 },
  { id: '8', name: 'Curitiba', uf: 'PR', hsp: 4.05 },
  { id: '9', name: 'Porto Alegre', uf: 'RS', hsp: 4.15 },
  { id: '10', name: 'Brasília', uf: 'DF', hsp: 5.15 },
  { id: '11', name: 'Goiânia', uf: 'GO', hsp: 5.05 },
  { id: '12', name: 'Manaus', uf: 'AM', hsp: 4.35 },
  { id: '13', name: 'Belém', uf: 'PA', hsp: 4.65 },
];

export const INITIAL_EQUIPMENT: Equipment[] = [
  { 
    id: '1', 
    type: 'MODULE', 
    manufacturer: 'Jinko', 
    model: 'Tiger Neo N-Type', 
    power: 575, 
    warranty: '12 anos',
    efficiencyWarranty: '30 anos (87.4%)',
    width: 1134,
    height: 2278
  },
  { 
    id: '2', 
    type: 'MODULE', 
    manufacturer: 'Canadian', 
    model: 'HiKu6', 
    power: 550, 
    warranty: '12 anos',
    efficiencyWarranty: '25 anos (84.8%)',
    width: 1134,
    height: 2278
  },
  { 
    id: '3', 
    type: 'MODULE', 
    manufacturer: 'Trina', 
    model: 'Vertex S', 
    power: 510, 
    warranty: '15 anos',
    efficiencyWarranty: '25 anos (84.8%)',
    width: 1096,
    height: 2187
  },
  { 
    id: '4', 
    type: 'INVERTER', 
    manufacturer: 'Growatt', 
    model: 'MIN 3000 TL-X', 
    power: 3, 
    warranty: '10 anos',
    voltage: '220V',
    inverterPhase: 'MONO',
    inverterType: 'STRING'
  },
  { 
    id: '5', 
    type: 'INVERTER', 
    manufacturer: 'Growatt', 
    model: 'MIN 5000 TL-X', 
    power: 5, 
    warranty: '10 anos',
    voltage: '220V',
    inverterPhase: 'MONO',
    inverterType: 'STRING'
  },
  { 
    id: '6', 
    type: 'INVERTER', 
    manufacturer: 'Deye', 
    model: 'SUN-8K-G', 
    power: 8, 
    warranty: '10 anos',
    voltage: '380V',
    inverterPhase: 'TRI',
    inverterType: 'STRING'
  },
  { 
    id: '7', 
    type: 'INVERTER', 
    manufacturer: 'Hoymiles', 
    model: 'HMS-2000', 
    power: 2, 
    warranty: '12 anos',
    voltage: '220V',
    inverterPhase: 'MONO',
    inverterType: 'MICRO'
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'SolarFlow Energia',
  companyCnpj: '00.000.000/0001-00',
  contactPhone: '(11) 99999-9999',
  contactEmail: 'contato@solarflow.com.br',
  website: 'www.solarflow.com.br',
  addressCity: 'São Paulo',
  addressState: 'SP',
  primaryColor: '#2563EB', // Blue-600
  proposalValidityDays: 5, // Default validity
  logoUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjU2M0VCIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIvPjxwYXRoIGQ9Ik0xMiAydjIiLz48cGF0aCBkPSJNMTIgMjB2MiIvPjxwYXRoIGQ9Im00LjkzIDQuOTMgMS40MSAxLjQxIi8+PHBhdGggZD0ibTE3LjY2IDE3LjY2IDEuNDEgMS40MSIvPjxwYXRoIGQ9Ik0yIDEyaDIiLz48cGF0aCBkPSJNMjAgMTJoMiIvPjxwYXRoIGQ9Im02LjM0IDE3LjY2LTEuNDEgMS40MSIvPjxwYXRoIGQ9Im0xOS4wNyA0LjkzLTEuNDEgMS40MSIvPjwvc3ZnPg==',
  
  // Energy Defaults
  te: 0.45,
  tusd: 0.50,
  tusdAneel: 0.28,
  icmsOnTusd: true, // Default to true as it is common
  icmsTaxPercentage: 18, // Default ICMS %
  defaultTariff: 0.95, // 0.45 + 0.50
  fioBPercentage: 29.47, // (0.28 / 0.95) * 100
  defaultSelfConsumption: 30, // 30% default for Residential
  energyInflation: 6.0, // 6% annual inflation default

  // Orientation Efficiency Defaults
  effNorth: 1.0,      // 0% loss
  effEastWest: 0.85,  // 15% loss
  effSouth: 0.75      // 25% loss
};

export const KANBAN_COLUMNS: KanbanColumn[] = [
  { id: LeadStatus.NEW, title: 'Novo Lead', color: 'bg-blue-100 border-blue-300' },
  { id: LeadStatus.QUALIFICATION, title: 'Qualificação', color: 'bg-indigo-100 border-indigo-300' },
  { id: LeadStatus.SIZING, title: 'Dimensionamento', color: 'bg-yellow-100 border-yellow-300' },
  { id: LeadStatus.PROPOSAL_SENT, title: 'Proposta Enviada', color: 'bg-orange-100 border-orange-300' },
  { id: LeadStatus.NEGOTIATION, title: 'Negociação', color: 'bg-purple-100 border-purple-300' },
  { id: LeadStatus.CLOSED_WON, title: 'Fechado (Ganho)', color: 'bg-green-100 border-green-300' },
  { id: LeadStatus.CLOSED_LOST, title: 'Perdido', color: 'bg-red-100 border-red-300' },
];

export const MOCK_LEADS: Lead[] = [
  {
    id: '1',
    name: 'Padaria do João',
    clientType: 'PJ',
    document: '12.345.678/0001-90',
    contactName: 'João da Silva',
    phone: '11999998888',
    status: LeadStatus.NEW,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'admin-1'
  },
  {
    id: '2',
    name: 'Carlos Silva',
    clientType: 'PF',
    document: '123.456.789-00',
    phone: '11988887777',
    status: LeadStatus.SIZING,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'admin-1',
    simulation: {
      avgConsumption: 450,
      city: 'Campinas',
      uf: 'SP',
      hsp: 4.60,
      tariff: 0.92,
      connectionType: 'BIFASICO',
      roofOrientation: 'NORTH',
      selfConsumption: 30,
      systemSize: 3.4,
      estimatedGeneration: 460,
      estimatedSavings: 423.2,
      payback: 3.5,
      totalPrice: 12500,
      kitItems: [
        { id: 'k1', name: 'Painel 550W Jinko', quantity: 6, type: 'MODULE' },
        { id: 'k2', name: 'Inversor Growatt 3kW', quantity: 1, type: 'INVERTER' }
      ],
      conditions: 'Pagamento à vista com 5% de desconto.',
      financialProjection: Array.from({length: 25}, (_, i) => ({
          year: i + 1,
          calendarYear: new Date().getFullYear() + i,
          tariff: 0.92 * Math.pow(1.06, i),
          generation: 460 * 12 * (1 - (i * 0.0055)),
          savings: 423.2 * 12 * Math.pow(1.06, i),
          accumulatedSavings: (423.2 * 12 * Math.pow(1.06, i)) * (i + 1) - 12500, // Simplificado
          fioBCost: 50 * 12 // Simplificado
      }))
    }
  },
  {
    id: '3',
    name: 'Mercado Central Ltda',
    clientType: 'PJ',
    phone: '11977776666',
    status: LeadStatus.PROPOSAL_SENT,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
    userId: 'admin-1',
    simulation: {
      avgConsumption: 1200,
      city: 'São Paulo',
      uf: 'SP',
      hsp: 4.45,
      tariff: 0.98,
      connectionType: 'TRIFASICO',
      roofOrientation: 'EAST_WEST',
      selfConsumption: 60,
      systemSize: 9.2,
      estimatedGeneration: 1150,
      estimatedSavings: 1127,
      payback: 2.8,
      totalPrice: 28900,
      kitItems: [],
      conditions: 'Entrada + 12x.',
      financialProjection: []
    }
  }
];
