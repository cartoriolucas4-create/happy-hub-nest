import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Plus, Search, ShoppingCart, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell, Empty, btn, btnGhost, input } from "@/components/admin/AdminShell";
import { useShop } from "@/lib/shop";
import { brl } from "@/lib/barber";

export const Route = createFileRoute("/_authenticated/admin/vendas-externas")({
  head: () => ({ meta: [{ title: "Vendas Externas | BarberFlow" }, { name: "robots", content: "noindex" }] }),
  component: VendasExternas,
});

type CatalogItem = { id: string; name: string; price: number; kind: "service" | "product"; service_id?: string; product_id?: string };
type CartItem = CatalogItem & { quantity: number };
type ProductForm = { id?: string; name: string; description: string; price: string; active: boolean };
type ServiceForm = { name: string; description: string; price: string; duration: string; active: boolean };

const emptyProduct: ProductForm = { name: "", description: "", price: "", active: true };
const emptyService: ServiceForm = { name: "", description: "", price: "", duration: "30", active: true };
const fallbackPayments = ["Dinheiro", "Pix", "Cartão de débito", "Cartão de crédito", "Outro"];

function money(value: string) {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : NaN;
}

function VendasExternas() {
  const { data: shop } = useShop();
  const qc = useQueryClient();
  const db = supabase as any;
  const [saleOpen, setSaleOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [barberId, setBarberId] = useState("");
  const [clientId, setClientId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [productForm, setProductForm] = useState<ProductForm | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm | null>(null);

  const baseEnabled = Boolean(shop?.id);
  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ["external-services", shop?.id], enabled: baseEnabled,
    queryFn: async () => { const { data, error } = await db.from("services").select("id,nome,descricao,preco,duracao_minutos,ativo").eq("barbershop_id", shop!.id).order("nome"); if (error) throw error; return data ?? []; },
  });
  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ["external-products", shop?.id], enabled: baseEnabled,
    queryFn: async () => { const { data, error } = await db.from("external_products").select("*").eq("barbershop_id", shop!.id).order("name"); if (error) throw error; return data ?? []; },
  });
  const { data: barbers = [] } = useQuery({
    queryKey: ["external-barbers", shop?.id], enabled: baseEnabled,
    queryFn: async () => { const { data, error } = await db.from("barbers").select("id,nome").eq("barbershop_id", shop!.id).eq("ativo", true).order("nome"); if (error) throw error; return data ?? []; },
  });
  const { data: clients = [] } = useQuery({
    queryKey: ["external-clients", shop?.id], enabled: baseEnabled,
    queryFn: async () => { const { data, error } = await db.from("customers").select("id,nome,telefone").eq("barbershop_id", shop!.id).order("nome").limit(500); if (error) throw error; return data ?? []; },
  });
  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["external-payment-methods", shop?.id], enabled: baseEnabled,
    queryFn: async () => { const { data, error } = await db.from("payment_methods").select("id,name").eq("barbershop_id", shop!.id).eq("active", true).order("name"); if (error) throw error; return data ?? []; },
  });
  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["external-sales", shop?.id], enabled: baseEnabled,
    queryFn: async () => {
      const { data, error } = await db.from("external_sales").select("id,total,subtotal,discount,status,sold_at,payment_method,barbers(nome),customers(nome)").eq("barbershop_id", shop!.id).order("sold_at", { ascending: false }).limit(100);
      if (error) throw error; return data ?? [];
    },
  });
  const { data: todaySummary } = useQuery({
    queryKey: ["external-sales-today", shop?.id], enabled: baseEnabled,
    queryFn: async () => { const start = new Date(); start.setHours(0,0,0,0); const { data, error } = await db.from("external_sales").select("total").eq("barbershop_id", shop!.id).eq("status", "finalizada").gte("sold_at", start.toISOString()); if (error) throw error; return data ?? []; },
  });

  const catalog = useMemo<CatalogItem[]>(() => [
    ...services.filter((s: any) => s.ativo).map((s: any) => ({ id: s.id, name: s.nome, price: Number(s.preco), kind: "service" as const, service_id: s.id })),
    ...products.filter((p: any) => p.active).map((p: any) => ({ id: p.id, name: p.name, price: Number(p.price), kind: "product" as const, product_id: p.id })),
  ], [services, products]);
  const filteredCatalog = catalog.filter((item) => item.name.toLowerCase().includes(search.toLowerCase().trim()));
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountValue = Math.max(0, money(discount) || 0);
  const total = Math.max(0, subtotal - discountValue);
  const todayTotal = (todaySummary as any[]).reduce((sum, item) => sum + Number(item.total), 0);

  function addItem(item: CatalogItem) {
    setCart((current) => {
      const found = current.find((x) => x.id === item.id && x.kind === item.kind);
      return found ? current.map((x) => x === found ? { ...x, quantity: x.quantity + 1 } : x) : [...current, { ...item, quantity: 1 }];
    });
  }
  function changeQuantity(id: string, kind: CatalogItem["kind"], delta: number) {
    setCart((current) => current.map((item) => item.id === id && item.kind === kind ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  }
  function closeSale() { setSaleOpen(false); setCart([]); setDiscount(""); setBarberId(""); setClientId(""); setPaymentMethod(""); setPaymentMethodId(""); setSearch(""); }

  const createSale = useMutation({
    mutationFn: async () => {
      if (!cart.length) throw new Error("Adicione pelo menos um item.");
      if (!paymentMethod) throw new Error("Selecione a forma de pagamento.");
      if (discountValue > subtotal) throw new Error("O desconto não pode superar o subtotal.");
      const items = cart.map((item) => ({ service_id: item.service_id ?? null, product_id: item.product_id ?? null, quantity: item.quantity }));
      const selectedPayment = paymentMethods.find((p: any) => p.name === paymentMethod);
      const { data, error } = await db.rpc("create_external_sale", { p_barber_id: barberId || null, p_client_id: clientId || null, p_payment_method: paymentMethod, p_payment_method_id: selectedPayment?.id ?? (paymentMethodId || null), p_discount: discountValue, p_items: items });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success("Venda realizada com sucesso."); closeSale(); qc.invalidateQueries({ queryKey: ["external-sales"] }); qc.invalidateQueries({ queryKey: ["external-sales-today"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: Error) => toast.error(e.message || "Não foi possível registrar a venda."),
  });

  const saveProduct = useMutation({
    mutationFn: async (form: ProductForm) => {
      if (!shop) throw new Error("Barbearia não identificada.");
      const price = money(form.price);
      if (!form.name.trim() || !Number.isFinite(price) || price < 0) throw new Error("Informe nome e preço válidos.");
      const payload = { barbershop_id: shop.id, name: form.name.trim(), description: form.description.trim() || null, price, active: form.active, updated_at: new Date().toISOString() };
      const res = form.id ? await db.from("external_products").update(payload).eq("id", form.id).eq("barbershop_id", shop.id) : await db.from("external_products").insert(payload);
      if (res.error) throw res.error;
    },
    onSuccess: () => { toast.success("Produto salvo!"); setProductForm(null); qc.invalidateQueries({ queryKey: ["external-products", shop?.id] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const deleteProduct = useMutation({ mutationFn: async (id: string) => { const { error } = await db.from("external_products").delete().eq("id", id).eq("barbershop_id", shop!.id); if (error) throw error; }, onSuccess: () => { toast.success("Produto excluído."); qc.invalidateQueries({ queryKey: ["external-products", shop?.id] }); }, onError: (e: Error) => toast.error(e.message) });
  const saveService = useMutation({
    mutationFn: async (form: ServiceForm) => {
      if (!shop) throw new Error("Barbearia não identificada.");
      const price = money(form.price); const duration = Number(form.duration);
      if (!form.name.trim() || !Number.isFinite(price) || price < 0 || !Number.isInteger(duration) || duration < 5 || duration > 480) throw new Error("Informe nome, preço e duração válidos.");
      const { error } = await db.from("services").insert({ barbershop_id: shop.id, nome: form.name.trim(), descricao: form.description.trim() || null, preco: price, duracao_minutos: duration, ativo: form.active });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Serviço criado e disponível em Serviços e Vendas Externas."); setServiceForm(null); qc.invalidateQueries({ queryKey: ["external-services", shop?.id] }); qc.invalidateQueries({ queryKey: ["servicos", shop?.id] }); qc.invalidateQueries({ queryKey: ["agendar-base"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancelSale = useMutation({ mutationFn: async (id: string) => { const { error } = await db.rpc("cancel_external_sale", { p_sale_id: id }); if (error) throw error; }, onSuccess: () => { toast.success("Venda cancelada."); qc.invalidateQueries({ queryKey: ["external-sales"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); }, onError: (e: Error) => toast.error(e.message) });

  return (
    <AdminShell title="Vendas Externas" subtitle="Registre vendas presenciais sem criar agendamento." actions={<button className={btn} onClick={() => setSaleOpen(true)}><span className="flex items-center gap-2"><Plus className="h-4 w-4" /> NOVA VENDA</span></button>}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Vendas hoje" value={brl(todayTotal)} />
        <Metric label="Quantidade hoje" value={String((todaySummary as any[]).length)} />
        <Metric label="Catálogo ativo" value={String(catalog.length)} />
      </div>

      <section className="mt-10 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl">Catálogo para venda</h2><p className="mt-1 text-sm text-muted-foreground">Serviços ativos vêm automaticamente de Operação → Serviços. Produtos são cadastrados aqui.</p></div><div className="flex flex-wrap gap-2"><button className={btnGhost} onClick={() => setServiceForm(emptyService)}>+ Cadastrar serviço</button><button className={btnGhost} onClick={() => setProductForm(emptyProduct)}>+ Cadastrar produto</button></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.map((item) => <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between gap-3 rounded-md border border-border p-4"><div><p className="font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{item.kind === "service" ? "Serviço" : "Produto"} · {brl(item.price)}</p></div><button className="rounded-md bg-primary/10 px-3 py-2 text-xs text-primary" onClick={() => { setSaleOpen(true); addItem(item); }}>VENDER</button></div>)}
          {!catalog.length && !loadingServices && !loadingProducts && <Empty>Nenhum item ativo disponível para venda.</Empty>}
        </div>
      </section>

      <section className="mt-10"><h2 className="text-2xl">Histórico de vendas</h2><div className="mt-4 overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border bg-secondary/40 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Barbeiro</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Pagamento</th><th className="px-4 py-3">Total</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Ações</th></tr></thead><tbody>{loadingSales && <tr><td colSpan={7} className="p-5"><Empty>Carregando...</Empty></td></tr>}{!loadingSales && !sales.length && <tr><td colSpan={7} className="p-5"><Empty>Nenhuma venda registrada.</Empty></td></tr>}{sales.map((sale: any) => <tr key={sale.id} className="border-b border-border last:border-0"><td className="px-4 py-3">{new Date(sale.sold_at).toLocaleString("pt-BR")}</td><td className="px-4 py-3">{sale.barbers?.nome ?? "—"}</td><td className="px-4 py-3">{sale.customers?.nome ?? "Sem cliente"}</td><td className="px-4 py-3">{sale.payment_method}</td><td className="px-4 py-3 font-medium">{brl(sale.total)}</td><td className="px-4 py-3">{sale.status === "finalizada" ? "Finalizada" : "Cancelada"}</td><td className="px-4 py-3">{sale.status === "finalizada" && <button className="text-xs text-destructive" onClick={() => { if (confirm("Cancelar esta venda? Ela deixará de entrar no faturamento.")) cancelSale.mutate(sale.id); }}>Cancelar</button>}</td></tr>)}</tbody></table></div></section>

      {saleOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true"><div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl"><div className="flex items-center justify-between border-b border-border p-5"><div><h2 className="text-2xl">Nova venda</h2><p className="text-sm text-muted-foreground">Atendimento presencial — não cria agendamento.</p></div><button className={btnGhost} onClick={closeSale}><X className="h-4 w-4" /></button></div><div className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[1.15fr_.85fr]">
        <div className="p-5"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input className={`${input} pl-9`} placeholder="Buscar serviço ou produto..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{filteredCatalog.map((item) => <button key={`${item.kind}-${item.id}`} onClick={() => addItem(item)} className="flex items-center justify-between rounded-md border border-border p-3 text-left hover:border-primary"><span><span className="block font-medium">{item.name}</span><span className="text-xs text-muted-foreground">{item.kind === "service" ? "Serviço" : "Produto"}</span></span><span className="font-medium">{brl(item.price)}</span></button>)}</div></div>
        <div className="border-t border-border bg-card p-5 lg:border-l lg:border-t-0"><h3 className="font-medium">Resumo da venda</h3><div className="mt-4 space-y-2">{cart.map((item) => <div key={`${item.kind}-${item.id}`} className="rounded-md border border-border p-3"><div className="flex justify-between gap-3"><span>{item.name}</span><strong>{brl(item.price * item.quantity)}</strong></div><div className="mt-2 flex items-center gap-2 text-xs"><button className={btnGhost} onClick={() => changeQuantity(item.id, item.kind, -1)}>-</button><span>{item.quantity}</span><button className={btnGhost} onClick={() => changeQuantity(item.id, item.kind, 1)}>+</button><button className="ml-auto text-destructive" onClick={() => setCart((current) => current.filter((x) => !(x.id === item.id && x.kind === item.kind)))}>Remover</button></div></div>)}{!cart.length && <p className="py-8 text-center text-sm text-muted-foreground">Adicione itens ao carrinho.</p>}</div><div className="mt-5 space-y-3"><label className="block text-sm">Barbeiro (opcional)<select className={`${input} mt-1`} value={barberId} onChange={(e) => setBarberId(e.target.value)}><option value="">Não informado</option>{barbers.map((b: any) => <option key={b.id} value={b.id}>{b.nome}</option>)}</select></label><label className="block text-sm">Cliente (opcional)<select className={`${input} mt-1`} value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">Sem cliente identificado</option>{clients.map((c: any) => <option key={c.id} value={c.id}>{c.nome} · {c.telefone}</option>)}</select></label><label className="block text-sm">Forma de pagamento<select className={`${input} mt-1`} value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}><option value="">Selecione...</option>{paymentMethods.length ? paymentMethods.map((p: any) => <option key={p.id} value={p.name}>{p.name}</option>) : fallbackPayments.map((p) => <option key={p} value={p}>{p}</option>)}</select></label><label className="block text-sm">Desconto<input className={`${input} mt-1`} placeholder="R$ 0,00" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} /></label></div><div className="mt-5 space-y-2 border-t border-border pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{brl(subtotal)}</span></div><div className="flex justify-between"><span>Desconto</span><span>- {brl(discountValue)}</span></div><div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{brl(total)}</span></div></div><button className={`${btn} mt-5 w-full`} disabled={createSale.isPending || !cart.length} onClick={() => createSale.mutate()}>{createSale.isPending ? "FINALIZANDO..." : "FINALIZAR VENDA"}</button></div>
      </div></div></div>}

      {productForm && <ProductDialog form={productForm} setForm={setProductForm} onSave={() => saveProduct.mutate(productForm)} saving={saveProduct.isPending} />}
      {serviceForm && <ServiceDialog form={serviceForm} setForm={setServiceForm} onSave={() => saveService.mutate(serviceForm)} saving={saveService.isPending} />}

      <section className="mt-10 rounded-lg border border-border bg-card p-5"><h2 className="text-xl">Produtos cadastrados</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{products.map((p: any) => <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-4"><div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground">{brl(p.price)} · {p.active ? "Ativo" : "Inativo"}</p></div><div className="flex gap-3"><button className="text-muted-foreground hover:text-primary" onClick={() => setProductForm({ id: p.id, name: p.name, description: p.description ?? "", price: String(p.price), active: p.active })}><Pencil className="h-4 w-4" /></button><button className="text-muted-foreground hover:text-destructive" onClick={() => { if (confirm(`Excluir definitivamente o produto "${p.name}"?`)) deleteProduct.mutate(p.id); }}><Trash2 className="h-4 w-4" /></button></div></div>)}</div></section>
    </AdminShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 font-display text-3xl">{value}</p></div>; }

function ProductDialog({ form, setForm, onSave, saving }: { form: ProductForm; setForm: (v: ProductForm | null) => void; onSave: () => void; saving: boolean }) { return <Dialog title={form.id ? "Editar produto" : "Novo produto"} onClose={() => setForm(null)}><label className="block text-sm">Nome<input className={`${input} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="mt-4 block text-sm">Preço<input className={`${input} mt-1`} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="decimal" /></label><label className="mt-4 block text-sm">Descrição<input className={`${input} mt-1`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label><div className="mt-6 flex justify-end gap-2"><button className={btnGhost} onClick={() => setForm(null)}>Cancelar</button><button className={btn} disabled={saving} onClick={onSave}>{saving ? "SALVANDO..." : "SALVAR"}</button></div></Dialog>; }
function ServiceDialog({ form, setForm, onSave, saving }: { form: ServiceForm; setForm: (v: ServiceForm | null) => void; onSave: () => void; saving: boolean }) { return <Dialog title="Novo serviço" onClose={() => setForm(null)}><label className="block text-sm">Nome<input className={`${input} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label className="mt-4 block text-sm">Preço<input className={`${input} mt-1`} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="decimal" /></label><label className="mt-4 block text-sm">Duração (minutos)<input className={`${input} mt-1`} type="number" min={5} max={480} step={5} value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></label><label className="mt-4 block text-sm">Descrição<input className={`${input} mt-1`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label><div className="mt-6 flex justify-end gap-2"><button className={btnGhost} onClick={() => setForm(null)}>Cancelar</button><button className={btn} disabled={saving} onClick={onSave}>{saving ? "SALVANDO..." : "SALVAR"}</button></div></Dialog>; }
function Dialog({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) { return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-lg rounded-xl border border-border bg-background p-6 shadow-2xl"><div className="flex items-center justify-between gap-3"><h2 className="text-xl">{title}</h2><button className={btnGhost} onClick={onClose}><X className="h-4 w-4" /></button></div><div className="mt-5">{children}</div></div></div>; }
