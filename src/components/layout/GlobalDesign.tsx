import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";

import { transicaoBase, transicaoReduzida } from "@/lib/motion";
import { useMenosMovimento } from "@/hooks/useMovimento";

/**
 * Base de movimento do app: respeita "reduzir movimento" do aparelho
 * (só esmaece, até 150 ms) e dá transição padrão sem quique a quem não define.
 */
export function GlobalDesign({ children }: { children: ReactNode }) {
  const menos = useMenosMovimento();
  return (
    <div className="min-h-screen">
      <MotionConfig reducedMotion="user" transition={menos ? transicaoReduzida : transicaoBase}>
        {children}
      </MotionConfig>
    </div>
  );
}
