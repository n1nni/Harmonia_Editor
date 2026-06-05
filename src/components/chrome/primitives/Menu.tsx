'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';
import { CheckIcon, ChevronRightIcon } from '../icons';

/**
 * Tiny dropdown-menu primitive. One <Menu label="File"> per top-level
 * category; children are <MenuItem> / <MenuCheck> / <MenuSeparator> /
 * <MenuSubmenu>.
 *
 * Behaviour:
 *  - click the label to open, click anywhere outside to close
 *  - Escape closes (Escape handler installed by parent useKeyboardShortcuts;
 *    we also listen here so the menu doesn't capture Escape if the parent
 *    has other things to do)
 *  - selecting a MenuItem fires its onSelect then closes the dropdown
 *  - MenuSubmenu opens on hover and closes when its parent closes
 */

interface MenuCtx {
  close: () => void;
  open: boolean;
}

const MenuContext = createContext<MenuCtx | null>(null);

function useMenu(): MenuCtx {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('Menu primitives must be used inside <Menu>');
  return ctx;
}

interface MenuProps {
  label: string;
  children: ReactNode;
  width?: number;
}

export function Menu({ label, children, width = 240 }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: PointerEvent) {
      if (!(e.target instanceof Node)) return;
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const ctx: MenuCtx = { close: () => setOpen(false), open };

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'inline-flex h-7 items-center rounded px-2 text-[12px] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
          open && 'bg-surface-hover text-text-primary',
        )}
      >
        {label}
      </button>
      <AnimatePresence>
        {open ? (
          <MenuContext.Provider value={ctx}>
            <motion.div
              key="dropdown"
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
              role="menu"
              className="absolute left-0 top-full z-40 mt-1 rounded-lg border border-line bg-surface-panel py-1 shadow-float"
              style={{ width }}
            >
              {children}
            </motion.div>
          </MenuContext.Provider>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

interface MenuItemProps {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
  /** When true, fires onSelect but does NOT auto-close the menu (used for
   *  checkbox items that should toggle in place). */
  keepOpen?: boolean;
}

export function MenuItem({ label, shortcut, disabled, onSelect, keepOpen }: MenuItemProps) {
  const { close } = useMenu();
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        if (!keepOpen) close();
      }}
      className={cn(
        'flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12px] text-text-primary transition-colors hover:bg-surface-hover focus:outline-none',
        disabled && 'cursor-not-allowed text-text-tertiary hover:bg-transparent',
      )}
    >
      <span>{label}</span>
      {shortcut ? (
        <span className="font-mono text-[10px] text-text-tertiary">{shortcut}</span>
      ) : null}
    </button>
  );
}

interface MenuCheckProps extends MenuItemProps {
  checked: boolean;
}

export function MenuCheck({ label, shortcut, checked, onSelect }: MenuCheckProps) {
  const { close } = useMenu();
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={() => {
        onSelect?.();
        close();
      }}
      className="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12px] text-text-primary transition-colors hover:bg-surface-hover focus:outline-none"
    >
      <span className="flex items-center gap-2">
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center text-accent">
          {checked ? <CheckIcon width={12} height={12} /> : null}
        </span>
        {label}
      </span>
      {shortcut ? (
        <span className="font-mono text-[10px] text-text-tertiary">{shortcut}</span>
      ) : null}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 h-px bg-line-subtle" />;
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 pt-2 pb-1 font-mono text-[9px] uppercase tracking-widest text-text-tertiary">
      {children}
    </div>
  );
}

interface MenuSubmenuProps {
  label: string;
  children: ReactNode;
}

export function MenuSubmenu({ label, children }: MenuSubmenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12px] text-text-primary transition-colors hover:bg-surface-hover">
        <span>{label}</span>
        <ChevronRightIcon width={10} height={10} className="text-text-tertiary" />
      </div>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.1 }}
            role="menu"
            className="absolute left-full top-0 z-50 rounded-lg border border-line bg-surface-panel py-1 shadow-float"
            style={{ minWidth: 180 }}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
