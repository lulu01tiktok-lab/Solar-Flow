import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Lead, AppSettings } from '../types';
import { Sun, Leaf, DollarSign, BatteryCharging, Check, Printer, MessageCircle, ArrowLeft, Mail, Phone, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ProposalViewProps {
  leads: Lead[];
  settings?: AppSettings;
}

// A4 Page Component
const Page: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white w-[210mm] min-w-[210mm] min-h-[297mm] mx-auto shadow-2xl print:shadow-none print:w-full print:h-[297mm] print:break-after-page relative p-12 mb-8 last:mb-0 flex flex-col ${className}`}>
    {children}
  </div>
);

const ProposalView: React.FC<ProposalViewProps> = ({ leads, settings }) => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const proposalType = searchParams.get('type') || 'simple'; // 'simple' | 'complete'
  
  const lead = leads.find((l) => l.id === id);
  const sim = lead?.simulation;

  if (!lead || !sim) {
    return <div className="p-8 text-center">Proposta não encontrada ou incompleta.</div>;
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Use Settings or Defaults
  const companyName = settings?.companyName || "SolarFlow Energia";
  const primaryColor = settings?.primaryColor || "#2563EB";
  const logoUrl = settings?.logoUrl;
  const contactPhone = settings?.contactPhone || "(11) 99999-9999";
  const contactEmail = settings?.contactEmail || "contato@solarflow.com.br";
  const validityDays = settings?.proposalValidityDays || 5;

  // Chart Data
  const chartData = [
    { name: 'Consumo Médio', val: sim.avgConsumption },
    { name: 'Geração Solar', val: sim.estimatedGeneration },
  ];

  const [scale, setScale] = useState(1);

  useEffect(() => {
    const handleResize = () => {
      const contentWidth = 840; // Approx 210mm + margins
      const screenWidth = window.innerWidth;
      
      if (screenWidth < contentWidth) {
        setScale(screenWidth / contentWidth);
      } else {
        setScale(1);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const Header = () => (
    <header className="flex justify-between items-end border-b-4 pb-6 mb-8" style={{ borderColor: primaryColor }}>
        <div>
            <div className="flex items-center gap-2 mb-2">
                {logoUrl ? (
                        <img src={logoUrl} alt="Company Logo" className="h-12 object-contain" />
                ) : (
                        <Sun size={40} style={{ color: primaryColor }} />
                )}
                <h1 className="text-3xl font-bold" style={{ color: '#1e293b' }}>{companyName}</h1>
            </div>
            <p className="text-sm text-gray-500">Soluções em Energia Renovável</p>
        </div>
        <div className="text-right">
            <h2 className="text-xl font-semibold text-gray-700">Proposta Comercial</h2>
            {proposalType === 'complete' && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">Relatório Detalhado</span>}
            <p className="text-sm text-gray-500 mt-1">Data: {new Date().toLocaleDateString()}</p>
            <p className="text-sm text-gray-500 font-medium mt-1">Cliente: {lead.name}</p>
        </div>
    </header>
  );

  const Footer = () => (
    <footer className="mt-auto pt-8 border-t border-gray-200 text-center text-gray-500 text-sm">
            <p className="font-semibold">{companyName}</p>
            {settings?.companyCnpj && <p>CNPJ {settings.companyCnpj}</p>}
            <div className="flex justify-center gap-4 mt-2">
            <span className="flex items-center gap-1"><Phone size={14}/> {contactPhone}</span>
            <span className="flex items-center gap-1"><Mail size={14}/> {contactEmail}</span>
            </div>
            
            <div className="mt-4 flex justify-center gap-4">
                <div className="flex items-center gap-1"><Check size={16} className="text-green-500"/> Garantia de Instalação</div>
                <div className="flex items-center gap-1"><Check size={16} className="text-green-500"/> Suporte Técnico</div>
                <div className="flex items-center gap-1"><Check size={16} className="text-green-500"/> Monitoramento App</div>
            </div>
    </footer>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 print:py-0 print:bg-white">
      
      {/* Header Actions (No Print) */}
      <div className="w-full max-w-[210mm] mb-4 flex justify-between items-center px-4 no-print">
         <Link to={`/lead/${lead.id}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
             <ArrowLeft size={20} /> Voltar
         </Link>
         <div className="flex gap-3">
             <button 
                onClick={() => {
                  window.focus();
                  setTimeout(() => window.print(), 100);
                }} 
                className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded shadow hover:bg-gray-700"
            >
                 <Printer size={18} /> Imprimir / PDF
             </button>
             <a 
                href={`https://wa.me/55${lead.phone.replace(/\D/g,'')}?text=Olá ${lead.name}, segue sua proposta solar (${proposalType === 'simple' ? 'Resumo' : 'Completa'}): ${window.location.href}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600"
            >
                 <MessageCircle size={18} /> Enviar WhatsApp
             </a>
         </div>
      </div>

      {/* Scrollable Container for Pages */}
      <div className="w-full flex flex-col items-center pb-8 overflow-hidden">
        <div style={{ 
            transform: `scale(${scale})`, 
            transformOrigin: 'top center',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
        {/* PAGE 1: Overview */}
        <Page>
        <Header />

        {/* Hero Highlights */}
        <div className="grid grid-cols-4 gap-4 mb-10">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center print:border-gray-200">
                <BatteryCharging className="mx-auto mb-2" size={28} style={{ color: primaryColor }} />
                <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">Potência</div>
                <div className="text-2xl font-bold text-gray-800">{sim.systemSize} kWp</div>
            </div>
            <div className="bg-green-50 p-4 rounded-xl border border-green-100 text-center print:border-gray-200">
                <Leaf className="mx-auto text-green-600 mb-2" size={28} />
                <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">Geração Est.</div>
                <div className="text-2xl font-bold text-gray-800">{sim.estimatedGeneration} kWh</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 text-center print:border-gray-200">
                <DollarSign className="mx-auto text-yellow-600 mb-2" size={28} />
                <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">Economia/mês</div>
                <div className="text-2xl font-bold text-gray-800">{formatCurrency(sim.estimatedSavings)}</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 text-center print:border-gray-200">
                <div className="text-3xl font-bold text-purple-600 mb-0">{sim.payback}</div>
                <div className="text-sm text-gray-500 uppercase font-bold tracking-wider">Anos Payback</div>
            </div>
        </div>

        {/* Chart Section */}
        <div className="mb-10">
            <h3 className="text-lg font-bold border-l-4 pl-3 mb-4 text-gray-800" style={{ borderColor: primaryColor }}>Impacto Energético</h3>
            <div className="h-64 w-full bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 14}} />
                        <Tooltip cursor={{fill: 'transparent'}} />
                        <Bar dataKey="val" radius={[0, 10, 10, 0]} barSize={40}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? '#94a3b8' : '#22c55e'} />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
            </div>
            <p className="mt-2 text-sm text-gray-500 italic text-center">
                * Sua geração estimada cobre {Math.round((sim.estimatedGeneration / sim.avgConsumption) * 100)}% do seu consumo atual.
            </p>
        </div>

        {/* Kit Section */}
        <div className="mb-10">
            <h3 className="text-lg font-bold border-l-4 pl-3 mb-4 text-gray-800" style={{ borderColor: primaryColor }}>Seu Kit Solar</h3>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-3 font-semibold text-gray-600">Qtd</th>
                        <th className="p-3 font-semibold text-gray-600">Item</th>
                        <th className="p-3 font-semibold text-gray-600">Tipo</th>
                    </tr>
                </thead>
                <tbody>
                    {sim.kitItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100">
                            <td className="p-3 text-gray-800 font-bold">{item.quantity}x</td>
                            <td className="p-3 text-gray-700">{item.name}</td>
                            <td className="p-3 text-gray-500 text-sm">{item.type}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Financials & Closing */}
        <div className="text-white p-8 rounded-xl print:bg-white print:text-black print:border-2 print:border-black mb-10" style={{ backgroundColor: '#0f172a' }}>
            <div className="flex flex-row justify-between items-center gap-6">
                <div>
                    <h3 className="text-xl font-bold mb-2">Investimento Total</h3>
                    {sim.conditions && <p className="opacity-80 max-w-sm text-sm">{sim.conditions}</p>}
                </div>
                <div className="text-right">
                    <div className="text-4xl font-bold text-yellow-400 print:text-black">{formatCurrency(sim.totalPrice)}</div>
                    <p className="text-sm opacity-70 mt-1">Validade: {validityDays} dias</p>
                </div>
            </div>
        </div>

        {proposalType !== 'complete' && <Footer />}
      </Page>

      {/* PAGE 2: Detailed Financials (Only for Complete) */}
      {proposalType === 'complete' && sim.financialProjection && (
        <Page>
            <div className="flex-1">
                <h3 className="text-lg font-bold border-l-4 pl-3 mb-4 text-gray-800" style={{ borderColor: primaryColor }}>Análise de Fluxo de Caixa (25 Anos)</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Projeção detalhada considerando inflação energética de {settings?.energyInflation}% a.a. e degradação dos módulos.
                </p>
                <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                    <thead>
                        <tr className="bg-gray-100 text-gray-600 border-b border-gray-300">
                            <th className="p-2 text-center">Ano</th>
                            <th className="p-2">Tarifa (R$)</th>
                            <th className="p-2">Geração (kWh)</th>
                            <th className="p-2">Economia Anual</th>
                            <th className="p-2">Acumulado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sim.financialProjection.map((row, idx) => (
                            <tr key={row.year} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="p-2 text-center">{row.calendarYear}</td>
                                <td className="p-2">{row.tariff.toFixed(2)}</td>
                                <td className="p-2">{row.generation.toLocaleString()}</td>
                                <td className="p-2 font-bold text-green-600">{row.savings.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                                <td className="p-2 font-bold text-blue-600">{(row.accumulatedSavings - sim.totalPrice).toLocaleString('pt-BR', {style:'currency', currency:'BRL'})}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                </div>
                
                <div className="mt-8">
                    <h3 className="text-lg font-bold border-l-4 pl-3 mb-4 text-gray-800" style={{ borderColor: primaryColor }}>Glossário Técnico</h3>
                    <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
                        <li><strong>kWp (Quilowatt-pico):</strong> Potência máxima do sistema fotovoltaico em condições ideais de teste.</li>
                        <li><strong>kWh (Quilowatt-hora):</strong> Unidade de energia gerada ou consumida ao longo do tempo.</li>
                        <li><strong>Payback:</strong> Tempo estimado para que a economia gerada pague o investimento inicial.</li>
                        <li><strong>Fio B:</strong> Componente da tarifa de uso do sistema de distribuição cobrada sobre a energia injetada na rede (Lei 14.300).</li>
                    </ul>
                </div>
            </div>
            <Footer />
        </Page>
      )}
        </div>
      </div>
    </div>
  );
};

export default ProposalView;