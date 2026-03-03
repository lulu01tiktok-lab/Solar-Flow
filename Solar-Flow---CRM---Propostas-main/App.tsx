import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Kanban from './pages/Kanban';
import LeadFlow from './pages/LeadFlow';
import ProposalView from './pages/ProposalView';
import Settings from './pages/Settings';
import EquipmentPage from './pages/Equipment';
import Team from './pages/Team';
import { Lead, LeadStatus, AppSettings, City, Equipment, KanbanColumn, User, Role } from './types';
import { MOCK_LEADS, DEFAULT_SETTINGS, INITIAL_CITIES, INITIAL_EQUIPMENT, KANBAN_COLUMNS } from './constants';
import Login from './pages/Login';

const DEFAULT_ADMIN: User = {
  id: 'admin-1',
  name: 'Administrador',
  email: 'admin@gmail.com',
  password: 'admin',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString()
};

const App: React.FC = () => {
  // Helper to safely parse JSON
  const safeParse = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (e) {
      console.error(`Error parsing ${key} from localStorage:`, e);
      return fallback;
    }
  };

  // --- Auth Logic ---
  const [users, setUsers] = useState<User[]>(() => safeParse('solarflow_users_v1', [DEFAULT_ADMIN]));
  const [currentUser, setCurrentUser] = useState<User | null>(() => safeParse('solarflow_current_user_v1', null));

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('solarflow_current_user_v1', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('solarflow_current_user_v1');
  };

  // User Management Actions
  const addUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const updateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const deleteUser = (id: string) => {
    // Reassign leads to admin (or null/unassigned) before deleting user
    // Find an admin to assign to (e.g., the first admin found, or the current user if admin)
    // For simplicity, let's assign to the default admin or the first available admin.
    const adminToAssign = users.find(u => u.role === 'ADMIN' && u.id !== id) || users.find(u => u.role === 'ADMIN');
    
    if (adminToAssign) {
        setLeads(prev => prev.map(lead => {
            if (lead.userId === id) {
                return { ...lead, userId: adminToAssign.id };
            }
            return lead;
        }));
    }

    setUsers(prev => prev.filter(u => u.id !== id));
  };

  // Persist Users
  useEffect(() => {
    localStorage.setItem('solarflow_users_v1', JSON.stringify(users));
  }, [users]);

  // --- Theme Logic ---
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
     const saved = localStorage.getItem('solarflow_theme');
     if (saved) return saved === 'dark';
     return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('solarflow_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('solarflow_theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  // Global State for Leads
  const [leads, setLeads] = useState<Lead[]>(() => safeParse('solarflow_leads_v1', MOCK_LEADS));

  // Global State for Settings
  const [settings, setSettings] = useState<AppSettings>(() => safeParse('solarflow_settings_v1', DEFAULT_SETTINGS));

  // Global State for Cities
  const [cities, setCities] = useState<City[]>(() => safeParse('solarflow_cities_v1', INITIAL_CITIES));

  // Global State for Equipment
  const [equipmentList, setEquipmentList] = useState<Equipment[]>(() => safeParse('solarflow_equipment_v1', INITIAL_EQUIPMENT));

  // Global State for Kanban Columns (New)
  const [columns, setColumns] = useState<KanbanColumn[]>(() => safeParse('solarflow_columns_v1', KANBAN_COLUMNS));

  // Persist Leads
  useEffect(() => {
    localStorage.setItem('solarflow_leads_v1', JSON.stringify(leads));
  }, [leads]);

  // Persist Settings
  useEffect(() => {
    localStorage.setItem('solarflow_settings_v1', JSON.stringify(settings));
  }, [settings]);

  // Persist Cities
  useEffect(() => {
    localStorage.setItem('solarflow_cities_v1', JSON.stringify(cities));
  }, [cities]);

  // Persist Equipment
  useEffect(() => {
    localStorage.setItem('solarflow_equipment_v1', JSON.stringify(equipmentList));
  }, [equipmentList]);

  // Persist Columns
  useEffect(() => {
    localStorage.setItem('solarflow_columns_v1', JSON.stringify(columns));
  }, [columns]);

  // Actions
  const updateLeadStatus = (id: string, newStatus: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus, updatedAt: new Date().toISOString() } : l));
  };

  const saveLead = (lead: Lead) => {
    // If new lead, assign current user as owner
    const leadWithUser = {
        ...lead,
        userId: lead.userId || currentUser?.id
    };

    setLeads(prev => {
      const exists = prev.find(l => l.id === lead.id);
      if (exists) {
        return prev.map(l => l.id === lead.id ? leadWithUser : l);
      }
      return [...prev, leadWithUser];
    });
  };

  const deleteLead = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const addCity = (city: City) => {
    setCities(prev => [...prev, city]);
  };

  const updateCity = (updatedCity: City) => {
    setCities(prev => prev.map(c => c.id === updatedCity.id ? updatedCity : c));
  };

  // Equipment Actions
  const addEquipment = (item: Equipment) => {
    setEquipmentList(prev => [...prev, item]);
  };

  const updateEquipment = (item: Equipment) => {
    setEquipmentList(prev => prev.map(e => e.id === item.id ? item : e));
  };

  const deleteEquipment = (id: string) => {
    setEquipmentList(prev => prev.filter(e => e.id !== id));
  };

  // Filter leads based on role
  const visibleLeads = leads.filter(lead => {
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN') return true;
    return lead.userId === currentUser.id;
  });

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={
          currentUser ? <Navigate to="/dashboard" replace /> : <Login onLogin={handleLogin} users={users} isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        } />
        
        {/* Proposal View (Public style) needs settings for branding - kept separate from main layout */}
        <Route path="/proposal/:id" element={<ProposalView leads={leads} settings={settings} />} />
        
        {/* Main App Routes with Sidebar (Layout needs settings for Sidebar logo) */}
        <Route path="*" element={
          currentUser ? (
            <Layout settings={settings} isDarkMode={isDarkMode} toggleTheme={toggleTheme} onLogout={handleLogout} currentUser={currentUser}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route 
                  path="/dashboard" 
                  element={<Dashboard leads={visibleLeads} columns={columns} currentUser={currentUser} />} 
                />
                <Route 
                  path="/kanban" 
                  element={<Kanban leads={visibleLeads} updateLeadStatus={updateLeadStatus} saveLead={saveLead} columns={columns} currentUser={currentUser} users={users} />} 
                />
                <Route 
                  path="/lead/:id" 
                  element={
                    <LeadFlow 
                      leads={visibleLeads} 
                      saveLead={saveLead} 
                      deleteLead={deleteLead} 
                      settings={settings} 
                      cities={cities} 
                      addCity={addCity} 
                      updateCity={updateCity} 
                      equipmentList={equipmentList}
                      addEquipment={addEquipment}
                      columns={columns}
                      users={users}
                    />
                  } 
                />
                <Route 
                  path="/equipment" 
                  element={<EquipmentPage equipmentList={equipmentList} onAdd={addEquipment} onUpdate={updateEquipment} onDelete={deleteEquipment} currentUser={currentUser} />} 
                />
                
                {/* Protected Admin Routes */}
                <Route 
                  path="/settings" 
                  element={
                    currentUser.role === 'ADMIN' ? (
                        <Settings settings={settings} onSave={setSettings} columns={columns} onUpdateColumns={setColumns} leads={leads} />
                    ) : <Navigate to="/dashboard" replace />
                  } 
                />
                <Route 
                  path="/team" 
                  element={
                    currentUser.role === 'ADMIN' ? (
                        <Team users={users} leads={leads} onAddUser={addUser} onUpdateUser={updateUser} onDeleteUser={deleteUser} currentUser={currentUser} />
                    ) : <Navigate to="/dashboard" replace />
                  } 
                />

              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        } />
      </Routes>
    </Router>
  );
};

export default App;