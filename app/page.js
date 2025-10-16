"use client";

import React, { useMemo, useState, useEffect } from "react";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import heic2any from "heic2any";

function TabButton({ active, onClick, children }) {
  return (
    <button
      className={`button ${active ? "primary" : "secondary"}`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function AuthBox({ userEmail, setUserEmail, setAuthStatus }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState(userEmail || "");
  const [password, setPassword] = useState("");

  useEffect(() => setEmail(userEmail || ""), [userEmail]);

  async function submit() {
    try {
      const url = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!json.ok) {
        setAuthStatus(json.error || "Auth failed");
        return;
      }
      if (mode === "signup") {
        setAuthStatus("Signup successful. Please log in.");
      } else {
        setAuthStatus("Logged in.");
        setUserEmail(email);
      }
    } catch (e) {
      setAuthStatus("Auth request failed.");
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUserEmail("");
    setAuthStatus("Logged out.");
  }

  return (
    <div className="actions" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button className={`button ${mode === "login" ? "primary" : "secondary"}`} type="button" onClick={() => setMode("login")}>Login</button>
        <button className={`button ${mode === "signup" ? "primary" : "secondary"}`} type="button" onClick={() => setMode("signup")}>Sign up</button>
        {userEmail && <button className="button secondary" type="button" onClick={logout}>Logout</button>}
      </div>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="button" type="button" onClick={submit}>{mode === "signup" ? "Create account" : "Login"}</button>
      {userEmail && <div className="hint">Logged in as {userEmail}</div>}
    </div>
  );
}

export default function HomePage() {
  const [tab, setTab] = useState("unzip"); // unzip | zip | image | pdf | heic
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0, stage: "" });

  // Unzip to folder
  const [zipFiles, setZipFiles] = useState([]);
  const [flatten, setFlatten] = useState(false);

  // Zip a folder
  const [folderFiles, setFolderFiles] = useState([]);
  const [zipDownloadUrl, setZipDownloadUrl] = useState("");

  // Image converter
  const [imageFiles, setImageFiles] = useState([]);
  const [imageTarget, setImageTarget] = useState("image/webp"); // image/webp | image/jpeg | image/png
  const [imageQuality, setImageQuality] = useState(0.9);
  const [imagesZipUrl, setImagesZipUrl] = useState("");

  // PDF merger
  const [pdfFiles, setPdfFiles] = useState([]);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState("");

  // HEIC converter (Pro)
  const [heicFiles, setHeicFiles] = useState([]);
  const [heicTarget, setHeicTarget] = useState("image/jpeg"); // image/jpeg | image/png
  const [heicZipUrl, setHeicZipUrl] = useState("");

  // Licensing
  const [licenseKey, setLicenseKey] = useState("");
  const [licensed, setLicensed] = useState(false);

  async function verifyLicense() {
    try {
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ licenseKey }),
      });
      const json = await res.json();
      setLicensed(!!json.ok);
      setError(json.ok ? "" : "Invalid license key.");
    } catch (e) {
      setError("License verification failed.");
    }
  }

  const limits = {
    imageMax: licensed ? Infinity : 10,
    pdfMax: licensed ? Infinity : 5,
    zipFolderMaxFiles: licensed ? Infinity : 100,
  };

  const resetCommon = () => {
    setProcessing(false);
    setError("");
    setStatus("");
    setProgress({ current: 0, total: 0, stage: "" });
  };

  // Unzip handlers
  const handleZipChange = (e) => {
    const selected = Array.from(e.target.files || []).filter((f) =>
      f.name.toLowerCase().endsWith(".zip")
    );
    setZipFiles(selected);
    setError(selected.length ? "" : "Please select one or more .zip files.");
  };

  async function ensureDir(root, parts) {
    let dir = root;
    for (const p of parts) {
      dir = await dir.getDirectoryHandle(p, { create: true });
    }
    return dir;
  }

  async function unzipToFolder() {
    if (!zipFiles.length) {
      setError("Please select one or more .zip files.");
      return;
    }

    try {
      setProcessing(true);
      setError("");
      setStatus("Reading ZIPs...");

      // Pre-count
      let totalFilesCount = 0;
      for (const f of zipFiles) {
        const ab = await f.arrayBuffer();
        const z = await JSZip.loadAsync(ab);
        totalFilesCount += Object.values(z.files).filter((entry) => !entry.dir).length;
      }
      setProgress({ current: 0, total: totalFilesCount, stage: "Extracting" });

      // Merge
      const merged = new Map();
      let processedCount = 0;

      for (let i = 0; i < zipFiles.length; i++) {
        const file = zipFiles[i];
        setStatus(`Unzipping: ${file.name}`);
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        const entries = Object.values(zip.files);
        for (const entry of entries) {
          if (entry.dir) continue;
          const name = flatten ? entry.name.split("/").pop() : entry.name;
          const data = await entry.async("uint8array");

          merged.set(name, data);
          processedCount++;
          setProgress({
            current: processedCount,
            total: totalFilesCount,
            stage: "Extracting",
          });
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      if (!("showDirectoryPicker" in window)) {
        setError("Saving as folder is not supported in this browser. Please use Chrome or Edge.");
        resetCommon();
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
      setError("Failed to unzip. Ensure files are valid ZIP archives.");
      resetCommon();
    }
  }

  // Zip a folder using webkitdirectory selection
  const handleFolderChange = (e) => {
    let selected = Array.from(e.target.files || []);
    if (!licensed && selected.length > limits.zipFolderMaxFiles) {
      selected = selected.slice(0, limits.zipFolderMaxFiles);
      setError(`Free tier limited to ${limits.zipFolderMaxFiles} files. DM us for Pro.`);
    } else if (!selected.length) {
      setError("Please select a folder (files).");
    } else {
      setError("");
    }
    setFolderFiles(selected);
    if (zipDownloadUrl) {
      URL.revokeObjectURL(zipDownloadUrl);
      setZipDownloadUrl("");
    }
  };

  async function zipSelectedFolder() {
    if (!folderFiles.length) {
      setError("Please select a folder using the input.");
      return;
    }
    try {
      setProcessing(true);
      setError("");
      setStatus("Preparing ZIP...");
      const zip = new JSZip();

      // Preserve relative paths via webkitRelativePath if available
      const entries = folderFiles;
      setProgress({ current: 0, total: entries.length, stage: "Zipping" });

      let count = 0;
      for (const file of entries) {
        const ab = await file.arrayBuffer();
        const rel = file.webkitRelativePath || file.name;
        zip.file(rel, ab);
        count++;
        setProgress({ current: count, total: entries.length, stage: "Zipping" });
        await new Promise((r) => setTimeout(r, 0));
      }

      setStatus("Generating ZIP...");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      setZipDownloadUrl(url);
      setStatus("Ready.");
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError("Failed to zip folder.");
      resetCommon();
    }
  }

  // Image converter
  const handleImageChange = (e) => {
    let selected = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (!licensed && selected.length > limits.imageMax) {
      selected = selected.slice(0, limits.imageMax);
      setError(`Free tier limited to ${limits.imageMax} images. DM us for Pro.`);
    } else if (!selected.length) {
      setError("Please select images.");
    } else {
      setError("");
    }
    setImageFiles(selected);
    if (imagesZipUrl) {
      URL.revokeObjectURL(imagesZipUrl);
      setImagesZipUrl("");
    }
  };

  async function convertImages() {
    if (!imageFiles.length) {
      setError("Please select images.");
      return;
    }
    try {
      setProcessing(true);
      setError("");
      setStatus("Converting images...");
      const zip = new JSZip();
      setProgress({ current: 0, total: imageFiles.length, stage: "Converting" });

      let count = 0;
      for (const file of imageFiles) {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0);
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, imageTarget, imageTarget === "image/jpeg" ? imageQuality : undefined)
        );
        const baseName = file.name.replace(/\.[^.]+$/, "");
        const ext = imageTarget.split("/")[1];
        const buf = await blob.arrayBuffer();
        zip.file(`${baseName}.${ext}`, buf);
        count++;
        setProgress({ current: count, total: imageFiles.length, stage: "Converting" });
        await new Promise((r) => setTimeout(r, 0));
      }

      setStatus("Packaging converted images...");
      const outBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(outBlob);
      setImagesZipUrl(url);
      setStatus("Ready.");
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError("Failed to convert images.");
      resetCommon();
    }
  }

  // PDF merger
  const handlePdfChange = (e) => {
    let selected = Array.from(e.target.files || []).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
    if (!licensed && selected.length > limits.pdfMax) {
      selected = selected.slice(0, limits.pdfMax);
      setError(`Free tier limited to ${limits.pdfMax} PDFs. Buy Pro for unlimited merges.`);
    }
    setPdfFiles(selected);
    if (pdfDownloadUrl) {
      URL.revokeObjectURL(pdfDownloadUrl);
      setPdfDownloadUrl("");
    }
  };

  async function mergePdfs() {
    if (!pdfFiles.length) {
      setError("Please select PDF files.");
      return;
    }
    try {
      setProcessing(true);
      setError("");
      setStatus("Merging PDFs...");
      const mergedPdf = await PDFDocument.create();
      setProgress({ current: 0, total: pdfFiles.length, stage: "Merging" });

      let count = 0;
      for (const f of pdfFiles) {
        const ab = await f.arrayBuffer();
        const src = await PDFDocument.load(ab);
        const copied = await mergedPdf.copyPages(src, src.getPageIndices());
        for (const p of copied) mergedPdf.addPage(p);
        count++;
        setProgress({ current: count, total: pdfFiles.length, stage: "Merging" });
        await new Promise((r) => setTimeout(r, 0));
      }

      const out = await mergedPdf.save();
      const blob = new Blob([out], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfDownloadUrl(url);
      setStatus("Ready.");
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError("Failed to merge PDFs.");
      resetCommon();
    }
  }

  async function convertHeic() {
    if (!licensed) {
      setError("HEIC conversion is Pro only.");
      return;
    }
    if (!heicFiles.length) {
      setError("Please select HEIC images.");
      return;
    }
    try {
      setProcessing(true);
      setError("");
      setStatus("Converting HEIC images...");
      const zip = new JSZip();
      setProgress({ current: 0, total: heicFiles.length, stage: "Converting" });
      let count = 0;
      for (const file of heicFiles) {
        const outBlob = await heic2any({ blob: file, toType: heicTarget });
        const baseName = file.name.replace(/\\.heic$/i, "");
        const ext = heicTarget.split("/")[1];
        const buf = await outBlob.arrayBuffer();
        zip.file(`${baseName}.${ext}`, buf);
        count++;
        setProgress({ current: count, total: heicFiles.length, stage: "Converting" });
        await new Promise((r) => setTimeout(r, 0));
      }
      setStatus("Packaging converted images...");
      const outZipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(outZipBlob);
      setHeicZipUrl(url);
      setStatus("Ready.");
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError("Failed to convert HEIC images.");
      resetCommon();
    }
  }

  const tabTitle = useMemo(() => {
    switch (tab) {
      case "unzip": return "Unzip to Folder";
      case "zip": return "Zip a Folder";
      case "image": return "Image Converter";
      case "pdf": return "PDF Merger";
      default: return "Tools";
    }
  }, [tab]);

  return (
    <main className="container">
      <h1>Archive & File Tools</h1>
      <p className="subtitle">Client-side utilities to help you work with ZIPs, images, and PDFs. No files are uploaded to any server.</p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <TabButton active={tab === "unzip"} onClick={() => setTab("unzip")}>Unzip to Folder</TabButton>
        <TabButton active={tab === "zip"} onClick={() => setTab("zip")}>Zip a Folder</TabButton>
        <TabButton active={tab === "image"} onClick={() => setTab("image")}>Image Converter</TabButton>
        <TabButton active={tab === "pdf"} onClick={() => setTab("pdf")}>PDF Merger</TabButton>
        <TabButton active={tab === "heic"} onClick={() => setTab("heic")}>HEIC to JPG/PNG (Pro)</TabButton>
      </div>

      <h2 style={{ marginTop: 0 }}>{tabTitle}</h2>

      {tab === "unzip" && (
        <div className="card">
          <label className="label" htmlFor="zipInput">Select ZIP files</label>
          <input id="zipInput" type="file" accept=".zip,application/zip" multiple onChange={handleZipChange} />
          <div className="options">
            <label className="checkbox">
              <input type="checkbox" checked={flatten} onChange={(e) => setFlatten(e.target.checked)} />
              Flatten folder structure (overwrites files with the same name)
            </label>
          </div>
          <div className="actions">
            <button className="button" disabled={!zipFiles.length || processing} onClick={unzipToFolder}>
              {processing ? "Processing..." : "Unzip to Folder"}
            </button>
          </div>
        </div>
      )}

      {tab === "zip" && (
        <div className="card">
          <label className="label" htmlFor="folderInput">Select a Folder</label>
          <input id="folderInput" type="file" webkitdirectory="" multiple onChange={handleFolderChange} />
          <div className="actions">
            <button className="button" disabled={!folderFiles.length || processing} onClick={zipSelectedFolder}>
              {processing ? "Processing..." : "Create ZIP"}
            </button>
            {zipDownloadUrl && (
              <a className="button primary" href={zipDownloadUrl} download="folder.zip">Download ZIP</a>
            )}
          </div>
        </div>
      )}

      {tab === "image" && (
        <div className="card">
          <label className="label" htmlFor="imageInput">Select Images</label>
          <input id="imageInput" type="file" accept="image/*" multiple onChange={handleImageChange} />
          <div className="options" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <label>Format:
              <select value={imageTarget} onChange={(e) => setImageTarget(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                <option value="image/webp">WEBP</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
              </select>
            </label>
            {imageTarget === "image/jpeg" && (
              <label>Quality:
                <input type="range" min="0.1" max="1" step="0.05" value={imageQuality}
                  onChange={(e) => setImageQuality(parseFloat(e.target.value))}
                  style={{ marginLeft: "0.5rem", verticalAlign: "middle" }} />
              </label>
            )}
          </div>
          <div className="actions">
            <button className="button" disabled={!imageFiles.length || processing} onClick={convertImages}>
              {processing ? "Processing..." : "Convert & Download"}
            </button>
            {imagesZipUrl && (
              <a className="button primary" href={imagesZipUrl} download="converted_images.zip">Download Converted Images</a>
            )}
          </div>
        </div>
      )}

      {tab === "pdf" && (
        <div className="card">
          <label className="label" htmlFor="pdfInput">Select PDF files</label>
          <input id="pdfInput" type="file" accept="application/pdf" multiple onChange={handlePdfChange} />
          <div className="actions">
            <button className="button" disabled={!pdfFiles.length || processing} onClick={mergePdfs}>
              {processing ? "Processing..." : "Merge & Download"}
            </button>
            {pdfDownloadUrl && (
              <a className="button primary" href={pdfDownloadUrl} download="merged.pdf">Download Merged PDF</a>
            )}
          </div>
        </div>
      )}

      {tab === "heic" && (
        <div className="card">
          <label className="label" htmlFor="heicInput">Select HEIC images (Pro)</label>
          <input id="heicInput" type="file" accept=".heic,image/heic" multiple onChange={(e) => {
            if (!licensed) {
              setError("HEIC conversion is a Pro feature. DM us for a license.");
              setHeicFiles([]);
              return;
            }
            const selected = Array.from(e.target.files || []).filter((f) => /\.(heic)$/i.test(f.name));
            setHeicFiles(selected);
            setError(selected.length ? "" : "Please select HEIC images.");
            if (heicZipUrl) {
              URL.revokeObjectURL(heicZipUrl);
              setHeicZipUrl("");
            }
          }} />
          <div className="options" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <label>Target:
              <select value={heicTarget} onChange={(e) => setHeicTarget(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
              </select>
            </label>
          </div>
          <div className="actions">
            <button className="button" disabled={!licensed || !heicFiles.length || processing} onClick={convertHeic}>
              {processing ? "Processing..." : "Convert HEIC"}
            </button>
            {heicZipUrl && (
              <a className="button primary" href={heicZipUrl} download="heic_converted.zip">Download Converted Images</a>
            )}
          </div>
          {!licensed && <div className="hint">Pro only. Get a license via Telegram.</div>}
        </div>
      )}

      {(status || progress.stage) && (
        <div className="status" style={{ marginTop: "1rem" }}>
          {status && <div><strong>Status:</strong> {status}</div>}
          {progress.stage && (
            <>
              <div className="progress">
                <div
                  className="bar"
                  style={{
                    width: `${Math.min(100, Math.floor((progress.current / (progress.total || 1)) * 100))}%`,
                  }}
                />
              </div>
              <div className="progress-details">
                {progress.stage} {progress.total ? `(${progress.current}/${progress.total})` : ""}
              </div>
            </>
          )}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ marginTop: "1rem" }}>
        <strong>Pro features</strong>
        <p className="hint">
          Unlock higher limits and more tools. DM us on Telegram to get a license:
          <a href={process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/your_username"} target="_blank" rel="noreferrer" style={{ marginLeft: 6 }}>
            {process.env.NEXT_PUBLIC_TELEGRAM_URL ? "Contact on Telegram" : "@your_username"}
          </a>
        </p>
        <div className="actions">
          <input
            type="text"
            placeholder="Enter license key"
            value={licenseKey}
            onChange={(e) => setLicenseKey(e.target.value)}
            style={{ flex: "1", minWidth: "200px" }}
          />
          <button className="button" onClick={verifyLicense}>Verify</button>
          {licensed && <span style={{ color: "var(--accent)" }}>Pro active</span>}
        </div>
      </div>

      <footer className="footer">
        <small>Client-side only. No files are uploaded to a server.</small>
      </footer>
    </main>
  );
}