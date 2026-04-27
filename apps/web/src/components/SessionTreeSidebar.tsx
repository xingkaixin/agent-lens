import { FileTree, useFileTree } from "@pierre/trees/react";
import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import type { SessionHead } from "../lib/api";
import { BookmarkButton } from "./BookmarkButton";

interface SessionTreeSidebarProps {
  sessions: SessionHead[];
  activeSessionId: string | null;
  selectedSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  isBookmarked: (sessionId: string) => boolean;
  onToggleBookmark: (session: SessionHead) => void;
}

interface SessionTreeModel {
  paths: string[];
  pathBySessionId: Map<string, string>;
  sessionIdByPath: Map<string, string>;
  decorationByPath: Map<string, string>;
}

type TreeHostStyle = CSSProperties & Record<`--${string}`, string>;

function sanitizeSegment(value: string) {
  return value.replaceAll("/", "∕").trim() || "(untitled)";
}

function getDirectorySegments(directory: string) {
  return directory
    .replace(/^~(?=\/|$)/, "home")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function getCommonPrefixLength(items: string[][]) {
  if (items.length === 0) return 0;
  let index = 0;
  while (items.every((item) => item[index] && item[index] === items[0]?.[index])) {
    index += 1;
  }
  return index;
}

function buildSessionTreeModel(sessions: SessionHead[]): SessionTreeModel {
  const directorySegments = sessions.map((session) => getDirectorySegments(session.directory));
  const prefixLength = getCommonPrefixLength(directorySegments);
  const pathBySessionId = new Map<string, string>();
  const sessionIdByPath = new Map<string, string>();
  const decorationByPath = new Map<string, string>();
  const usedPaths = new Set<string>();
  const paths: string[] = [];

  sessions.forEach((session, index) => {
    const relativeSegments = directorySegments[index]?.slice(prefixLength) ?? [];
    const directoryPath = relativeSegments.length > 0 ? relativeSegments : ["(unknown)"];
    const baseLeaf = `${sanitizeSegment(session.title)} #${session.id.slice(0, 8)}`;
    let path = [...directoryPath.map(sanitizeSegment), baseLeaf].join("/");
    let suffix = 2;
    while (usedPaths.has(path)) {
      path = [...directoryPath.map(sanitizeSegment), `${baseLeaf} (${suffix})`].join("/");
      suffix += 1;
    }

    usedPaths.add(path);
    paths.push(path);
    pathBySessionId.set(session.id, path);
    sessionIdByPath.set(path, session.id);
    decorationByPath.set(path, `${session.stats.message_count}`);
  });

  return { paths, pathBySessionId, sessionIdByPath, decorationByPath };
}

export function SessionTreeSidebar({
  sessions,
  activeSessionId,
  selectedSessionId,
  onSelectSession,
  isBookmarked,
  onToggleBookmark,
}: SessionTreeSidebarProps) {
  const modelData = useMemo(() => buildSessionTreeModel(sessions), [sessions]);
  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === (selectedSessionId ?? activeSessionId)) ?? null,
    [activeSessionId, selectedSessionId, sessions],
  );
  const sessionIdByPathRef = useRef(modelData.sessionIdByPath);
  const decorationByPathRef = useRef(modelData.decorationByPath);
  const onSelectSessionRef = useRef(onSelectSession);
  const treeHostStyle: TreeHostStyle = {
    "--trees-border-color-override": "var(--console-border)",
    "--trees-fg-override": "var(--console-text)",
    "--trees-selected-bg-override": "white",
  };
  const { model } = useFileTree({
    flattenEmptyDirectories: true,
    initialExpansion: "open",
    paths: modelData.paths,
    search: true,
    density: "compact",
    onSelectionChange(paths) {
      const sessionId = sessionIdByPathRef.current.get(paths[0] ?? "");
      if (sessionId) onSelectSessionRef.current(sessionId);
    },
    renderRowDecoration({ item }) {
      return decorationByPathRef.current.get(item.path)
        ? { text: decorationByPathRef.current.get(item.path)!, title: "Messages" }
        : null;
    },
  });

  useEffect(() => {
    sessionIdByPathRef.current = modelData.sessionIdByPath;
    decorationByPathRef.current = modelData.decorationByPath;
    model.resetPaths(modelData.paths);
  }, [model, modelData]);

  useEffect(() => {
    onSelectSessionRef.current = onSelectSession;
  }, [onSelectSession]);

  useEffect(() => {
    const activePath = modelData.pathBySessionId.get(activeSessionId ?? "");
    const focusedPath = modelData.pathBySessionId.get(selectedSessionId ?? "") ?? activePath;
    if (activePath) model.getItem(activePath)?.select();
    if (focusedPath) model.focusPath(focusedPath);
  }, [activeSessionId, model, modelData, selectedSessionId]);

  return (
    <div className="overflow-hidden rounded-sm border border-[var(--console-border)] bg-white">
      <div
        className="session-tree h-[min(560px,calc(100vh-410px))] min-h-56 overflow-hidden"
        style={treeHostStyle}
      >
        <FileTree model={model} style={{ height: "100%" }} aria-label="Sessions" />
      </div>
      {selectedSession ? (
        <div className="flex items-center gap-2 border-t border-[var(--console-border)] px-2 py-2">
          <span
            className="console-mono line-clamp-1 min-w-0 flex-1 text-[11px] text-[var(--console-muted)]"
            title={selectedSession.title}
          >
            {selectedSession.title}
          </span>
          <BookmarkButton
            active={isBookmarked(selectedSession.id)}
            onToggle={() => onToggleBookmark(selectedSession)}
          />
        </div>
      ) : null}
    </div>
  );
}
