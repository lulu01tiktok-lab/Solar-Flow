import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
  users?: User[];
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, users = [], isDarkMode, toggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Find user in the provided list
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      if (!user.active) {
        setError('Usuário desativado. Contate o administrador.');
        return;
      }
      onLogin(user);
      navigate('/dashboard');
    } else {
      // Fallback for initial dev testing if no users provided (should not happen with App.tsx update)
      if (users.length === 0 && email === 'admin@gmail.com' && password === 'admin') {
         // Create a temporary admin user
         const tempAdmin: User = {
             id: 'temp-admin',
             name: 'Admin',
             email: 'admin@gmail.com',
             role: 'ADMIN',
             active: true,
             createdAt: new Date().toISOString()
         };
         onLogin(tempAdmin);
         navigate('/dashboard');
         return;
      }
      setError('Credenciais inválidas. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="absolute top-4 right-4">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 hover:text-yellow-500 dark:hover:text-yellow-400 shadow-sm border border-gray-200 dark:border-slate-700 transition-all"
          title={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
           {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center shadow-lg">
            <Sun className="text-white" size={28} fill="white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          SolarFlow
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-slate-400">
          Faça login para acessar sua conta
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100 dark:border-slate-700">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Endereço de e-mail
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-yellow-500 focus:border-yellow-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-slate-600 rounded-md py-2 border dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                  placeholder=""
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                Senha
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-yellow-500 focus:border-yellow-500 block w-full pl-10 pr-10 sm:text-sm border-gray-300 dark:border-slate-600 rounded-md py-2 border dark:bg-slate-700 dark:text-white dark:placeholder-slate-400"
                  placeholder=""
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 dark:border-slate-600 rounded dark:bg-slate-700"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-slate-300">
                  Lembrar-me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-yellow-600 hover:text-yellow-500 dark:text-yellow-500 dark:hover:text-yellow-400">
                  Esqueceu sua senha?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              >
                Entrar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
