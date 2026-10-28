# GestaodeSalao → SaaS comercial: diagnóstico e plano de implementação

*Análise do repositório `Alves1986/GestaodeSalao` (branch `main`, commit `971eb73`) em 27/10/2026 · preparado por Claude · documento de trabalho para execução*

## 1. Veredito

O repositório é um **protótipo de interface muito bem especificado**, mas **ainda não é um SaaS**. O que tem valor e deve ser aproveitado: o modelo de domínio (411 linhas de tipos), as regras de negócio puras com 8 testes passando, o design (verde/dourado, tipografia serifada) e o escopo de produto de 26 seções. O que falta é tudo que é “servidor”: banco, login, isolamento entre salões, pagamentos, mensageria, fiscal, cobrança da própria plataforma, LGPD e operação em produção.

Hoje 100% dos dados são mocks em `useState` (somem ao recarregar a página), o “login” é um dropdown de perfil e vários recursos são **simulados de forma que parecem reais** (NFS-e com número aleatório, teste de backup que sempre passa, 2FA e criptografia só como texto). Vender assim gera risco jurídico (CDC e LGPD) e reputacional.

**Recomendação:** não reescrever do zero. Reaproveitar tipos, regras e visual; migrar a base para **Next.js + Supabase + Vercel** (a stack que você já usa); mover as regras críticas para servidor/banco; remover ou rotular tudo que é simulado.

**Ordem de ataque** (estimativa indicativa para 1 dev com apoio de IA; ajuste ao seu ritmo):

1. Fase 0 — higiene do repositório (1–2 dias)
2. Fase 1 — fundação: Next.js, Supabase Auth, multi-tenant com RLS (1–2 semanas)
3. Fase 2 — fluxo ponta a ponta no servidor: agenda → reserva online → atendimento → comanda → pagamento → caixa → comissão (3–4 semanas)
4. Fase 3 — financeiro, relatórios, CRM e importação CSV (2–3 semanas)
5. Fase 4 — cobrança da plataforma + onboarding self-service ⇒ **beta fechado vendável** (1–2 semanas)
6. Fases 5–7 — integrações (pagamentos, WhatsApp oficial, fiscal), conformidade/produção e lançamento (4–6 semanas, parte em paralelo)

## 2. O que o repositório é hoje (fatos verificados)

- **Stack:** Vite 8 + React 19 + Tailwind 4 + TypeScript, gerado no Google AI Studio (`.aistudio/`, `metadata.json`, `.env.example` com `GEMINI_API_KEY` e `APP_URL` do AI Studio). Não usa Next.js nem Supabase.
- **Tamanho:** 11.073 linhas em `src/`. `App.tsx` (1.311 linhas) concentra todo o estado e os handlers; 6 telas entre 856 e 1.256 linhas; `initialData.ts` com 1.420 linhas de mock.
- **Histórico:** 1 commit, 1 autor.
- **Build:** `vite build` passa (1 único bundle de 489 kB / 124 kB gzip, sem code-splitting). `tsc --noEmit` **falha com 2 erros** (`App.tsx:491`: `comandaStatus` inferido como `string`; `initialData.ts:392`: origem `'WhatsApp'` fora do tipo). O `tsconfig.json` **não tem `strict: true`**.
- **Testes:** 8 testes `node:test` só das regras puras (`salonRules.test.ts`); passam com `npx tsx --test`, mas não há script `test`, CI nem teste de tela ou integração.
- **Ausências confirmadas por busca no código:** nenhum `fetch`, `localStorage`, router, login/senha/token ou Supabase. `express`, `dotenv`, `@google/genai` e `motion` estão no `package.json` sem nenhum import.
- **Metadados:** sem README e sem LICENSE; `package.json` com nome `react-example` v0.0.0; `.npmrc` com `legacy-peer-deps=true` (esconde conflitos de dependência); script `clean` aponta para `server.js` inexistente; arquivos com cabeçalho SPDX Apache-2.0 do template.
- **Arquivos que não deveriam estar no repo/deploy:** 14 PNGs do AI Studio (≈2,1 MB) em `.aistudio/` e o documento de escopo em `public/assets/aistudio/` (tudo em `public/` é publicado no deploy).

### Escopo prometido × realidade

