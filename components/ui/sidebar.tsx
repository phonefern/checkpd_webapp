"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const SidebarContext = React.createContext<{
  open: boolean
  setOpen: (open: boolean) => void
} | null>(null)

export function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a Sidebar")
  }
  return context
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Sidebar({ className, children, ...props }: SidebarProps) {
  const [open, setOpen] = React.useState(true)

  return (
    <SidebarContext.Provider value={{ open, setOpen }}>
      <div
        className={cn(
          "relative flex h-screen w-full",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

interface SidebarTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode
}

export function SidebarTrigger({ className, children, ...props }: SidebarTriggerProps) {
  const { setOpen } = useSidebar()

  return (
    <button
      onClick={() => setOpen(true)}
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 w-9",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface SidebarContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function SidebarContent({ className, children, ...props }: SidebarContentProps) {
  const { open } = useSidebar()

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out transform",
        open ? "translate-x-0" : "-translate-x-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface SidebarOverlayProps extends React.HTMLAttributes<HTMLDivElement> {}

export function SidebarOverlay({ className, ...props }: SidebarOverlayProps) {
  const { open, setOpen } = useSidebar()

  if (!open) return null

  return (
    <div
      onClick={() => setOpen(false)}
      className={cn(
        "fixed inset-0 z-40 bg-black/50 transition-opacity duration-300",
        className
      )}
      {...props}
    />
  )
}

interface SidebarHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function SidebarHeader({ className, children, ...props }: SidebarHeaderProps) {
  return (
    <div
      className={cn("px-6 py-4 border-b border-gray-200", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface SidebarMenuProps extends React.HTMLAttributes<HTMLUListElement> {
  children: React.ReactNode
}

export function SidebarMenu({ className, children, ...props }: SidebarMenuProps) {
  return (
    <ul className={cn("flex flex-col gap-2 px-4 py-4", className)} {...props}>
      {children}
    </ul>
  )
}

interface SidebarMenuItemProps extends React.HTMLAttributes<HTMLLIElement> {
  children: React.ReactNode
}

export function SidebarMenuItem({ className, children, ...props }: SidebarMenuItemProps) {
  return <li className={cn("", className)} {...props}>{children}</li>
}

interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  isActive?: boolean
}

export function SidebarMenuButton({
  className,
  children,
  isActive = false,
  ...props
}: SidebarMenuButtonProps) {
  const { setOpen } = useSidebar()

  return (
    <button
      onClick={(e) => {
        props.onClick?.(e)
        setOpen(false)
      }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200",
        isActive
          ? "bg-blue-100 text-blue-700"
          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface SidebarFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function SidebarFooter({ className, children, ...props }: SidebarFooterProps) {
  return (
    <div
      className={cn("mt-auto px-4 py-4 border-t border-gray-200", className)}
      {...props}
    >
      {children}
    </div>
  )
}
