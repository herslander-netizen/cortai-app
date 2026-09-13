import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";

const STORAGE_KEY = "cortai-tema";

export function ThemeToggle() {
  const [claro, setClaro] = useState(false);

  useEffect(() => {
    const salvo = window.localStorage.getItem(STORAGE_KEY);
    const usarClaro = salvo === "claro";
    document.documentElement.classList.toggle("light", usarClaro);
    setClaro(usarClaro);
  }, []);

  function alterar(ativo: boolean) {
    setClaro(ativo);
    document.documentElement.classList.toggle("light", ativo);
    window.localStorage.setItem(STORAGE_KEY, ativo ? "claro" : "escuro");
  }

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 border-b border-line py-5">
      {claro ? <Sun size={18} className="text-mute" /> : <Moon size={18} className="text-mute" />}
      <span className="min-w-0">
        <span className="block text-sm text-paper">Tema claro</span>
        <span className="mt-0.5 block text-xs text-mute">Use a aparência mais confortável para você</span>
      </span>
      <Switch checked={claro} onCheckedChange={alterar} aria-label="Usar tema claro" />
    </div>
  );
}