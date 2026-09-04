# Roadmap

## Concluído
- [x] Painel geral: ações em massa (bloquear/desbloquear/liberar prazo) + registro de troca de senha
- [x] Painel geral: controle de prazo (adicionar/remover tempo, definir vencimento, encerrar acesso) — RPCs criadas e erro "reading 'rest'" corrigido

## Evolução UX/UI completa do BarberControl (solicitada — em andamento)
Ordem de execução planejada. Cada item deve ser entregue completo (mobile-first, estados vazios, loading, toasts).

- [ ] 11) Design system compartilhado: `src/components/admin/ui.tsx` (PageSection, StatCard, EmptyState com ícone/ação, Skeletons, Badge de status, Toolbar de filtros, SegmentedControl, botões/inputs padronizados) — reutilizado por todas as telas abaixo
- [ ] 1) Dashboard: hierarquia (próximos atendimentos + agenda de hoje em destaque), KPIs (faturamento período, agendamentos hoje, clientes/novos, taxa de comparecimento por status concluido vs nao_compareceu), gráficos Recharts (faturamento/agendamentos por dia), manter relatório PDF
- [ ] 2) Agenda: Hoje / anterior / próximo / calendário / semana, filtros barbeiro + status, horários em destaque, estados vazios, mobile
- [ ] 3) Agendamentos: busca por nome/telefone, filtros, detalhes em drawer, ações com feedback (confirmar/concluir/cancelar/não compareceu), preservar regras
- [ ] 4) Clientes/CRM: busca, cards responsivos, última visita, nº atendimentos, total gasto, serviço mais usado, WhatsApp, histórico com status/valores (tudo calculado de `appointments`)
- [ ] 5) Serviços: cards compactos (nome, preço, duração), editar/ativar/desativar/excluir
- [ ] 6) Profissionais: foto, nome, descrição, serviços associados (`barber_services`), status, ações
- [ ] 7) Financeiro: painel em `/admin/custos` + resumo (faturamento, custos, lucro, ticket médio, por barbeiro/serviço, filtros Hoje/7d/30d/mês, gráficos) usando `financial_summary` + appointments
- [ ] 8) Setup inicial: SetupChecklist/SetupWizard com progresso, itens (nome, serviços, profissionais, horários, intervalos, pagamentos, personalização, link) e mensagem de conclusão
- [ ] 9) Página pública: Hero -> Agendar -> Serviços -> Profissionais -> Galeria -> Horários/Local -> CTA final; CTA fixo discreto; galeria otimizada; preservar todos os campos
- [ ] 10) Fluxo público de agendamento: indicador de progresso, voltar sem perder dados, horários grandes, dias fechados diferenciados, estados de erro/sem horários; preservar Mercado Pago/Pix/WhatsApp/RPC
- [ ] 12) Revisão mobile de todas as telas admin + públicas
- [ ] 13) Verificação final: typecheck, rotas, isolamento multi-tenant

## Pendências anteriores
- [ ] Configuração inicial obrigatória da barbearia (checklist no Dashboard, banner de prazo só no Dashboard, bloqueio do agendamento público enquanto incompleto)
- [ ] Revisar avisos do linter de segurança (funções SECURITY DEFINER guardadas por sa_require)
