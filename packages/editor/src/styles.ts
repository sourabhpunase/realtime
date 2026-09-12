export const editorStyles = `
.realtime-editor { display: grid; gap: 12px; }
.realtime-editor-meta { display: flex; gap: 12px; align-items: baseline; }
.realtime-editor-meta input {
  flex: 1; font-size: 28px; font-weight: 650; border: 0; background: transparent;
}
.realtime-editor-toolbar { display: flex; flex-wrap: wrap; gap: 6px; }
.realtime-editor-toolbar button, .realtime-editor-exports button {
  border: 1px solid #d6d0c6; background: #fff; padding: 4px 8px; cursor: pointer;
}
.realtime-editor-prose {
  min-height: 280px; outline: none; line-height: 1.6; font-size: 16px;
}
.realtime-editor-prose h1 { font-size: 1.8em; }
.realtime-editor-prose h2 { font-size: 1.4em; }
.realtime-editor-prose pre { background: #f4f1ea; padding: 12px; overflow: auto; }
.realtime-editor-prose table { border-collapse: collapse; width: 100%; }
.realtime-editor-prose td, .realtime-editor-prose th { border: 1px solid #d6d0c6; padding: 4px 8px; }
.collaboration-cursor__caret { border-left: 2px solid currentColor; margin-left: -1px; }
.collaboration-cursor__label {
  font-size: 11px; color: #fff; padding: 1px 5px; border-radius: 3px;
}
.realtime-skip {
  position: absolute; left: -999px; top: 8px;
}
.realtime-skip:focus { left: 8px; background: #fff; padding: 4px 8px; z-index: 2; }
.realtime-editor-find { display: flex; gap: 8px; align-items: center; font-size: 13px; }
.realtime-follow-banner, .realtime-notifications, .realtime-suggestions, .realtime-chat, .realtime-share, .realtime-comments {
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.realtime-follow-banner, .realtime-notifications {
  background: #f4f1ea; padding: 8px 12px; display: flex; gap: 8px; align-items: center;
}
.realtime-suggestions article, .realtime-chat article, .realtime-comments article {
  border-top: 1px solid #e7e5e4; padding-top: 8px; margin-top: 8px;
}
@media print {
  .realtime-editor-toolbar, .realtime-editor-exports, [data-realtime-presence], [data-realtime-cursors] {
    display: none !important;
  }
}
`;