| Módulo | Hoje | Falta para produção |
| --- | --- | --- |
| Painel de operação | UI com mocks; comparativo “+14,2%” fixo | Consultas reais por período/unidade e comparativos calculados |
| Agenda e recepção | UI + checagem de conflito só no formulário interno | Disponibilidade real (jornada, almoço, bloqueios, pausa de coloração, recurso), concorrência, arrastar-e-soltar e recorrência (inexistentes), lista de espera real |
| Agendamento online | Gera reserva “confirmada” sem pagamento | Ver P0-5 |
| Comandas e atendimento | Fluxo visual completo | Regras corrigidas (seção 4), estorno parcial, comprovante, fotos/anexos da ficha (upload inexistente) |
| Clientes e CRM | Cadastro e funil visuais | Consentimentos LGPD versionados, importação/exportação CSV (inexistentes), deduplicação |
| Serviços e profissionais | Cadastro em memória | Preço por profissional/unidade, jornada, folgas e férias persistidas |
| Estoque e compras | Movimentos em memória | Ledger imutável, lote/validade, consumo técnico, transferência entre unidades |
| Comissões | Cálculo por item; “pagar” só muda status em memória | Regras (fixo, faixas, categoria), adiantamentos, fechamento de período imutável |
| Financeiro e caixa | Cálculo de caixa e DRE com mock | Contas a pagar/receber persistidas, conciliação, taxas por operadora configuráveis |
| Marketing e automações | Lista de regras; botão soma +14 ao contador | Motor de envio, canais, opt-out, logs de entrega |
| Pacotes, assinaturas, fidelidade | Resgate de sessão em memória | Venda, recebimento e uso como eventos separados; validade; vale-presente (inexistente) |
| Área do profissional | Telas de leitura | Login próprio, agenda real, iniciar/concluir atendimento, solicitações de bloqueio |
| Área do cliente | Uma tela pública | Login por link/OTP; dados só do próprio cliente |
| Admin da plataforma | Tabela e “Provisionar ambiente” em memória | Provisionamento real, planos e limites, cobrança, suspensão, suporte auditado |
| Fiscal (NFS-e) | **Simulado** | Provedor fiscal real ou remover |

## 3. Bloqueadores para comercializar (P0)

Nada abaixo é opcional: enquanto existir, o produto não pode ser vendido.

**P0-1 · Sem backend, banco nem persistência.** `App.tsx` mantém 16 estados de dados inicializados com `INITIAL_*`; recarregar a página apaga tudo. → Fase 1.

**P0-2 · Sem autenticação; “permissões” são um dropdown.** O seletor de Perfil (`App.tsx:825`), o seletor de Ambiente (inclui “Admin SaaS”) e o de Estabelecimento Ativo ficam disponíveis a qualquer visitante, e **todos os salões são carregados no navegador**. `getAllowedMenusForRole` só esconde menus; nenhuma ação confere permissão. → Auth + RBAC validado no servidor/RLS (Fase 1).

**P0-3 · Multi-tenant só simulado.** Existe `salonId` nos tipos, mas nada isola dados; o requisito “autorização validada no servidor” (escopo, seção 17) não é atendido. → RLS em todas as tabelas + testes de isolamento.

**P0-4 · Recursos simulados que parecem reais** (remover, ou manter apenas num tenant de demonstração com aviso visível):

- NFS-e: `handleIssueNfse` monta o número com `Math.random()` (`App.tsx:541`).
- “Testar Restauração de Backup” sempre exibe “validada com 100% de integridade” (`SettingsAndPortalsView.tsx:521`).
- O texto afirma “2FA ativa” e “criptografia de fichas de saúde”: nenhum dos dois existe.
- “Trilha de Auditoria Imutável” é um array em memória, editável; o usuário vira `Usuário (perfil)` e o horário é fixo (`App.tsx:166`).
- “Sessão de suporte temporário auditado (30 min)” é só uma mensagem.
- Automações: o botão de envio soma +14 ao contador (`App.tsx:1258`); nada é enviado. A lista de espera só exibe uma mensagem de “oferta automática”.
- Sinal Pix “vinculado” sem Pix; orçamento “gerado” sem entidade de orçamento.

Risco: propaganda enganosa (CDC) e declarar controles inexistentes (LGPD).

**P0-5 · Reserva online incorreta e insegura** (`SettingsAndPortalsView.tsx`, \~740–785 e \~1030):

