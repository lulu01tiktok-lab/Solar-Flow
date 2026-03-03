
import React, { useState, useRef, useEffect } from 'react';
import { AppSettings, KanbanColumn, Lead } from '../types';
import { Save, Upload, Building, Palette, Zap, ExternalLink, Calculator, MapPin, Globe, Instagram, AlertCircle, Compass, SunDim, FileText, Calendar, Trello, Plus, Trash2, Edit2, GripVertical, ChevronUp, ChevronDown, AlertTriangle, X, CheckCircle } from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  columns?: KanbanColumn[];
  onUpdateColumns?: (cols: KanbanColumn[]) => void;
  leads?: Lead[];
}

// CNPJ Validation Helper
const validateCNPJ = (cnpj: string): boolean => {
  cnpj = cnpj.replace(/[^\d]+/g, '');

  if (cnpj == '') return false;
  if (cnpj.length != 14) return false;

  // Eliminate known invalid CNPJs
  if (
    cnpj == "00000000000000" ||
    cnpj == "11111111111111" ||
    cnpj == "22222222222222" ||
    cnpj == "33333333333333" ||
    cnpj == "44444444444444" ||
    cnpj == "55555555555555" ||
    cnpj == "66666666666666" ||
    cnpj == "77777777777777" ||
    cnpj == "88888888888888" ||
    cnpj == "99999999999999"
  )
    return false;

  // Validate DVs
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  let digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result != parseInt(digits.charAt(0))) return false;

  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result != parseInt(digits.charAt(1))) return false;

  return true;
};

// Simplified Color Options for Kanban
const COLUMN_COLORS = [
    { name: 'Azul', value: 'bg-blue-100 border-blue-300' },
    { name: 'Indigo', value: 'bg-indigo-100 border-indigo-300' },
    { name: 'Verde', value: 'bg-green-100 border-green-300' },
    { name: 'Amarelo', value: 'bg-yellow-100 border-yellow-300' },
    { name: 'Laranja', value: 'bg-orange-100 border-orange-300' },
    { name: 'Vermelho', value: 'bg-red-100 border-red-300' },
    { name: 'Roxo', value: 'bg-purple-100 border-purple-300' },
    { name: 'Cinza', value: 'bg-gray-100 border-gray-300' },
    { name: 'Rosa', value: 'bg-pink-100 border-pink-300' },
];

