import { useState } from "react";

export default function Dropzone({ file, onFile, invalid }) {
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

  const classes = ["dropzone", dragOver && "is-over", file && "has-file", invalid && "is-invalid"].filter(Boolean).join(" ");

  return (
    <label
      className={classes}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        type="file"
        className="visually-hidden"
        accept="application/pdf,.pdf"
        aria-invalid={Boolean(invalid)}
        onChange={(e) => {
          onFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
      {dragOver ? (
        <span className="dropzone-title">Let go to add it</span>
      ) : file ? (
        <>
          <span className="dropzone-title">{file.name}</span>
          <span className="dropzone-sub"><span className="text-link">Choose a different file</span> or drop one here.</span>
        </>
      ) : (
        <>
          <span className="dropzone-title">Drop your resume PDF here</span>
          <span className="dropzone-sub">or <span className="text-link">choose a file</span>. PDF, up to 4 MB.</span>
        </>
      )}
    </label>
  );
}
