'use client';

import { useHarmonyActions, useHarmonyStore } from '@/lib/store/useHarmonyStore';
import { useDisplay, useHistory, useInteraction } from '@/lib/store/selectors';
import {
  Menu,
  MenuItem,
  MenuCheck,
  MenuSeparator,
  MenuSubmenu,
} from './primitives/Menu';
import { SCALED } from './scale';

/**
 * Top horizontal menu bar — wordmark + five category dropdowns.
 * Height and font size scale with the `--ui-scale` CSS variable so the
 * whole chrome can be enlarged or shrunk via View → UI scale.
 */
export function TopMenuBar() {
  const a = useHarmonyActions();
  const display = useDisplay();
  const interaction = useInteraction();
  const history = useHistory();
  const status = useHarmonyStore((s) => s.data.status);

  const hasSelection = Boolean(interaction.selectedId);
  const uiScale = display.uiScale;

  const UI_SCALES: { label: string; value: number }[] = [
    { label: 'Compact (70%)', value: 0.7 },
    { label: 'Small (85%)', value: 0.85 },
    { label: 'Normal (100%)', value: 1.0 },
    { label: 'Large (115%)', value: 1.15 },
    { label: 'Larger (130%)', value: 1.3 },
  ];

  return (
    <header
      className="flex items-center justify-between border-b border-line-subtle bg-surface-panel pl-3 pr-3"
      style={{ height: SCALED.menuBarHeight, fontSize: SCALED.menuLabelSize }}
    >
      <div className="flex items-center gap-3">
        <BrandWordmark />
        <nav className="flex items-center gap-0.5" aria-label="Application menu">
          <Menu label="File">
            <MenuItem
              label="Upload score"
              shortcut="Ctrl+O"
              onSelect={() => void a.loadFixture()}
            />
            <MenuItem
              label="Save edited MusicXML"
              shortcut="Ctrl+S"
              onSelect={() => void a.saveEditedXml()}
              disabled={status !== 'ready'}
            />
          </Menu>

          <Menu label="Edit">
            <MenuItem
              label="Undo"
              shortcut="Ctrl+Z"
              disabled={!history.canUndo}
              onSelect={a.undo}
            />
            <MenuItem
              label="Redo"
              shortcut="Ctrl+Y"
              disabled={!history.canRedo}
              onSelect={a.redo}
            />
            <MenuSeparator />
            <MenuItem
              label="Pitch up"
              shortcut="↑"
              disabled={!hasSelection}
              onSelect={() => a.shiftSelectedPitch(1)}
            />
            <MenuItem
              label="Pitch down"
              shortcut="↓"
              disabled={!hasSelection}
              onSelect={() => a.shiftSelectedPitch(-1)}
            />
            <MenuSeparator />
            <MenuItem
              label="Delete note"
              shortcut="Del"
              disabled={!hasSelection}
              onSelect={() => {
                if (interaction.selectedId) a.requestDelete(interaction.selectedId);
              }}
            />
          </Menu>

          <Menu label="View">
            <MenuItem label="Fit to screen" shortcut="F" onSelect={a.fitToScreen} />
            <MenuItem
              label="Zoom in"
              shortcut="+"
              onSelect={() => {
                const z = useHarmonyStore.getState().viewport.zoom;
                a.setZoom(z * 1.2);
              }}
            />
            <MenuItem
              label="Zoom out"
              shortcut="-"
              onSelect={() => {
                const z = useHarmonyStore.getState().viewport.zoom;
                a.setZoom(z / 1.2);
              }}
            />
            <MenuItem
              label="Reset zoom"
              shortcut="0"
              onSelect={() => {
                a.setZoom(1);
                a.setPan({ x: 0, y: 0 });
              }}
            />
            <MenuSeparator />
            <MenuSubmenu label="UI scale">
              {UI_SCALES.map(({ label, value }) => (
                <MenuCheck
                  key={value}
                  label={label}
                  checked={Math.abs(uiScale - value) < 0.01}
                  onSelect={() => a.setUiScale(value)}
                />
              ))}
            </MenuSubmenu>
            <MenuSeparator />
            <MenuCheck
              label="Show source image"
              checked={display.reconstructionOn}
              onSelect={() => a.setReconstructionOn(!display.reconstructionOn)}
            />
            <MenuCheck
              label="Show staff inspector"
              checked={display.staffInspectorVisible}
              onSelect={() =>
                a.setStaffInspectorVisible(!display.staffInspectorVisible)
              }
            />
            <MenuCheck
              label="Snap to other staves"
              checked={display.snapToOtherStaves}
              onSelect={() =>
                a.setSnapToOtherStaves(!display.snapToOtherStaves)
              }
            />
            <MenuSubmenu label="DPI">
              {[96, 150, 300, 600].map((d) => (
                <MenuCheck
                  key={d}
                  label={`${d}`}
                  checked={display.dpi === d}
                  onSelect={() => a.setDpi(d)}
                />
              ))}
            </MenuSubmenu>
            <MenuSubmenu label="Overlay opacity">
              {[100, 75, 50, 25].map((p) => (
                <MenuItem
                  key={p}
                  label={`${p}%`}
                  onSelect={() => a.setOverlayOpacity(p / 100)}
                />
              ))}
            </MenuSubmenu>
            <MenuSubmenu label="Debug">
              <MenuCheck
                label="Bounding boxes"
                checked={display.debug.bboxes}
                onSelect={() => a.toggleDebug('bboxes')}
              />
              <MenuCheck
                label="Centers"
                checked={display.debug.centers}
                onSelect={() => a.toggleDebug('centers')}
              />
              <MenuCheck
                label="Staff baselines"
                checked={display.debug.baselines}
                onSelect={() => a.toggleDebug('baselines')}
              />
              <MenuCheck
                label="Class labels"
                checked={display.debug.labels}
                onSelect={() => a.toggleDebug('labels')}
              />
              <MenuCheck
                label="Image grid"
                checked={display.debug.grid}
                onSelect={() => a.toggleDebug('grid')}
              />
            </MenuSubmenu>
          </Menu>

          <Menu label="Sequence">
            <MenuItem
              label="Start from first note"
              onSelect={a.selectFirstNote}
            />
            <MenuItem
              label="Previous"
              shortcut="←"
              disabled={!hasSelection}
              onSelect={() => a.stepNote(-1)}
            />
            <MenuItem
              label="Next"
              shortcut="→"
              disabled={!hasSelection}
              onSelect={() => a.stepNote(1)}
            />
          </Menu>

          <Menu label="Help" width={220}>
            <MenuItem
              label="Keyboard shortcuts"
              onSelect={() =>
                window.alert(
                  'F  Fit to screen\n+  Zoom in\n−  Zoom out\n0  Reset zoom\n←/→  Previous / next note\n↑/↓  Pitch up / down\nDel  Delete note\nEnter  Confirm delete\nEsc  Cancel / clear selection\nCtrl+S  Save\nCtrl+O  Upload\nCtrl+Z  Undo\nCtrl+Y  Redo',
                )
              }
            />
            <MenuItem
              label="About Harmonia"
              onSelect={() =>
                window.alert(
                  'Harmonia — vector overlay reconstruction and correction for optically recognised sheet music.',
                )
              }
            />
          </Menu>
        </nav>
      </div>

      <span
        className="rounded bg-surface-elevated px-1.5 py-0.5 font-mono uppercase tracking-widest text-text-tertiary"
        style={{ fontSize: SCALED.statusTextSize }}
      >
        βeta
      </span>
    </header>
  );
}

function BrandWordmark() {
  return (
    <div className="flex select-none items-center gap-2 pr-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/harmonia_logo.png"
        alt="Harmonia"
        draggable={false}
        className="w-auto"
        style={{ height: SCALED.logoHeight }}
      />
      <span
        className="font-semibold tracking-tight text-text-primary"
        style={{ fontSize: SCALED.wordmarkSize }}
      >
        Harmonia
      </span>
    </div>
  );
}
