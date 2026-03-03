import React, { useState } from 'react';
import { Equipment, User } from '../types';
import { Plus, Edit2, Trash2, Zap, Box, Search, X, Ruler, Cable } from 'lucide-react';

interface EquipmentPageProps {
  equipmentList: Equipment[];
  onAdd: (item: Equipment) => void;
  onUpdate: (item: Equipment) => void;
  onDelete: (id: string) => void;
  currentUser?: User;
}

const EquipmentPage: React.FC<EquipmentPageProps> = ({ equipmentList, onAdd, onUpdate, onDelete, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'MODULE' | 'INVERTER'>('MODULE');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);
  
  // Form Data
  const [formData, setFormData] = useState<Partial<Equipment>>({
      type: 'MODULE',
      manufacturer: '',
      model: '',
      power: 0,
      price: 0,
      warranty: '',
      efficiencyWarranty: '',
      width: 0,
      height: 0,
      voltage: '',
      inverterPhase: 'MONO',
      inverterType: 'STRING'
  });

  const openModal = (item?: Equipment) => {
      // Check permissions for editing
      if (item && currentUser?.role !== 'ADMIN') {
          alert('Apenas administradores podem editar equipamentos.');
          return;
      }

      if (item) {
          setEditingItem(item);
          setFormData(item);
      } else {
          setEditingItem(null);
          setFormData({
              type: activeTab,
              manufacturer: '',
              model: '',
              power: 0,
              price: 0,
              warranty: '',
              efficiencyWarranty: '',
              width: 0,
              height: 0,
              voltage: '',
              inverterPhase: 'MONO',
              inverterType: 'STRING'
          });
      }
      setIsModalOpen(true);
  };

  const handleSave = () => {
      if (!formData.manufacturer || !formData.model || !formData.power) {
          alert('Preencha os campos obrigatórios (Fabricante, Modelo e Potência).');
          return;
      }

      const itemToSave: Equipment = {
          id: editingItem ? editingItem.id : Date.now().toString(),
          type: activeTab, // Force type based on tab if new
          manufacturer: formData.manufacturer,
          model: formData.model,
          power: Number(formData.power),
          price: Number(formData.price || 0),
          warranty: formData.warranty || '',
          
          // Module Specifics
          efficiencyWarranty: activeTab === 'MODULE' ? formData.efficiencyWarranty : undefined,
          width: activeTab === 'MODULE' ? Number(formData.width) : undefined,
          height: activeTab === 'MODULE' ? Number(formData.height) : undefined,
          
          // Inverter Specifics
          voltage: activeTab === 'INVERTER' ? formData.voltage : undefined,
          inverterPhase: activeTab === 'INVERTER' ? formData.inverterPhase : undefined,
          inverterType: activeTab === 'INVERTER' ? (formData.inverterType || 'STRING') : undefined,
      };

      if (editingItem) {
          onUpdate(itemToSave);
      } else {
          onAdd(itemToSave);
      }
      setIsModalOpen(false);
  };

  // Filter List
  const filteredList = equipmentList.filter(item => {
      const matchesType = item.type === activeTab;
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = item.model.toLowerCase().includes(searchLower) || 
                            item.manufacturer.toLowerCase().includes(searchLower);
      return matchesType && matchesSearch;
  });

  // Calculation Helper
  const calculateEfficiency = (power: number, widthMm?: number, heightMm?: number): string => {
      if (!widthMm || !heightMm || !power || widthMm <= 0 || heightMm <= 0) return '-';
      
      const widthM = widthMm / 1000;
      const heightM = heightMm / 1000;
      const area = widthM * heightM;
      
      // Standard Efficiency Formula: (Power / (Area * 1000W/m2)) * 100
      const efficiency = (power / (area * 1000)) * 100;
      
      return efficiency.toFixed(2) + '%';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Catálogo de Equipamentos</h1>
            <p className="text-gray-500 dark:text-slate-400">Gerencie módulos e inversores disponíveis.</p>
        </div>
        <button 
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
        >
            <Plus size={20} /> Novo Equipamento
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-700">
          <button 
            onClick={() => setActiveTab('MODULE')}
            className={`px-6 py-3 font-medium flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'MODULE' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          >
              <Box size={18} /> Módulos (Painéis)
          </button>
          <button 
            onClick={() => setActiveTab('INVERTER')}
            className={`px-6 py-3 font-medium flex items-center gap-2 transition-colors border-b-2 ${activeTab === 'INVERTER' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'}`}
          >
              <Zap size={18} /> Inversores
          </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500" size={20} />
          <input 
              type="text" 
              placeholder={`Buscar ${activeTab === 'MODULE' ? 'módulos' : 'inversores'}...`}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-4">
          {filteredList.map(item => (
              <div key={item.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                      <div>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{item.manufacturer}</span>
                          <h3 className="font-bold text-gray-800 dark:text-white text-lg">{item.model}</h3>
                      </div>
                      <div className="text-right">
                          <div className="font-bold text-gray-800 dark:text-white">
                              {item.power} {activeTab === 'MODULE' ? 'W' : 'kW'}
                          </div>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 dark:text-slate-400 mb-4">
                      {activeTab === 'MODULE' && (
                          <>
                              <div>
                                  <span className="block text-xs text-gray-400 dark:text-slate-500">Dimensões</span>
                                  {item.width && item.height ? `${item.width} x ${item.height}` : '-'}
                              </div>
                              <div>
                                  <span className="block text-xs text-gray-400 dark:text-slate-500">Eficiência</span>
                                  <span className="text-green-600 dark:text-green-400 font-medium">
                                      {calculateEfficiency(item.power, item.width, item.height)}
                                  </span>
                              </div>
                          </>
                      )}
                      {activeTab === 'INVERTER' && (
                          <>
                              <div>
                                  <span className="block text-xs text-gray-400 dark:text-slate-500">Tipo</span>
                                  {item.inverterType === 'MICRO' ? 'Microinversor' : 'String'}
                              </div>
                              <div>
                                  <span className="block text-xs text-gray-400 dark:text-slate-500">Fase</span>
                                  {item.inverterPhase === 'MONO' ? 'Monofásico' : item.inverterPhase === 'TRI' ? 'Trifásico' : '-'}
                              </div>
                              <div className="col-span-2">
                                  <span className="block text-xs text-gray-400 dark:text-slate-500">Tensão</span>
                                  {item.voltage || '-'}
                              </div>
                          </>
                      )}
                      <div className="col-span-2">
                          <span className="block text-xs text-gray-400 dark:text-slate-500">Garantia</span>
                          {item.warranty || '-'}
                      </div>
                  </div>

                  {currentUser?.role === 'ADMIN' && (
                      <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-700">
                          <button 
                            onClick={() => openModal(item)}
                            className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 font-medium"
                          >
                              <Edit2 size={16} /> Editar
                          </button>
                          <button 
                            onClick={() => {
                                if(window.confirm(`Excluir ${item.manufacturer} ${item.model}?`)) {
                                    onDelete(item.id);
                                }
                            }}
                            className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400 font-medium"
                          >
                              <Trash2 size={16} /> Excluir
                          </button>
                      </div>
                  )}
              </div>
          ))}
          {filteredList.length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-lg border border-dashed border-gray-300 dark:border-slate-700">
                  Nenhum equipamento encontrado.
              </div>
          )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 text-sm">
                  <tr>
                      <th className="p-4 font-semibold">Fabricante</th>
                      <th className="p-4 font-semibold">Modelo</th>
                      <th className="p-4 font-semibold text-center">
                          {activeTab === 'MODULE' ? 'Potência (W)' : 'Potência (kW)'}
                      </th>
                      {activeTab === 'MODULE' && (
                          <>
                            <th className="p-4 font-semibold text-center hidden md:table-cell">Dimensões (mm)</th>
                            <th className="p-4 font-semibold text-center">Eficiência</th>
                          </>
                      )}
                      {activeTab === 'INVERTER' && (
                          <>
                             <th className="p-4 font-semibold text-center">Tipo</th>
                             <th className="p-4 font-semibold text-center">Tensão</th>
                             <th className="p-4 font-semibold text-center">Fase</th>
                          </>
                      )}
                      <th className="p-4 font-semibold text-center hidden md:table-cell">Garantia</th>
                      <th className="p-4 font-semibold text-right">Ações</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filteredList.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                          <td className="p-4 font-medium text-gray-800 dark:text-white">{item.manufacturer}</td>
                          <td className="p-4 text-gray-600 dark:text-slate-400">{item.model}</td>
                          <td className="p-4 text-center font-bold text-blue-600 dark:text-blue-400">
                              {item.power} {activeTab === 'MODULE' ? 'W' : 'kW'}
                          </td>
                          {activeTab === 'MODULE' && (
                              <>
                                <td className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm hidden md:table-cell">
                                    {item.width && item.height ? `${item.width} x ${item.height}` : '-'}
                                </td>
                                <td className="p-4 text-center text-green-600 dark:text-green-400 font-bold text-sm">
                                    {calculateEfficiency(item.power, item.width, item.height)}
                                </td>
                              </>
                          )}
                          {activeTab === 'INVERTER' && (
                              <>
                                <td className="p-4 text-center text-sm">
                                    {item.inverterType === 'MICRO' 
                                        ? <span className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-semibold">Micro</span>
                                        : <span className="bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-slate-200 px-2 py-0.5 rounded text-xs font-semibold">String</span>
                                    }
                                </td>
                                <td className="p-4 text-center text-gray-600 dark:text-slate-400 text-sm">
                                    {item.voltage || '-'}
                                </td>
                                <td className="p-4 text-center text-sm">
                                    {item.inverterPhase === 'MONO' && <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-semibold">Mono</span>}
                                    {item.inverterPhase === 'TRI' && <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded text-xs font-semibold">Tri</span>}
                                    {!item.inverterPhase && '-'}
                                </td>
                              </>
                          )}
                          <td className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm hidden md:table-cell">
                              {item.warranty || '-'}
                          </td>
                          <td className="p-4 text-right">
                              <div className="flex justify-end gap-2">
                                  {/* Only Admins can edit/delete */}
                                  {currentUser?.role === 'ADMIN' && (
                                      <>
                                          <button 
                                            onClick={() => openModal(item)}
                                            className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Editar">
                                              <Edit2 size={18} />
                                          </button>
                                          <button 
                                            onClick={() => {
                                                if(window.confirm(`Excluir ${item.manufacturer} ${item.model}?`)) {
                                                    onDelete(item.id);
                                                }
                                            }}
                                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded" title="Excluir">
                                              <Trash2 size={18} />
                                          </button>
                                      </>
                                  )}
                              </div>
                          </td>
                      </tr>
                  ))}
                  {filteredList.length === 0 && (
                      <tr>
                          <td colSpan={7} className="p-8 text-center text-gray-400 dark:text-slate-500">
                              Nenhum equipamento encontrado.
                          </td>
                      </tr>
                  )}
              </tbody>
          </table>
          </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                  <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                          {editingItem ? 'Editar Equipamento' : 'Novo Equipamento'}
                      </h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white">
                          <X size={20} />
                      </button>
                  </div>
                  
                  <div className="p-4 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fabricante</label>
                          <input 
                              type="text" 
                              className="w-full border dark:border-slate-600 rounded p-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              value={formData.manufacturer}
                              onChange={e => setFormData({...formData, manufacturer: e.target.value})}
                              placeholder="Ex: Jinko, Growatt"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Modelo</label>
                          <input 
                              type="text" 
                              className="w-full border dark:border-slate-600 rounded p-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              value={formData.model}
                              onChange={e => setFormData({...formData, model: e.target.value})}
                              placeholder="Ex: Tiger Neo 575"
                          />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                                  {activeTab === 'MODULE' ? 'Potência (Watts)' : 'Potência (kW)'}
                              </label>
                              <input 
                                  type="number" 
                                  className="w-full border dark:border-slate-600 rounded p-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                  value={formData.power}
                                  onChange={e => setFormData({...formData, power: Number(e.target.value)})}
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Preço Custo (Opcional)</label>
                              <input 
                                  type="number" 
                                  className="w-full border dark:border-slate-600 rounded p-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                  value={formData.price}
                                  onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                              />
                          </div>
                      </div>

                      {activeTab === 'MODULE' && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                           <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase mb-2 flex items-center gap-1">
                               <Ruler size={14} /> Dimensões e Eficiência
                           </h4>
                           <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Largura (mm)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                        value={formData.width || ''}
                                        onChange={e => setFormData({...formData, width: Number(e.target.value)})}
                                        placeholder="Ex: 1134"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Altura (mm)</label>
                                    <input 
                                        type="number" 
                                        className="w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                        value={formData.height || ''}
                                        onChange={e => setFormData({...formData, height: Number(e.target.value)})}
                                        placeholder="Ex: 2278"
                                    />
                                </div>
                           </div>
                           
                           {formData.width && formData.height && formData.power ? (
                               <div className="text-center bg-white dark:bg-slate-700 p-2 rounded border border-blue-200 dark:border-blue-800">
                                   <span className="text-xs text-gray-500 dark:text-slate-400">Eficiência Calculada</span>
                                   <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                                       {calculateEfficiency(Number(formData.power), Number(formData.width), Number(formData.height))}
                                   </div>
                               </div>
                           ) : (
                               <p className="text-[10px] text-gray-400 dark:text-slate-500 text-center">Preencha potência e dimensões para calcular a eficiência.</p>
                           )}
                        </div>
                      )}
                      
                      {activeTab === 'INVERTER' && (
                          <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-800">
                               <h4 className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase mb-2 flex items-center gap-1">
                                   <Cable size={14} /> Detalhes Elétricos
                               </h4>
                               <div className="grid grid-cols-2 gap-3 mb-3">
                                   <div>
                                       <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tipo de Inversor</label>
                                       <select
                                            className="w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                            value={formData.inverterType || 'STRING'}
                                            onChange={e => setFormData({...formData, inverterType: e.target.value as 'STRING' | 'MICRO'})}
                                       >
                                           <option value="STRING">Inversor String (Parede)</option>
                                           <option value="MICRO">Microinversor</option>
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Tensão (V)</label>
                                       <input 
                                            type="text" 
                                            className="w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                            value={formData.voltage || ''}
                                            onChange={e => setFormData({...formData, voltage: e.target.value})}
                                            placeholder="Ex: 220V"
                                        />
                                   </div>
                               </div>
                               <div>
                                   <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">Fase</label>
                                   <select
                                        className="w-full border dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                        value={formData.inverterPhase || 'MONO'}
                                        onChange={e => setFormData({...formData, inverterPhase: e.target.value as 'MONO' | 'TRI'})}
                                   >
                                       <option value="MONO">Monofásico</option>
                                       <option value="TRI">Trifásico</option>
                                   </select>
                               </div>
                          </div>
                      )}

                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Garantia Produto</label>
                          <input 
                              type="text" 
                              className="w-full border dark:border-slate-600 rounded p-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                              value={formData.warranty}
                              onChange={e => setFormData({...formData, warranty: e.target.value})}
                              placeholder="Ex: 12 anos contra defeitos"
                          />
                      </div>
                      
                      {activeTab === 'MODULE' && (
                           <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Garantia Eficiência (Performance)</label>
                                <input 
                                    type="text" 
                                    className="w-full border dark:border-slate-600 rounded p-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                                    value={formData.efficiencyWarranty || ''}
                                    onChange={e => setFormData({...formData, efficiencyWarranty: e.target.value})}
                                    placeholder="Ex: 25 anos (80%)"
                                />
                            </div>
                      )}
                  </div>

                  <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 flex justify-end gap-2 rounded-b-lg">
                      <button 
                          onClick={() => setIsModalOpen(false)}
                          className="px-4 py-2 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={handleSave}
                          className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded transition-colors"
                      >
                          Salvar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default EquipmentPage;