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
  const [tab, setTab] = useState("unzip"); // unzip | zip | image | pdf | heic | imagepro | pdftools
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

  // Image Resize/Watermark (Pro)
  const [proImageFiles, setProImageFiles] = useState([]);
  const [resizeMode, setResizeMode] = useState("max"); // max | percent
  const [maxWidth, setMaxWidth] = useState(1920);
  const [maxHeight, setMaxHeight] = useState(1080);
  const [percentScale, setPercentScale] = useState(50);
  const [wmText, setWmText] = useState("");
  const [wmOpacity, setWmOpacity] = useState(0.3);
  const [wmSize, setWmSize] = useState(24);
  const [wmPosition, setWmPosition] = useState("bottom-right"); // tl, tr, br, bl
  const [wmTargetFormat, setWmTargetFormat] = useState("image/jpeg");
  const [wmQuality, setWmQuality] = useState(0.85);
  const [wmZipUrl, setWmZipUrl] = useState("");

  // PDF Tools (Pro)
  const [pdfToolFiles, setPdfToolFiles] = useState([]);
  const [pdfAction, setPdfAction] = useState("split"); // split | rotate90 | rotate180 | rotate270
  const [pdfToolsZipUrl, setPdfToolsZipUrl] = useState("");

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

  async function resizeAndWatermark() {
    if (!licensed) {
      setError("This is a Pro feature. DM us for a license.");
      return;
    }
    if (!proImageFiles.length) {
      setError("Please select images.");
      return;
    }
    try {
      setProcessing(true);
      setError("");
      setStatus("Processing images...");
      const zip = new JSZip();
      setProgress({ current: 0, total: proImageFiles.length, stage: "Processing" });
      let count = 0;
      for (const file of proImageFiles) {
        const bitmap = await createImageBitmap(file);
        let targetW = bitmap.width;
        let targetH = bitmap.height;
        if (resizeMode === "percent") {
          const scale = Math.max(1, percentScale) / 100;
          targetW = Math.max(1, Math.round(bitmap.width * scale));
          targetH = Math.max(1, Math.round(bitmap.height * scale));
        } else {
          const ratio = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
          targetW = Math.max(1, Math.round(bitmap.width * ratio));
          targetH = Math.max(1, Math.round(bitmap.height * ratio));
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);

        if (wmText) {
          ctx.globalAlpha = Math.min(1, Math.max(0, wmOpacity));
          ctx.fillStyle = "white";
          ctx.font = `${wmSize}px sans-serif`;
          ctx.textBaseline = "bottom";
          const padding = 12;
          let x = padding, y = targetH - padding;
          if (wmPosition === "bottom-right") { x = targetW - padding; y = targetH - padding; ctx.textAlign = "right"; }
          else if (wmPosition === "bottom-left") { x = padding; y = targetH - padding; ctx.textAlign = "left"; }
          else if (wmPosition === "top-right") { x = targetW - padding; y = wmSize + padding; ctx.textAlign = "right"; ctx.textBaseline = "alphabetic"; }
          else if (wmPosition === "top-left") { x = padding; y = wmSize + padding; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }
          ctx.fillText(wmText, x, y);
          ctx.globalAlpha = 1;
        }

        const outBlob = await new Promise((resolve) =>
          canvas.toBlob(resolve, wmTargetFormat, wmTargetFormat === "image/jpeg" ? wmQuality : undefined)
        );
        const baseName = file.name.replace(/\\.[^.]+$/, "");
        const ext = wmTargetFormat.split("/")[1];
        const buf = await outBlob.arrayBuffer();
        zip.file(`${baseName}.${ext}`, buf);

        count++;
        setProgress({ current: count, total: proImageFiles.length, stage: "Processing" });
        await new Promise((r) => setTimeout(r, 0));
      }
      setStatus("Packaging processed images...");
      const outZipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(outZipBlob);
      setWmZipUrl(url);
      setStatus("Ready.");
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError("Failed to process images.");
      resetCommon();
    }
  }

  async function runPdfTools() {
    if (!licensed) {
      setError("This is a Pro feature. DM us for a license.");
      return;
    }
    if (!pdfToolFiles.length) {
      setError("Please select PDF files.");
      return;
    }
    try {
      setProcessing(true);
      setError("");
      setStatus("Running PDF tool...");
      const zip = new JSZip();
      setProgress({ current: 0, total: pdfToolFiles.length, stage: "Processing" });
      let count = 0;

      for (const file of pdfToolFiles) {
        const ab = await file.arrayBuffer();
        const doc = await PDFDocument.load(ab);

        if (pdfAction === "split") {
          const indices = doc.getPageIndices();
          for (const i of indices) {
            const out = await PDFDocument.create();
            const [page] = await out.copyPages(doc, [i]);
            out.addPage(page);
            const bytes = await out.save();
            zip.file(`${file.name.replace(/\\.[^.]+$/, "")}_page_${i + 1}.pdf`, bytes);
          }
        } else {
          const rotation = pdfAction === "rotate90" ? 90 : pdfAction === "rotate180" ? 180 : 270;
          const indices = doc.getPageIndices();
          for (const i of indices) {
            const p = doc.getPage(i);
            p.setRotation((rotation * Math.PI) / 180);
          }
          const bytes = await doc.save();
          zip.file(`${file.name.replace(/\\.[^.]+$/, "")}_rotated_${rotation}.pdf`, bytes);
        }

        count++;
        setProgress({ current: count, total: pdfToolFiles.length, stage: "Processing" });
        await new Promise((r) => setTimeout(r, 0));
      }

      const outZipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(outZipBlob);
      setPdfToolsZipUrl(url);
      setStatus("Ready.");
      setProcessing(false);
    } catch (err) {
      console.error(err);
      setError("Failed to run PDF tools.");
      resetCommon();
    }
  }

  const tabTitle = useMemo(() => {
    switch (tab) {
      case "unzip": return "Unzip to Folder";
      case "zip": return "Zip a Folder";
      case "image": return "Image Converter";
      case "pdf": return "PDF Merger";
      case "heic": return "HEIC to JPG/PNG (Pro)";
      case "imagepro": return "Image Resize & Watermark (Pro)";
      case "pdftools": return "PDF Tools ();

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
        <TabButton active={tab === "imagepro"} onClick={() => setTab("imagepro")}>Image Resize & Watermark (Pro)</TabButton>
        <TabButton active={tab === "pdftools"} onClick={() => setTab("pdftools")}>PDF Tools (Pro)</TabButton>
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

      {tab === "imagepro" && (
        <div className="card">
          <label className="label" htmlFor="imageProInput">Select Images (Pro)</label>
          <input id="imageProInput" type="file" accept="image/*" multiple onChange={(e) => {
            if (!licensed) {
              setError("Pro feature. DM us for a license.");
              setProImageFiles([]);
              return;
            }
            const selected = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
            setProImageFiles(selected);
            setError(selected.length ? "" : "Please select images.");
            if (wmZipUrl) {
              URL.revokeObjectURL(wmZipUrl);
              setWmZipUrl("");
            }
          }} />
          <div className="options" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0.75rem" }}>
            <div>
              <label>Resize mode:
                <select value={resizeMode} onChange={(e) => setResizeMode(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                  <option value="max">Max width/height</option>
                  <option value="percent">Percent scale</option>
                </select>
              </label>
            </div>
            {resizeMode === "max" ? (
              <>
                <div><label>Max width <input type="number" value={maxWidth} onChange={(e) => setMaxWidth(parseInt(e.target.value || "0", 10))} /></label></div>
                <div><label>Max height <input type="number" value={maxHeight} onChange={(e) => setMaxHeight(parseInt(e.target.value || "0", 10))} /></label></div>
              </>
            ) : (
              <div><label>Scale (%) <input type="number" value={percentScale} onChange={(e) => setPercentScale(parseInt(e.target.value || "0", 10))} /></label></div>
            )}
            <div><label>Watermark text <input type="text" value={wmText} onChange={(e) => setWmText(e.target.value)} placeholder="Optional" /></label></div>
            <div><label>Watermark opacity <input type="range" min="0" max="1" step="0.05" value={wmOpacity} onChange={(e) => setWmOpacity(parseFloat(e.target.value))} /></label></div>
            <div><label>Watermark size <input type="number" value={wmSize} onChange={(e) => setWmSize(parseInt(e.target.value || "0", 10))} /></label></div>
            <div>
              <label>Watermark position
                <select value={wmPosition} onChange={(e) => setWmPosition(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                  <option value="bottom-right">Bottom-right</option>
                  <option value="bottom-left">Bottom-left</option>
                  <option value="top-right">Top-right</option>
                  <option value="top-left">Top-left</option>
                </select>
              </label>
            </div>
            <div>
              <label>Output
                <select value={wmTargetFormat} onChange={(e) => setWmTargetFormat(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WEBP</option>
                </select>
              </label>
            </div>
            {wmTargetFormat === "image/jpeg" && (
              <div><label>Quality <input type="range" min="0.1" max="1" step="0.05" value={wmQuality} onChange={(e) => setWmQuality(parseFloat(e.target.value))} /></label></div>
            )}
          </div>
          <div className="actions">
            <button className="button" disabled={!licensed || !proImageFiles.length || processing} onClick={resizeAndWatermark}>
              {processing ? "Processing..." : "Process Images"}
            </button>
            {wmZipUrl && (
              <a className="button primary" href={wmZipUrl} download="processed_images.zip">Download Processed Images</a>
            )}
          </div>
          {!licensed && <div className="hint">Pro only. Get a license via Telegram.</div>}
        </div>
      )}

      {tab === "pdftools" && (
        <div className="card">
          <label className="label" htmlFor="pdfToolsInput">Select PDF files (Pro)</label>
          <input id="pdfToolsInput" type="file" accept="application/pdf" multiple onChange={(e) => {
            if (!licensed) {
              setError("Pro feature. DM us for a license.");
              setPdfToolFiles([]);
              return;
            }
            const selected = Array.from(e.target.files || []).filter((f) => f.name.toLowerCase().endsWith(".pdf"));
            setPdfToolFiles(selected);
            setError(selected.length ? "" : "Please select PDF files.");
            if (pdfToolsZipUrl) {
              URL.revokeObjectURL(pdfToolsZipUrl);
              setPdfToolsZipUrl("");
            }
          }} />
          <div className="options" style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <label>Action:
              <select value={pdfAction} onChange={(e) => setPdfAction(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                <option value="split">Split pages</option>
                <option value="rotate90">Rotate 90°</option>
                <option value="rotate180">Rotate 180°</option>
                <option value="rotate270">Rotate 270°</option>
              </select>
            </label>
          </div>
          <div className="actions">
            <button className="button" disabled={!licensed || !pdfToolFiles.length || processing} onClick={runPdfTools}>
              {processing ? "Processing..." : "Run PDF Tool"}
            </button>
            {pdfToolsZipUrl && (
              <a className="button primary" href={pdfToolsZipUrl} download="pdf_tools.zip">Download Output</a>
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