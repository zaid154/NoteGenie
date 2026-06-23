// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (motion). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

import { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useReducedMotion as useFramerReducedMotion,
} from "framer-motion";

export function useReducedMotion() {
  return useFramerReducedMotion();
}

function getTransition(reduced, duration = 0.35) {
  if (reduced) return { duration: 0 };
  return { duration, ease: [0.25, 0.1, 0.25, 1] };
}

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export function PageTransition({ children, className = "" }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={getTransition(reduced, 0.3)}
    >
      {children}
    </motion.div>
  );
}

const staggerContainerVariants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

const staggerItemVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

export function StaggerContainer({ children, className = "" }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerContainerVariants}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = "" }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={staggerItemVariants}
      transition={getTransition(false, 0.35)}
    >
      {children}
    </motion.div>
  );
}

export function MotionDiv({ children, className = "", whileHover, ...props }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div className={className} whileHover={whileHover} {...props}>
      {children}
    </motion.div>
  );
}

export function AnimatedNumber({ value, className = "" }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(typeof value === "number" ? 0 : value);

  useEffect(() => {
    if (typeof value !== "number" || reduced) {
      setDisplay(value);
      return;
    }

    const end = value;
    const duration = 600;
    const startTime = performance.now();
    let frame;

    function tick(now) {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(end * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    }

    setDisplay(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduced]);

  return <span className={className}>{display}</span>;
}

const slideVariants = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 20 : -20 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -20 : 20 }),
};

export function SlideTabs({ tabKey, children, className = "" }) {
  const reduced = useReducedMotion();
  const [prevKey, setPrevKey] = useState(tabKey);
  const direction = tabKey > prevKey ? 1 : -1;

  useEffect(() => {
    setPrevKey(tabKey);
  }, [tabKey]);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={tabKey}
        className={className}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={getTransition(false, 0.25)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function SlideTabContent({ activeKey, tabKey, children, className = "" }) {
  const reduced = useReducedMotion();
  if (activeKey !== tabKey) return null;
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={getTransition(false, 0.25)}
    >
      {children}
    </motion.div>
  );
}

export function DrawerPanel({ open, onClose, children }) {
  const reduced = useReducedMotion();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            className="absolute inset-0 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={getTransition(reduced, 0.2)}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-y-0 left-0 w-64 bg-surface shadow-card"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={reduced ? { duration: 0 } : { type: "spring", damping: 28, stiffness: 320 }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function FlipCard({ front, back, flipped, className = "", faceClassName = "" }) {
  const reduced = useReducedMotion();
  const faceCls = faceClassName
    ? `absolute inset-0 backface-hidden ${faceClassName}`
    : "card-solid absolute inset-0 p-6 backface-hidden";

  if (reduced) {
    return (
      <div className={faceClassName ? `${faceClassName} ${className}` : `card-solid min-h-[200px] p-6 ${className}`}>
        {flipped ? back : front}
      </div>
    );
  }

  return (
    <div className={`perspective-[1000px] ${className}`} style={{ perspective: 1000 }}>
      <motion.div
        className="relative min-h-[200px] w-full"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className={faceCls} style={{ backfaceVisibility: "hidden" }}>
          {front}
        </div>
        <div
          className={faceCls}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}

export function CardSlide({ cardKey, children, direction = 1 }) {
  const reduced = useReducedMotion();

  if (reduced) return <div>{children}</div>;

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={cardKey}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={getTransition(false, 0.3)}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function ScrollReveal({ children, className = "", delay = 0 }) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function ScaleIn({ children, className = "" }) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={getTransition(false, 0.35)}
    >
      {children}
    </motion.div>
  );
}

export { motion, AnimatePresence };