- `clientId: 'cli-1'` fixo: toda reserva online vai para a mesma cliente.
- “Qualquer profissional” escolhe sempre o primeiro da lista, sem checar disponibilidade.
- Não chama `hasScheduleConflict`: dupla reserva é possível.
- Grava `status: 'confirmado'` e `depositPaid = depositRequired` sem nenhum pagamento.
- A aba “Meus horários” mostra os 4 primeiros agendamentos do salão, de qualquer cliente (vazamento de dados).

**P0-6 · Datas, horas e IDs fixos.** “Hoje” é sempre 26/10/2026 (cabeçalho `App.tsx:845`, `selectedDate`, gráfico semanal em `salonRules.ts:363–421`); os handlers gravam `15:05`, `15:10`, `16:10`, `15:25`; não há fuso horário. IDs usam `Date.now()` (colisão) e o número da comanda é `2040 + quantidade + 1` (colide com mais de um usuário).

**P0-7 · Erros nas regras financeiras e de estoque.** Ver seção 4.

**P0-8 · Dados e arquivos inadequados para produção.** `initialData.ts` traz CPFs, telefones e e-mails em formato real; `.aistudio/` e o escopo em `public/` seriam publicados. → Seeds obviamente fictícios (e-mails `@example.com`, CPF de teste) e limpeza do repositório.

## 4. Bugs de regra de negócio (corrigir com teste antes de migrar)

Regra prática: **escreva o teste que falha, corrija, só então porte para o servidor.** Os testes atuais cobrem as funções puras de `salonRules.ts`, não os handlers do `App.tsx`, onde estão quase todos os bugs.

| # | Onde | Comportamento atual | Correção |
| --- | --- | --- | --- |
| B1 | `calculateComandaTotals` | Sinal maior que o total some: total 100 + gorjeta 10 com sinal 150 ⇒ a pagar 0, status “pago”; R$ 50 de crédito e a gorjeta se perdem (verificado por execução). `depositApplied` é ignorado | Sinal vira pagamento do tipo `deposit` aplicado uma única vez; excedente vira crédito interno; gorjeta fora do abatimento |
| B2 | `handleRegisterPayment` | Qualquer pagamento, mesmo parcial, marca atendimento “concluído”, agendamento “pago” e **todas** as comissões da comanda como “elegíveis” | Pagamento parcial ⇒ “parcial”; elegibilidade pela regra do salão (execução × recebimento) com `calculateItemCommission`; concluir ≠ pagar |
| B3 | `handleCancelComandaItem` | Devolve estoque, mas **não estorna comissão nem financeiro**; o log afirma que sim. A comissão do item cancelado vira “elegível” no pagamento | Cancelar numa única transação: item, estoque, comissão (“estornada”) e recebível |
| B4 | `handleStartAttendanceAndOpenComanda` | O serviço principal não gera registro de comissão (só itens adicionados depois geram) | Gerar comissão de todos os itens na liquidação, de forma idempotente |
| B5 | `handleAddComandaItem` e estoque | `Math.max(0, estoque − qtd)` permite vender sem estoque e desalinha saldo e movimentos; a baixa ocorre ao adicionar, não ao liquidar | Saldo = soma do ledger; bloquear ou alertar estoque insuficiente; baixa na liquidação |
| B6 | Taxas de cartão | `0,89 / 1,39 / 2,89` fixas no código | Tabela de taxas por salão, método, parcelas e vigência |
| B7 | Dinheiro em `number` | Ponto flutuante (`0.1 + 0.2`) | Inteiros em centavos no domínio e no banco |
| B8 | `hasScheduleConflict` | Compara só profissional e horário; ignora pausa/preparo do serviço, jornada, almoço, bloqueios, recurso (cadeira/sala) e unidade; não é atômico | Validar no servidor com constraint de exclusão (seção 6) e regras de jornada |
| B9 | Encaixe autorizado e origem | A justificativa vai só para `notes`, sem permissão nem auditoria; a origem “WhatsApp” é gravada para tudo que não é recepção/encaixe | Permissão específica + evento de auditoria; origem explícita no formulário |
| B10 | Comissão | Só percentual | Valor fixo, faixas, regra por categoria, adiantamentos e fechamento de período imutável |

### Regras de consistência do escopo (seção 21): situação atual

