import * as Dialog from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, Inbox, LoaderCircle, X } from "lucide-react";
import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

import type { ApplicationStatus } from "@sei/shared";

import { cn } from "../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b10] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-[#5b8cff] text-[#06132e] hover:bg-[#82a7ff]",
        secondary:
          "border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10",
        ghost: "text-slate-300 hover:bg-white/7 hover:text-white",
        danger: "bg-[#f45d69] text-[#26050a] hover:bg-[#ff818b]",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant }), className)} {...props} />
  );
}

export function Panel({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/8 bg-[#11151d] shadow-[0_18px_52px_rgb(0_0_0_/_0.16)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

const statusClasses: Record<ApplicationStatus, string> = {
  WISHLIST: "border-slate-400/25 bg-slate-400/10 text-slate-200",
  APPLIED: "border-blue-300/25 bg-blue-400/10 text-blue-200",
  INTERVIEW: "border-amber-300/25 bg-amber-400/10 text-amber-100",
  OFFER: "border-emerald-300/25 bg-emerald-400/10 text-emerald-200",
  REJECTED: "border-rose-300/25 bg-rose-400/10 text-rose-200",
};

const statusLabels: Record<ApplicationStatus, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
};

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
        statusClasses[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export function LoadingState({ label = "Memuat data…" }: { label?: string }) {
  return (
    <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-slate-400">
      <span className="flex items-center gap-3 text-sm">
        <LoaderCircle
          className="size-5 animate-spin text-[#82a7ff]"
          aria-hidden
        />
        {label}
      </span>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-300/20 bg-rose-400/8 p-5 text-rose-100"
    >
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div>
          <p className="font-semibold">Data belum bisa dimuat</p>
          <p className="mt-1 text-sm text-rose-100/80">{message}</p>
          {onRetry ? (
            <Button className="mt-4" variant="secondary" onClick={onRetry}>
              Coba lagi
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-60 place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
      <Inbox className="size-8 text-[#82a7ff]" aria-hidden />
      <div className="mt-4 max-w-sm">
        <h2 className="font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      </div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function FieldError({ message }: { message?: string | undefined }) {
  return message ? (
    <p className="mt-1.5 text-sm text-rose-300">{message}</p>
  ) : null;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending = false,
}: {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm(): void;
  pending?: boolean;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#181e29] p-6 shadow-2xl focus:outline-none">
          <Dialog.Title className="text-lg font-semibold text-white">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-slate-400">
            {description}
          </Dialog.Description>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={pending}>
                Batal
              </Button>
            </Dialog.Close>
            <Button variant="danger" onClick={onConfirm} disabled={pending}>
              {pending ? "Memproses…" : confirmLabel}
            </Button>
          </div>
          <Dialog.Close
            aria-label="Tutup dialog"
            className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-white/8 hover:text-white"
          >
            <X className="size-4" />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
