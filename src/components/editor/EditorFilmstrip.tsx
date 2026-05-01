import React, { useEffect, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import { useEditorStore } from "../../store/editorStore";
import { supabase } from "../../lib/supabase";
import type { Panel } from "../../types";
import VideoThumbnail from "../VideoThumbnail";

const THUMB_WIDTH = 148;

export default function EditorFilmstrip(): React.JSX.Element {
  const {
    panels,
    layers,
    activePanelId,
    story,
    defaultChunkId,
    setActivePanelId,
    addPanel,
    deletePanel,
    reorderPanels,
    setSaveStatus,
  } = useEditorStore();

  // Two-click delete confirmation. First click on the × switches the
  // button into "confirm" state for 3s; second click within that window
  // commits the delete. Clicking outside or the 3s timeout reverts.
  const [confirmingDeletionId, setConfirmingDeletionId] = useState<string | null>(null);
  const confirmTimeoutRef = useRef<number | null>(null);
  const deleteButtonRef = useRef<HTMLButtonElement | null>(null);

  const clearConfirmTimeout = (): void => {
    if (confirmTimeoutRef.current !== null) {
      window.clearTimeout(confirmTimeoutRef.current);
      confirmTimeoutRef.current = null;
    }
  };

  // Reset confirm-state when the user clicks anywhere outside the delete
  // button (e.g. on a different panel, the canvas, or the rail).
  useEffect(() => {
    if (!confirmingDeletionId) return;
    const onDocClick = (e: MouseEvent): void => {
      if (deleteButtonRef.current && deleteButtonRef.current.contains(e.target as Node)) return;
      setConfirmingDeletionId(null);
      clearConfirmTimeout();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [confirmingDeletionId]);

  // Clean up the timeout on unmount.
  useEffect(() => () => clearConfirmTimeout(), []);

  const performDelete = async (panelId: string): Promise<void> => {
    const { error } = await supabase.from("panels").delete().eq("id", panelId);
    if (error) {
      setSaveStatus("error");
      return;
    }
    deletePanel(panelId);
  };

  const handleDeletePanel = (panelId: string): void => {
    if (confirmingDeletionId === panelId) {
      // Second click — commit.
      setConfirmingDeletionId(null);
      clearConfirmTimeout();
      void performDelete(panelId);
      return;
    }
    // First click — enter confirm state for 3s.
    setConfirmingDeletionId(panelId);
    clearConfirmTimeout();
    confirmTimeoutRef.current = window.setTimeout(() => {
      setConfirmingDeletionId(null);
      confirmTimeoutRef.current = null;
    }, 3000);
  };

  const handleAddPanel = async (): Promise<void> => {
    if (!story) return;
    if (!defaultChunkId) {
      // Chunk hasn't loaded yet; refuse the write so we don't create an
      // orphaned panel that the reader would have to heal.
      setSaveStatus("error");
      if (import.meta.env.DEV)
        console.warn("[editor] refused add-panel: defaultChunkId is null");
      return;
    }
    const position = panels.length;
    const newPanel = {
      story_id: story.id,
      chunk_id: defaultChunkId,
      position,
      height: 480,
      image_url: null as string | null,
    };
    const { data, error } = await supabase
      .from("panels")
      .insert(newPanel)
      .select()
      .single();

    if (error || !data) {
      setSaveStatus("error");
      return;
    }
    addPanel(data as Panel);
    setActivePanelId((data as Panel).id);
    setSaveStatus("unsaved");
  };

  return (
    <aside
      className="editor-filmstrip"
      aria-label="Panel filmstrip"
      style={{ overflowX: "hidden", width: "275px" }}
    >
      <div
        style={{
          padding: "12px 16px 8px",
          fontSize: "15px",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-faint)",
        }}
      >
        Panels
      </div>
      <Reorder.Group
        as="div"
        axis="y"
        values={[...panels].sort((a, b) => a.position - b.position)}
        onReorder={(newOrder: Panel[]) => {
          reorderPanels(newOrder.map((p) => p.id));
          setSaveStatus("unsaved");
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "0 16px",
          listStyle: "none",
          margin: 0,
        }}
      >
        {[...panels].sort((a, b) => a.position - b.position).map((panel, index) => {
          const thumbHeight = Math.round(panel.height * (THUMB_WIDTH / 304));
          const isActive = panel.id === activePanelId;
          return (
            <Reorder.Item
              key={panel.id}
              value={panel}
              as="div"
              onClick={() => setActivePanelId(panel.id)}
              aria-label={`Panel ${index + 1}${isActive ? ", selected" : ""}`}
              style={{
                width: "100%",
                height: `300px`,
                background: "var(--bg-dd)",
                border: isActive
                  ? "1.5px solid var(--rose-deep)"
                  : "1px solid var(--thumb-brd)",
                borderRadius: "4px",
                overflow: "hidden",
                position: "relative",
                flexShrink: 0,
                cursor: "grab",
                listStyle: "none",
              }}
            >
              {(() => {
                const panelLayers = layers
                  .filter(
                    (l) =>
                      l.panel_id === panel.id &&
                      l.media_type !== "audio" &&
                      l.media_url,
                  )
                  .sort((a, b) => b.position - a.position);
                const topLayer = panelLayers[0];
                if (!topLayer?.media_url) {
                  return (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        pointerEvents: "none",
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                        style={{ opacity: 0.2 }}
                      >
                        <rect x="1" y="1" width="18" height="18" rx="2" stroke="var(--text-primary)" strokeWidth="1.5" />
                        <path d="M1 14l5-5 4 4 3-3 6 6" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="6.5" cy="6.5" r="1.5" stroke="var(--text-primary)" strokeWidth="1.2" />
                      </svg>
                    </div>
                  );
                }
                if (topLayer.media_type === "video") {
                  return (
                    <VideoThumbnail
                      src={topLayer.media_url}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                    />
                  );
                }
                return (
                  <img
                    src={topLayer.media_url}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }}
                    draggable={false}
                  />
                );
              })()}
              {/* Panel number badge */}
              <div
                style={{
                  position: "absolute",
                  bottom: "4px",
                  left: "4px",
                  background: "rgba(14,6,8,0.75)",
                  borderRadius: "3px",
                  padding: "1px 5px",
                  fontSize: "9px",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  letterSpacing: "0.04em",
                  pointerEvents: "none",
                }}
              >
                {index + 1}
              </div>
              {/* Delete button — only on active panel */}
              {isActive && (() => {
                const confirming = confirmingDeletionId === panel.id;
                const disabled = panels.length === 1;
                return (
                  <button
                    ref={confirming ? deleteButtonRef : undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePanel(panel.id);
                    }}
                    disabled={disabled}
                    aria-label={confirming ? "Confirm delete panel" : "Delete panel"}
                    title={confirming ? "Click again to confirm" : "Delete panel"}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      height: "18px",
                      width: confirming ? "auto" : "18px",
                      padding: confirming ? "0 6px" : 0,
                      background: confirming ? "#C93060" : "rgba(14,6,8,0.75)",
                      borderRadius: "3px",
                      border: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: confirming ? "#F5EEE8" : "var(--text-secondary)",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: "10px",
                      fontWeight: 600,
                      letterSpacing: "0.04em",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.4 : 1,
                    }}
                  >
                    {confirming ? (
                      "Confirm?"
                    ) : (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                        <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                    )}
                  </button>
                );
              })()}
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      {/* Add Panel button */}
      <button
        onClick={handleAddPanel}
        style={{
          margin: "12px 16px",
          width: `${THUMB_WIDTH}px`,
          height: "40px",
          background: "none",
          border: "1px dashed var(--border)",
          borderRadius: "4px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          color: "var(--text-muted)",
          fontFamily: "DM Sans, sans-serif",
          fontSize: "11px",
          cursor: "pointer",
        }}
        aria-label="Add panel"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 1v8M1 5h8"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
        Add Panel
      </button>
    </aside>
  );
}
