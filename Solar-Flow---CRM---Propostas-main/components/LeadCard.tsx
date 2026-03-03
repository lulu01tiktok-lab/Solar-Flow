import React from 'react';
import { Lead } from '../types';
import { DollarSign, Zap, Calendar, Phone, Tag, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LeadCardProps {
  lead: Lead;
  ownerName?: string;
}

const LeadCard: React.FC<LeadCardProps> = ({ lead, ownerName }) => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'Quente': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'Morno': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Frio': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Desqualificado': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 hover:shadow-md transition-shadow cursor-pointer relative group">
        <div className="flex justify-between items-start mb-2">
            <div className="flex flex-col gap-1">
                <div className="flex flex-wrap gap-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit ${lead.clientType === 'PJ' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                        {lead.clientType || 'PF'}
                    </span>
                    {lead.tags?.map(tag => (
                        <span key={tag} className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit flex items-center gap-1 ${getTagColor(tag)}`}>
                            <Tag size={8} />
                            {tag}
                        </span>
                    ))}
                    {ownerName && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded w-fit bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            {ownerName}
                        </span>
                    )}
                </div>
                <h4 className="font-semibold text-gray-800 dark:text-slate-100 leading-tight">{lead.name}</h4>
            </div>
            <span className="text-xs text-gray-400 dark:text-slate-500">{new Date(lead.updatedAt).toLocaleDateString()}</span>
        </div>
        
        <div className="space-y-2 text-sm text-gray-600 dark:text-slate-400">
            <div className="flex items-center gap-2">
                <Phone size={14} />
                <span>{lead.phone}</span>
            </div>
            
            {lead.simulation && (
                <>
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                        <Zap size={14} />
                        <span>{lead.simulation.systemSize} kWp</span>
                    </div>
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                        <DollarSign size={14} />
                        <span>{formatCurrency(lead.simulation.totalPrice)}</span>
                    </div>
                </>
            )}

            {lead.notes && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-slate-700">
                    <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-slate-400 italic">
                        <FileText size={12} className="mt-0.5 shrink-0" />
                        <p className="line-clamp-2">{lead.notes}</p>
                    </div>
                </div>
            )}
        </div>

        <div className="mt-3 flex gap-2">
            <Link 
                to={`/lead/${lead.id}`}
                className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-center py-1.5 rounded text-xs font-medium transition-colors"
            >
                Abrir
            </Link>
            {lead.simulation && (
                 <Link 
                 to={`/lead/${lead.id}?tab=PROPOSAL`}
                 className="flex-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-center py-1.5 rounded text-xs font-medium transition-colors"
             >
                 Proposta
             </Link>
            )}
        </div>
    </div>
  );
};

export default LeadCard;