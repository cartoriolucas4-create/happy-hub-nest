import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useRouterState, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { PublicSetupGate } from "@/components/public/PublicSetupGate";
import { supabase } from "@/integrations/supabase/client";
import { accentStyle, DEFAULT_ACCENT_COLOR } from "@/lib/theme";
import { formatBrlInput } from "@/lib/barber";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() { return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2><p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link></div></div></div>; }

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error); const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1><p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end. You can try refreshing or head back home.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button><a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background text-foreground px-4 py-2 text-sm font-medium">Go home</a></div></div></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({ meta: [
    { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" },
    { title: "BarberFlow | Sistema de agendamento para barbearias" },
    { name: "description", content: "Plataforma de agendamento online para barbearias: agenda, equipe, serviços e clientes em um só lugar." },
    { name: "author", content: "Lovable" }, { property: "og:title", content: "BarberFlow | Agendamento para barbearias" },
    { property: "og:description", content: "Gerencie sua barbearia e receba agendamentos online 24h." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:site", content: "@Lovable" },
  ], links: [
    { rel: "stylesheet", href: appCss }, { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600&family=Inter:wght@300;400;500;600&family=Cormorant+Garamond:wght@300;400;500;600&display=swap" }, { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
  ] }),
  shellComponent: RootShell, component: RootComponent, notFoundComponent: NotFoundComponent, errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) { return <html lang="pt-BR"><head><HeadContent /></head><body>{children}<Scripts /></body></html>; }

function applyAccentStyle(value: string | null | undefined) {
  for (const [property, cssValue] of Object.entries(accentStyle(value))) {
    document.documentElement.style.setProperty(property, cssValue);
  }
}

function PublicAccentController() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    const match = pathname.match(/^\/barbearia\/([^/]+)(?:\/agendar)?\/?$/);
    if (!match) {
      applyAccentStyle(DEFAULT_ACCENT_COLOR);
      return;
    }

    let active = true;
    const slug = decodeURIComponent(match[1]!);
    void Promise.resolve(
      supabase.from("barbershops").select("cor_primaria").eq("slug", slug).maybeSingle(),
    )
      .then(({ data }) => {
        if (!active) return;
        applyAccentStyle(data?.cor_primaria);
      })
      .catch(() => {
        if (active) applyAccentStyle(DEFAULT_ACCENT_COLOR);
      });

    return () => {
      active = false;
    };
  }, [pathname]);

  return null;
}

function isCurrencyInput(input: HTMLInputElement) {
  if (input.inputMode !== "decimal") return false;
  const text = [input.name, input.id, input.placeholder, input.getAttribute("aria-label"), input.getAttribute("data-field")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const labelText = input.closest("label")?.textContent?.toLowerCase() ?? "";
  const context = `${text} ${labelText}`;
  return /(pre[cç]o|valor|custo|desconto|total|faturamento|venda|receita|pagamento|r\$|dinheiro)/i.test(context);
}

function formattedCaretPosition(formatted: string, digitIndex: number) {
  if (digitIndex <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formatted.length; i += 1) {
    if (/\d/.test(formatted[i]!)) {
      seen += 1;
      if (seen >= digitIndex) return i + 1;
    }
  }
  return formatted.length;
}

function BrlInputController() {
  useEffect(() => {
    const bound = new WeakSet<HTMLInputElement>();
    const nativeValueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;

    const emitValue = (input: HTMLInputElement, value: string, caretDigits: number) => {
      if (nativeValueSetter) nativeValueSetter.call(input, value);
      else input.value = value;
      const caret = formattedCaretPosition(value, caretDigits);
      try {
        input.setSelectionRange(caret, caret);
      } catch {
        // Some input types do not support selection ranges.
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };

    const bind = () => {
      document.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]').forEach((input) => {
        if (bound.has(input) || !isCurrencyInput(input)) return;
        bound.add(input);

        const beforeInput = (event: InputEvent) => {
          if (!isCurrencyInput(input)) return;
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? start;
          const currentDigits = input.value.replace(/\D/g, "");
          const startDigits = input.value.slice(0, start).replace(/\D/g, "").length;
          const endDigits = input.value.slice(0, end).replace(/\D/g, "").length;
          const inputType = event.inputType;

          if (inputType === "insertText" || inputType === "insertFromPaste" || inputType === "insertReplacementText") {
            const inserted = (event.data ?? "").replace(/\D/g, "");
            if (!inserted) {
              event.preventDefault();
              return;
            }
            event.preventDefault();
            const nextDigits = currentDigits.slice(0, startDigits) + inserted + currentDigits.slice(endDigits);
            emitValue(input, formatBrlInput(nextDigits), startDigits + inserted.length);
            return;
          }

          if (inputType === "deleteContentBackward" || inputType === "deleteContentForward") {
            event.preventDefault();
            let removeStart = startDigits;
            let removeEnd = endDigits;
            if (startDigits === endDigits) {
              if (inputType === "deleteContentBackward") {
                if (removeStart === 0) return;
                removeStart -= 1;
              } else {
                if (removeEnd >= currentDigits.length) return;
                removeEnd += 1;
              }
            }
            const nextDigits = currentDigits.slice(0, removeStart) + currentDigits.slice(removeEnd);
            emitValue(input, formatBrlInput(nextDigits), removeStart);
          }
        };

        const paste = (event: ClipboardEvent) => {
          if (!isCurrencyInput(input)) return;
          const pasted = event.clipboardData?.getData("text") ?? "";
          const digits = pasted.replace(/\D/g, "");
          if (!digits) return;
          event.preventDefault();
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? start;
          const currentDigits = input.value.replace(/\D/g, "");
          const startDigits = input.value.slice(0, start).replace(/\D/g, "").length;
          const endDigits = input.value.slice(0, end).replace(/\D/g, "").length;
          const nextDigits = currentDigits.slice(0, startDigits) + digits + currentDigits.slice(endDigits);
          emitValue(input, formatBrlInput(nextDigits), startDigits + digits.length);
        };

        const focus = () => {
          const digits = input.value.replace(/\D/g, "");
          const formatted = formatBrlInput(digits);
          if (formatted !== input.value) emitValue(input, formatted, formatted.replace(/\D/g, "").length);
        };

        input.addEventListener("beforeinput", beforeInput);
        input.addEventListener("paste", paste);
        input.addEventListener("focus", focus);
      });
    };

    bind();
    const observer = new MutationObserver(bind);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><PublicAccentController /><BrlInputController /><PublicSetupGate><Outlet /></PublicSetupGate><Toaster /></QueryClientProvider>;
}
