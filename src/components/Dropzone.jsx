import { useState } from "react";

export default function Dropzone({ onFile }) {
  const [dragOver, setDragOver] = useState(false);

  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    onFile(e.dataTransfer.files[0]);
  };

  return (
    <label
      className={`dropzone ${dragOver ? "is-over" : ""}`.trim()}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type="file"
        className="visually-hidden"
        accept="application/pdf,.pdf"
        onChange={(e) => {
          onFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <span className="dropzone-title">{dragOver ? "Let go to check it" : "Drop your resume PDF here"}</span>
      <span className="dropzone-sub">or <span className="text-link">choose a file</span>. PDF, up to 5 MB.</span>
    </label>
  );
}
