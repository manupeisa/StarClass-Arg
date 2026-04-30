"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

export default function HeroCarousel({ images }) {
  const slides = useMemo(() => {
    return [...new Set((images || []).filter(Boolean))];
  }, [images]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 7000);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  return (
    <div className="hero-media" aria-hidden="true">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={slides[active]}
          className="hero-slide"
          style={{ backgroundImage: `url("${slides[active]}")` }}
          initial={{
            clipPath: "circle(0% at 50% 50%)",
            scale: 1.08,
            opacity: 0.6,
          }}
          animate={{
            clipPath: "circle(145% at 50% 50%)",
            scale: 1,
            opacity: 1,
          }}
          exit={{
            clipPath: "circle(0% at 50% 50%)",
            scale: 1.04,
            opacity: 0,
          }}
          transition={{
            clipPath: { duration: 0.9, ease: [0.76, 0, 0.24, 1] },
            scale: { duration: 1.2, ease: "easeOut" },
            opacity: { duration: 0.45 },
          }}
        />
      </AnimatePresence>
    </div>
  );
}
