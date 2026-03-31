import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div initial="initial" animate="animate" variants={pageVariants}>
      {children}
    </motion.div>
  );
}
