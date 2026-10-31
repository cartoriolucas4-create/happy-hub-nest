import { createFileRoute, Link } from "@tanstack/react-router";
import { createElement, useEffect, useState } from "react";
import {
  ArrowRight, CalendarClock, CalendarDays, Check, ChevronRight, Clock3,
  CreditCard, DollarSign, Link2, Menu, Monitor, Scissors, Smartphone,
  Tablet, UserCog, Users, X, BarChart3, ShieldCheck, Zap, CircleHelp,
  Phone, Video, MoreVertical, CheckCheck, Send, MessageCircle,
  CalendarCheck, Wallet, TrendingUp, Receipt, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import heroImg from "@/assets/hero-barbearia.jpg";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "MINHA BARBEARIA — Gestão completa para sua barbearia" },
    { name: "description", content: "Organize agenda, clientes, equipe, serviços e financeiro em um só lugar. Conheça o MINHA BARBEARIA e gerencie seu negócio pelo computador ou celular." },
    { property: "og:title", content: "MINHA BARBEARIA — Gestão completa para sua barbearia" },
    { property: "og:description", content: "Sua barbearia organizada, no computador, tablet ou celular." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ]}),
  component: Landing,
});

const resources = [
  [CalendarClock, "Agenda e agendamentos", "Organize horários, acompanhe atendimentos e tenha uma visão clara da rotina."],
  [Users, "Clientes", "Consulte cadastros e mantenha as informações dos clientes organizadas."],
  [UserCog, "Profissionais", "Gerencie sua equipe, os serviços e a rotina de cada profissional."],
  [Scissors, "Serviços", "Cadastre serviços, preços e duração dos atendimentos."],
  [Clock3, "Horários", "Configure dias, horários e intervalos de funcionamento."],
  [DollarSign, "Controle financeiro", "Acompanhe os registros financeiros da sua operação."],
  [CreditCard, "Pagamentos", "Organize os meios de pagamento utilizados na barbearia."],
  [Link2, "Link de agendamento", "Compartilhe sua página para que o cliente escolha serviço e horário."],
] as const;

const faqs = [
  ["Preciso instalar um programa no computador?", "Não. O MINHA BARBEARIA funciona pela internet. Acesse pelo navegador no computador, tablet ou celular."],
  ["Posso acessar pelo celular?", "Sim. A plataforma é preparada para acesso em Android e iPhone. Você também pode adicionar o acesso à tela inicial quando o navegador e o aparelho oferecerem essa opção."],
  ["Meus clientes conseguem agendar sozinhos?", "Você pode compartilhar o link público de agendamento da sua barbearia para que os clientes consultem os serviços e horários disponíveis."],
  ["Posso cadastrar meus profissionais e serviços?", "Sim. A configuração permite cadastrar os profissionais, serviços, valores, duração e horários da operação."],
  ["Como começo a usar?", "Crie sua conta, configure os dados da barbearia e compartilhe seu link de agendamento."],
];


const demoScenes = [
  { phase: "client", label: "WhatsApp", caption: "O cliente recebe seu link e inicia o agendamento." },
  { phase: "client", label: "Página da barbearia", caption: "A página apresenta a barbearia, os serviços e os valores." },
  { phase: "client", label: "Escolha do profissional", caption: "O cliente escolhe o serviço e quem vai atender." },
  { phase: "client", label: "Data e horário", caption: "Ele seleciona um horário disponível na agenda." },
  { phase: "client", label: "Agendamento confirmado", caption: "Pronto: o horário fica confirmado para o cliente." },
  { phase: "manager", label: "Painel do gestor", caption: "Você começa pelo resumo da operação e dos indicadores." },
  { phase: "manager", label: "Agenda", caption: "Acompanhe os horários, clientes e atendimentos do dia." },
  { phase: "manager", label: "Vendas", caption: "Registre também as vendas feitas presencialmente." },
  { phase: "manager", label: "Entradas e saídas", caption: "Lance receitas e despesas e acompanhe o saldo." },
  { phase: "manager", label: "Relatórios", caption: "Visualize o movimento e os resultados da barbearia." },
] as const;

