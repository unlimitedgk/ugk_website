import * as React from 'react'

import { cn } from '@/lib/utils'

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

type ButtonBaseProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  as?: 'button' | 'a'
}

export type ButtonProps = ButtonBaseProps &
  React.ButtonHTMLAttributes<HTMLButtonElement>

export type ButtonLinkProps = ButtonBaseProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    as: 'a'
  }

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-gradient-to-r from-indigo-500 to-rose-500 text-white shadow-lg shadow-indigo-200/60 hover:opacity-90',
  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200',
  outline:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100',
}

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-11 px-6',
  sm: 'h-9 px-4 text-xs',
  lg: 'h-12 px-8 text-base',
  icon: 'h-10 w-10',
}

const Button = React.forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps | ButtonLinkProps
>(({ className, variant = 'default', size = 'default', as = 'button', ...props }, ref) => {
  const classes = cn(baseClasses, variantClasses[variant], sizeClasses[size], className)

  if (as === 'a') {
    return (
      <a
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={classes}
        {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
      />
    )
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={classes}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    />
  )
})
Button.displayName = 'Button'

export { Button }
