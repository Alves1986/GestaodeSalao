import React, { useState, useEffect } from 'react';
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
  Database,
  Calendar,
  DollarSign,
  Scissors,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { AuthUser, DbStatus, loginUser, registerUser } from '../services/dbClient';

interface AuthScreenProps {
  dbStatus: DbStatus | null;
  isDbLoading: boolean;
  onLoginSuccess: (user: AuthUser) => void;
  onViewClientPortal?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  dbStatus,
  isDbLoading,
  onLoginSuccess,
  onViewClientPortal,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);

  // Campos de Cadastro
  const [fullName, setFullName] = useState('');
  const [salonName, setSalonName] = useState('');
  const [phone, setPhone] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Estados de Interface
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Carrega e-mail salvo se houver
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('gestao_salao_remembered_email');
      if (savedEmail) {
        setEmail(savedEmail);
      }
    } catch {
      // Ignora erro de localStorage
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (rememberEmail && email.trim()) {
        try {
          localStorage.setItem('gestao_salao_remembered_email', email.trim());
        } catch {
          // Ignora
        }
      }

      if (tab === 'login') {
        const res = await loginUser(email, password);
        if (res.error) {
          setError(res.error);
        } else if (res.user) {
          onLoginSuccess(res.user);
        }
      } else {
        if (!agreeTerms) {
          setError('É necessário concordar com os Termos de Uso e Política de Privacidade para prosseguir.');
          setLoading(false);
          return;
        }

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
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado ao conectar ao banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#FAF8F5] text-stone-900 selection:bg-[#143328] selection:text-white">
      {/* --------------------------------------------------------------------- */}
      {/* PAINEL ESQUERDO: Apresentação da Marca & Benefícios SaaS (Desktop)     */}
      {/* --------------------------------------------------------------------- */}
      <div className="lg:w-1/2 bg-gradient-to-br from-[#0B1D15] via-[#143328] to-[#1B4234] text-white p-8 lg:p-14 flex flex-col justify-between relative overflow-hidden shrink-0">
        {/* Elementos Decorativos de Fundo */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#C59B27]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        {/* Topo: Logo & Identidade */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center text-[#E6C665] shadow-inner">
              <Sparkles className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h1 className="text-2xl font-serif tracking-tight font-semibold text-white">Atelier Gestão</h1>
              <p className="text-xs text-stone-300 font-sans tracking-wide uppercase font-medium">
                SaaS Multi-Tenant para Salões & Estética
              </p>
            </div>
          </div>

          <div className="mt-10 lg:mt-14 max-w-lg">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs text-[#E6C665] font-medium mb-4">
              <Scissors className="w-3.5 h-3.5" />
              <span>Plataforma Operacional & Financeira Completa</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-serif font-normal leading-tight text-white tracking-tight">
              Gestão de excelência para o seu salão, clínica ou spa.
            </h2>
            <p className="text-sm text-stone-300 mt-4 leading-relaxed font-light">
              Elimine gargalos de recepção, comande atendimentos em tempo real e realize a divisão de comissões com conformidade jurídica na Lei Salão-Parceiro.
            </p>
          </div>
        </div>

        {/* Centro: 3 Pilares Principais com Ícones */}
        <div className="relative z-10 my-8 lg:my-10 space-y-4 max-w-lg">
          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Agenda Visual & Comandas Dinâmicas</h3>
              <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
                Fila de espera, check-in de clientes e abertura de comandas com abatimento automático de sinal prévio.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-[#E6C665] shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Comissões & Lei Salão-Parceiro</h3>
              <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
                Rateio seguro entre proprietário, profissional e auxiliar com liberação por execução ou recebimento.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sky-300 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-white">Multi-Unidades & Isolamento de Dados</h3>
              <p className="text-[11px] text-stone-300 mt-0.5 leading-snug">
                Políticas de Row-Level Security (RLS) no PostgreSQL: cada salão tem seus dados totalmente isolados.
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé do Painel Esquerdo: Status da Nuvem Neon */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-400">
          <div className="inline-flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dbStatus ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dbStatus ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
            <Database className="w-3.5 h-3.5 text-stone-300" />
            <span className="text-stone-300 font-mono-tabular">
              {dbStatus ? `Neon Postgres Conectado (${dbStatus.latencyMs}ms)` : isDbLoading ? 'Conectando ao banco Neon...' : 'Banco em Nuvem Ativo'}
            </span>
          </div>

          <span className="text-[11px] text-stone-400">
            Criptografia pgcrypto ativa
          </span>
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* PAINEL DIREITO: Formulário de Autenticação (Login / Cadastro)         */}
      {/* --------------------------------------------------------------------- */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md bg-white rounded-3xl p-7 sm:p-9 shadow-xl border border-stone-200/90 relative">
          {/* Seletor de Abas (Pill Navigation) */}
          <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-2xl mb-7 text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                tab === 'login'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Acessar Salão
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`py-2.5 rounded-xl transition-all cursor-pointer ${
                tab === 'register'
                  ? 'bg-white text-stone-900 shadow-sm font-semibold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Cadastrar Novo Salão
            </button>
          </div>

          {/* Cabeçalho da Aba */}
          <div className="mb-6">
            <h2 className="text-xl sm:text-2xl font-serif font-semibold text-stone-900 tracking-tight">
              {tab === 'login' ? 'Entrar no Sistema' : 'Cadastre seu Estabelecimento'}
            </h2>
            <p className="text-xs text-stone-500 mt-1.5 leading-relaxed">
              {tab === 'login'
                ? 'Informe suas credenciais para gerenciar agendamentos, equipe e caixa.'
                : 'Crie seu salão no Neon DB. Inicialização imediata com serviços e unidade.'}
            </p>
          </div>

          {/* Banner de Erro */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">{error}</div>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Nome Completo do Proprietário
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Anderson Alves"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-stone-50/60 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#143328]/25 focus:border-[#143328] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Nome Comercial do Salão
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={salonName}
                      onChange={(e) => setSalonName(e.target.value)}
                      placeholder="Ex: Studio Elegance Hair"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-stone-50/60 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#143328]/25 focus:border-[#143328] transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1.5">
                      Telefone / WhatsApp
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full pl-10 pr-3 py-2.5 text-xs bg-stone-50/60 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#143328]/25 focus:border-[#143328] transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1.5">
                      CNPJ <span className="text-stone-400 font-normal">(Opcional)</span>
                    </label>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={cnpj}
                        onChange={(e) => setCnpj(e.target.value)}
                        placeholder="00.000.000/0001-00"
                        className="w-full pl-10 pr-3 py-2.5 text-xs bg-stone-50/60 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#143328]/25 focus:border-[#143328] transition-all"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1.5">
                E-mail de Acesso
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-stone-50/60 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#143328]/25 focus:border-[#143328] transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-stone-700">
                  Senha
                </label>
                {tab === 'login' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-[#143328] hover:underline font-medium cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-stone-50/60 border border-stone-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#143328]/25 focus:border-[#143328] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {tab === 'login' ? (
              <div className="flex items-center justify-between pt-1 text-xs text-stone-600">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    className="rounded text-[#143328] focus:ring-[#143328]"
                  />
                  <span>Lembrar meu e-mail</span>
                </label>
              </div>
            ) : (
              <div className="pt-1 text-[11px] text-stone-600">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="rounded text-[#143328] focus:ring-[#143328] mt-0.5"
                  />
                  <span>
                    Concordo com os Termos de Uso, Política de Privacidade e Consentimento LGPD do Atelier Gestão.
                  </span>
                </label>
              </div>
            )}

            {/* Botão de Ação Principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-[#143328] hover:bg-[#1a4436] active:bg-[#0f281f] text-white rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Conectando ao banco...</span>
                </div>
              ) : tab === 'login' ? (
                <>
                  <span>Entrar no Salão</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Criar Salão e Acessar</span>
                  <CheckCircle2 className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé Alternativo: Ver Demonstração Pública */}
          {onViewClientPortal && (
            <div className="mt-6 pt-5 border-t border-stone-200/80 text-center">
              <button
                type="button"
                onClick={onViewClientPortal}
                className="inline-flex items-center gap-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors font-medium cursor-pointer"
              >
                <span>Visualizar Página Pública de Agendamento do Cliente</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Esqueceu a Senha */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-stone-900">Recuperação de Acesso</h3>
              <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                As senhas são criptografadas com o algoritmo Blowfish (`pgcrypto`) no Neon PostgreSQL.
                Caso tenha esquecido sua senha, você pode cadastrar um novo salão ou redefini-la via suporte do administrador.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-900 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
