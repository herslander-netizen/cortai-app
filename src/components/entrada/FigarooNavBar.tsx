import type { ComponentType } from "react";
import { motion } from "framer-motion";
import { Globe, CalendarDays, BotMessageSquare, Wallet, UsersRound } from "lucide-react";

interface Props {
  currentIndex: number;
  onTap: (i: number) => void;
}

type NavItem = {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  pulse?: boolean;
  badge?: number;
};

const ITEMS: NavItem[] = [
  { icon: Globe, label: "Site" },
  { icon: CalendarDays, label: "Agenda" },
  { icon: BotMessageSquare, label: "Atendimento Automatizado", pulse: true },
  { icon: Wallet, label: "Financeiro" },
  { icon: UsersRound, label: "Fila de espera", badge: 3 },
];

export const FigarooNavBar = ({ currentIndex, onTap }: Props) => (
  <nav className="flex justify-between px-8 max-w-[390px] mx-auto w-full" aria-label="Navegação das demonstrações">
    {ITEMS.map((item, i) => {
      const isActive = i === currentIndex;
      const Icon = item.icon;
      return (
        <button key={i} type="button" aria-label={item.label} aria-current={isActive ? "page" : undefined} onClick={() => onTap(i)} className="flex flex-col items-center gap-1.5 w-12 outline-none">
          <motion.div
            initial={false}
            animate={{ scale: isActive ? 1.3 : 1, y: isActive ? -2 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            whileTap={{ scale: 0.85 }}
            className="relative p-1.5 rounded-full"
            style={{
              color: isActive ? "#FF7AB8" : "rgba(255,255,255,0.35)",
              filter: isActive ? "drop-shadow(0 0 10px rgba(255,122,184,0.9)) drop-shadow(0 0 24px rgba(255,122,184,0.45))" : "none",
            }}
          >
            <Icon size={28} strokeWidth={isActive ? 2.5 : 2} />
            {item.pulse && !isActive ? <span className="absolute top-1 right-1 flex h-2 w-2"><span className="animate-ping absolute h-full w-full rounded-full bg-[#FF7AB8] opacity-75" /><span className="relative rounded-full h-2 w-2 bg-[#FF7AB8]" /></span> : null}
            {item.badge ? <span className="absolute -top-1 -right-1 bg-[#0D5CAD] text-white text-[10px] font-bold min-w-5 h-5 grid place-items-center rounded-full px-1">{item.badge}</span> : null}
          </motion.div>
          <motion.div
            initial={false}
            animate={{ width: isActive ? 28 : 16, opacity: isActive ? 1 : 0.6 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="h-1 rounded-full bg-[#C7A900]"
            style={{ boxShadow: isActive ? "0 0 8px rgba(199,169,0,.8)" : "none" }}
          />
        </button>
      );
    })}
  </nav>
);
