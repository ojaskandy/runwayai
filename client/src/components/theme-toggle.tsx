import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "./theme-provider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      className="w-8 h-8 rounded-full text-white hover:bg-red-900/40"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-yellow-300" />
      ) : (
        <Moon className="h-4 w-4 text-red-300" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}