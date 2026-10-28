import React, { useState } from 'react';
import {
  Lock,
  Mail,
  Building2,
  User,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react';
import { AuthUser, loginUser, registerUser } from '../services/dbClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [salonName, setSalonName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await loginUser(email, password);
        if (res.error) {
          setError(res.error);
        } else if (res.user) {
          onLoginSuccess(res.user);
          if (onClose) onClose();
        }
      } else {
        const res = await registerUser({
          fullName,
          email,
          password,
          salonName,
          cnpj: cnpj || undefined,
        });
        if (res.error) {
          setError(res.error);
        } else if (res.user) {
          onLoginSuccess(res.user);
          if (onClose) onClose();
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao conectar ao banco.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden relative">
        {/* Header Visual */}
        <div className="bg-gradient-to-br from-[#0B1D15] via-[#143328] to-[#1B4234] p-6 text-white text-center relative">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/10 text-[#E6C665] mb-2.5 border border-white/15 shadow-inner">
            <Sparkles className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h2 className="text-xl font-serif tracking-tight text-white font-semibold">Atelier Gestão</h2>
          <p className="text-xs text-stone-300 mt-0.5">SaaS Multi-Tenant para Salões & Estética</p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-200 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Neon Lakebase Postgres Conectado</span>
          </div>
        </div>

        {/* Tabs de Seleção */}
        <div className="grid grid-cols-2 p-1.5 bg-stone-100/90 border-b border-stone-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              tab === 'login' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Acessar Salão
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${
              tab === 'register' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Cadastrar Novo Salão
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex: Anderson Alves"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#143328]/30 focus:border-[#143328]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Nome do Salão / Estabelecimento</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={salonName}
                    onChange={(e) => setSalonName(e.target.value)}
                    placeholder="Ex: Studio Elegance Hair"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#143328]/30 focus:border-[#143328]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Telefone</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full pl-9 pr-2 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#143328]/30 focus:border-[#143328]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">CNPJ (Opcional)</label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#143328]/30 focus:border-[#143328]"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#143328]/30 focus:border-[#143328]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">Senha de Acesso</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#143328]/30 focus:border-[#143328]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 bg-[#143328] hover:bg-[#1a4436] text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span>Conectando ao banco...</span>
            ) : tab === 'login' ? (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Criar Salão e Acessar</span>
                <CheckCircle2 className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
