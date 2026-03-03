import React, { useState } from 'react';
import { User, Role, Lead } from '../types';
import { Trash2, UserPlus, Shield, User as UserIcon, Check, X, Mail, Lock, TrendingUp, FileText, DollarSign, AlertCircle, Edit2 } from 'lucide-react';

interface TeamProps {
  users: User[];
  leads: Lead[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User;
}

const Team: React.FC<TeamProps> = ({ users, leads, onAddUser, onUpdateUser, onDeleteUser, currentUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SALESPERSON' as Role
  });

  const adminsCount = users.filter(u => u.role === 'ADMIN').length;
  const salesCount = users.filter(u => u.role === 'SALESPERSON').length;

  const canAddAdmin = adminsCount < 2;
  const canAddSales = salesCount < 5;

  // Identify the main admin (first created admin or specific ID if persisted differently)
  const mainAdminId = users.filter(u => u.role === 'ADMIN').sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]?.id;

  const getUserStats = (userId: string) => {
      const userLeads = leads.filter(l => l.userId === userId);
      const totalLeads = userLeads.length;
      const proposals = userLeads.filter(l => l.status !== 'NEW' && l.status !== 'QUALIFICATION').length; // Assuming proposal sent after qualification
      const wonDeals = userLeads.filter(l => l.status === 'CLOSED_WON');
      const lostDeals = userLeads.filter(l => l.status === 'CLOSED_LOST');
      
      const wonRevenue = wonDeals.reduce((sum, l) => sum + (l.simulation?.totalPrice || 0), 0);
      const lostRevenue = lostDeals.reduce((sum, l) => sum + (l.simulation?.totalPrice || 0), 0);

      return { totalLeads, proposals, wonCount: wonDeals.length, wonRevenue, lostCount: lostDeals.length, lostRevenue };
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const openAddModal = () => {
      setEditingUser(null);
      setNewUser({ name: '', email: '', password: '', role: 'SALESPERSON' });
      setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
      setEditingUser(user);
      setNewUser({
          name: user.name,
          email: user.email,
          password: '', // Keep empty to indicate no change
          role: user.role
      });
      setIsModalOpen(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation for Role Limits (skip if editing and role hasn't changed)
    if (!editingUser || editingUser.role !== newUser.role) {
        if (newUser.role === 'ADMIN' && !canAddAdmin) {
            alert('Limite de administradores atingido (Máx: 2)');
            return;
        }
        if (newUser.role === 'SALESPERSON' && !canAddSales) {
            alert('Limite de vendedores atingido (Máx: 5)');
            return;
        }
    }

    // Email Uniqueness Check
    if (users.some(u => u.email === newUser.email && u.id !== editingUser?.id)) {
        alert('E-mail já cadastrado!');
        return;
    }

    if (editingUser) {
        // Update Existing User
        const updatedUser: User = {
            ...editingUser,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            // Only update password if provided
            password: newUser.password ? newUser.password : editingUser.password
        };
        onUpdateUser(updatedUser);
    } else {
        // Create New User
        if (!newUser.password) {
            alert('Senha é obrigatória para novos usuários.');
            return;
        }

        const user: User = {
          id: Date.now().toString(),
          name: newUser.name,
          email: newUser.email,
          password: newUser.password, // In a real app, hash this!
          role: newUser.role,
          active: true,
          createdAt: new Date().toISOString()
        };
        onAddUser(user);
    }

    setIsModalOpen(false);
    setNewUser({ name: '', email: '', password: '', role: 'SALESPERSON' });
    setEditingUser(null);
  };

  const handleToggleActive = (user: User) => {
      // Secondary admin cannot deactivate Main Admin
      if (user.id === mainAdminId && currentUser.id !== mainAdminId) {
          alert('Você não pode desativar o Administrador Principal.');
          return;
      }
      
      // Prevent deactivating yourself
      if (user.id === currentUser.id) {
          alert('Você não pode desativar sua própria conta.');
          return;
      }

      onUpdateUser({ ...user, active: !user.active });
  };

  const handleDelete = (user: User) => {
      // Secondary admin cannot delete Main Admin
      if (user.id === mainAdminId && currentUser.id !== mainAdminId) {
          alert('Você não pode excluir o Administrador Principal.');
          return;
      }

      // Prevent deleting yourself
      if (user.id === currentUser.id) {
          alert('Você não pode excluir sua própria conta.');
          return;
      }

      if (confirm(`Tem certeza que deseja excluir ${user.name}? Os leads deste usuário serão transferidos para a administração.`)) {
          onDeleteUser(user.id);
      }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gerenciamento de Equipe</h1>
          <p className="text-gray-500 dark:text-slate-400">Gerencie o acesso de administradores e vendedores.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <UserPlus size={20} />
          Adicionar Usuário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <h3 className="text-gray-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Total de Usuários</h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{users.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <h3 className="text-gray-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Administradores</h3>
            <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{adminsCount}</p>
                <span className="text-sm text-gray-400 mb-1">/ 2 máx</span>
            </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
            <h3 className="text-gray-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider mb-1">Vendedores</h3>
            <div className="flex items-end gap-2">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{salesCount}</p>
                <span className="text-sm text-gray-400 mb-1">/ 5 máx</span>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400 uppercase text-xs">
            <tr>
              <th className="p-4 font-medium">Usuário</th>
              <th className="p-4 font-medium">Função</th>
              <th className="p-4 font-medium text-center">Leads</th>
              <th className="p-4 font-medium text-center">Propostas</th>
              <th className="p-4 font-medium text-center">Ganhos</th>
              <th className="p-4 font-medium text-center">Perdidos</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {users.map(user => {
              const stats = getUserStats(user.id);
              return (
              <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'} ${!user.active ? 'opacity-50 grayscale' : ''}`}>
                        {user.role === 'ADMIN' ? <Shield size={20} /> : <UserIcon size={20} />}
                    </div>
                    <div className={!user.active ? 'opacity-50' : ''}>
                      <p className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {user.name}
                          {user.id === mainAdminId && <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200">Principal</span>}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    user.role === 'ADMIN' 
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  } ${!user.active ? 'opacity-50' : ''}`}>
                    {user.role === 'ADMIN' ? 'Administrador' : 'Vendedor'}
                  </span>
                </td>
                
                {/* Stats Columns */}
                <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-gray-800 dark:text-white">{stats.totalLeads}</span>
                    </div>
                </td>
                <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-gray-800 dark:text-white">{stats.proposals}</span>
                    </div>
                </td>
                <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-green-600 dark:text-green-400">{stats.wonCount}</span>
                        {stats.wonRevenue > 0 && <span className="text-[10px] text-green-500">{formatCurrency(stats.wonRevenue)}</span>}
                    </div>
                </td>
                <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                        <span className="font-bold text-red-500">{stats.lostCount}</span>
                        {stats.lostRevenue > 0 && <span className="text-[10px] text-red-400">{formatCurrency(stats.lostRevenue)}</span>}
                    </div>
                </td>

                <td className="p-4">
                  <button 
                    onClick={() => handleToggleActive(user)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${user.active ? 'text-green-600 dark:text-green-400 hover:text-green-700' : 'text-red-500 hover:text-red-600'}`}
                    title={user.active ? "Clique para desativar" : "Clique para ativar"}
                    disabled={user.id === currentUser.id || (user.id === mainAdminId && currentUser.id !== mainAdminId)}
                  >
                    <span className={`w-2 h-2 rounded-full ${user.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {user.active ? 'Ativo' : 'Inativo'}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Editar Usuário"
                      >
                        <Edit2 size={18} />
                      </button>
                      {user.id !== currentUser.id && (
                        <button 
                          onClick={() => handleDelete(user)}
                          className={`text-red-500 hover:text-red-700 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${(user.id === mainAdminId && currentUser.id !== mainAdminId) ? 'opacity-30 cursor-not-allowed' : ''}`}
                          title="Remover Usuário"
                          disabled={user.id === mainAdminId && currentUser.id !== mainAdminId}
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                  </div>
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nome Completo</label>
                <div className="relative">
                    <UserIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        required
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Ex: João Silva"
                        value={newUser.name}
                        onChange={e => setNewUser({...newUser, name: e.target.value})}
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">E-mail</label>
                <div className="relative">
                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="email" 
                        required
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Ex: joao@empresa.com"
                        value={newUser.email}
                        onChange={e => setNewUser({...newUser, email: e.target.value})}
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Senha {editingUser && <span className="text-xs font-normal text-gray-500">(Deixe em branco para manter a atual)</span>}
                </label>
                <div className="relative">
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="password" 
                        required={!editingUser}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder={editingUser ? "Nova senha (opcional)" : "******"}
                        value={newUser.password}
                        onChange={e => setNewUser({...newUser, password: e.target.value})}
                    />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Função</label>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setNewUser({...newUser, role: 'SALESPERSON'})}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                            newUser.role === 'SALESPERSON' 
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                            : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750'
                        }`}
                    >
                        <UserIcon size={24} />
                        <span className="font-medium text-sm">Vendedor</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setNewUser({...newUser, role: 'ADMIN'})}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${
                            newUser.role === 'ADMIN' 
                            ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                            : 'border-gray-200 dark:border-slate-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-750'
                        }`}
                    >
                        <Shield size={24} />
                        <span className="font-medium text-sm">Admin</span>
                    </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                    Cancelar
                </button>
                <button 
                    type="submit" 
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                    {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Team;
