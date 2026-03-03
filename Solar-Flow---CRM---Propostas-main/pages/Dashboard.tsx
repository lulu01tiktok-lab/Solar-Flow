import React, { useState, useMemo } from 'react';
import { Lead, KanbanColumn, LeadStatus, User } from '../types';
import { 
  DollarSign, Users, Clock, TrendingUp, Calendar, 
  ArrowRight, Plus, Filter, MessageCircle, AlertCircle, 
  FileText, KanbanSquare, Settings, CheckCircle2 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface DashboardProps {
  leads: Lead[];
  columns: KanbanColumn[];
  currentUser: User;
}

type TimeRange = '7D' | '30D' | 'ALL';

const Dashboard: React.FC<DashboardProps> = ({ leads, columns, currentUser }) => {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');

  // --- Helpers ---
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  // --- Filter Logic ---
  const filteredLeads = useMemo(() => {
    if (timeRange === 'ALL') return leads;
    
    const now = new Date();
    const days = timeRange === '7D' ? 7 : 30;
    const cutoff = new Date(now.setDate(now.getDate() - days));
    
    return leads.filter(l => new Date(l.updatedAt) >= cutoff);
  }, [leads, timeRange]);

  // --- KPI Calculations ---
  
  // 1. Propostas Geradas (Leads com simulação e status > SIZING)
  const proposalsGenerated = filteredLeads.filter(l => 
    l.simulation && l.simulation.totalPrice > 0 && l.status !== LeadStatus.NEW && l.status !== LeadStatus.QUALIFICATION
  ).length;

  // 2. Pipeline (Valor em Negociação - Exclui ganhos e perdidos)
  const activeLeads = leads.filter(l => 
    l.status !== LeadStatus.CLOSED_WON && l.status !== LeadStatus.CLOSED_LOST && l.status !== LeadStatus.NEW
  );
  const pipelineValue = activeLeads.reduce((acc, lead) => acc + (lead.simulation?.totalPrice || 0), 0);

  // 3. Conversão (Ganhos / Propostas Geradas) no período
  const wonInPeriod = filteredLeads.filter(l => l.status === LeadStatus.CLOSED_WON);
  const conversionRate = proposalsGenerated > 0 ? (wonInPeriod.length / proposalsGenerated) * 100 : 0;

  // 4. Vendas (Ganho)
  const wonValue = wonInPeriod.reduce((acc, lead) => acc + (lead.simulation?.totalPrice || 0), 0);

  // 5. Ciclo Médio (Apenas para ganhos)
  const avgCycleTime = useMemo(() => {
    if (wonInPeriod.length === 0) return 0;
    const totalDays = wonInPeriod.reduce((acc, lead) => {
      const start = new Date(lead.createdAt).getTime();
      const end = new Date(lead.updatedAt).getTime();
      return acc + (end - start);
    }, 0);
    return Math.round((totalDays / wonInPeriod.length) / (1000 * 3600 * 24));
  }, [wonInPeriod]);


  // --- Pipeline Summary ---
  const pipelineCounts = columns.map(col => ({
    ...col,
    count: leads.filter(l => l.status === col.id).length
  }));

  // --- Recent Activity ---
  const recentActivity = [...leads]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      
      {/* 1. Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Visão geral do seu negócio.</p>
        </div>
        
        <div className="flex items-center bg-white dark:bg-slate-800 rounded-lg p-1 border border-gray-200 dark:border-slate-700 shadow-sm w-fit">
           <button 
              onClick={() => setTimeRange('7D')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${timeRange === '7D' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
           >
             7 dias
           </button>
           <button 
              onClick={() => setTimeRange('30D')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${timeRange === '30D' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
           >
             30 dias
           </button>
           <button 
              onClick={() => setTimeRange('ALL')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${timeRange === 'ALL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
           >
             Tudo
           </button>
        </div>
      </div>

      {/* 2. KPIs (Scrollable on Mobile) */}
      <div className="flex overflow-x-auto gap-4 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-5 md:overflow-visible scrollbar-hide snap-x">
        
        {/* Card 1: Propostas */}
        <div className="min-w-[240px] bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm snap-start">
           <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <FileText size={20} />
              </div>
              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                 Ref. Período
              </span>
           </div>
           <div className="text-2xl font-bold text-gray-800 dark:text-white">{proposalsGenerated}</div>
           <div className="text-sm text-gray-500 dark:text-slate-400">Propostas Geradas</div>
        </div>

        {/* Card 2: Pipeline (Money) */}
        <div className="min-w-[240px] bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm snap-start">
           <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                <DollarSign size={20} />
              </div>
           </div>
           <div className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(pipelineValue)}</div>
           <div className="text-sm text-gray-500 dark:text-slate-400">Em Negociação (Total)</div>
        </div>

        {/* Card 3: Vendas (Ganho) */}
        <div className="min-w-[240px] bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm snap-start">
           <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                <CheckCircle2 size={20} />
              </div>
           </div>
           <div className="text-2xl font-bold text-gray-800 dark:text-white">{formatCurrency(wonValue)}</div>
           <div className="text-sm text-gray-500 dark:text-slate-400">{wonInPeriod.length} Vendas Fechadas</div>
        </div>

        {/* Card 4: Conversão */}
        <div className="min-w-[240px] bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm snap-start">
           <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
                <TrendingUp size={20} />
              </div>
           </div>
           <div className="text-2xl font-bold text-gray-800 dark:text-white">{conversionRate.toFixed(1)}%</div>
           <div className="text-sm text-gray-500 dark:text-slate-400">Taxa de Conversão</div>
        </div>

        {/* Card 4: Ciclo */}
        <div className="min-w-[240px] bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm snap-start">
           <div className="flex justify-between items-start mb-2">
              <div className="p-2 bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-lg">
                <Clock size={20} />
              </div>
           </div>
           <div className="text-2xl font-bold text-gray-800 dark:text-white">{avgCycleTime} dias</div>
           <div className="text-sm text-gray-500 dark:text-slate-400">Ciclo Médio de Venda</div>
        </div>
      </div>

      {/* 3. Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
         <Link to="/lead/new" className="hidden md:flex flex-col items-center justify-center p-6 bg-blue-600 text-white rounded-xl shadow-sm hover:bg-blue-700 transition-colors group">
            <div className="p-3 bg-white/20 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <Plus size={28} />
            </div>
            <span className="text-lg font-bold">Novo Lead</span>
            <span className="text-blue-100 text-sm mt-1">Iniciar nova simulação</span>
         </Link>
         <Link to="/kanban" className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition-all group">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-3 group-hover:scale-110 transition-transform">
                <KanbanSquare size={28} />
            </div>
            <span className="text-lg font-bold">CRM Kanban</span>
            <span className="text-gray-500 dark:text-slate-400 text-sm mt-1">Gerenciar negociações</span>
         </Link>
         {currentUser.role === 'ADMIN' && (
             <Link to="/settings" className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 rounded-xl shadow-sm hover:border-gray-400 dark:hover:border-slate-500 transition-all group">
                <div className="p-3 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full mb-3 group-hover:scale-110 transition-transform">
                    <Settings size={28} />
                </div>
                <span className="text-lg font-bold">Ajustes</span>
                <span className="text-gray-500 dark:text-slate-400 text-sm mt-1">Configurar sistema</span>
             </Link>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Pipeline Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
           <div className="flex justify-between items-center mb-6">
              <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Funil de Vendas</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Visão geral das etapas</p>
              </div>
              <Link to="/kanban" className="text-sm text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1">
                  Ver Quadro <ArrowRight size={16} />
              </Link>
           </div>
           <div className="space-y-4">
              {pipelineCounts.map(col => (
                 <div key={col.id} className="group flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors cursor-pointer" onClick={() => navigate('/kanban')}>
                    <div className={`w-3 h-3 rounded-full ${col.color.split(' ')[0]} ring-4 ring-opacity-20 ${col.color.split(' ')[0].replace('bg-', 'ring-')}`}></div>
                    <div className="flex-1 font-medium text-gray-700 dark:text-slate-200">{col.title}</div>
                    <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500 dark:text-slate-400">
                            {formatCurrency(leads.filter(l => l.status === col.id).reduce((acc, l) => acc + (l.simulation?.totalPrice || 0), 0))}
                        </div>
                        <div className="text-sm font-bold text-gray-800 dark:text-white bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full min-w-[32px] text-center">
                           {col.count}
                        </div>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
           <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1">Últimas Atividades</h3>
           <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Histórico recente de atualizações</p>
           
           <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {recentActivity.map(lead => (
                 <div key={lead.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full border border-white dark:border-slate-800 bg-slate-300 group-[.is-active]:bg-blue-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <div className={`w-2 h-2 rounded-full ${
                            lead.status === LeadStatus.CLOSED_WON ? 'bg-green-300' : 
                            lead.status === LeadStatus.NEW ? 'bg-white' : 'bg-gray-200'
                        }`}></div>
                    </div>
                    
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                       <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-gray-800 dark:text-slate-200">{lead.name}</div>
                          <time className="font-caveat font-medium text-xs text-indigo-500">{new Date(lead.updatedAt).toLocaleDateString()}</time>
                       </div>
                       <div className="text-gray-500 dark:text-slate-400 text-sm">
                          Status atualizado para <span className="font-medium text-gray-700 dark:text-slate-300">
                             {columns.find(c => c.id === lead.status)?.title || lead.status}
                          </span>
                       </div>
                    </div>
                 </div>
              ))}
              {recentActivity.length === 0 && <p className="text-center text-gray-400 dark:text-slate-500 italic py-8">Nenhuma atividade recente.</p>}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;