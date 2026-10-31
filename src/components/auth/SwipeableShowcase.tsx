import type { ReactNode } from "react";
import { motion, type PanInfo } from "framer-motion";

interface SwipeableShowcaseProps {
  currentIndex: number;
  totalScenes: number;
  onIndexChange: (newIndex: number) => void;
  onHoldStart: () => void;
  onHoldEnd: () => void;
  children: ReactNode;
}

const SWIPE_THRESHOLD = 50;
const VELOCITY_THRESHOLD = 400;

/**
 * Área de demonstração que aceita gesto horizontal sem bloquear a rolagem vertical.
 * O componente não controla o índice: a cena ativa continua pertencendo ao pai.
 */
export function SwipeableShowcase({
  currentIndex,
  totalScenes,
  onIndexChange,
  onHoldStart,
  onHoldEnd,
  children,
}: SwipeableShowcaseProps) {
  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    onHoldEnd();

    const { offset, velocity } = info;
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) {
      if (currentIndex < totalScenes - 1) onIndexChange(currentIndex + 1);
      return;
    }

    if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
      if (currentIndex > 0) onIndexChange(currentIndex - 1);
    }
  }

  return (
    <div
      className="relative h-full w-full touch-pan-y select-none overflow-hidden"
      onPointerDown={onHoldStart}
      onPointerUp={onHoldEnd}
      onPointerCancel={onHoldEnd}
      onLostPointerCapture={onHoldEnd}
    >
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.22, right: 0.22 }}
        dragMomentum
        dragTransition={{ bounceStiffness: 400, bounceDamping: 32 }}
        onDragEnd={handleDragEnd}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        style={{ x: 0 }}
      >
        {children}
      </motion.div>
    </div>
  );
}