function ProductDemo() {
  const [scene, setScene] = useState(0);
  useEffect(() => {
    const delay = scene < 5 ? 3360 : 4800;
    const timer = window.setTimeout(() => setScene(current => (current + 1) % demoScenes.length), delay);
    return () => window.clearTimeout(timer);
  }, [scene]);
  const current = demoScenes[scene] ?? demoScenes[0]!;
  const manager = current.phase === "manager";
  return <div className="product-demo-wrap">
    <div className="product-demo-glow" />
    <div className="product-demo-phone">
      <div className="product-demo-island" />
      <div className="product-demo-status"><span>9:41</span><span>●●●　▰</span></div>
      <div className="product-demo-screen">
        <div key={scene} className="demo-touch-pointer" aria-hidden="true" style={{ left: `${[44,50,52,57,50,78,76,74,72,76][scene]}%`, top: `${[33,74,43,48,78,58,52,68,66,60][scene]}%` }} />
        {scene === 0 ? <div className="demo-whatsapp">
          <div className="demo-wa-header"><span className="demo-wa-back">‹</span><span className="demo-wa-avatar">MB</span><span className="min-w-0 flex-1"><b>Minha Barbearia</b><small>Perfil comercial</small></span><Video size={16}/><Phone size={15}/><MoreVertical size={16}/></div>
          <div className="demo-wa-chat"><div className="demo-wa-date">HOJE</div><div className="demo-wa-bubble">Olá! Tudo bem? 💈<br/>Agende seu próximo horário com a gente pelo link abaixo.</div><div className="demo-wa-link"><span>🔗</span><div><b>Agende seu horário</b><small>agendocorte.com/minhabarbearia</small></div></div><div className="demo-wa-time">14:32　<CheckCheck size={11}/></div><div className="demo-wa-reply">Quero agendar! <small>14:33　✓✓</small></div></div>
          <div className="demo-wa-input"><span>＋</span><span>Mensagem</span><MessageCircle size={17}/><span>📷</span></div>
        </div> : scene === 1 ? <div className="demo-booking">
          <div className="demo-booking-cover"><span>MINHA BARBEARIA</span><b>ESTILO. PRECISÃO.<br/>NO SEU TEMPO.</b></div>
          <div className="demo-booking-content"><small>PÁGINA OFICIAL</small><h4>Barbearia do Lucas</h4><p>Seu estilo merece atenção aos detalhes.</p><b className="demo-booking-title">Nossos serviços</b><div className="demo-service"><span>✂ Corte tradicional</span><b>R$ 35,00</b></div><div className="demo-service"><span>✦ Barba</span><b>R$ 25,00</b></div><div className="demo-service"><span>✂ Corte + barba</span><b>R$ 55,00</b></div><div className="demo-gold-button">AGENDAR HORÁRIO　›</div></div>
        </div> : scene === 2 ? <div className="demo-booking">
          <div className="demo-mini-header"><span>‹</span><b>Agendar horário</b><span>1 de 3</span></div><div className="demo-booking-content"><small>SERVIÇO SELECIONADO</small><div className="demo-selected-service"><b>Corte tradicional</b><strong>R$ 35,00</strong></div><b className="demo-booking-title">Escolha o profissional</b><div className="demo-barber selected"><span className="demo-barber-avatar">LR</span><span><b>Lucas Rodrigues</b><small>Barbeiro</small></span><Check size={16}/></div><div className="demo-barber"><span className="demo-barber-avatar">MR</span><span><b>Marcos Ribeiro</b><small>Barbeiro</small></span></div><div className="demo-gold-button">CONTINUAR　›</div></div>
        </div> : scene === 3 ? <div className="demo-booking">
          <div className="demo-mini-header"><span>‹</span><b>Escolha o horário</b><span>2 de 3</span></div><div className="demo-booking-content"><small>OUTUBRO 2026</small><div className="demo-calendar">{["D","S","T","Q","Q","S","S","25","26","27","28","29","30","31"].map((d,i)=><span key={i} className={d==="30"?"active":""}>{d}</span>)}</div><b className="demo-booking-title">Sexta-feira, 30 de outubro</b><div className="demo-times">{["14:00","14:30","15:00","15:30","16:00","16:30"].map(t=><span key={t} className={t==="15:30"?"active":""}>{t}</span>)}</div><div className="demo-gold-button">CONFIRMAR HORÁRIO　›</div></div>
        </div> : scene === 4 ? <div className="demo-success"><span className="demo-success-check"><Check size={30}/></span><small>MINHA BARBEARIA</small><h4>Agendamento realizado!</h4><p>Seu horário está reservado.</p><div className="demo-confirm-card"><span>Serviço</span><b>Corte tradicional</b><span>Profissional</span><b>Lucas Rodrigues</b><span>Data e horário</span><b>30/10 · 15h30</b><span>Valor</span><b>R$ 35,00</b></div><div className="demo-gold-button">TUDO CERTO!</div></div>
        : <div className="demo-manager">
          <div className="demo-manager-head"><div><small>MINHA BARBEARIA</small><b>{manager ? "Painel de gestão" : "Agendamentos"}</b></div><span className="demo-manager-avatar">LR</span></div>
          {scene === 5 ? <><p className="demo-manager-greeting">Bom dia, Lucas 👋</p><div className="demo-manager-grid"><div><small>FATURAMENTO HOJE</small><b>R$ 1.280</b><em>↑ 12,5%</em></div><div><small>AGENDAMENTOS</small><b>18</b><em>Hoje</em></div><div><small>VENDAS</small><b>R$ 420</b><em>Registradas</em></div><div><small>DESPESAS</small><b>R$ 95</b><em>Do período</em></div></div><div className="demo-manager-card"><b>Movimentação da semana</b><div className="demo-manager-chart">{[35,55,44,72,60,90,76].map((h,i)=><i key={i} style={{height:h+"%"}}/>)}</div><small>SEG　 TER　 QUA　 QUI　 SEX　 SÁB　 DOM</small></div></>
          : scene === 6 ? <><div className="demo-manager-title"><CalendarCheck size={16}/> Agenda de hoje <span>18 horários</span></div>{[["09:00","Corte tradicional","João Pedro","Concluído"],["10:30","Corte + barba","André Lima","Confirmado"],["11:30","Degradê","Pedro Alves","Próximo"],["14:00","Barba","Rafael Souza","Confirmado"]].map(row=><div className="demo-manager-row" key={row[0]}><b>{row[0]}</b><span><strong>{row[1]}</strong><small>{row[2]}</small></span><em>{row[3]}</em></div>)}</>
          : scene === 7 ? <><div className="demo-manager-title"><Receipt size={16}/> Nova venda <span>Presencial</span></div><div className="demo-sale-box"><small>PRODUTO / SERVIÇO</small><b>Pomada modeladora</b><small>VALOR DA VENDA</small><strong>R$ 45,00</strong><small>FORMA DE PAGAMENTO</small><div className="demo-payment-pills"><span className="active">PIX</span><span>Dinheiro</span><span>Cartão</span></div><div className="demo-gold-button">✓　REGISTRAR VENDA</div></div><div className="demo-manager-notice">Venda registrada com sucesso</div></>
          : scene === 8 ? <><div className="demo-manager-title"><Wallet size={16}/> Controle financeiro</div><div className="demo-finance-balance"><small>SALDO DO PERÍODO</small><b>R$ 3.840,00</b></div><div className="demo-finance-row"><span><ArrowDownLeft size={16}/> Entradas</span><b className="positive">+ R$ 4.500,00</b></div><div className="demo-finance-row"><span><ArrowUpRight size={16}/> Saídas</span><b className="negative">− R$ 660,00</b></div><div className="demo-finance-row"><span><Receipt size={16}/> Despesas registradas</span><b>12 lançamentos</b></div><div className="demo-gold-button">VER LANÇAMENTOS</div></>
          : <><div className="demo-manager-title"><TrendingUp size={16}/> Relatório de resultados</div><div className="demo-report-total"><small>FATURAMENTO NO MÊS</small><b>R$ 12.450,00</b><em>↑ 18% em relação ao mês anterior</em></div><div className="demo-manager-chart demo-report-chart">{[40,58,48,70,62,88,75,100,82,91].map((h,i)=><i key={i} style={{height:h+"%"}}/>)}</div><div className="demo-manager-row"><span><strong>Serviços realizados</strong><small>Atendimentos concluídos</small></span><b>214</b></div><div className="demo-manager-row"><span><strong>Ticket médio</strong><small>Por atendimento</small></span><b>R$ 58,18</b></div></>}
          <div className="demo-bottom-nav"><span>⌂<small>Início</small></span><span>▦<small>Agenda</small></span><span>＋<small>Vendas</small></span><span>◷<small>Financeiro</small></span></div>
        </div>}
      </div>
    </div>
    <div className="product-demo-caption">
      <div className="flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.18em] text-primary">Uma jornada do agendamento à gestão</span><span className="text-[10px] text-muted-foreground">{manager ? "02 / 02 · GESTOR" : "01 / 02 · CLIENTE"}</span></div>
      <h3 className="mt-2 text-lg font-semibold">{current.label}</h3><p className="mt-1 min-h-10 text-sm leading-6 text-muted-foreground">{current.caption}</p>
      <div className="mt-4 flex gap-1.5">{demoScenes.map((s,i)=><button key={s.label} type="button" aria-label={`Ir para etapa ${i+1}: ${s.label}`} onClick={()=>setScene(i)} className={`h-1.5 flex-1 rounded-full transition-colors ${i===scene?"bg-primary":"bg-border"}`}/>)}</div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground"><span>CLIENTE</span><span>GESTOR</span></div>
    </div>
  </div>;
}

