import { Outlet } from 'react-router-dom';

/**
 * Minimal mobile canvas shell for every /vote/* route. Top bars, bottom action bars, and
 * footers vary meaningfully screen-to-screen in the Stitch mocks (back button presence,
 * title alignment, terminal-state chrome), so those are composed per-page from
 * `components/voter/*` rather than forced into a single shared header here.
 */
export function VoterLayout() {
  return (
    <div className="canvas-container">
      <Outlet />
    </div>
  );
}
