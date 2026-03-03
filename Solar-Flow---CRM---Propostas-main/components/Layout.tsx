import React, { useState } from 'react';
import { LayoutDashboard, PlusCircle, LogOut, Sun, Moon, Menu, X, Settings, Package, KanbanSquare, Users } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { AppSettings, User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  settings?: AppSettings;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onLogout?: () => void;
  currentUser?: User;
}

const Layout: React.FC<LayoutProps> = ({ children, settings, isDarkMode, toggleTheme, onLogout, currentUser }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { label: 'CRM Kanban', icon: <KanbanSquare size={20} />, path: '/kanban' },
    { label: 'Novo Projeto', icon: <PlusCircle size={20} />, path: '/lead/new' },
    { label: 'Equipamentos', icon: <Package size={20} />, path: '/equipment' },
  ];

  if (currentUser?.role === 'ADMIN') {
      navItems.push({ label: 'Equipe', icon: <Users size={20} />, path: '/team' });
      navItems.push({ label: 'Configurações', icon: <Settings size={20} />, path: '/settings' });
  }

  const isActive = (path: string) => location.pathname === path;

  // Use settings for branding if available
  const companyName = settings?.companyName || "SolarFlow";
  const logoUrl = settings?.logoUrl;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-800 dark:text-gray-100 transition-colors duration-200">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 dark:bg-slate-900 text-white shadow-xl no-print border-r border-transparent dark:border-slate-800">
        <div className="p-6 flex items-center gap-3 border-b border-slate-700">
          {logoUrl ? (
             <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
          ) : (
             <Sun className="text-yellow-400" size={28} />
          )}
          <span className="text-lg font-bold tracking-tight truncate">{companyName}</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700 flex flex-col gap-2">
          {currentUser && (
              <div className="px-4 py-2 mb-2">
                  <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-400">{currentUser.role === 'ADMIN' ? 'Administrador' : 'Vendedor'}</p>
              </div>
          )}
          <button 
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors w-full rounded-lg hover:bg-slate-800"
          >
             {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors w-full rounded-lg hover:bg-slate-800"
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-slate-900 dark:bg-slate-900 text-white z-50 flex items-center justify-between p-4 shadow-md no-print">
        <div className="flex items-center gap-2">
            {logoUrl ? (
             <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
             <Sun className="text-yellow-400" size={24} />
            )}
            <span className="font-bold text-lg truncate max-w-[200px]">{companyName}</span>
        </div>
        <div className="flex items-center gap-4">
             <button onClick={toggleTheme} className="text-slate-300">
                {isDarkMode ? <Sun size={22} /> : <Moon size={22} />}
             </button>
             {currentUser && (
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {currentUser.name.charAt(0)}
                </div>
             )}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 z-50 flex justify-around items-center pb-safe pt-2 px-2 no-print shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <Link to="/dashboard" className={`flex flex-col items-center p-2 rounded-lg ${isActive('/dashboard') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}`}>
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-medium mt-1">Início</span>
        </Link>
        <Link to="/kanban" className={`flex flex-col items-center p-2 rounded-lg ${isActive('/kanban') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}`}>
            <KanbanSquare size={24} />
            <span className="text-[10px] font-medium mt-1">CRM</span>
        </Link>
        
        <Link to="/lead/new" className="flex flex-col items-center justify-center -mt-8">
            <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg border-4 border-gray-50 dark:border-slate-950">
                <PlusCircle size={28} />
            </div>
            <span className="text-[10px] font-medium mt-1 text-gray-500 dark:text-slate-400">Novo</span>
        </Link>

        <Link to="/equipment" className={`flex flex-col items-center p-2 rounded-lg ${isActive('/equipment') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}`}>
            <Package size={24} />
            <span className="text-[10px] font-medium mt-1">Kits</span>
        </Link>
        
        <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className={`flex flex-col items-center p-2 rounded-lg ${isMobileMenuOpen ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-slate-400'}`}
        >
            <Menu size={24} />
            <span className="text-[10px] font-medium mt-1">Menu</span>
        </button>
      </div>

      {/* Mobile More Menu Overlay (Settings, Team, Logout) */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/50 z-[60] flex justify-end" onClick={() => setIsMobileMenuOpen(false)}>
             <div className="w-3/4 max-w-xs bg-white dark:bg-slate-900 h-full shadow-xl p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Menu</h3>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                
                <nav className="space-y-2 flex-1">
                    {currentUser?.role === 'ADMIN' && (
                        <>
                            <Link to="/team" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200">
                                <Users size={20} /> Equipe
                            </Link>
                            <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-slate-200">
                                <Settings size={20} /> Configurações
                            </Link>
                        </>
                    )}
                </nav>

                <div className="border-t border-gray-100 dark:border-slate-800 pt-4">
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full rounded-lg"
                    >
                        <LogOut size={20} /> Sair
                    </button>
                </div>
             </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 pt-20 md:pt-0 overflow-y-auto bg-gray-50 dark:bg-slate-950 pb-24 md:pb-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