| # | Regra | Situação | Como fechar |
| --- | --- | --- | --- |
| 1 | Mesmo horário não confirmado 2× | Parcial (só no formulário interno) | Constraint de exclusão + transação + reserva temporária |
| 2 | Sinal abatido uma vez | Parcial (B1) | Sinal como pagamento aplicado 1× |
| 3 | Notificação de pagamento repetida | Parcial (dedup só em memória) | `UNIQUE (tenant_id, provider, external_id)` + webhook idempotente |
| 4 | Concluir ≠ pago | Quebrada (B2) | Eventos separados |
| 5 | Pacote: venda ≠ uso | Função correta, sem ledger | Eventos separados: venda, recebimento, uso |
| 6 | Cancelar item ajusta estoque, comissão e financeiro | Só estoque (B3) | Transação única |
| 7 | Preço/comissão não reescrevem histórico | Parcial (snapshot no item) | Snapshot em todas as tabelas + fechamento de período |
| 8 | Estorno parcial | Ausente | Tabela de estornos por pagamento e item |
| 9 | Caixa fechado imutável | Só texto | Trigger bloqueando escrita; reabertura com permissão e auditoria |
| 10 | Exclusão não apaga rastro | Ausente | Sem `DELETE` em tabelas financeiras; `deleted_at`; auditoria append-only |
| 11 | Falha de integração visível e reprocessável | Ausente | Tabela `integration_events` com status e tentativas |
| 12 | Sem acesso cruzado entre salões | Ausente | RLS + testes automatizados |

## 5. Arquitetura-alvo

**Stack:** Next.js (App Router) + TypeScript `strict` + Tailwind 4 (já usado) + Supabase (Auth, Postgres com RLS, Storage, cron/filas) + Vercel. Apoio: Zod (validação), TanStack Query, react-hook-form, Sentry, e-mail transacional (Resend ou Postmark) e Playwright (E2E).

**Por que Next.js e não manter Vite:** a página pública de cada salão precisa de SSR/SEO e de subdomínio ou domínio próprio (middleware); webhooks de pagamento, WhatsApp e fiscal exigem rota de servidor; segredos não podem ir ao navegador. Alternativa menos indicada: manter Vite + Supabase Edge Functions.

**Rotas e ambientes**

- `app.seudominio.com` — painel do salão (os 15 menus viram rotas: `/agenda`, `/comandas`…)
- `{slug}.seudominio.com` e domínio próprio — página pública de agendamento (SSR, tema do tenant vindo do banco)
- `/portal` — área do cliente (link mágico ou OTP; vê apenas os próprios dados)
- `/profissional` — PWA mobile do profissional
- `admin.seudominio.com` — console da plataforma (MFA obrigatório; sem “trocar de salão” por dropdown: suporte por acesso temporário registrado)
- `/api/webhooks/pagamentos`, `/api/webhooks/whatsapp`, `/api/webhooks/fiscal` — entrada de eventos externos

**Estrutura de pastas sugerida**

```
src/
  app/                # rotas (salão, público, portal, admin, api)
  domain/             # tipos + regras puras (salonRules migrado) + testes
  server/             # actions, serviços, repositórios, integrações
  lib/                # clientes Supabase, clock, money, timezone
  components/         # UI por módulo (arquivos < 300 linhas)
supabase/
  migrations/  seed.sql  tests/
docs/                 # escopo, decisões (ADRs), runbooks
```

**Princípios (valem para toda tarefa)**

1. O servidor é a fonte da verdade: toda mutação passa por server action/RPC com validação Zod, checagem de permissão e transação.
2. Regras de agenda e financeiro executam no banco/servidor; o navegador só exibe.
3. Dinheiro em centavos (`bigint`); datas em `timestamptz` com o fuso do salão (padrão `America/Sao_Paulo`); relógio injetável (`now()`), nunca data fixa.
4. Eventos imutáveis (pagamentos, estoque, caixa, comissão, auditoria) e estados derivados deles.
5. Toda tabela tem `tenant_id` e RLS “negar por padrão”.
6. Toda integração tem idempotência, retentativa e log.

**O que reaproveitar:** `types/salon.ts` (base do modelo), `utils/salonRules.ts` + testes (portar e ampliar), tokens de `index.css`, fontes e identidade visual, o documento de escopo (mover para `docs/`). **O que descartar:** `initialData.ts` como fonte de dados (vira seed de demonstração), os seletores de perfil/ambiente/tenant e todos os recursos simulados da seção 3.

## 6. Modelo de dados e isolamento (SQL essencial)

