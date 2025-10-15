"use client";

import React, { useState } from "react";
import JSZip from "jszip";

export default function HomePage() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: "" });
  const [flatten, setFlatten] = useState(false);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith(".zip")
    );
    setFiles(selected);
    setError(selected.length ? "" : "Please select one or more .zip files.");
  };

  const reset = () => {
    setFiles([]);
    setProcessing(false);
    setError("");
    setStatus("");
    setProgress({ current: 0, total: 0, stage: "" });
  };

  async function ensureDir(root, parts) {
    let dir = root;
    for (const p of parts) {
      dir = await dir.getDirectoryHandle(p, { create: true });
    }
    return dir;
  }

  async function processZips() {
    if (!files.length) {
      setError("Please select one or more .zip files.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setStatus("Reading ZIPs...");

      // Pre-count total files for coarse progress
      let totalFilesCount = 0;
      for (const f of files) {
        const ab = await f.arrayBuffer();
        const z = await JSZip.loadAsync(ab);
        totalFilesCount += Object.values(z.files).filter((entry) => !entry.dir).length;
      }
      setProgress({ current: 0, total: totalFilesCount, stage: "Extracting" });

      // Extract and merge all zips into memory map
      const merged = new Map(); // path -> Uint8Array
      let processedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setStatus(`Unzipping: ${file.name}`);
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        const entries = Object.values(zip.files);
        for (const entry of entries) {
          if (entry.dir) continue;
          const name = flatten ? entry.name.split("/").pop() : entry.name;
          const data = await entry.async("uint8array");

          // Overwrite duplicates by later ZIPs
          merged.set(name, data);
          processedCount++;
          setProgress({
            current: processedCount,
            total: totalFilesCount,
            stage: "Extracting",
          });

          // Yield to UI for large sets
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      // Save to folder using File System Access API
      if (!("showDirectoryPicker" in window)) {
        setError("Saving as folder is not supported in this browser. Please use Chrome or Edge.");
        setProcessing(false);
        setStatus("");
        return;
      }

      setStatus("Select destination folder...");
      const root = await window.showDirectoryPicker();

      setStatus("Saving files to folder...");
      const filesOnly = Array.from(merged.entries());
      setProgress({ current: 0, total: filesOnly.length, stage: "Saving" });

      let savedCount = 0;
      for (const [path, data] of filesOnly) {
        const segments = path.split("/").filter(Boolean);
        const fileName = segments.pop();
        const parent = await ensureDir(root, flatten ? [] : segments);
        const fileHandle = await parent.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(new Blob([data]));
        await writable.close();

        savedCount++;
        setProgress({ current: savedCount, total: filesOnly.length, stage: "Saving" });
        await new Promise((r) => setTimeout(r, 0));
      }

      setStatus("Folder saved.");
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError(
        "Failed to process ZIPs. Ensure all files are valid ZIP archives. If the browser runs out of memory, try processing fewer files at once."
      );
      setProcessing(false);
      setStatus("");
    }
  }

  const canProcess = files.length > 0 && !processing;

  return (
    <main className="container">
      <h1>ZIP Extractor</h1>
      <p className="subtitle">
        Upload multiple ZIP files, merge their contents, and save them directly to a folder.
        All processing happens in your browser. You will be prompted to choose a destination folder.
      </p>

      <div className="card">
        <label className="label" htmlFor="zipInput">Select ZIP files</label>
        <input
          id="zipInput"
          type="file"
          accept=".zip,application/zip"
          multiple
          onChange={handleFileChange}
        />

        <div className="options">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={flatten}
              onChange={(e) => setFlatten(e.target.checked)}
            />
            Flatten folder structure (overwrites files with the same name)
          </label>
        </div>

        <div className="actions">
          <button className="button" disabled={!canProcess} onClick={processZips}>
            {processing ? "Processing..." : "Unzip to Folder"}
          </button>
          <button className="button secondary" onClick={reset} disabled={processing}>
            Reset
          </button>
        </div>

        {status && (
          <div className="status">
            <strong>Status:</strong> {status}
            {progress.stage && (
              <div className="progress">
                <div
                  className="bar"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.floor((progress.current / progress.total) * 100)
                    )}%`,
                  }}
                />
              </div>
            )}
            <div className="progress-details">
              {progress.stage} {progress.total ? `(${progress.current}/${progress.total})` : ""}
            </div>
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>

      <footer className="footer">
        <small>Client-side only. No files are uploaded to a server.</small>
      </footer>
    </main>
  );
}