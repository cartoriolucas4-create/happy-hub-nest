import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { AdminShell, btn } from "@/components/admin/AdminShell";
import { useSetupStatus } from "@/lib/setup";

export const Route = createFileRoute("/_authenticated/admin/configurar")({ component: Configurar });

const ITEMS = [
  {
    key: "dias_atendimento",
    title: "Dias de atendimento",
    text: "Escolha os dias em que sua barbearia atende.",
    to: "/admin/horarios",
  },
  {
    key: "barbeiros",
    title: "Barbeiros",
    text: "Cadastre pelo menos um profissional ativo.",
    to: "/admin/barbeiros",
  },
  {
    key: "servicos",
    title: "Serviços",
    text: "Cadastre pelo menos um serviço ativo.",
    to: "/admin/servicos",
  },
  {
    key: "horarios",
    title: "Horários",
    text: "Defina abertura e fechamento para os dias selecionados.",
    to: "/admin/horarios",
  },
  {
    key: "meios_pagamento",
    title: "Meios de pagamento",
    text: "Cadastre ao menos um meio de pagamento ativo.",
    to: "/admin/pagamentos",
  },
] as const;

function Configurar() {
  const { data: setup, isLoading } = useSetupStatus();
  const firstPending = ITEMS.find((item) => !setup?.[item.key]);
  return (
    <AdminShell
      title="Configuração inicial"
      subtitle="Complete os itens abaixo para liberar o agendamento online."
    >
      {isLoading && <p className="text-sm text-muted-foreground">Verificando configuração...</p>}
      {setup?.concluida && (
        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          Sua barbearia está pronta para operar.
        </p>
      )}
      {setup && !setup.concluida && (
        <div className="max-w-3xl space-y-3">
          {ITEMS.map((item) => {
            const complete = setup[item.key];
            return (
              <Link
                key={item.key}
                to={item.to}
                className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card p-4 hover:border-primary"
              >
                <div className="flex items-start gap-3">
                  {complete ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                  ) : (
                    <CircleAlert className="mt-0.5 h-5 w-5 text-primary" />
                  )}
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </div>
                <span className="text-xs text-primary">
                  {complete ? "CONCLUÍDO" : "CONFIGURAR"}
                </span>
              </Link>
            );
          })}
          {firstPending && (
            <Link to={firstPending.to} className={`inline-block ${btn}`}>
              COMEÇAR CONFIGURAÇÃO
            </Link>
          )}
        </div>
      )}
    </AdminShell>
  );
}