Convenções: `tenant_id` em toda tabela; `id uuid`; valores em centavos; `created_at`/`updated_at`; `deleted_at` em vez de `DELETE`; RLS ligado em tudo.

```sql
create extension if not exists btree_gist;

create type member_role as enum
  ('proprietario','gerente','recepcao','caixa','financeiro','profissional','estoque','marketing');

create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null, legal_name text, cnpj text,
  timezone text not null default 'America/Sao_Paulo',
  status text not null default 'trial'
    check (status in ('trial','active','past_due','suspended','canceled')),
  trial_ends_at timestamptz,
  theme jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table memberships (
  user_id uuid not null references auth.users on delete cascade,
  tenant_id uuid not null references tenants on delete cascade,
  unit_id uuid,
  role member_role not null,
  primary key (user_id, tenant_id, role)
);

create function has_role(t uuid, roles member_role[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from memberships m
    where m.user_id = (select auth.uid()) and m.tenant_id = t and m.role = any(roles)
  );
$$;
```

Padrão de RLS (repetir em toda tabela):

```sql
alter table clients enable row level security;

create policy clients_read on clients for select
  using (has_role(tenant_id, array['proprietario','gerente','recepcao','caixa','marketing']::member_role[]));

create policy clients_write on clients for all
  using (has_role(tenant_id, array['proprietario','gerente','recepcao']::member_role[]))
  with check (has_role(tenant_id, array['proprietario','gerente','recepcao']::member_role[]));
```

Agenda sem dupla reserva. A reserva é dividida em etapas: a pausa de coloração libera o profissional, mas mantém a cadeira ocupada.

```sql
create table appointment_segments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  appointment_id uuid not null,
  professional_id uuid not null,
  resource_id uuid,
  kind text not null check (kind in ('prep','active','pause','cleanup')),
  period tstzrange not null,
  blocks_professional boolean not null default true,
  blocks_resource boolean not null default true,
  active boolean not null default true,   -- false ao cancelar ou faltar
  constraint no_double_professional exclude using gist
    (professional_id with =, period with &&) where (blocks_professional and active),
  constraint no_double_resource exclude using gist
    (resource_id with =, period with &&) where (resource_id is not null and blocks_resource and active)
);
```

Pagamentos idempotentes e imutáveis; auditoria append-only:

```sql
create table payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  comanda_id uuid not null,
  kind text not null check (kind in ('payment','deposit','refund','credit_use')),
  method text not null,
  amount_cents bigint not null check (amount_cents > 0),
  fee_cents bigint not null default 0,
  installments int not null default 1,
  provider text, external_id text,
  cash_session_id uuid,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, provider, external_id)
);

create function forbid_change() returns trigger language plpgsql as $$
begin raise exception 'registro imutável: use estorno ou ajuste'; end $$;

create trigger payments_immutable before update or delete on payments
  for each row execute function forbid_change();
create trigger audit_immutable before update or delete on audit_log
  for each row execute function forbid_change();
```

Caixa fechado não aceita escrita:

```sql
create function block_closed_cash() returns trigger language plpgsql as $$
begin
  if exists (select 1 from cash_sessions s
             where s.id = new.cash_session_id and s.closed_at is not null) then
    raise exception 'caixa fechado: reabertura exige permissão e auditoria';
  end if;
  return new;
end $$;

create trigger payments_cash_open before insert on payments
  for each row execute function block_closed_cash();
create trigger cash_movements_cash_open before insert on cash_movements
  for each row execute function block_closed_cash();
```

Demais tabelas (mesma convenção): `units`, `profiles`, `professionals` (+ jornada, folgas, bloqueios), `services` (+ materiais técnicos), `resources`, `clients` (+ `consents` versionados), `appointments`, `comandas`, `comanda_items` (snapshot de preço e % de comissão), `refunds`, `cash_sessions`, `cash_movements`, `financial_entries`, `products`, `stock_movements` (ledger: saldo = soma), `commission_entries` e `commission_periods` (fechados), `packages` e `package_events`, `automation_rules`, `messages`, `integration_events`, `audit_log`, `plans`, `subscriptions`, `payment_fee_rules`.

**Regras de segurança do modelo**

