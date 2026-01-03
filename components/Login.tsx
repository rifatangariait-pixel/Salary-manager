
import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, ShieldCheck, Building2 } from 'lucide-react';
import { googleSheetService } from '../services/googleSheetService';

interface LoginProps {
  onLogin: (user: User) => void;
  users?: User[]; 
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        // Strict Authentication: Fetch Users from Service
        const users = await googleSheetService.getUsers();
        
        if (users.length === 0) {
             setError("Database is empty or connection failed. Please ensure SystemUsers sheet is populated.");
             setLoading(false);
             return;
        }

        const user = users.find(u => u.username === username);
        
        // Simple password check (In production, use hashing)
        if (user && user.password === password) {
            onLogin(user);
        } else {
            setError('Invalid username or password.');
        }
    } catch (err) {
        console.error(err);
        setError("Connection Error: Unable to reach Google Sheets database.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      
      {/* Left Side - Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900/90 to-blue-900/80"></div>
        
        <div className="relative z-10 p-12 text-white max-w-lg">
          <div className="mb-6 inline-block p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30">
            <Building2 size={40} className="text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">Multi-Branch Salary Management System</h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Streamline your organization's payroll across multiple locations. 
            Secure, efficient, and centralized management for all your branches.
          </p>
          <div className="mt-8 flex gap-4 text-sm font-medium text-slate-400">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" /> Secure Access
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" /> Data Encryption
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white lg:bg-transparent lg:shadow-none rounded-2xl shadow-xl p-8 lg:p-0">
          
          <div className="text-center lg:text-left mb-10">
            <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
            <p className="text-slate-500 mt-2">Please sign in to access your dashboard.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center border border-red-100 animate-shake">
                <span className="mr-2 text-lg">⚠️</span> {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Username</label>
              <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <UserIcon size={20} />
                </div>
                <input 
                  type="text" 
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-semibold text-slate-700">Password</label>
              </div>
              <div className="relative group">
                <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center text-slate-400 group-focus-within:text-blue-600 transition-colors">
                  <Lock size={20} />
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-[0.98] flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Authenticating...</span>
                </div>
              ) : (
                <>
                  Sign In <ArrowRight size={20} className="ml-2" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">
              Developed and Copyrighted by <span className="font-bold text-slate-600">DiviX</span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;
