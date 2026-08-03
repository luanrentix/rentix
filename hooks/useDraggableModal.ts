"use client";

import { useEffect, useRef, useState } from "react";

export function useDraggableModal(modalOpen: boolean) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!modalOpen) {
      setPosition({ x: 0, y: 0 });
      return;
    }

    const modalEl = modalRef.current;
    if (!modalEl) return;

    // Find the header inside modal
    const headerEl = modalEl.querySelector<HTMLElement>(".contrx-modal-header") || modalEl.firstElementChild as HTMLElement;
    if (!headerEl) return;

    headerEl.style.cursor = "grab";
    headerRef.current = headerEl;

    function onMouseDown(e: MouseEvent) {
      // Don't drag if clicking buttons or inputs
      const target = e.target as HTMLElement;
      if (target.closest("button, input, select, textarea, a")) return;

      isDragging.current = true;
      headerEl.style.cursor = "grabbing";
      dragStart.current = { x: e.clientX, y: e.clientY };
      initialPos.current = { ...position };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPosition({
        x: initialPos.current.x + dx,
        y: initialPos.current.y + dy,
      });
    }

    function onMouseUp() {
      isDragging.current = false;
      if (headerRef.current) {
        headerRef.current.style.cursor = "grab";
      }
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    headerEl.addEventListener("mousedown", onMouseDown);

    return () => {
      headerEl.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [modalOpen, position]);

  return { modalRef, position };
}
