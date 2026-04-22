/**
 * Visual harness root. Renders a sidebar listing the entries defined
 * in ./entries.tsx and a viewport panel showing the active entry.
 *
 * URL contract:
 *   http://.../?entry=<id>     → render that entry full-viewport
 *   http://.../                → render the first entry
 *
 * The screenshot script drives the URL param to grab one PNG per entry.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ENTRIES, HarnessEntry } from './entries';

function getEntryFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get('entry');
}

function setEntryInUrl(id: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set('entry', id);
  window.history.replaceState({}, '', url.toString());
}

function Harness() {
  const [activeId, setActiveId] = useState<string>(
    getEntryFromUrl() ?? ENTRIES[0]?.id ?? '',
  );
  // Screenshot script sets ?shot=1 to hide the sidebar for clean captures.
  const shotMode = useMemo(
    () => new URLSearchParams(window.location.search).get('shot') === '1',
    [],
  );

  useEffect(() => {
    setEntryInUrl(activeId);
  }, [activeId]);

  const active: HarnessEntry | undefined = ENTRIES.find(
    (e) => e.id === activeId,
  );

  return (
    <>
      {!shotMode && (
        <aside className="harness-sidebar">
          <h1>WORDFALL HARNESS</h1>
          {ENTRIES.map((e) => (
            <button
              key={e.id}
              data-active={e.id === activeId}
              onClick={() => setActiveId(e.id)}
            >
              {e.label}
            </button>
          ))}
        </aside>
      )}
      <main className="harness-viewport" data-testid="harness-viewport">
        <span className="harness-label" data-testid="harness-label">
          {active?.id}
        </span>
        {active && (
          <div className="harness-frame" data-testid="harness-frame">
            {active.render()}
          </div>
        )}
      </main>
    </>
  );
}

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<Harness />);