const Settings: React.FC<SettingsProps> = ({ settings, onSave, columns, onUpdateColumns, leads }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [cnpjError, setCnpjError] = useState<boolean>(false);
  
  // Local state for efficiency inputs to allow "0," and "0." typing
  const [effDisplay, setEffDisplay] = useState({
      north: '',
      eastWest: '',
      south: ''
  });

  // Kanban Editing State
  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [colForm, setColForm] = useState<{title: string, color: string}>({ title: '', color: COLUMN_COLORS[0].value });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Drag and Drop State
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ensure default values exist if migrating from old version & Sync Display State
  useEffect(() => {
    setFormData(prev => {
        const updated = {
            ...prev,
            te: prev.te ?? 0.45,
            tusd: prev.tusd ?? 0.50,
            tusdAneel: prev.tusdAneel ?? 0.28,
            icmsOnTusd: prev.icmsOnTusd ?? true,
            icmsTaxPercentage: prev.icmsTaxPercentage ?? 18,
            fioBPercentage: prev.fioBPercentage ?? 29.47,
            defaultTariff: prev.defaultTariff ?? 0.95,
            effNorth: prev.effNorth ?? 1.0,
            effEastWest: prev.effEastWest ?? 0.85,
            effSouth: prev.effSouth ?? 0.75,
            defaultSelfConsumption: prev.defaultSelfConsumption ?? 30,
            proposalValidityDays: prev.proposalValidityDays ?? 5,
            energyInflation: prev.energyInflation ?? 6.0,
        };
        
        // Initialize display strings with commas for BR experience
        setEffDisplay({
            north: String(updated.effNorth).replace('.', ','),
            eastWest: String(updated.effEastWest).replace('.', ','),
            south: String(updated.effSouth).replace('.', ',')
        });

        return updated;
    });
  }, []);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      handleChange('companyCnpj', val);
      
      const numeric = val.replace(/[^\d]+/g, '');
      if (numeric.length === 14) {
          setCnpjError(!validateCNPJ(numeric));
      } else if (numeric.length > 0 && numeric.length < 14) {
          setCnpjError(false); 
      } else {
          setCnpjError(false);
      }
  };

  const handleCnpjBlur = () => {
      if (formData.companyCnpj) {
          const valid = validateCNPJ(formData.companyCnpj);
          setCnpjError(!valid);
      }
  };

  const handleEnergyChange = (field: 'te' | 'tusd' | 'tusdAneel', value: number) => {
    setFormData(prev => {
        const newData = { ...prev, [field]: value };
        
        const te = field === 'te' ? value : (prev.te || 0);
        const tusd = field === 'tusd' ? value : (prev.tusd || 0);
        const tusdAneel = field === 'tusdAneel' ? value : (prev.tusdAneel || 0);

        const totalTariff = te + tusd;
        let percentage = 0;
        
        if (totalTariff > 0) {
            percentage = (tusdAneel / totalTariff) * 100;
        }

        return {
            ...newData,
            defaultTariff: parseFloat(totalTariff.toFixed(2)),
            fioBPercentage: parseFloat(percentage.toFixed(2))
        };
    });
  };

  // Handler for Efficiency Inputs (String -> Float)
  const handleEffChange = (field: 'north' | 'eastWest' | 'south', value: string) => {
      // Allow only numbers, comma and dot
      if (!/^[\d.,]*$/.test(value)) return;

      setEffDisplay(prev => ({ ...prev, [field]: value }));

      // Parse for formData
      const normalized = value.replace(',', '.');
      const num = parseFloat(normalized);

      if (!isNaN(num)) {
          const map = { north: 'effNorth', eastWest: 'effEastWest', south: 'effSouth' };
          handleChange(map[field] as keyof AppSettings, num);
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { 
        alert('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        handleChange('logoUrl', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Kanban Column Management ---

  const handleAddColumn = () => {
      setEditingColId('NEW');
      setColForm({ title: '', color: COLUMN_COLORS[0].value });
  };

  const handleEditColumn = (col: KanbanColumn) => {
      setEditingColId(col.id);
      setColForm({ title: col.title, color: col.color });
  };

  const handleSaveColumn = () => {
      if (!onUpdateColumns || !columns) return;
      if (!colForm.title.trim()) {
          alert("O título da coluna é obrigatório.");
          return;
      }

      let newCols = [...columns];
      if (editingColId === 'NEW') {
          const newId = `COL_${Date.now()}`;
          newCols.push({ id: newId, ...colForm });
      } else {
          newCols = newCols.map(c => c.id === editingColId ? { ...c, ...colForm } : c);
      }

      onUpdateColumns(newCols);
      setEditingColId(null);
  };

  const handleDeleteRequest = (colId: string) => {
      // Check if leads exist in this column
      const hasLeads = leads && leads.some(l => l.status === colId);
      if (hasLeads) {
          alert("Não é possível excluir esta etapa pois existem leads nela. Mova os leads para outra etapa antes de excluir.");
          return;
      }
      
      // Open Confirmation Modal
      setShowDeleteModal(true);
  };

  const confirmDelete = () => {
      if (!onUpdateColumns || !columns || !editingColId) return;

      const updatedCols = columns.filter(c => c.id !== editingColId);
      onUpdateColumns(updatedCols);
      
      setShowDeleteModal(false);
      setEditingColId(null); // Close the edit form after deletion
  };

  const moveColumn = (index: number, direction: 'UP' | 'DOWN') => {
      if (!columns || !onUpdateColumns) return;
      
      const newCols = [...columns];
      if (direction === 'UP' && index > 0) {
          [newCols[index], newCols[index - 1]] = [newCols[index - 1], newCols[index]];
      } else if (direction === 'DOWN' && index < newCols.length - 1) {
          [newCols[index], newCols[index + 1]] = [newCols[index + 1], newCols[index]];
      }
      onUpdateColumns(newCols);
  };

  // --- Drag and Drop Handlers for Columns ---
  
  const onDragStart = (e: React.DragEvent, index: number) => {
      // Check if the user grabbed the HANDLE
      const target = e.target as HTMLElement;
      // If we are NOT clicking inside the drag handle, prevent drag
      if (!target.closest('.drag-handle')) {
          e.preventDefault();
          return;
      }

      setDraggedColIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", index.toString());
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
      e.preventDefault(); // Essential to allow dropping
      if (draggedColIndex === null) return;
  };

  const onDrop = (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      if (draggedColIndex === null || !columns || !onUpdateColumns) return;

      if (draggedColIndex !== dropIndex) {
          const newCols = [...columns];
          const [movedItem] = newCols.splice(draggedColIndex, 1);
          newCols.splice(dropIndex, 0, movedItem);
          onUpdateColumns(newCols);
      }
      setDraggedColIndex(null);
  };

  const handleSave = () => {
    if (formData.companyCnpj && !validateCNPJ(formData.companyCnpj)) {
        alert('Por favor, corrija o CNPJ inválido antes de salvar.');
        setCnpjError(true);
        return;
    }
    onSave(formData);
    alert('Configurações salvas com sucesso!');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Configurações da Empresa</h1>
        <p className="text-gray-500 dark:text-slate-400">Personalize seus dados e parâmetros do sistema.</p>
      </div>

      {/* Dados da Empresa */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <Building size={20} className="text-gray-500 dark:text-slate-400" />
            <h2 className="font-semibold text-gray-700 dark:text-slate-200">Dados da Empresa</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome da Empresa / Razão Social</label>
                <input 
                    type="text" 
                    className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">CNPJ</label>
                <div className="relative">
                    <input 
                        type="text" 
                        className={`w-full rounded p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 ${cnpjError ? 'border-red-500 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 dark:border-slate-600'}`}
                        value={formData.companyCnpj || ''}
                        onChange={handleCnpjChange}
                        onBlur={handleCnpjBlur}
                        placeholder="00.000.000/0000-00"
                    />
                    {cnpjError && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-red-500">
                            <AlertCircle size={16} />
                        </div>
                    )}
                </div>
                {cnpjError && <p className="text-xs text-red-500 mt-1">CNPJ inválido</p>}
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                <input 
                    type="text" 
                    className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.contactPhone}
                    onChange={(e) => handleChange('contactPhone', e.target.value)}
                />
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email de Contato</label>
                <input 
                    type="email" 
                    className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.contactEmail}
                    onChange={(e) => handleChange('contactEmail', e.target.value)}
                />
            </div>

            <div className="flex gap-2">
                 <div className="w-10 flex items-center justify-center text-gray-400 dark:text-slate-500">
                     <Globe size={20} />
                 </div>
                 <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Site</label>
                    <input 
                        type="text" 
                        placeholder="www.seusite.com.br"
                        className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        value={formData.website || ''}
                        onChange={(e) => handleChange('website', e.target.value)}
                    />
                 </div>
            </div>

            <div className="flex gap-2">
                 <div className="w-10 flex items-center justify-center text-gray-400 dark:text-slate-500">
                     <Instagram size={20} />
                 </div>
                 <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Instagram</label>
                    <input 
                        type="text" 
                        placeholder="@seuusuario"
                        className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        value={formData.socialInstagram || ''}
                        onChange={(e) => handleChange('socialInstagram', e.target.value)}
                    />
                 </div>
            </div>
        </div>
      </div>

      {/* Endereço */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <MapPin size={20} className="text-gray-500 dark:text-slate-400" />
            <h2 className="font-semibold text-gray-700 dark:text-slate-200">Endereço Comercial</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-6 gap-6">
            <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">CEP</label>
                 <input 
                    type="text" 
                    className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.addressZip || ''}
                    onChange={(e) => handleChange('addressZip', e.target.value)}
                    placeholder="00000-000"
                />
            </div>
            <div className="md:col-span-3">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Rua / Avenida</label>
                 <input 
                    type="text" 
                    className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.addressStreet || ''}
                    onChange={(e) => handleChange('addressStreet', e.target.value)}
                />
            </div>
            <div className="md:col-span-1">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Número</label>
                 <input 
                    type="text" 
                    className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.addressNumber || ''}
                    onChange={(e) => handleChange('addressNumber', e.target.value)}
                />
            </div>
            
            <div className="md:col-span-3">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Cidade</label>
                 <input 
                    type="text" 
                    className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.addressCity || ''}
                    onChange={(e) => handleChange('addressCity', e.target.value)}
                />
            </div>
             <div className="md:col-span-3">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Estado (UF)</label>
                 <input 
                    type="text" 
                    className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.addressState || ''}
                    onChange={(e) => handleChange('addressState', e.target.value)}
                    maxLength={2}
                />
            </div>
        </div>
      </div>

      {/* Gerenciamento de Pipeline / Kanban */}
      {columns && onUpdateColumns && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                      <Trello size={20} className="text-gray-500 dark:text-slate-400" />
                      <h2 className="font-semibold text-gray-700 dark:text-slate-200">Etapas do Funil (Pipeline)</h2>
                  </div>
                  {!editingColId && (
                      <button 
                          onClick={handleAddColumn}
                          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                          <Plus size={16} /> Nova Etapa
                      </button>
                  )}
              </div>
              <div className="p-6">
                  {editingColId ? (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded border border-blue-200 dark:border-blue-800 animate-in fade-in">
                          <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-3 text-sm uppercase">
                              {editingColId === 'NEW' ? 'Nova Etapa' : 'Editar Etapa'}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Título</label>
                                  <input 
                                      type="text"
                                      className="w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                      value={colForm.title}
                                      onChange={(e) => setColForm({...colForm, title: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Cor do Card</label>
                                  <select
                                      className="w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                      value={colForm.color}
                                      onChange={(e) => setColForm({...colForm, color: e.target.value})}
                                  >
                                      {COLUMN_COLORS.map(c => (
                                          <option key={c.value} value={c.value}>{c.name}</option>
                                      ))}
                                  </select>
                              </div>
                          </div>
                          <div className="mt-2 text-xs flex gap-2 items-center">
                              <span className="font-medium text-gray-500 dark:text-slate-400">Preview:</span>
                              <div className={`px-4 py-2 rounded text-gray-700 dark:text-slate-200 font-bold ${colForm.color.replace('bg-', 'bg-opacity-80 dark:bg-opacity-20 ')} border`}>
                                  {colForm.title || 'Título da Etapa'}
                              </div>
                          </div>
                          <div className="flex gap-2 justify-between mt-4">
                               {editingColId !== 'NEW' && (
                                    <button 
                                        onClick={() => handleDeleteRequest(editingColId)}
                                        className="px-3 py-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-sm flex items-center gap-1"
                                    >
                                        <Trash2 size={16} /> Excluir Etapa
                                    </button>
                               )}
                               
                               <div className="flex gap-2 ml-auto">
                                   <button 
                                       onClick={() => setEditingColId(null)}
                                       className="px-3 py-1.5 text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-600 text-sm"
                                   >
                                       Cancelar
                                   </button>
                                   <button 
                                       onClick={handleSaveColumn}
                                       className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm flex items-center gap-1"
                                   >
                                       <Save size={16} /> Salvar Etapa
                                   </button>
                               </div>
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-2">
                          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3 italic">
                              Arraste pela alça <GripVertical size={12} className="inline"/> ou use as setas para reordenar.
                          </p>
                          {columns.map((col, idx) => (
                              <div 
                                key={col.id} 
                                draggable
                                onDragStart={(e) => onDragStart(e, idx)}
                                onDragOver={(e) => onDragOver(e, idx)}
                                onDrop={(e) => onDrop(e, idx)}
                                className={`flex items-center justify-between p-3 border rounded bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-750 group transition-all duration-200 cursor-default ${draggedColIndex === idx ? 'opacity-50 border-blue-400 bg-blue-50' : 'border-gray-200 dark:border-slate-700'}`}
                              >
                                  <div className="flex items-center gap-3">
                                      <div 
                                        className="drag-handle cursor-grab text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 active:cursor-grabbing p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                                      >
                                         <GripVertical size={18} className="pointer-events-none" />
                                      </div>
                                      <span className="text-gray-400 dark:text-slate-500 font-mono text-xs w-6">{idx + 1}.</span>
                                      <div className={`w-4 h-4 rounded-full ${col.color.split(' ')[0]}`}></div>
                                      <span className="font-medium text-gray-700 dark:text-slate-200">{col.title}</span>
                                      <span className="text-xs text-gray-400 dark:text-slate-500">({leads?.filter(l => l.status === col.id).length || 0} leads)</span>
                                  </div>
                                  
                                  <div className="flex items-center gap-1">
                                      <div className="flex flex-col mr-2">
                                          <button 
                                             type="button"
                                             onMouseDown={(e) => e.stopPropagation()}
                                             onClick={() => moveColumn(idx, 'UP')}
                                             disabled={idx === 0}
                                             className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 disabled:cursor-not-allowed"
                                             title="Mover para cima"
                                          >
                                              <ChevronUp size={14} className="pointer-events-none" />
                                          </button>
                                          <button 
                                             type="button"
                                             onMouseDown={(e) => e.stopPropagation()}
                                             onClick={() => moveColumn(idx, 'DOWN')}
                                             disabled={idx === columns.length - 1}
                                             className="text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-20 disabled:cursor-not-allowed"
                                             title="Mover para baixo"
                                          >
                                              <ChevronDown size={14} className="pointer-events-none" />
                                          </button>
                                      </div>

                                      <button 
                                          type="button"
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onClick={() => handleEditColumn(col)}
                                          className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded cursor-pointer"
                                          title="Editar"
                                      >
                                          <Edit2 size={16} className="pointer-events-none" />
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* Identidade Visual */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
         <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <Palette size={20} className="text-gray-500 dark:text-slate-400" />
            <h2 className="font-semibold text-gray-700 dark:text-slate-200">Identidade Visual</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Logo da Empresa</label>
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 border border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-slate-700 overflow-hidden">
                        {formData.logoUrl ? (
                            <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                        ) : (
                            <span className="text-xs text-gray-400 dark:text-slate-400">Sem Logo</span>
                        )}
                    </div>
                    <div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleLogoUpload}
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded text-sm hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200"
                        >
                            <Upload size={16} /> Carregar Imagem
                        </button>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Recomendado: PNG Transparente.</p>
                    </div>
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Cor Primária (Hex)</label>
                <div className="flex items-center gap-2 mb-3">
                    <input 
                        type="color" 
                        className="h-10 w-10 border p-0 rounded cursor-pointer bg-white"
                        value={formData.primaryColor}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                    />
                    <input 
                        type="text" 
                        className="w-32 rounded border-gray-300 dark:border-slate-600 p-2 border uppercase bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                        value={formData.primaryColor}
                        onChange={(e) => handleChange('primaryColor', e.target.value)}
                    />
                </div>
                
                <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Paletas Sugeridas:</label>
                <div className="flex gap-2 flex-wrap">
                    {[
                        { color: '#1e3a8a', name: 'Azul' },
                        { color: '#15803d', name: 'Verde' },
                        { color: '#b91c1c', name: 'Vermelho' },
                        { color: '#c2410c', name: 'Laranja' },
                        { color: '#7e22ce', name: 'Roxo' },
                        { color: '#111827', name: 'Preto' },
                    ].map((preset) => (
                        <button
                            key={preset.color}
                            onClick={() => handleChange('primaryColor', preset.color)}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${formData.primaryColor === preset.color ? 'border-gray-900 scale-110' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: preset.color }}
                            title={preset.name}
                            type="button"
                        />
                    ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">Usada em botões e destaques na proposta.</p>
            </div>
        </div>
      </div>

       {/* Configurações da Proposta */}
       <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
         <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <FileText size={20} className="text-gray-500 dark:text-slate-400" />
            <h2 className="font-semibold text-gray-700 dark:text-slate-200">Configurações da Proposta</h2>
        </div>
        <div className="p-6 grid grid-cols-1 gap-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                    <Calendar size={16} /> Validade da Proposta (Dias)
                </label>
                <input 
                    type="number" 
                    min="1"
                    className="w-32 rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.proposalValidityDays || 5}
                    onChange={(e) => handleChange('proposalValidityDays', Number(e.target.value))}
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Número de dias exibido na proposta para a validade dos preços.</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 flex items-center gap-2">
                    <CheckCircle size={16} /> Garantia de Instalação
                </label>
                <input 
                    type="text" 
                    className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.installationWarranty || ''}
                    onChange={(e) => handleChange('installationWarranty', e.target.value)}
                    placeholder="Ex: 12 meses, 5 anos"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Tempo de garantia oferecido para o serviço de instalação.</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Quem Somos (Texto para Proposta Completa)
                </label>
                <textarea 
                    rows={4}
                    className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                    value={formData.aboutUs || ''}
                    onChange={(e) => handleChange('aboutUs', e.target.value)}
                    placeholder="Escreva um breve resumo sobre a empresa..."
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Este texto aparecerá na seção introdutória da proposta completa.</p>
            </div>
        </div>
      </div>

       {/* Dados de Energia */}
       <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
         <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <Zap size={20} className="text-gray-500 dark:text-slate-400" />
            <h2 className="font-semibold text-gray-700 dark:text-slate-200">Parâmetros de Energia (Composição Tarifária)</h2>
        </div>
        <div className="p-6 space-y-6">
             <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md text-sm text-blue-800 dark:text-blue-200 flex items-start gap-3">
                <Calculator className="shrink-0 mt-1" size={18} />
                <div>
                    <strong>Cálculo do Fio B (Lei 14.300):</strong> O sistema calcula automaticamente a tributação progressiva sobre a energia injetada (TUSD Fio B) ao longo dos 25 anos.
                    <br />2026 (60%), 2027 (75%), 2028 (90%), 2029+ (100%).
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">TE (Tarifa Energia) - R$/kWh</label>
                    <input 
                        type="number" 
                        step="0.0001"
                        className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        value={formData.te || 0}
                        onChange={(e) => handleEnergyChange('te', Number(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Valor TE na conta de luz.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">TUSD (Fatura) - R$/kWh</label>
                    <input 
                        type="number" 
                        step="0.0001"
                        className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        value={formData.tusd || 0}
                        onChange={(e) => handleEnergyChange('tusd', Number(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Valor TUSD na conta de luz.</p>
                </div>
                 
                 {/* Display Total Tariff */}
                <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded border border-gray-200 dark:border-slate-600 flex flex-col justify-center items-center">
                    <span className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Tarifa Cheia (Soma)</span>
                    <span className="text-2xl font-bold text-gray-800 dark:text-white">
                        R$ {formData.defaultTariff?.toFixed(4) || '0.0000'}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500">R$/kWh</span>
                </div>
            </div>
            
            {/* ICMS Toggle */}
            <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded border border-gray-200 dark:border-slate-600">
                    <input
                        type="checkbox"
                        id="icmsOnTusd"
                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                        checked={formData.icmsOnTusd}
                        onChange={(e) => handleChange('icmsOnTusd', e.target.checked)}
                    />
                    <label htmlFor="icmsOnTusd" className="text-sm font-medium text-gray-700 dark:text-slate-300 cursor-pointer select-none">
                        Há cobrança de ICMS sobre a TUSD?
                        <p className="text-xs text-gray-500 dark:text-slate-400 font-normal mt-0.5">
                            Marque esta opção se o estado cobra ICMS sobre a componente TUSD da fatura.
                        </p>
                    </label>
                </div>

                {formData.icmsOnTusd && (
                    <div className="ml-8 animate-in fade-in slide-in-from-top-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Alíquota ICMS (%)</label>
                        <div className="flex items-center gap-2">
                            <input 
                                type="number" 
                                className="w-32 rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                                value={formData.icmsTaxPercentage || ''}
                                onChange={(e) => handleChange('icmsTaxPercentage', Number(e.target.value))}
                                placeholder="Ex: 18"
                            />
                            <span className="text-gray-500 dark:text-slate-400 font-bold">%</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                            A porcentagem deste imposto será deduzida da economia na energia injetada.
                        </p>
                    </div>
                )}
            </div>

            <hr className="border-gray-100 dark:border-slate-700" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                 <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">TUSD (ANEEL)</label>
                        <a 
                            href="https://portalrelatorios.aneel.gov.br/luznatarifa/basestarifas#!" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 flex items-center gap-1 font-semibold"
                        >
                            <ExternalLink size={12} /> Consultar ANEEL
                        </a>
                    </div>
                    <input 
                        type="number" 
                        step="0.0001"
                        className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        value={formData.tusdAneel || 0}
                        onChange={(e) => handleEnergyChange('tusdAneel', Number(e.target.value))}
                    />
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Valor de referência da TUSD na tabela da Aneel.</p>
                </div>

                {/* Calculated Fio B % */}
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded border border-orange-100 dark:border-orange-800">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-orange-800 dark:text-orange-200">Custo Fio B Calculado</span>
                        <span className="text-xs bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-100 px-2 py-0.5 rounded-full">Automático</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {formData.fioBPercentage?.toFixed(2) || '0.00'}%
                    </div>
                    <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                        Representa a porcentagem da TUSD ANEEL sobre a Tarifa Cheia.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Taxa de Reajuste Anual da Energia (%)</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            step="0.1"
                            className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                            value={formData.energyInflation || 0}
                            onChange={(e) => handleChange('energyInflation', Number(e.target.value))}
                        />
                        <span className="text-gray-500 dark:text-slate-400 font-bold">%</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Estimativa de aumento anual da conta de luz (inflação energética).</p>
                </div>
            </div>
        </div>
      </div>

       {/* Parâmetros de Dimensionamento */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700 flex items-center gap-2">
            <Compass size={20} className="text-gray-500 dark:text-slate-400" />
            <h2 className="font-semibold text-gray-700 dark:text-slate-200">Parâmetros de Dimensionamento</h2>
        </div>
        <div className="p-6">
             {/* Simultaneidade Padrão */}
             <div className="mb-6">
                 <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                    <SunDim size={16} /> Fator de Simultaneidade Padrão (%)
                 </label>
                 <div className="flex items-center gap-4">
                     <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        className="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer"
                        value={formData.defaultSelfConsumption || 30}
                        onChange={(e) => handleChange('defaultSelfConsumption', Number(e.target.value))}
                     />
                     <span className="text-lg font-bold text-blue-600 dark:text-blue-400 w-12 text-right">
                         {formData.defaultSelfConsumption}%
                     </span>
                 </div>
                 <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                     Define quanto da energia gerada é consumida instantaneamente pelo cliente (sem injetar na rede).
                     <br/>Residencial: ~30-40%. Comercial (diurno): ~60-80%.
                 </p>
             </div>

             <hr className="border-gray-100 dark:border-slate-700 my-6" />

            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                Configure a eficiência (fator de rendimento) esperada para cada orientação de telhado.
                <br />Ex: 1.00 = 100% de eficiência (Sem perdas). 0.85 = 85% de eficiência (15% de perda).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fator Norte (Ideal)</label>
                    <input 
                        type="text"
                        inputMode="decimal"
                        className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        value={effDisplay.north}
                        onChange={(e) => handleEffChange('north', e.target.value)}
                        placeholder="Ex: 1,0"
                    />
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Perda: {((1 - (formData.effNorth || 1)) * 100).toFixed(0)}%</p>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fator Leste/Oeste</label>
                    <input 
                        type="text"
                        inputMode="decimal"
                        className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        value={effDisplay.eastWest}
                        onChange={(e) => handleEffChange('eastWest', e.target.value)}
                        placeholder="Ex: 0,85"
                    />
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Perda: {((1 - (formData.effEastWest || 1)) * 100).toFixed(0)}%</p>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fator Sul/Sombreado</label>
                    <input 
                        type="text"
                        inputMode="decimal"
                        className="w-full rounded border-gray-300 dark:border-slate-600 p-2 border bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                        value={effDisplay.south}
                        onChange={(e) => handleEffChange('south', e.target.value)}
                        placeholder="Ex: 0,75"
                    />
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Perda: {((1 - (formData.effSouth || 1)) * 100).toFixed(0)}%</p>
                </div>
            </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm transition-colors"
        >
            <Save size={20} /> Salvar Configurações
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm animate-in fade-in zoom-in-95">
                  <div className="p-6 text-center">
                      <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Excluir Etapa?</h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                          Tem certeza que deseja remover esta etapa do seu funil de vendas? Esta ação não pode ser desfeita.
                      </p>
                      
                      <div className="flex gap-3 justify-center">
                          <button 
                              onClick={() => setShowDeleteModal(false)}
                              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 font-medium"
                          >
                              Cancelar
                          </button>
                          <button 
                              onClick={confirmDelete}
                              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium shadow-sm"
                          >
                              Sim, excluir
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Settings;