function Landing() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);
  return <div className="landing-page min-h-screen bg-background text-foreground">
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 lg:h-[72px] lg:px-8">
        <a href="#inicio" className="flex shrink-0 items-center gap-2.5" aria-label="Minha Barbearia — início"><img src="/minha-barbearia-logo.webp" alt="Minha Barbearia" className="h-11 w-auto max-w-[220px] object-contain object-left" /></a>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
          <a href="#inicio" className="text-sm text-muted-foreground hover:text-foreground">Início</a><a href="#demonstracao" className="text-sm text-muted-foreground hover:text-foreground">Demonstração</a><a href="#recursos" className="text-sm text-muted-foreground hover:text-foreground">Recursos</a><a href="#pwa" className="text-sm text-muted-foreground hover:text-foreground">Aplicativo</a><a href="#planos" className="text-sm text-muted-foreground hover:text-foreground">Começar</a>
        </nav>
        <div className="hidden items-center gap-2 sm:flex"><Link to="/login" className="rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground">Entrar</Link><Link to="/cadastro" className="rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:bg-primary/90">Experimentar agora</Link></div>
        <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border sm:hidden" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen(v => !v)}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {mobileOpen && <div className="border-t border-border bg-background px-5 py-4 sm:hidden"><nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Navegação mobile">{[["inicio","Início"],["demonstracao","Demonstração"],["recursos","Recursos"],["pwa","Aplicativo"],["planos","Começar"],["faq","Dúvidas"]].map(([id,label]) => <a key={id} href={`#${id}`} onClick={close} className="rounded-md px-3 py-3 text-sm text-muted-foreground hover:bg-card hover:text-foreground">{label}</a>)}<div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-3"><Link to="/login" onClick={close} className="rounded-md border border-border px-4 py-3 text-center text-sm font-medium">Entrar</Link><Link to="/cadastro" onClick={close} className="rounded-md bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">Criar conta</Link></div></nav></div>}
    </header>

    <main>
      <section id="inicio" className="relative isolate overflow-hidden border-b border-border">
        <img src={heroImg} alt="Ambiente de barbearia" width={1600} height={1008} className="absolute inset-0 -z-20 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/95 to-background/65" /><div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/20 via-transparent to-background" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:py-24 lg:grid-cols-[.95fr_1.05fr] lg:px-8 lg:py-28">
          <div className="landing-enter"><div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/60 px-3 py-1.5 text-xs font-medium text-primary backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-primary" />GESTÃO INTELIGENTE PARA BARBEARIAS</div>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">Sua barbearia organizada. <span className="text-primary">Seu negócio sob controle.</span></h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">Agenda, clientes, profissionais, serviços e financeiro em uma única plataforma. Menos tempo apagando incêndios. Mais tempo cuidando da sua barbearia.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/cadastro" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90">Experimentar grátis <ArrowRight className="h-4 w-4" /></Link><a href="#demonstracao" className="inline-flex items-center justify-center rounded-md border border-border bg-background/60 px-6 py-3.5 text-sm font-semibold backdrop-blur hover:border-primary/50 hover:text-primary">Ver demonstração</a></div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Acesso pelo navegador</span><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Computador e celular</span><span className="inline-flex items-center gap-2"><Check className="h-4 w-4 text-primary" />Sua rotina em um só lugar</span></div>
          </div>
          <div className="relative mx-auto w-full max-w-[620px] landing-enter landing-delay">
            <div className="absolute -inset-10 rounded-[2rem] bg-primary/15 blur-3xl" />
            <div className="dashboard-showcase relative">
              <div className="dashboard-window">
                <div className="flex items-center justify-between border-b border-white/10 px-4 pb-4 sm:px-5">
                  <div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary"><Scissors className="h-4 w-4" /></span><div><p className="text-[10px] tracking-wider text-white/45">MINHA BARBEARIA</p><p className="text-sm font-semibold text-white">Painel de controle</p></div></div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold text-emerald-300">● AO VIVO</span>
                </div>
                <div className="grid grid-cols-3 gap-2 p-3 sm:gap-3 sm:p-5">
                  <div className="dashboard-metric"><p>Agendamentos</p><strong>24</strong><span>+ hoje</span></div>
                  <div className="dashboard-metric"><p>Faturamento</p><strong>R$ 1.280</strong><span>movimentação</span></div>
                  <div className="dashboard-metric"><p>Clientes</p><strong>186</strong><span>cadastrados</span></div>
                </div>
                <div className="grid gap-3 px-3 pb-4 sm:grid-cols-[1.15fr_.85fr] sm:px-5">
                  <div className="rounded-xl border border-white/10 bg-white/[.035] p-3 sm:p-4">
                    <div className="mb-3 flex items-center justify-between"><div><p className="text-xs font-semibold text-white">Próximos horários</p><p className="mt-1 text-[9px] text-white/40">Agenda de hoje</p></div><CalendarDays className="h-4 w-4 text-primary" /></div>
                    {[["09:00","Corte tradicional","Lucas"],["10:30","Corte + barba","Marcos"],["11:30","Degradê","Rafael"]].map(([time,service,person],i)=><div key={time} className="dashboard-appointment"><span className="text-[10px] font-bold text-primary">{time}</span><span className="min-w-0 flex-1"><b>{service}</b><small>{person}</small></span><i className={i===2?"is-next":""}>{i===2?"Próximo":"Confirmado"}</i></div>)}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[.035] p-3 sm:p-4">
                    <div className="flex items-center justify-between"><p className="text-xs font-semibold text-white">Movimento</p><BarChart3 className="h-4 w-4 text-primary" /></div>
                    <div className="dashboard-bars"><span style={{height:"34%"}}/><span style={{height:"52%"}}/><span style={{height:"43%"}}/><span style={{height:"70%"}}/><span style={{height:"58%"}}/><span style={{height:"88%"}}/><span style={{height:"100%"}}/><span style={{height:"76%"}}/></div>
                    <div className="mt-2 flex justify-between text-[9px] text-white/35"><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span></div>
                  </div>
                </div>
              </div>
              <div className="dashboard-float dashboard-float-booking"><span className="dashboard-float-icon"><CalendarClock className="h-4 w-4" /></span><span><b>Novo agendamento</b><small>Cliente confirmou às 14:30</small></span><Check className="ml-auto h-4 w-4 text-emerald-300" /></div>
              <div className="dashboard-float dashboard-float-payment"><span className="dashboard-float-icon"><DollarSign className="h-4 w-4" /></span><span><b>Pagamento recebido</b><small>Serviço concluído · R$ 45,00</small></span><span className="ml-auto text-[10px] font-bold text-emerald-300">+ R$ 45</span></div>
              <div className="dashboard-float dashboard-float-team"><span className="dashboard-avatar">LR</span><span><b>Equipe em atividade</b><small>3 profissionais atendendo</small></span></div>
            </div>            <p className="relative mt-3 text-center text-[11px] text-muted-foreground">Prévia ilustrativa da experiência de gestão</p>
          </div>
        </div>
      </section>

      <section id="demonstracao" className="scroll-mt-20 border-b border-border py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mx-auto max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Veja na prática</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Não é só uma lista de recursos. É sua rotina mais simples.</h2><p className="mt-4 leading-7 text-muted-foreground">Conheça as áreas que ajudam você a organizar o dia a dia da barbearia.</p></div>
        <div className="mt-12 grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-border bg-card p-4 shadow-xl sm:p-6"><div className="flex items-center justify-between border-b border-border pb-4"><div><p className="text-xs text-muted-foreground">MINHA BARBEARIA / PAINEL</p><h3 className="mt-1 text-lg font-semibold">Resumo da operação</h3></div><BarChart3 className="h-5 w-5 text-primary" /></div><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl border border-border bg-background p-4"><p className="text-xs text-muted-foreground">Agenda</p><p className="mt-2 text-lg font-semibold">Organizada</p><p className="mt-1 text-[11px] text-primary">Horários e atendimentos</p></div><div className="rounded-xl border border-border bg-background p-4"><p className="text-xs text-muted-foreground">Equipe</p><p className="mt-2 text-lg font-semibold">Centralizada</p><p className="mt-1 text-[11px] text-primary">Profissionais e serviços</p></div></div><div className="mt-3 rounded-xl border border-border bg-background p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Atendimentos</span><span className="text-xs text-muted-foreground">Exemplo de agenda</span></div>{[["09:00","Corte","Confirmado"],["10:30","Barba","Confirmado"],["14:00","Corte + barba","Agendado"]].map(([time,service,state]) => <div key={time} className="mt-3 flex items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0"><span className="w-12 text-xs font-semibold text-primary">{time}</span><span className="flex-1 text-sm">{service}</span><span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">{state}</span></div>)}</div></div>
          <div><div className="space-y-5">{[[CalendarClock,"Agenda sem confusão","Visualize seus horários e acompanhe os atendimentos."],[Users,"Clientes organizados","Encontre informações e acompanhe os registros da sua clientela."],[DollarSign,"Mais clareza financeira","Consulte os lançamentos e acompanhe a movimentação do negócio."],[UserCog,"Equipe alinhada","Organize profissionais, serviços e configurações da barbearia."]].map(([Icon,title,desc]) => <div key={title as string} className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{createElement(Icon as React.ElementType, { className: "h-5 w-5" })}</span><div><h3 className="font-semibold">{title as string}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{desc as string}</p></div></div>)}</div></div>
        </div>
      </div></section>

      <section id="recursos" className="scroll-mt-20 border-b border-border bg-card/30 py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Gestão completa</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Tudo o que sua barbearia precisa, conectado.</h2><p className="mt-4 leading-7 text-muted-foreground">Ferramentas para cuidar da operação sem depender de planilhas, anotações soltas e conversas espalhadas.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{resources.map(([Icon,title,desc]) => <article key={title} className="rounded-xl border border-border bg-background/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:bg-card"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{desc}</p></article>)}</div></div></section>

      <section className="border-b border-border py-20 sm:py-24"><div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2 lg:px-8"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Seu link de agendamento</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Seu cliente escolhe. Você acompanha.</h2><p className="mt-4 max-w-xl leading-7 text-muted-foreground">Compartilhe o link público da sua barbearia e facilite a escolha de serviços, profissionais e horários disponíveis. Uma experiência mais prática para quem agenda e mais organização para quem atende.</p><ul className="mt-6 space-y-3 text-sm text-muted-foreground">{["Apresente seus serviços e valores","Mostre os horários disponíveis","Facilite o agendamento pelo celular"].map(x => <li key={x} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" />{x}</li>)}</ul><Link to="/cadastro" className="mt-7 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Criar minha conta <ArrowRight className="h-4 w-4" /></Link></div><div className="rounded-2xl border border-border bg-card p-5 shadow-xl"><div className="rounded-xl border border-border bg-background p-5"><div className="flex items-center gap-3 border-b border-border pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Scissors className="h-5 w-5" /></span><div><p className="text-xs text-muted-foreground">PÁGINA DE AGENDAMENTO</p><p className="font-semibold">Sua barbearia</p></div></div><div className="mt-5"><p className="text-sm font-semibold">Escolha seu serviço</p>{[["Corte tradicional","R$ —"],["Barba","R$ —"],["Corte + barba","R$ —"]].map(([name,price]) => <div key={name} className="mt-2 flex items-center justify-between rounded-lg border border-border p-3 text-sm"><span>{name}</span><span className="text-xs text-muted-foreground">{price}</span></div>)}</div><div className="mt-4 rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground">Continuar agendamento</div><p className="mt-3 text-center text-[10px] text-muted-foreground">Prévia ilustrativa — os dados reais são configurados pela barbearia.</p></div></div></div></section>

      <section id="pwa" className="scroll-mt-20 overflow-hidden border-b border-border bg-card/30 py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Veja o sistema funcionando</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Do primeiro contato à gestão completa.</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Uma demonstração em duas etapas: primeiro, seu cliente agenda pelo WhatsApp; depois, você acompanha e administra a barbearia pelo painel.</p>
          </div>
          <div className="mt-12 grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <div className="space-y-7">
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Smartphone className="h-5 w-5" /></span>
                <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Uma experiência simples para o seu cliente</p><h3 className="mt-1 text-lg font-semibold">Mais facilidade para agendar. Menos mensagens para você responder.</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Seu cliente encontra os serviços, escolhe quem vai atender e reserva o melhor horário em poucos passos — a qualquer hora, direto pelo celular. Uma experiência prática que valoriza sua barbearia e ajuda a transformar interesse em agendamento.</p></div>
              </div>
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></span>
                <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">Sua barbearia na palma da mão</p><h3 className="mt-1 text-lg font-semibold">Tenha clareza da operação e controle de cada resultado.</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Acompanhe a agenda, organize vendas, registre entradas e despesas e entenda como o negócio está performando. Tudo conectado em um só lugar, para você tomar decisões com mais segurança e cuidar do crescimento da sua barbearia.</p></div>
              </div>
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-sm font-semibold">Dois lados. Um só sistema.</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">A demonstração alterna automaticamente entre a experiência do cliente e a visão do gestor, dentro do mesmo celular.</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3"><Device icon={Monitor} title="Computador" text="Gestão em tela ampla" /><Device icon={Smartphone} title="Celular" text="Acesso de qualquer lugar" /><Device icon={Tablet} title="Tablet" text="Mais espaço para visualizar" /></div>
            </div>
            <ProductDemo />
          </div>
        </div>
      </section>

      <section className="border-b border-border py-20 sm:py-24"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="grid items-center gap-10 lg:grid-cols-[.9fr_1.1fr]"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Mais clareza para decidir</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Entenda melhor o movimento do seu negócio.</h2><p className="mt-4 leading-7 text-muted-foreground">Tenha os registros da operação mais organizados para acompanhar atendimentos, vendas e informações financeiras em um só ambiente.</p></div><div className="rounded-2xl border border-border bg-card p-5"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></span><div><p className="font-semibold">Visão financeira</p><p className="text-xs text-muted-foreground">Acompanhe os dados registrados</p></div></div><div className="mt-5 grid grid-cols-3 gap-2">{["Vendas","Pagamentos","Despesas"].map(v => <div key={v} className="rounded-lg border border-border bg-background p-3 text-center"><p className="text-[10px] text-muted-foreground">{v}</p><p className="mt-2 text-xs font-semibold">Consulte</p></div>)}</div><div className="mt-4 flex h-24 items-end gap-2 rounded-lg border border-border bg-background p-3">{[35,55,42,70,58,85,64,92,73,100,78,88].map((v,i) => <div key={i} className="flex-1 rounded-t-sm bg-primary/70" style={{height:`${v}%`}} />)}</div><p className="mt-2 text-[10px] text-muted-foreground">Ilustração visual, sem representar dados reais de faturamento.</p></div></div></div></section>

      <section id="planos" className="scroll-mt-20 border-b border-border bg-card/25 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Planos e assinaturas</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Sua barbearia completa, por um valor que cabe no seu negócio.</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">Tenha agenda, equipe, clientes, vendas e financeiro organizados em uma única plataforma. Todos os planos oferecem acesso aos recursos; quanto maior o período, menor o investimento mensal.</p>
            <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-xs font-semibold text-primary">
              <CreditCard className="h-4 w-4" /> 10% DE DESCONTO NO PAGAMENTO VIA PIX — EM TODOS OS PLANOS
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-5xl items-stretch gap-5 md:grid-cols-3 md:gap-4">
            <article className="flex flex-col rounded-2xl border border-border bg-background p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 sm:p-6">
              <div className="flex items-center justify-between"><span className="text-sm font-semibold">Mensal</span><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">Mais flexibilidade</span></div>
              <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">Ideal para começar a organizar a operação sem compromisso de longo prazo.</p>
              <div className="mt-5"><span className="text-3xl font-bold tracking-tight">R$ 59,99</span><span className="ml-1 text-xs text-muted-foreground">/ mês</span></div>
              <p className="mt-1 text-[11px] text-muted-foreground">Valor mensal · pagamento a cada 30 dias</p>
              <div className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">No Pix: R$ 53,99 · 10% de desconto</div>
              <div className="my-5 h-px bg-border" />
              <ul className="flex-1 space-y-3 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Acesso a todos os módulos da plataforma</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Agenda, clientes e profissionais</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Controle financeiro e vendas</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Acesso pelo computador e celular</li>
              </ul>
              <a href="/comprar?plano=mensal" className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold transition-colors hover:border-primary hover:text-primary">Escolher mensal <ArrowRight className="h-4 w-4"/></a>
            </article>

            <article className="relative z-10 flex flex-col rounded-2xl border-2 border-primary bg-gradient-to-b from-primary/[.12] via-background to-background p-5 shadow-[0_18px_55px_-22px_hsl(var(--primary)/.55)] md:my-[-10px] md:scale-[1.035] sm:p-6">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-lg">Melhor custo-benefício</div>
              <div className="mt-2 flex items-center justify-between"><span className="text-sm font-semibold text-primary">Anual</span><span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold text-primary">Economize 58%</span></div>
              <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">A escolha inteligente para quem quer profissionalizar a gestão e economizar o ano inteiro.</p>
              <div className="mt-5"><span className="text-3xl font-bold tracking-tight">R$ 25,00</span><span className="ml-1 text-xs text-muted-foreground">/ mês</span></div>
              <p className="mt-1 text-[11px] text-muted-foreground">Total do plano: R$ 299,99 por 12 meses</p>
              <div className="mt-3 rounded-lg bg-primary/15 px-3 py-2 text-xs font-bold text-primary">No Pix: R$ 269,99 no total · equivalente a R$ 22,50/mês</div>
              <p className="mt-2 text-[11px] text-muted-foreground">Você economiza R$ 419,89 em relação a 12 mensalidades.</p>
              <div className="my-5 h-px bg-primary/20" />
              <ul className="flex-1 space-y-3 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Todos os recursos da plataforma</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Uso ilimitado da plataforma durante a vigência</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Cadastro ilimitado de produtos e serviços</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Gestão de agenda, equipe, clientes e vendas</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Controle financeiro, despesas e relatórios</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Link de agendamento para seus clientes</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Mais economia: equivalente a R$ 25/mês</li>
              </ul>
              <a href="/comprar?plano=anual" className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:bg-primary/90">Garantir plano anual <ArrowRight className="h-4 w-4"/></a>
              <p className="mt-2 text-center text-[10px] font-medium text-primary">A opção mais econômica para sua barbearia</p>
            </article>

            <article className="flex flex-col rounded-2xl border border-border bg-background p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-primary/40 sm:p-6">
              <div className="flex items-center justify-between"><span className="text-sm font-semibold">Semestral</span><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">6 meses</span></div>
              <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">Para quem busca um período maior de organização com economia intermediária.</p>
              <div className="mt-5"><span className="text-3xl font-bold tracking-tight">R$ 39,99</span><span className="ml-1 text-xs text-muted-foreground">/ mês</span></div>
              <p className="mt-1 text-[11px] text-muted-foreground">Total do plano: R$ 239,94 por 6 meses</p>
              <div className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">No Pix: R$ 215,95 no total · equivalente a R$ 35,99/mês</div>
              <p className="mt-2 text-[11px] text-muted-foreground">Economia de R$ 120,00 em comparação a 6 mensalidades.</p>
              <div className="my-5 h-px bg-border" />
              <ul className="flex-1 space-y-3 text-sm">
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Acesso a todos os módulos da plataforma</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Agenda, clientes e profissionais</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Controle financeiro e vendas</li>
                <li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary"/> Acesso por 6 meses</li>
              </ul>
              <a href="/comprar?plano=semestral" className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 py-3 text-sm font-semibold transition-colors hover:border-primary hover:text-primary">Escolher semestral <ArrowRight className="h-4 w-4"/></a>
            </article>
          </div>

          <div className="mx-auto mt-14 max-w-5xl">
            <div className="text-center"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Uma plataforma completa</p><h3 className="mt-2 text-2xl font-semibold tracking-tight">Tudo o que sua barbearia precisa para funcionar melhor.</h3><p className="mt-2 text-sm text-muted-foreground">Os recursos abaixo estão disponíveis em todos os planos.</p></div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {resources.map(([Icon, title, description]) => <div key={title} className="rounded-xl border border-border bg-background p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4"/></span><h4 className="mt-3 text-sm font-semibold">{title}</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>)}
              <div className="rounded-xl border border-border bg-background p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Receipt className="h-4 w-4"/></span><h4 className="mt-3 text-sm font-semibold">Vendas presenciais</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Registre vendas realizadas diretamente no balcão.</p></div>
              <div className="rounded-xl border border-border bg-background p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Wallet className="h-4 w-4"/></span><h4 className="mt-3 text-sm font-semibold">Despesas e custos</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Registre gastos e acompanhe os custos da operação.</p></div>
              <div className="rounded-xl border border-border bg-background p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><BarChart3 className="h-4 w-4"/></span><h4 className="mt-3 text-sm font-semibold">Indicadores e relatórios</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Tenha uma visão organizada dos resultados registrados.</p></div>
              <div className="rounded-xl border border-border bg-background p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Smartphone className="h-4 w-4"/></span><h4 className="mt-3 text-sm font-semibold">Acesso em qualquer tela</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">Use no computador, tablet ou celular, de onde estiver.</p></div>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-5xl rounded-2xl border border-border bg-background p-5 sm:p-7">
            <div className="text-center"><h3 className="text-xl font-semibold">Por que o plano anual compensa mais?</h3><p className="mt-2 text-sm text-muted-foreground">Você mantém a operação organizada por 12 meses e paga muito menos pelo mesmo conjunto de recursos.</p></div>
            <div className="mt-6 grid gap-4 text-center sm:grid-cols-3">
              <div className="rounded-xl bg-card p-4"><p className="text-xs text-muted-foreground">Mensalidade equivalente</p><p className="mt-1 text-2xl font-bold">R$ 25,00</p><p className="mt-1 text-xs text-muted-foreground">no plano anual</p></div>
              <div className="rounded-xl bg-card p-4"><p className="text-xs text-muted-foreground">Economia em 12 meses</p><p className="mt-1 text-2xl font-bold text-primary">R$ 419,89</p><p className="mt-1 text-xs text-muted-foreground">comparado ao mensal</p></div>
              <div className="rounded-xl bg-card p-4"><p className="text-xs text-muted-foreground">Desconto adicional no Pix</p><p className="mt-1 text-2xl font-bold text-primary">10%</p><p className="mt-1 text-xs text-muted-foreground">em qualquer período</p></div>
            </div>
            <div className="mt-6 text-center"><a href="/comprar?plano=anual" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">Quero economizar com o anual <ArrowRight className="h-4 w-4"/></a></div>
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">Pagamento processado com segurança pela InfinitePay. O desconto de 10% no Pix é aplicado ao valor do plano no pagamento.</p>
          <div className="mt-4 flex justify-center"><Link to="/login" className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-primary">Já tem uma conta? Entrar</Link></div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 border-b border-border py-20 sm:py-24"><div className="mx-auto max-w-4xl px-5 lg:px-8"><div className="text-center"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Dúvidas frequentes</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Tudo o que você precisa saber para começar.</h2></div><div className="mt-10 space-y-3">{faqs.map(([question,answer]) => <details key={question} className="group rounded-xl border border-border bg-card/50 p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium"><span>{question}</span><ChevronRight className="h-4 w-4 shrink-0 text-primary transition-transform group-open:rotate-90" /></summary><p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">{answer}</p></details>)}</div></div></section>

      <section id="contato" className="scroll-mt-20 py-24 sm:py-28"><div className="mx-auto max-w-4xl px-5 text-center lg:px-8"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Scissors className="h-5 w-5" /></div><h2 className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl">Sua barbearia merece uma gestão à altura.</h2><p className="mx-auto mt-5 max-w-2xl leading-7 text-muted-foreground">Organize a operação, facilite os agendamentos e tenha mais clareza para cuidar do seu negócio.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link to="/cadastro" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90">Experimentar agora <ArrowRight className="h-4 w-4" /></Link><Link to="/login" className="inline-flex items-center justify-center rounded-md border border-border px-7 py-3.5 text-sm font-semibold hover:border-primary/50 hover:text-primary">Entrar na minha conta</Link></div></div></section>
    </main>
    <footer className="border-t border-border bg-card/20"><div className="mx-auto flex max-w-7xl flex-col gap-7 px-5 py-10 lg:flex-row lg:items-end lg:justify-between lg:px-8"><div><a href="#inicio" className="landing-brand">MINHA <span>BARBEARIA</span></a><p className="mt-2 text-sm text-muted-foreground">Gestão completa para sua barbearia.</p></div><div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground"><a href="#recursos" className="hover:text-foreground">Recursos</a><a href="#pwa" className="hover:text-foreground">Aplicativo</a><a href="#faq" className="hover:text-foreground">Dúvidas</a><Link to="/login" className="hover:text-foreground">Entrar</Link><Link to="/cadastro" className="hover:text-foreground">Criar conta</Link></div><p className="text-xs text-muted-foreground">© {new Date().getFullYear()} MINHA BARBEARIA. Todos os direitos reservados.</p></div></footer>
  </div>;
}

function DashboardTile({ icon: Icon, title, value }: { icon: React.ElementType; title: string; value: string }) {
  return <div className="rounded-lg border border-white/10 bg-white/[.03] p-3"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-[10px] text-white/50">{title}</p><p className="mt-1 text-xs font-semibold text-white">{value}</p></div>;
}

function Device({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return <div className="rounded-xl border border-border bg-background p-4">{createElement(Icon as React.ElementType, { className: "h-5 w-5 text-primary" })}<p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p></div>;
}
