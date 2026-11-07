import { motion, type HTMLMotionProps } from "framer-motion";
import { Plus } from "lucide-react";

type BotaoCircularAdicionarProps = HTMLMotionProps<"button"> & { menuAberto?: boolean };

/** FAB circular com anel duplo azul e núcleo grafite. */
export function BotaoCircularAdicionar({
  className,
  menuAberto = false,
  ...props
}: BotaoCircularAdicionarProps) {
  return (
    <motion.button
      type="button"
      aria-label="Adicionar"
      whileTap={{ scale: 0.94 }}
      whileHover={{
        filter: "drop-shadow(0 0 8px rgba(37, 99, 235, 0.48))",
      }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={[
        "inline-grid size-14 shrink-0 place-items-center rounded-full",
        "border-[3px] border-[#2563EB] bg-transparent p-[3px]",
        "shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      <span
        aria-hidden="true"
        className="grid size-full place-items-center rounded-full border border-white/[0.12] bg-[#26282D]"
      >
        <Plus size={22} strokeWidth={2.5} className={`text-white agenda-fab-icone ${menuAberto ? "agenda-fab-icone-aberto" : ""}`} />
      </span>
    </motion.button>
  );
}
