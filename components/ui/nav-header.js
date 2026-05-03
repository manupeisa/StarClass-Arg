"use client";

import React, { useRef, useState } from "react";
import { motion } from "framer-motion";

const defaultItems = [
  { label: "Home", href: "#inicio" },
  { label: "Calendario", href: "#calendario" },
  { label: "Resultados", href: "#resultados" },
  { label: "Fotos", href: "#fotos" },
  { label: "Major", href: "/posicionamiento" },
  { label: "Sudamericano", href: "/sudamericano" },
  { label: "Dues", href: "/dues" },
];

export default function NavHeader({ items = defaultItems }) {
  const [position, setPosition] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  return (
    <nav className="nav-header" aria-label="Principal">
      <ul
        className="nav-header-list"
        onMouseLeave={() => setPosition((current) => ({ ...current, opacity: 0 }))}
      >
        {items.map((item) => (
          <Tab item={item} key={item.href} setPosition={setPosition} />
        ))}
        <Cursor position={position} />
      </ul>
    </nav>
  );
}

function Tab({ item, setPosition }) {
  const ref = useRef(null);

  return (
    <li
      ref={ref}
      onMouseEnter={() => {
        if (!ref.current) return;

        const { width } = ref.current.getBoundingClientRect();
        setPosition({
          width,
          opacity: 1,
          left: ref.current.offsetLeft,
        });
      }}
      className="nav-header-tab"
    >
      <a href={item.href}>{item.label}</a>
    </li>
  );
}

function Cursor({ position }) {
  return <motion.li animate={position} className="nav-header-cursor" />;
}
