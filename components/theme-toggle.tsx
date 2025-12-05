"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  variant?: "dropdown" | "switch"
  className?: string
}

export function ThemeToggle({ variant = "dropdown", className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)}>
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  if (variant === "switch") {
    return (
      <div className={cn("flex items-center gap-1 rounded-lg bg-sidebar-accent/50 p-1", className)}>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 rounded-md", theme === "light" && "bg-sidebar-accent text-sidebar-accent-foreground")}
          onClick={() => setTheme("light")}
        >
          <Sun className="h-3.5 w-3.5" />
          <span className="sr-only">Modo claro</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 rounded-md", theme === "dark" && "bg-sidebar-accent text-sidebar-accent-foreground")}
          onClick={() => setTheme("dark")}
        >
          <Moon className="h-3.5 w-3.5" />
          <span className="sr-only">Modo oscuro</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-7 w-7 rounded-md", theme === "system" && "bg-sidebar-accent text-sidebar-accent-foreground")}
          onClick={() => setTheme("system")}
        >
          <Monitor className="h-3.5 w-3.5" />
          <span className="sr-only">Sistema</span>
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)}>
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Cambiar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Claro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Oscuro
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          Sistema
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
