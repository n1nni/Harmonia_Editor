import type { SVGProps } from 'react';

/**
 * Local SVG icon set. All icons are 16x16 viewBox, stroke-only with
 * currentColor so they inherit text colour. Sized at the call site via
 * `width` / `height` props.
 *
 * Keeping these inline (rather than an external icon library) keeps the
 * bundle small and the visual style consistent.
 */

const baseProps: Partial<SVGProps<SVGSVGElement>> = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

type IconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'fill' | 'xmlns'>;

function I({ children, ...rest }: { children: React.ReactNode } & IconProps) {
  // Default to 1em / 1em so the icon scales with the parent's font-size,
  // which the chrome's --ui-scale system drives. Callers can still pass
  // explicit `width` / `height` to opt out.
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" {...baseProps} {...rest}>
      {children}
    </svg>
  );
}

export const UploadIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M8 2.5v8m0-8L5 5.5m3-3L11 5.5M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11" />
  </I>
);

export const SaveIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M3 3v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5l-2-2H4a1 1 0 0 0-1 1z M5 3v3h6V3 M6 10h4" />
  </I>
);

export const FitIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M3 6V3h3M13 6V3h-3M3 10v3h3M13 10v3h-3" />
  </I>
);

export const ZoomInIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M8 3.5v9M3.5 8h9" />
  </I>
);

export const ZoomOutIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M3.5 8h9" />
  </I>
);

export const ZoomResetIcon = (p: IconProps) => (
  <I {...p}>
    <circle cx="8" cy="8" r="5" />
    <path d="M8 6v4M6 8h4" />
  </I>
);

export const EyeIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
    <circle cx="8" cy="8" r="1.6" />
  </I>
);

export const EyeOffIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M3 3l10 10M5.5 5.6C3.4 6.9 1.5 8 1.5 8s2.5 4.5 6.5 4.5c1.2 0 2.3-.4 3.2-.9M10.5 10.6c1.5-1 2.5-2.6 2.5-2.6S12 3.5 8 3.5c-.7 0-1.4.2-2 .4" />
  </I>
);

export const TrashIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M3 4.5h10M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M5 4.5v8a1.5 1.5 0 0 0 1.5 1.5h3A1.5 1.5 0 0 0 11 12.5v-8M7 7v5M9 7v5" />
  </I>
);

export const ArrowUpIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M8 12.5V3.5M4 7l4-3.5L12 7" />
  </I>
);

export const ArrowDownIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M8 3.5v9M4 9l4 3.5L12 9" />
  </I>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M12.5 8h-9M7 4L3.5 8 7 12" />
  </I>
);

export const ArrowRightIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M3.5 8h9M9 4l3.5 4L9 12" />
  </I>
);

export const PlayIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M5 3.5L12 8l-7 4.5z" />
  </I>
);

export const ChevronDownIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M4 6l4 4 4-4" />
  </I>
);

export const ChevronRightIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M6 4l4 4-4 4" />
  </I>
);

export const CheckIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M3 8.5l3.2 3.2L13 5" />
  </I>
);

export const BboxIcon = (p: IconProps) => (
  <I {...p}>
    <rect x="3" y="3" width="10" height="10" rx="0.5" strokeDasharray="2 1.5" />
  </I>
);

export const DotIcon = (p: IconProps) => (
  <I {...p}>
    <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
  </I>
);

export const RulerIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M2.5 6h11v4h-11zM5 6v2M8 6v3M11 6v2" />
  </I>
);

export const LabelIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M2 4h7l3 4-3 4H2zM5 8h0.01" />
  </I>
);

export const GridIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M2.5 5.5h11M2.5 8.5h11M2.5 11.5h11M5.5 2.5v11M8.5 2.5v11M11.5 2.5v11" />
  </I>
);

export const QuestionIcon = (p: IconProps) => (
  <I {...p}>
    <circle cx="8" cy="8" r="6" />
    <path d="M6.5 6.5c0-1 1-1.7 2-1.5s1.5 1 1.3 1.8c-.2.7-1.3 1-1.3 1.7v.5M8 11.5h.01" />
  </I>
);

export const CursorIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M3 2.5l8 4.5-3.5 1.2L6 13z" fill="currentColor" stroke="currentColor" strokeWidth="0.8" />
  </I>
);

export const StaffIcon = (p: IconProps) => (
  <I {...p}>
    <path d="M2 4.5h12M2 6.75h12M2 9h12M2 11.25h12M2 13.5h12" strokeWidth="1.2" />
  </I>
);

export const PlusNoteIcon = (p: IconProps) => (
  <I {...p}>
    <ellipse cx="5.5" cy="11" rx="3" ry="2.2" fill="currentColor" stroke="none" />
    <path d="M8.5 11V3" />
    <path d="M11.5 3.5h4M13.5 1.5v4" />
  </I>
);
