"use client";

import React, { useState } from "react";
import JSZip from "jszip";

export default function HomePage() {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: "" });
  const [downloadUrl, setDownloadUrl] = useState("");
  const [flatten, setFlatten] = useState(false);

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith(".zip")
    );
    setFiles(selected);
    setError(selected.length ? "" : "Please select one or more .zip files.");
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
      setDownloadUrl("");
    }
  };

  const reset = () => {
    setFiles([]);
    setProcessing(false);
    setError("");
    setStatus("");
    setProgress({ current: 0, total: 0, stage: "" });
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setDownloadUrl("");
  };

  async function processZips() {
    if (!files.length) {
      setError("Please select one or more .zip files.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setStatus("Reading ZIPs...");
      const combined = new JSZip();
      let totalFilesCount = 0;

      // Pre-count total files for coarse progress
      for (const f of files) {
        const ab = await f.arrayBuffer();
        const z = await JSZip.loadAsync(ab);
        totalFilesCount += Object.values(z.files).filter((entry) => !entry.dir)
          .length;
      }
      setProgress({ current: 0, total: totalFilesCount, stage: "Extracting" });

      // Merge all zips
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

          if (combined.file(name)) {
            combined.remove(name);
          }
          combined.file(name, data);
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

      setStatus("Generating combined ZIP...");
      setProgress({ current: 0, total: 100, stage: "Packaging" });

      const blob = await combined.generateAsync(
        { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
        (metadata) => {
          setProgress({
            current: Math.floor(metadata.percent),
            total: 100,
            stage: "Packaging",
          });
        }
      );

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus("Done.");
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
      <h1>ZIP Merger</h1>
      <p className="subtitle">
        Upload multiple ZIP files, merge their contents, and download a single combined ZIP.
        All processing happens in your browser.
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
            {processing ? "Processing..." : "Combine & Download"}
          </button>
          <button className="button secondary" onClick={reset} disabled={processing && !downloadUrl}>
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

        {downloadUrl && (
          <div className="download">
            <a className="button primary" href={downloadUrl} download="combined.zip">
              Download Combined ZIP
            </a>
            <p className="hint">If download doesn't start, click the button above.</p>
          </div>
        )}
      </div>

      <footer className="footer">
        <small>Client-side only. No files are uploaded to a server.</small>
      </footer>
    </main>
  );
}