- A chave `service_role` fica só no servidor; o navegador usa apenas a chave pública.
- Reserva pública passa por função/rota de servidor com validação, rate limit e CAPTCHA (Turnstile ou hCaptcha); nunca `INSERT` direto do anônimo.
- Storage privado, caminho `{tenant_id}/...`, políticas pelo primeiro segmento do caminho, URLs assinadas; fichas de saúde em bucket separado.
- Teste de isolamento no CI: dois tenants e dois usuários; o usuário A não lê nem escreve nada do B em nenhuma tabela (pgTAP ou script).

## 7. Plano de execução por fases

Cada tarefa termina com **evidência** (saída de comando e, em tela, print ou gravação). Um PR por tarefa. Nunca commitar segredos.

### Fase 0 — Higiene do repositório (1–2 dias)

| Tarefa | O que fazer | Evidência |
| --- | --- | --- |
| T0.1 | Corrigir os 2 erros do `tsc` (tipar `comandaStatus` corretamente; ajustar o tipo de origem ou o dado `'WhatsApp'`) | `npm run lint` sem erros |
| T0.2 | Ativar `strict: true` no `tsconfig.json` e corrigir o que surgir | `npm run lint` verde |
| T0.3 | Script `test` (`tsx --test 'src/**/*.test.ts'`) e workflow GitHub Actions (install, lint, test, build) | CI verde no PR |
| T0.4 | `git rm -r .aistudio` e adicionar ao `.gitignore`; mover o escopo para `docs/escopo.md` e apagar `public/assets/aistudio/` | `git ls-files` sem esses caminhos |
| T0.5 | Remover `@google/genai`, `express`, `dotenv` e `motion`; corrigir `name` e `clean`; remover `legacy-peer-deps` e resolver os conflitos | `npm ci` e build ok |
| T0.6 | README (stack, como rodar, estrutura); LICENSE proprietária ou decisão explícita; remover cabeçalhos SPDX Apache-2.0 | Arquivos no repo |
| T0.7 | ESLint + Prettier; hook de pre-commit; secret scanning (gitleaks) no CI | CI verde |
| T0.8 | Trocar PII realista por seeds fictícios; criar `Clock`/`now()` e eliminar datas e horas fixas | Buscar `2026-10-26` e `15:05` em `src/` não retorna nada fora dos testes |
| T0.9 | Escrever os testes que reproduzem B1–B7 (devem falhar) | Testes vermelhos documentados |

### Fase 1 — Fundação SaaS (1–2 semanas)

- **T1.1** Criar o app Next.js no repositório (branch `saas`); mover `types` e `salonRules` para `src/domain` com os testes; migrar os tokens visuais.
- **T1.2** Projetos Supabase separados (dev, staging, prod); CLI e migrations versionadas; seed de desenvolvimento.
- **T1.3** Tabelas base (tenants, units, memberships, profiles, professionals, services, clients, resources), RLS e `has_role`.
- **T1.4** Auth: e-mail e senha + link mágico; recuperação de senha; MFA TOTP para proprietário e admin; remover os seletores de Perfil, Ambiente e Tenant — o contexto vem da sessão.
- **T1.5** Middleware por subdomínio/domínio próprio; tema do tenant carregado no servidor; validar contraste com `getContrastRatio` ao salvar (no servidor).
- **T1.6** Testes de isolamento entre tenants no CI.

**Aceite:** usuário do tenant A não acessa nada do B (teste automatizado); F5 mantém os dados; recepção recebe 403 ao executar ação de gerente (teste); o seletor de perfil não existe mais.

### Fase 2 — Núcleo operacional no servidor (3–4 semanas)

- **T2.1** Agenda: segmentos com constraints; disponibilidade (jornada, almoço, folgas, bloqueios); função `get_available_slots`; reserva temporária de 10 min; reagendar e cancelar com política; auditoria.
- **T2.2** Reserva online real: página `/{slug}` com SSR; função com validação, rate limit e CAPTCHA; cliente identificado por telefone/e-mail (cria ou reaproveita) com consentimento LGPD registrado; status `aguardando_sinal` até o webhook confirmar o pagamento; “qualquer profissional” escolhe quem está livre.
- **T2.3** Recepção e atendimento: check-in, fila, início e fim com horário do servidor; transferência com permissão.
- **T2.4** Comanda e pagamento transacional (`register_payment`): sinal como pagamento, parcial, múltiplas formas, divisão, desconto com limite por perfil, estorno parcial, gorjeta; status derivado; corrigir B1–B4.
- **T2.5** Caixa: sessão por unidade e operador, movimentos imutáveis, fechamento com divergência e aprovação, reabertura auditada.
- **T2.6** Estoque: ledger, saldo, alerta de mínimo, consumo técnico por serviço, lote e validade (B5).
- **T2.7** Comissões: snapshot de regra, elegibilidade por execução ou recebimento, estorno no cancelamento, fechamento de período (B3, B10).

