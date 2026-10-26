import { forwardRef, useId } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { LoaderCircle } from 'lucide-react';

const variants = {
  primary: 'bg-leaf text-on-leaf hover:bg-leaf-hover',
  lime: 'bg-lime text-on-lime hover:brightness-95',
  secondary: 'bg-surface text-ink ring-1 ring-inset ring-line hover:ring-ink-soft',
  ghost: 'text-ink hover:bg-surface-2',
  danger: 'bg-tomato text-white hover:brightness-110 dark:text-[#1a0b07]',
  'danger-ghost': 'text-tomato hover:bg-tomato-soft',
};

const sizes = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-[0.95rem] gap-2',
  lg: 'h-13 px-6 text-base gap-2.5',
};

export const Button = forwardRef(function Button(
  { as, to, href, variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props },
  ref,
) {
  const cls = clsx(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold whitespace-nowrap',
    'transition-[background-color,box-shadow,filter,transform] duration-150 active:scale-[0.97]',
    'disabled:opacity-50 disabled:active:scale-100',
    variants[variant],
    sizes[size],
    className,
  );
  const content = (
    <>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {children}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={cls} {...props}>{content}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} {...props}>{content}</a>;
  const Comp = as ?? 'button';
  return (
    <Comp ref={ref} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </Comp>
  );
});

export function Field({ label, hint, error, required, children, className }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-tomato" aria-hidden> *</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-ink-soft">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-sm font-medium text-tomato">
          {error}
        </p>
      )}
    </div>
  );
}

export function Skeleton({ className }) {
  return <div className={clsx('skeleton', className)} aria-hidden />;
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center rounded-xl border-2 border-dashed border-line px-6 py-14 text-center">
      {Icon && <Icon className="mb-4 size-10 text-ink-soft" strokeWidth={1.5} aria-hidden />}
      <h3 className="text-xl font-bold">{title}</h3>
      {children && <p className="mt-2 max-w-md text-ink-soft">{children}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-xl bg-tomato-soft px-5 py-6 text-center">
      <p className="font-semibold text-tomato">{error?.message ?? 'Something went wrong.'}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Container({ className, children }) {
  return <div className={clsx('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}
