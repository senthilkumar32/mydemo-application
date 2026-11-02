import { useEffect, useRef, useState } from "react";
import { cancelJobRun, getJobRun } from "../lib/api";

const POLL_MS = 3000;
export const FINISHED = new Set(["done", "partial", "failed", "cancelled"]);

// Newest data wins for a match id; the list stays sorted best first.
const merge = (current, incoming) => {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => b.score - a.score);
};

// Follows a job run: polls every 3 s while it works, adding matches as they
// land. Pauses while the tab is hidden and stops when the run ends.
// `initial` is the run as the server last described it ({ id, token?, status, progress, ... }).
export function useJobRun(initial) {
  const runId = initial?.id;
  const runToken = initial?.token;
  const [run, setRun] = useState(initial);
  const [matches, setMatches] = useState([]);
  const [error, setError] = useState(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    setRun(initial);
    setMatches([]);
    setError(null);
    finishedRef.current = false;
    if (!runId) return undefined;

    let stopped = false;
    let inFlight = false;
    let timer = null;
    let cursor = null;

    const schedule = () => {
      clearTimeout(timer);
      if (!stopped && !finishedRef.current && !document.hidden) timer = setTimeout(poll, POLL_MS);
    };

    async function poll() {
      if (inFlight || stopped) return;
      inFlight = true;
      try {
        const data = await getJobRun(runId, { since: cursor, runToken });
        if (stopped) return;
        cursor = data.cursor;
        setRun((r) => ({ ...r, ...data.jobRun }));
        setMatches((m) => merge(m, data.matches));
        setError(null);
        if (FINISHED.has(data.jobRun.status)) {
          finishedRef.current = true;
          // One full read at the end picks up anything a poll could have missed.
          const all = await getJobRun(runId, { runToken });
          if (!stopped) setMatches(merge([], all.matches));
        }
      } catch (err) {
        if (stopped) return;
        setError(err.message);
        // Gone or not ours: polling again won't help.
        if (err.status === 404) finishedRef.current = true;
      } finally {
        inFlight = false;
      }
      schedule();
    }

    const onVisibility = () => {
      if (document.hidden) clearTimeout(timer);
      else poll();
    };

    document.addEventListener("visibilitychange", onVisibility);
    poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // `initial` is read only when the run changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId, runToken]);

  const cancel = async () => {
    try {
      const { jobRun } = await cancelJobRun(runId, runToken);
      setRun((r) => ({ ...r, ...jobRun }));
    } catch (err) {
      setError(err.message);
    }
  };

  return { run, matches, error, cancel };
}
