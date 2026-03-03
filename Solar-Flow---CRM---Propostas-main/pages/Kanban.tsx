import React, { useState } from 'react';
import { Lead, KanbanColumn, User } from '../types';
import LeadCard from '../components/LeadCard';
import { Plus, X, Save, Edit2, Tag, FileText, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KanbanProps {
  leads: Lead[];
  updateLeadStatus: (leadId: string, newStatus: string) => void;
  saveLead: (lead: Lead) => void;
  columns: KanbanColumn[];
  currentUser: User;
  users: User[];
}

const Kanban: React.FC<KanbanProps> = ({ leads, updateLeadStatus, saveLead, columns, currentUser, users }) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [targetColumn, setTargetColumn] = useState<string | null>(null);
  
  // Edit Modal State
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [tempTags, setTempTags] = useState<string[]>([]);
  const [tempNotes, setTempNotes] = useState<string>('');
  const [tempUserId, setTempUserId] = useState<string>('');
  
  // Filter State (Admin Only)
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');

  const openEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setTempTags(lead.tags || []);
    setTempNotes(lead.notes || '');
    setTempUserId(lead.userId || currentUser.id);
  };

  const closeEditModal = () => {
    setEditingLead(null);
    setTempTags([]);
    setTempNotes('');
    setTempUserId('');
  };

  const handleSaveEdit = () => {
    if (editingLead) {
      saveLead({
        ...editingLead,
        tags: tempTags,
        notes: tempNotes,
        userId: tempUserId,
        updatedAt: new Date().toISOString()
      });
      closeEditModal();
    }
  };

  const toggleTag = (tag: string) => {
    if (tempTags.includes(tag)) {
      setTempTags(prev => prev.filter(t => t !== tag));
    } else {
      setTempTags(prev => [...prev, tag]);
    }
  };

  const availableTags = ['Quente', 'Morno', 'Frio', 'Desqualificado'];

  const getTagColor = (tag: string) => {
    switch (tag) {
      case 'Quente': return 'bg-red-100 text-red-700 border-red-200';
      case 'Morno': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Frio': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Desqualificado': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };
  
  // Filter leads based on selected user (if admin)
  const filteredLeads = currentUser.role === 'ADMIN' && selectedUserFilter !== 'ALL'
    ? leads.filter(lead => lead.userId === selectedUserFilter)
    : leads;

  // Group leads by status
  const leadsByStatus = columns.reduce((acc, col) => {
    acc[col.id] = filteredLeads.filter(l => l.status === col.id);
    return acc;
  }, {} as Record<string, Lead[]>);

  // Helper to format currency
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL',
        maximumFractionDigits: 0 
    }).format(val);

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedLeadId(id);
    // Set effect allowed to move
    e.dataTransfer.effectAllowed = "move";
    // For older browsers/compatibility
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault(); // Necessary to allow dropping
    if (targetColumn !== status) {
        setTargetColumn(status);
    }
  };

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setTargetColumn(null);
    
    if (draggedLeadId) {
      updateLeadStatus(draggedLeadId, status);
      setDraggedLeadId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">CRM Kanban</h1>
          <p className="text-gray-500 dark:text-slate-400">Gerencie o fluxo dos seus leads e oportunidades</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {currentUser.role === 'ADMIN' && (
                <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg p-2">
                    <UserIcon size={16} className="text-gray-500 dark:text-slate-400 shrink-0" />
                    <select
                        value={selectedUserFilter}
                        onChange={(e) => setSelectedUserFilter(e.target.value)}
                        className="text-sm bg-transparent text-gray-700 dark:text-slate-200 outline-none w-full"
                    >
                        <option value="ALL">Todos os Vendedores</option>
                        {users.map(user => (
                            <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                    </select>
                </div>
            )}
            <Link 
              to="/lead/new" 
              className="hidden md:flex bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg items-center justify-center gap-2 shadow-sm transition-colors"
            >
              <Plus size={20} />
              <span>Novo Lead</span>
            </Link>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex overflow-x-auto pb-4 gap-4 flex-1 items-start snap-x snap-mandatory px-4 md:px-0">
        {columns.map((col) => {
          const columnLeads = leadsByStatus[col.id] || [];
          const columnTotalValue = columnLeads.reduce((sum, lead) => sum + (lead.simulation?.totalPrice || 0), 0);

          return (
            <div 
              key={col.id} 
              className="min-w-[280px] w-[300px] flex flex-col h-full max-h-full rounded-lg snap-center shrink-0"
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className={`p-3 rounded-t-lg border-b-2 flex justify-between items-start ${col.color.replace('bg-', 'bg-opacity-50 dark:bg-opacity-20 ')} bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 shrink-0`}>
                <div className="flex flex-col">
                    <h3 className="font-semibold text-gray-700 dark:text-slate-200 leading-tight">{col.title}</h3>
                    {columnTotalValue > 0 && (
                        <span className="text-[10px] text-gray-500 dark:text-slate-400 font-medium mt-1">
                            {formatCurrency(columnTotalValue)}
                        </span>
                    )}
                </div>
                <span className="bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-bold">
                  {columnLeads.length}
                </span>
              </div>

              {/* Column Body - Drop Zone */}
              <div 
                  className={`flex-1 p-2 rounded-b-lg overflow-y-auto space-y-3 transition-colors duration-200 border-x border-b border-gray-200 dark:border-slate-700 ${
                      targetColumn === col.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500' : 'bg-gray-100 dark:bg-slate-900'
                  }`}
              >
                {columnLeads.map((lead) => (
                  <div 
                      key={lead.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, lead.id)}
                      className={`transition-opacity duration-200 relative group ${draggedLeadId === lead.id ? 'opacity-40' : 'opacity-100'}`}
                  >
                      <LeadCard 
                        lead={lead} 
                        ownerName={users?.find(u => u.id === lead.userId)?.name} 
                      />
                      
                      {/* Edit Button - Visible on hover */}
                      <button 
                        onClick={() => openEditModal(lead)}
                        className="absolute top-2 right-2 p-1.5 bg-white dark:bg-slate-700 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 z-10"
                        title="Editar Etiquetas e Notas"
                      >
                        <Edit2 size={14} />
                      </button>
                      
                      {/* Mobile Fallback */}
                      <div className="md:hidden mt-1">
                          <select 
                              className="w-full text-xs p-1 border rounded bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600"
                              value={lead.status}
                              onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                          >
                              <option value={lead.status}>Mover para...</option>
                              {columns.filter(c => c.id !== lead.status).map(c => (
                                  <option key={c.id} value={c.id}>{c.title}</option>
                              ))}
                          </select>
                      </div>
                  </div>
                ))}
                
                {columnLeads.length === 0 && (
                  <div className={`text-center py-8 text-sm italic border-2 border-dashed rounded m-2 ${targetColumn === col.id ? 'border-blue-300 text-blue-500 bg-white dark:bg-slate-800 dark:text-blue-400' : 'border-gray-300 dark:border-slate-700 text-gray-400 dark:text-slate-600'}`}>
                    {targetColumn === col.id ? 'Soltar aqui' : 'Vazio'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                <Edit2 size={18} className="text-blue-600" />
                Editar Lead
              </h3>
              <button onClick={closeEditModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Lead Owner Assignment (Admin Only) */}
              {currentUser.role === 'ADMIN' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                      <UserIcon size={16} />
                      Responsável pelo Lead
                    </label>
                    <select
                        value={tempUserId}
                        onChange={(e) => setTempUserId(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                        {users.map(user => (
                            <option key={user.id} value={user.id}>
                                {user.name} ({user.role === 'ADMIN' ? 'Admin' : 'Vendedor'})
                            </option>
                        ))}
                    </select>
                  </div>
              )}

              {/* Tags Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <Tag size={16} />
                  Etiquetas (Status do Lead)
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                        tempTags.includes(tag)
                          ? getTagColor(tag) + ' ring-2 ring-offset-1 ring-blue-400 dark:ring-offset-slate-800'
                          : 'bg-white dark:bg-slate-700 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                  <FileText size={16} />
                  Observações e Tarefas
                </label>
                <textarea
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  className="w-full h-32 p-3 text-sm border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-200 resize-none"
                  placeholder="Descreva o andamento da negociação, agendamentos ou tarefas..."
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
              >
                <Save size={16} />
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Kanban;