**Aceite:** E2E (Playwright) do caminho completo — reservar online → pagar sinal (sandbox) → check-in → atender → comanda → pagar → fechar caixa → ver comissão — e os testes das 12 regras verdes.

### Fase 3 — Financeiro, relatórios e CRM (2–3 semanas)

- Contas a pagar e a receber persistidas, despesas recorrentes, anexos no Storage, conciliação manual.
- Relatórios em views SQL, sempre com a “data base” explícita (venda, execução, vencimento ou recebimento); DRE gerencial.
- CRM: tags, funil, inativos, aniversariantes; importação CSV (clientes, serviços, produtos) com pré-visualização e desfazer; exportação com permissão e auditoria.
- Paginação, filtros no servidor e índices por `tenant_id` + data.

**Aceite:** todo número de relatório rastreável até a operação de origem (critério do escopo, seção 25).

### Fase 4 — Cobrança da plataforma e onboarding (1–2 semanas)

- Tabelas `plans` e `subscriptions` com limites (unidades, profissionais, mensagens, armazenamento); trial de N dias.
- Cobrança recorrente via provedor (Asaas, Stripe, Pagar.me ou Mercado Pago — comparar taxas, Pix/boleto/cartão e emissão de nota); webhooks idempotentes; régua de inadimplência (aviso → modo somente leitura → suspensão).
- Onboarding self-service: dados do salão → unidade → serviços → profissionais → horários → tema → publicar a página.
- Tenant de demonstração (seed + faixa “dados fictícios”), separado da produção.
- Console admin real: provisionamento, planos, MRR/churn/trial, suporte com acesso temporário e registro.

**Marco:** beta fechado vendável com 5–10 salões piloto.

### Fase 5 — Integrações (2–4 semanas, parte em paralelo)

- **Pagamentos (Pix, cartão, link):** definir o modelo — cada salão com a própria conta no provedor evita que você custodie dinheiro de terceiros; webhooks idempotentes; sandbox primeiro.
- **WhatsApp:** usar a WhatsApp Business Platform (Cloud API oficial) com templates aprovados. Evolution API/Baileys é não oficial e expõe seus clientes a bloqueio de número; se oferecer, só como opção avançada, com aviso e termo de responsabilidade.
- **E-mail** transacional; SMS opcional.
- **Fiscal:** integrar por provedor de API fiscal (exemplos: Focus NFe, eNotas, PlugNotas — comparar cobertura de municípios e preço) ou oferecer emissão manual sem simular; validar o enquadramento com contador.
- **Motor de automações:** fila (pg\_cron, Supabase Queues ou similar), opt-in/opt-out, janelas de envio, limites do plano, log de entrega e reprocessamento.

### Fase 6 — Conformidade e produção (começa na Fase 1)

Ver seção 8.

### Fase 7 — Lançamento (1–2 semanas)

Landing e página de preços; termos, política de privacidade e DPA publicados; central de ajuda e vídeos curtos; canal de suporte e SLA; status page; analytics de ativação (cadastro → 1º agendamento → 1ª comanda paga); NPS; programa de indicação.

## 8. Segurança, LGPD e confiabilidade (checklist)

**Segurança**

- [ ] RLS em 100% das tabelas; teste automatizado de isolamento
- [ ] `service_role` e demais segredos só em variáveis de ambiente (Vercel/Supabase); gitleaks no CI; `.env*` fora do git (já está no `.gitignore`)
- [ ] Validação Zod em toda entrada; rate limit e CAPTCHA em login, reserva pública e recuperação de senha
- [ ] MFA para proprietário e admin; sessões com expiração e encerramento remoto
- [ ] Cabeçalhos de segurança (CSP, HSTS, frame-ancestors); CORS restrito
- [ ] Storage privado com URLs assinadas e caminho por tenant
- [ ] Auditoria append-only das ações sensíveis (desconto, cancelamento, estorno, exportar clientes, ver ficha de saúde, reabrir caixa) com usuário real, IP e horário do servidor
- [ ] Dependabot e `npm audit` no CI; pentest básico (OWASP Top 10) antes do lançamento geral

