import React, { useState } from 'react';
import { Lock, Mail, Building2, User, Sparkles, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [fullName, setFullName] = useState('');
  const [salonName, setSalonName] = useState('');
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden">
        {/* Header Visual */}
        <div className="bg-[#143328] p-6 text-white text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 text-emerald-300 mb-3 border border-white/15">
            <Sparkles className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h2 className="text-xl font-serif tracking-tight text-white">Atelier Gestão</h2>
          <p className="text-xs text-stone-300 mt-1">Plataforma SaaS para Salões de Beleza & Estética</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] text-emerald-200 font-mono">
            <span>●</span> Neon Lakebase Postgres Ativo
          </div>
        </div>

        {/* Tabs de Seleção */}
        <div className="grid grid-cols-2 p-1.5 bg-stone-100/80 border-b border-stone-200 text-xs font-medium">
          <button
            type="button"
            onClick={() => { setTab('login'); setError(null); }}
            className={`py-2 rounded-xl transition-all ${
              tab === 'login' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Acessar Salão (Login)
          </button>
          <button
            type="button"
            onClick={() => { setTab('register'); setError(null); }}
            className={`py-2 rounded-xl transition-all ${
              tab === 'register' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Cadastrar Novo Salão
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
                    placeholder="Ex: Studio Elegance"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#143328]/30 focus:border-[#143328]"
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
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#143328]/30 focus:border-[#143328]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#143328] hover:bg-[#1a4436] text-white rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
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