**LGPD** (validar tudo com advogado)

- [ ] Papéis definidos: o salão é controlador e sua empresa é operadora — contrato/DPA
- [ ] Termos de Uso, Política de Privacidade e aviso de cookies publicados
- [ ] Consentimento registrado e versionado (marketing, ficha técnica); revogação fácil
- [ ] Dados de saúde (alergias, restrições): **minimizar**; campo restrito por permissão, criptografado, com acesso registrado; avaliar se o recurso é indispensável no MVP
- [ ] Fluxo de direitos do titular: exportar, corrigir, anonimizar ou excluir
- [ ] Política de retenção e descarte; encarregado (DPO) com canal de contato
- [ ] Plano de resposta a incidentes, incluindo comunicação à ANPD e aos titulares nos prazos vigentes

**Confiabilidade**

- [ ] Backups automáticos + cópia lógica periódica em armazenamento separado; **restauração testada todo mês**, com evidência (substitui o botão simulado)
- [ ] Sentry (front e servidor), monitor de uptime, alertas de falha de webhook e de fila
- [ ] Ambientes dev, staging e prod; migrations versionadas; plano de rollback; deploy preview
- [ ] Índices e paginação; orçamento de performance (LCP/INP) no celular
- [ ] PWA instalável (manifest + service worker) para profissional e cliente

## 9. Checklist Go / No-Go

**Beta fechado**

- [ ] Nenhum recurso simulado visível fora do tenant de demonstração
- [ ] Testes de isolamento e das 12 regras verdes no CI
- [ ] E2E do caminho completo verde
- [ ] Login real, MFA para donos, recuperação de senha
- [ ] Reserva online com sinal real (sandbox e produção)
- [ ] Backup restaurado com sucesso ao menos 1×
- [ ] Termos, política de privacidade e DPA publicados
- [ ] Cobrança da plataforma funcionando (trial → pago → inadimplência)
- [ ] Monitoramento e alertas ativos; canal de suporte definido

**Lançamento geral:** tudo acima + integrações de pagamento e WhatsApp oficial em produção, fiscal resolvido (integrado ou manual explícito), importação CSV, pentest básico e 5–10 salões estáveis por 30 dias.

## 10. Decisões e riscos

| Tema | Risco | Decisão recomendada |
| --- | --- | --- |
| WhatsApp | API não oficial pode banir o número do salão | Cloud API oficial como padrão |
| Pagamentos | Custodiar valores de terceiros traz obrigações regulatórias | Conta do provedor por salão (sub-conta ou chave própria); consultar contador e advogado |
| Fiscal | NFS-e varia por município; simular é risco legal | Provedor fiscal ou emissão manual explícita |
| Dados de saúde | Dado sensível (LGPD) | Minimizar, restringir, criptografar e registrar acesso |
| Escopo | O escopo tem 26 seções; tentar tudo atrasa a venda | Vender a Etapa 1 do próprio escopo (agenda → caixa) e liberar o resto por plano |
| Licença | Cabeçalhos Apache-2.0 do template | Definir licença proprietária e limpar cabeçalhos |
| Marca | “Atelier Gestão” e salões fictícios usados no código | Checar disponibilidade da marca (INPI) e do domínio antes de investir em branding |
| Preços | R$ 190 / 390 / 690 fixos no código | Validar com os pilotos; guardar na tabela `plans` |

## 11. Como executar este documento

1. Exporte este documento como Markdown e salve em `docs/PLANO_SAAS.md` no repositório.
2. Trabalhe tarefa por tarefa, com um PR e a evidência de cada uma. Prompt-base para o Claude Code ou o Antigravity:

```
Leia docs/PLANO_SAAS.md. Execute APENAS a tarefa T1.3.
- Escreva os testes primeiro; depois a implementação.
- Não altere nada fora do escopo da tarefa.
- Rode lint, test e build e cole a saída como evidência.
- Não grave segredos no repositório.
- Pare se o build falhar e me diga o bloqueio.
```

3. Ordem: Fase 0 inteira → Fase 1 → Fase 2 (T2.1 a T2.7) → Fase 3 → Fase 4 → Fases 5 a 7. A Fase 6 (segurança e LGPD) corre em paralelo desde a Fase 1.
4. Ao fechar cada fase, revise as tabelas de situação (seção 4) e atualize este documento.
