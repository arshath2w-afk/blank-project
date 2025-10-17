"use client";

import React, { useMemo, useState, useEffect } from "react";
import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
  const [tab, setTab] = useState("unzip"); // unzip | zip | image | pdf | heic | imagepro | pdftools | ocr | qr | meta | checksums | diff | ziprename | zipsplit
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

  // PDF Editor (Pro)
  const [pdfEditFile, setPdfEditFile] = useState(null);
  const [pdfEditDelete, setPdfEditDelete] = useState(""); // e.g., 1-3,5
  const [pdfEditOrder, setPdfEditOrder] = useState(""); // e.g., 3,1,2
  const [pdfEditRotate, setPdfEditRotate] = useState("0"); // "0" | "90" | "180" | "270"
  const [pdfEditRotateRanges, setPdfEditRotateRanges] = useState(""); // e.g., 2-4
  const [pdfEditWatermark, setPdfEditWatermark] = useState(""); // text
  const [pdfEditWmOpacity, setPdfEditWmOpacity] = useState(0.3);
  const [pdfEditWmSize, setPdfEditWmSize] = useState(18);
  const [pdfEditWmPos, setPdfEditWmPos] = useState("bottom-right"); // bottom-right | bottom-left | top-right | top-left
  const [pdfEditAppendCount, setPdfEditAppendCount] = useState(0);
  const [pdfEditUrl, setPdfEditUrl] = useState("");

  // PDF Maker (Pro)
  const [pdfMakerImages, setPdfMakerImages] = useState([]);
  const [pdfMakerText, setPdfMakerText] = useState("");
  const [pdfMakerSize, setPdfMakerSize] = useState("A4"); // A4 | Letter | Custom
  const [pdfMakerOrientation, setPdfMakerOrientation] = useState("portrait"); // portrait | landscape
  const [pdfMakerMargin, setPdfMakerMargin] = useState(36); // points
  const [pdfMakerBg, setPdfMakerBg] = useState("#000000"); // background color
  const [pdfMakerFit, setPdfMakerFit] = useState("contain"); // contain | cover | stretch
  const [pdfMakerHeader, setPdfMakerHeader] = useState("");
  const [pdfMakerFooter, setPdfMakerFooter] = useState("");
  const [pdfMakerPageNumbers, setPdfMakerPageNumbers] = useState(true);
  const [pdfMakerTemplate, setPdfMakerTemplate] = useState("clean"); // clean | branded
  const [pdfMakerUnit, setPdfMakerUnit] = useState("pt"); // pt | mm | in
  const [pdfMakerCustomW, setPdfMakerCustomW] = useState(210); // default A4 mm
  const [pdfMakerCustomH, setPdfMakerCustomH] = useState(297);
  const [pdfMakerImgRotate, setPdfMakerImgRotate] = useState(0);
  const [pdfMakerShowCaptions, setPdfMakerShowCaptions] = useState(false);
  const [pdfMakerShapes, setPdfMakerShapes] = useState(""); // lines/rectangles: one per line
  const [pdfMakerUrl, setPdfMakerUrl] = useState("");

  // Licensing
  const [licenseKey, setLicenseKey] = useState("");
  const [licensed, setLicensed] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [authStatus, setAuthStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (json.ok) {
          setUserEmail(json.email || "");
        } else {
          setUserEmail("");
        }
      } catch {}
    })();
  }, []);

  async function verifyLicense() {
    try {
      const res = await fetch("/api/license/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ licenseKey, email: userEmail || undefined }),
      });
      const json = await res.json();
      setLicensed(!!json.ok);
      setError(json.ok ? "" : "Invalid or expired license.");
    } catch (e) {
      setError("License verification failed.");
    }
  }

  // Per-run item limits (free)
  const limits = {
    imageMax: licensed ? Infinity : 2,
    pdfMax: licensed ? Infinity : 2,
    zipFolderMaxFiles: licensed ? Infinity : 2,
  };

  async function checkQuota(tool) {
    try {
      const res = await fetch("/api/quota/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tool, increment: 1, email: userEmail || undefined }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(`Daily limit reached for ${tool}. Remaining: ${json.remaining}/${json.limit}. Try again tomorrow.`);
        return false;
      }
      return true;
    } catch {
      // If quota check fails, default to denying for free users
      if (!licensed) {
        setError("Quota service unavailable. Please try again later.");
        return false;
      }
      return true;
    }
  }

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
    if (!licensed) {
      const ok = await checkQuota("zipFolder");
      if (!ok) return;
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
    if (!licensed) {
      const ok = await checkQuota("pdfMerge");
      if (!ok) return;
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
      const { default: heic2any } = await import("heic2any");

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
      case "pdftools": return "PDF Tools (Pro)";
      case "pdfeditor": return "PDF Editor (Pro)";
      case "pdfmaker": return "PDF Maker (Pro)";
      case "ocr": return "OCR (Free)";
      case "qr": return "QR Generator (Free)";
      case "short": return "URL Shortener (Free)";
      case "meta": return "Strip Image Metadata (Free)";
      case "checksums": return "File Checksums (Free)";
      case "diff": return "Text Diff (Free)";
      case "ziprename": return "ZIP Batch Rename (Free)";
      case "zipsplit": return "Split ZIP by Size (Free)";
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
        <TabButton active={tab === "imagepro"} onClick={() => setTab("imagepro")}>Image Resize & Watermark (Pro)</TabButton>
        <TabButton active={tab === "pdftools"} onClick={() => setTab("pdftools")}>PDF Tools (Pro)</TabButton>
        <TabButton active={tab === "pdfeditor"} onClick={() => setTab("pdfeditor")}>PDF Editor (Pro)</TabButton>
        <TabButton active={tab === "pdfmaker"} onClick={() => setTab("pdfmaker")}>PDF Maker (Pro)</TabButton>
        <TabButton active={tab === "ocr"} onClick={() => setTab("ocr")}>OCR (Free)</TabButton>
        <TabButton active={tab === "qr"} onClick={() => setTab("qr")}>QR Generator (Free)</TabButton>
        <TabButton active={tab === "short"} onClick={() => setTab("short")}>URL Shortener (Free)</TabButton>
        <TabButton active={tab === "meta"} onClick={() => setTab("meta")}>Strip Image Metadata (Free)</TabButton>
        <TabButton active={tab === "checksums"} onClick={() => setTab("checksums")}>File Checksums (Free)</TabButton>
        <TabButton active={tab === "diff"} onClick={() => setTab("diff")}>Text Diff (Free)</TabButton>
        <TabButton active={tab === "ziprename"} onClick={() => setTab("ziprename")}>ZIP Batch Rename (Free)</TabButton>
        <TabButton active={tab === "zipsplit"} onClick={() => setTab("zipsplit")}>Split ZIP by Size (Free)</TabButton>
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
          <div className="options" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.75rem" }}>
            <div>
              <label>Action:
                <select value={pdfAction} onChange={(e) => setPdfAction(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                  <option value="split">Split pages</option>
                  <option value="rotate90">Rotate 90°</option>
                  <option value="rotate180">Rotate 180°</option>
                  <option value="rotate270">Rotate 270°</option>
                  <option value="clearMeta">Clear metadata</option>
                  <option value="addBlank">Append blank page</option>
                </select>
              </label>
            </div>
            <div>
              <label>Page ranges (for split)
                <input type="text" placeholder="e.g., 1-3,5" onChange={(e) => window.__pdfRanges = e.target.value} />
              </label>
            </div>
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

      {tab === "pdfeditor" && (
        <div className="card">
          <label className="label" htmlFor="pdfEditInput">PDF Editor (Pro)</label>
          <p className="hint">Upload one PDF and apply edits: delete pages, reorder, rotate, watermark, append blank pages.</p>
          <input id="pdfEditInput" type="file" accept="application/pdf" onChange={(e) => {
            if (!licensed) { setError("Pro feature. DM us for a license."); setPdfEditFile(null); return; }
            const f = e.target.files?.[0] || null;
            setPdfEditFile(f);
            setPdfEditUrl("");
            setError(f ? "" : "Please select a PDF.");
          }} />
          <div className="options" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "0.75rem" }}>
            <div><label>Delete pages <input type="text" placeholder="e.g., 1-3,5" value={pdfEditDelete} onChange={(e) => setPdfEditDelete(e.target.value)} /></label></div>
            <div><label>Reorder (list) <input type="text" placeholder="e.g., 3,1,2" value={pdfEditOrder} onChange={(e) => setPdfEditOrder(e.target.value)} /></label></div>
            <div><label>Rotate
              <select value={pdfEditRotate} onChange={(e) => setPdfEditRotate(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                <option value="0">0°</option>
                <option value="90">90°</option>
                <option value="180">180°</option>
                <option value="270">270°</option>
              </select>
            </label></div>
            <div><label>Rotate pages <input type="text" placeholder="e.g., 2-4" value={pdfEditRotateRanges} onChange={(e) => setPdfEditRotateRanges(e.target.value)} /></label></div>
            <div><label>Watermark text <input type="text" placeholder="Optional" value={pdfEditWatermark} onChange={(e) => setPdfEditWatermark(e.target.value)} /></label></div>
            <div><label>WM opacity <input type="range" min="0" max="1" step="0.05" value={pdfEditWmOpacity} onChange={(e) => setPdfEditWmOpacity(parseFloat(e.target.value))} /></label></div>
            <div><label>WM size <input type="number" value={pdfEditWmSize} onChange={(e) => setPdfEditWmSize(parseInt(e.target.value || "0", 10))} /></label></div>
            <div><label>WM position
              <select value={pdfEditWmPos} onChange={(e) => setPdfEditWmPos(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                <option value="bottom-right">Bottom-right</option>
                <option value="bottom-left">Bottom-left</option>
                <option value="top-right">Top-right</option>
                <option value="top-left">Top-left</option>
              </select>
            </label></div>
            <div><label>Append blank pages <input type="number" value={pdfEditAppendCount} onChange={(e) => setPdfEditAppendCount(parseInt(e.target.value || "0", 10))} /></label></div>
          </div>
          <div className="actions">
            <button className="button" disabled={!licensed || !pdfEditFile || processing} onClick={async () => {
              if (!pdfEditFile) { setError("Select a PDF."); return; }
              try {
                setProcessing(true); setError(""); setStatus("Editing PDF...");
                const ab = await pdfEditFile.arrayBuffer();
                let doc = await PDFDocument.load(ab);

                const max = doc.getPageCount();

                function parseRanges(str) {
                  const out = new Set();
                  const s = (str || "").trim();
                  if (!s) return Array.from(out);
                  for (const part of s.split(",").map(p => p.trim()).filter(Boolean)) {
                    const m = part.match(/^([0-9]+)(?:-([0-9]+))?$/);
                    if (!m) continue;
                    let a = parseInt(m[1], 10), b = m[2] ? parseInt(m[2], 10) : a;
                    if (isNaN(a) || isNaN(b)) continue;
                    a = Math.max(1, Math.min(max, a));
                    b = Math.max(1, Math.min(max, b));
                    const [start, end] = a <= b ? [a, b] : [b, a];
                    for (let i = start; i <= end; i++) out.add(i - 1); // zero-based
                  }
                  return Array.from(out).sort((x, y) => x - y);
                }

                // 1) Delete pages
                const delIdx = parseRanges(pdfEditDelete);
                if (delIdx.length) {
                  const keep = [];
                  for (let i = 0; i < doc.getPageCount(); i++) {
                    if (!delIdx.includes(i)) keep.push(i);
                  }
                  const newDoc = await PDFDocument.create();
                  const copied = await newDoc.copyPages(doc, keep);
                  copied.forEach(p => newDoc.addPage(p));
                  doc = newDoc;
                }

                // 2) Reorder pages
                if (pdfEditOrder.trim()) {
                  const order = pdfEditOrder.split(",").map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n));
                  const validOrder = order.map(n => Math.max(1, Math.min(doc.getPageCount(), n))).map(n => n - 1);
                  const newDoc = await PDFDocument.create();
                  const copied = await newDoc.copyPages(doc, validOrder);
                  copied.forEach(p => newDoc.addPage(p));
                  doc = newDoc;
                }

                // 3) Rotate selected pages
                const angle = parseInt(pdfEditRotate, 10) || 0;
                const rotateIdx = parseRanges(pdfEditRotateRanges);
                if (angle && rotateIdx.length) {
                  for (const i of rotateIdx) {
                    const p = doc.getPage(i);
                    p.setRotation((angle * Math.PI) / 180);
                  }
                }

                // 4) Append blank pages
                const append = Math.max(0, parseInt(pdfEditAppendCount || 0, 10));
                if (append > 0) {
                  const first = doc.getPage(0);
                  const { width, height } = first.getSize();
                  for (let i = 0; i < append; i++) {
                    const page = doc.addPage([width, height]);
                    // leave blank
                  }
                }

                // 5) Watermark text
                if (pdfEditWatermark.trim()) {
                  const font = await doc.embedStandardFont(StandardFonts.Helvetica);
                  for (let i = 0; i < doc.getPageCount(); i++) {
                    const p = doc.getPage(i);
                    const { width, height } = p.getSize();
                    const padding = 12;
                    let x = padding, y = height - padding;
                    if (pdfEditWmPos === "bottom-right") { x = width - padding; y = padding; }
                    else if (pdfEditWmPos === "bottom-left") { x = padding; y = padding; }
                    else if (pdfEditWmPos === "top-right") { x = width - padding; y = height - padding; }
                    else if (pdfEditWmPos === "top-left") { x = padding; y = height - padding; }
                    p.drawText(pdfEditWatermark, {
                      x, y,
                      size: Math.max(6, pdfEditWmSize),
                      font,
                      color: rgb(1, 1, 1),
                      opacity: Math.min(1, Math.max(0, pdfEditWmOpacity)),
                    });
                  }
                }

                const outBytes = await doc.save();
                const blob = new Blob([outBytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                setPdfEditUrl(url);
                setStatus("Ready.");
              } catch (err) {
                console.error(err); setError("Failed to edit PDF.");
              } finally {
                setProcessing(false);
              }
            }}>
              {processing ? "Processing..." : "Apply & Download"}
            </button>
            {pdfEditUrl && <a className="button primary" href={pdfEditUrl} download="edited.pdf">Download Edited PDF</a>}
          </div>
          {!licensed && <div className="hint">Pro only. Get a license via Telegram.</div>}
        </div>
      )}

      {tab === "pdfmaker" && (
        <div className="card">
          <label className="label" htmlFor="pdfMakerInput">PDF Maker (Pro)</label>
          <p className="hint">Create a new PDF from images and text. Choose page size, margins, fit, header/footer, background, and page numbers.</p>
          <input id="pdfMakerInput" type="file" accept="image/*" multiple onChange={(e) => {
            if (!licensed) { setError("Pro feature. DM us for a license."); setPdfMakerImages([]); return; }
            const selected = Array.from(e.target.files || []).filter(f => f.type.startsWith("image/"));
            setPdfMakerImages(selected);
            setError(selected.length ? "" : "Please select images.");
            if (pdfMakerUrl) { URL.revokeObjectURL(pdfMakerUrl); setPdfMakerUrl(""); }
          }} />
          <textarea placeholder="Optional text content (added after images or standalone)" rows={6} style={{ width: "100%", marginTop: "0.5rem" }} value={pdfMakerText} onChange={(e) => setPdfMakerText(e.target.value)} />
          <div className="options" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0.75rem" }}>
            <div><label>Page size
              <select value={pdfMakerSize} onChange={(e) => setPdfMakerSize(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                <option value="A4">A4</option>
                <option value="Letter">Letter</option>
                <option value="Custom">Custom</option>
              </select>
            </label></div>
            {pdfMakerSize === "Custom" && (
              <>
                <div><label>Unit
                  <select value={pdfMakerUnit} onChange={(e) => setPdfMakerUnit(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                    <option value="pt">pt</option>
                    <option value="mm">mm</option>
                    <option value="in">in</option>
                  </select>
                </label></div>
                <div><label>Width <input type="number" value={pdfMakerCustomW} onChange={(e) => setPdfMakerCustomW(parseFloat(e.target.value || "0"))} /></label></div>
                <div><label>Height <input type="number" value={pdfMakerCustomH} onChange={(e) => setPdfMakerCustomH(parseFloat(e.target.value || "0"))} /></label></div>
              </>
            )}
            <div><label>Orientation
              <select value={pdfMakerOrientation} onChange={(e) => setPdfMakerOrientation(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </label></div>
            <div><label>Margin (pt) <input type="number" value={pdfMakerMargin} onChange={(e) => setPdfMakerMargin(parseInt(e.target.value || "0", 10))} /></label></div>
            <div><label>Background <input type="color" value={pdfMakerBg} onChange={(e) => setPdfMakerBg(e.target.value)} /></label></div>
            <div><label>Image fit
              <select value={pdfMakerFit} onChange={(e) => setPdfMakerFit(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                <option value="contain">Contain</option>
                <option value="cover">Cover</option>
                <option value="stretch">Stretch</option>
              </select>
            </label></div>
            <div><label>Image rotation (deg) <input type="number" value={pdfMakerImgRotate} onChange={(e) => setPdfMakerImgRotate(parseInt(e.target.value || "0", 10))} /></label></div>
            <div><label><input type="checkbox" checked={pdfMakerShowCaptions} onChange={(e) => setPdfMakerShowCaptions(e.target.checked)} /> Show image captions</label></div>
            <div><label>Header text <input type="text" value={pdfMakerHeader} onChange={(e) => setPdfMakerHeader(e.target.value)} /></label></div>
            <div><label>Footer text <input type="text" value={pdfMakerFooter} onChange={(e) => setPdfMakerFooter(e.target.value)} /></label></div>
            <div><label>Template
              <select value={pdfMakerTemplate} onChange={(e) => setPdfMakerTemplate(e.target.value)} style={{ marginLeft: "0.5rem" }}>
                <option value="clean">Clean</option>
                <option value="branded">Branded</option>
              </select>
            </label></div>
            <div><label><input type="checkbox" checked={pdfMakerPageNumbers} onChange={(e) => setPdfMakerPageNumbers(e.target.checked)} /> Show page numbers</label></div>
          </div>
          <textarea placeholder="Shapes (one per line): rect x y w h #RRGGBB | line x1 y1 x2 y2 #RRGGBB" rows={4} style={{ width: "100%", marginTop: "0.5rem" }} value={pdfMakerShapes} onChange={(e) => setPdfMakerShapes(e.target.value)} />
          <div className="actions">
            <button className="button" disabled={!licensed || processing || (!pdfMakerImages.length && !pdfMakerText.trim())} onClick={async () => {
              if (!licensed) { setError("Pro feature. DM us for a license."); return; }
              if (!pdfMakerImages.length && !pdfMakerText.trim()) { setError("Add images or text."); return; }
              try {
                setProcessing(true); setError(""); setStatus("Building PDF...");
                const doc = await PDFDocument.create();
                const font = await doc.embedStandardFont(StandardFonts.Helvetica);

                const sizes = {
                  A4: { w: 595, h: 842 },
                  Letter: { w: 612, h: 792 },
                };
                let { w, h } = sizes[pdfMakerSize] || sizes.A4;
                if (pdfMakerOrientation === "landscape") [w, h] = [h, w];
                const margin = Math.max(0, parseInt(pdfMakerMargin || 0, 10));
                const bg = (() => {
                  const hex = pdfMakerBg.replace("#", "");
                  const r = parseInt(hex.slice(0, 2), 16) / 255;
                  const g = parseInt(hex.slice(2, 4), 16) / 255;
                  const b = parseInt(hex.slice(4, 6), 16) / 255;
                  return rgb(r, g, b);
                })();

                function drawHeaderFooter(page, pageIndex, totalPages) {
                  const header = pdfMakerHeader.trim();
                  const footer = pdfMakerFooter.trim();
                  if (header) page.drawText(header, { x: margin, y: h - margin + -12, size: 10, font, color: rgb(1,1,1) });
                  let footerText = footer;
                  if (pdfMakerPageNumbers) {
                    const pn = `Page ${pageIndex + 1}/${totalPages}`;
                    footerText = footerText ? `${footerText} · ${pn}` : pn;
                  }
                  if (footerText) page.drawText(footerText, { x: margin, y: margin - 14, size: 10, font, color: rgb(1,1,1) });
                }

                // Add image pages
                for (const file of pdfMakerImages) {
                  const ab = await file.arrayBuffer();
                  const isPng = file.type.includes("png");
                  const img = isPng ? await doc.embedPng(ab) : await doc.embedJpg(ab);
                  const page = doc.addPage([w, h]);
                  page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: bg });

                  const cw = w - margin * 2;
                  const ch = h - margin * 2;

                  let iw = img.width, ih = img.height;
                  let sx = cw / iw, sy = ch / ih;
                  let scale;
                  if (pdfMakerFit === "contain") scale = Math.min(sx, sy);
                  else if (pdfMakerFit === "cover") scale = Math.max(sx, sy);
                  else scale = 1; // stretch
                  const dw = iw * scale, dh = ih * scale;
                  const x = margin + (cw - dw) / 2;
                  const y = margin + (ch - dh) / 2;
                  page.drawImage(img, { x, y, width: dw, height: dh });
                  drawHeaderFooter(page, doc.getPageCount() - 1, 0); // total updated later
                }

                // Add text pages (simple wrapping)
                if (pdfMakerText.trim()) {
                  const content = pdfMakerText.replace(/\r/g, "").split("\n");
                  const pageSize = 12;
                  const lineHeight = pageSize * 1.25;
                  const cw = w - margin * 2;
                  // crude chars per line estimate
                  const charsPerLine = Math.max(10, Math.floor(cw / (pageSize * 0.6)));
                  let bufferLines = [];
                  for (const line of content) {
                    if (!line) { bufferLines.push(""); continue; }
                    for (let i = 0; i < line.length; i += charsPerLine) {
                      bufferLines.push(line.slice(i, i + charsPerLine));
                    }
                  }
                  let page = null, y = 0;
                  for (const L of bufferLines) {
                    if (!page || y - lineHeight < margin) {
                      page = doc.addPage([w, h]);
                      page.drawRectangle({ x: 0, y: 0, width: w, height: h, color: bg });
                      y = h - margin;
                    }
                    page.drawText(L, { x: margin, y: y - lineHeight, size: pageSize, font, color: rgb(1,1,1) });
                    y -= lineHeight;
                  }
                }

                // Update header/footer with proper total page count
                const total = doc.getPageCount();
                for (let i = 0; i < total; i++) {
                  const page = doc.getPage(i);
                  drawHeaderFooter(page, i, total);
                }

                const outBytes = await doc.save();
                const blob = new Blob([outBytes], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                setPdfMakerUrl(url);
                setStatus("Ready.");
              } catch (err) {
                console.error(err); setError("Failed to make PDF.");
              } finally {
                setProcessing(false);
              }
            }}>
              {processing ? "Processing..." : "Make PDF"}
            </button>
            {pdfMakerUrl && <a className="button primary" href={pdfMakerUrl} download="made.pdf">Download PDF</a>}
          </div>
          {!licensed && <div className="hint">Pro only. Get a license via Telegram.</div>}
        </div>
      )}

      {tab === "ocr" && (
        <div className="card">
          <label className="label" htmlFor="ocrInput">OCR (Free)</label>
          <p className="hint">Extract text from images or PDFs. Upload a file or supply a URL.</p>
          <input id="ocrInput" type="file" accept="image/*,application/pdf" onChange={async (e) => {
            const file = e.target.files?.[0];
            setError("");
            setStatus("");
            if (!file) { setError("Please select a file."); return; }
            try {
              setProcessing(true);
              setStatus("Sending to OCR...");
              const ab = await file.arrayBuffer();
              const base64 = `data:${file.type};base64,${btoa(String.fromCharCode(...new Uint8Array(ab)))}`;
              const res = await fetch("/api/ocr", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ base64 }),
              });
              const json = await res.json();
              if (!json.ok) { setError("OCR failed."); setProcessing(false); return; }
              const blob = new Blob([json.text || ""], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              setStatus("OCR complete.");
              setImagesZipUrl("");
              setPdfDownloadUrl("");
              setHeicZipUrl("");
              setWmZipUrl("");
              setPdfToolsZipUrl("");
              setImagesZipUrl(url);
            } catch (err) {
              console.error(err);
              setError("OCR error.");
            } finally {
              setProcessing(false);
            }
          }} />
          <div className="options" style={{ marginTop: "0.75rem" }}>
            <label>OR enter URL:
              <input type="text" placeholder="https://example.com/image.jpg" onChange={async (e) => {
                const urlInput = e.target.value.trim();
                if (!urlInput) return;
                setError(""); setStatus("");
                try {
                  setProcessing(true);
                  setStatus("Sending to OCR...");
                  const res = await fetch("/api/ocr", {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ url: urlInput }),
                  });
                  const json = await res.json();
                  if (!json.ok) { setError("OCR failed."); setProcessing(false); return; }
                  const blob = new Blob([json.text || ""], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  setStatus("OCR complete.");
                  setImagesZipUrl(url);
                } catch (err) {
                  console.error(err);
                  setError("OCR error.");
                } finally {
                  setProcessing(false);
                }
              }} />
            </label>
          </div>
          <div className="actions">
            {imagesZipUrl && (
              <a className="button primary" href={imagesZipUrl} download="ocr.txt">Download OCR Text</a>
            )}
          </div>
        </div>
      )}

      {tab === "qr" && (
        <div className="card">
          <label className="label" htmlFor="qrText">QR Generator (Free)</label>
          <p className="hint">Create a QR image from any text or URL.</p>
          <input id="qrText" type="text" placeholder="Enter text/URL" onChange={async (e) => {
            const text = e.target.value;
            setError("");
            setStatus("");
            if (!text) return;
            try {
              setProcessing(true);
              setStatus("Generating...");
              const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`;
              const resp = await fetch(apiUrl);
              const blob = await resp.blob();
              const url = URL.createObjectURL(blob);
              setStatus("QR ready.");
              setPdfDownloadUrl("");
              setHeicZipUrl("");
              setWmZipUrl("");
              setPdfToolsZipUrl("");
              setImagesZipUrl(url);
            } catch (err) {
              console.error(err);
              setError("QR generation failed.");
            } finally {
              setProcessing(false);
            }
          }} />
          <div className="actions">
            {imagesZipUrl && (
              <a className="button primary" href={imagesZipUrl} download="qr.png">Download QR</a>
            )}
          </div>
        </div>
      )}

      {tab === "short" && (
       <<div className="card">
         <<label className="label" htmlFor="shortUrl">URL Shortener (Fr)</</label>
         <<p className="hint">Create a short link from a long U.</</p>
         <<div className="actions" style={{ flexDirection: "column", alignItems: "stretch" }}>
           <<input id="shortUrl" type="text" placeholder="Paste a long URL here" />
           <<button className="button" type="button" onClick={async () => {
              const el = document.getElementById("shortUrl");
              const long = el?.value?.trim();
              if (!long) { setError("Please enter a URL."); return; }
              setError(""); setStatus("Shortening...");
              try {
                const res = await fetch("/api/shorten", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ url: long }),
                });
                const json = await res.json();
                if (!json.ok) { setError("Failed to shorten URL."); return; }
                setStatus("Short URL created.");
                const blob = new Blob([json.short], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                setImagesZipUrl(url);
              } catch (err) {
                console.error(err);
                setError("Shortener error.");
              }
            }}>Short</</button>
        </</div>
         <<div className="actions">
            {imagesZipUrl && (
             <<a className="button primary" href={imagesZipUrl} download="short_url.txt">Download Short U</</a>
            )}
        </</div>
      </</div>
      )}

      {tab === "meta" && (
       < div className="card">
         < label className="label" htmlFor="metaInput">Strip Image Metadata (Fr)</eelabel>
         < p className="hint">Re-encode images to remove EXIF/metadata. Outputs a ZIP of cleaned imag.</esp>
         < input id="metaInput" type="file" accept="image/*" multiple onChange={(e) => {
            const selected = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
            setImageFiles(selected);
            setError(selected.length ? "" : "Please select images.");
            if (imagesZipUrl) { URL.revokeObjectURL(imagesZipUrl); setImagesZipUrl(""); }
          }} />
         < div className="actions">
           < button className="button" disabled={!imageFiles.length || processing} onClick={async () => {
              if (!imageFiles.length) { setError("Select images."); return; }
              try {
                setProcessing(true);
                setError(""); setStatus("Stripping metadata...");
                const zip = new JSZip();
                setProgress({ current: 0, total: imageFiles.length, stage: "Processing" });
                let count = 0;
                for (const file of imageFiles) {
                  const bmp = await createImageBitmap(file);
                  const canvas = document.createElement("canvas");
                  canvas.width = bmp.width; canvas.height = bmp.height;
                  const ctx = canvas.getContext("2d"); ctx.drawImage(bmp, 0, 0);
                  const outBlob = await new Promise((resolve) =>
                    canvas.toBlob(resolve, "image/jpeg", 0.92)
                  );
                  const baseName = file.name.replace(/\.[^.]+$/, "");
                  const buf = await outBlob.arrayBuffer();
                  zip.file(`${baseName}.jpg`, buf);
                  count++; setProgress({ current: count, total: imageFiles.length, stage: "Processing" });
                  await new Promise((r) => setTimeout(r, 0));
                }
                setStatus("Packaging...");
                const outBlob = await zip.generateAsync({ type: "blob" });
                const url = URL.createObjectURL(outBlob);
                setImagesZipUrl(url);
                setStatus("Ready.");
              } catch (err) {
                console.error(err); setError("Failed to strip metadata.");
              } finally {
                setProcessing(false);
              }
            }}>
              {processing ? "Processing..." : "Strip & Download"}
          </  button>
            {imagesZipUrl && (
             < a className="button primary" href={imagesZipUrl} download="images_clean.zip">Download Clean Imag</esa>
            )}
        </  div>
      </  div>
      )}

      {tab === "checksums" && (
       < div className="card">
         < label className="label" htmlFor="checksumInput">File Checksums (Fr)</eelabel>
         < p className="hint">Generate SHA‑256 checksums for selected fil.</esp>
         < input id="checksumInput" type="file" multiple onChange={(e) => {
            const selected = Array.from(e.target.files || []);
            setFolderFiles(selected);
            setError(selected.length ? "" : "Please select files.");
            if (imagesZipUrl) { URL.revokeObjectURL(imagesZipUrl); setImagesZipUrl(""); }
          }} />
         < div className="actions">
           < button className="button" disabled={!folderFiles.length || processing} onClick={async () => {
              try {
                setProcessing(true); setError(""); setStatus("Hashing...");
                const lines = [];
                setProgress({ current: 0, total: folderFiles.length, stage: "Hashing" });
                let count = 0;
                for (const f of folderFiles) {
                  const ab = await f.arrayBuffer();
                  const hashBuf = await crypto.subtle.digest("SHA-256", ab);
                  const hashHex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
                  lines.push(`${hashHex}  ${f.name}`);
                  count++; setProgress({ current: count, total: folderFiles.length, stage: "Hashing" });
                  await new Promise((r) => setTimeout(r, 0));
                }
                const blob = new Blob([lines.join("\n")], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                setImagesZipUrl(url);
                setStatus("Ready.");
              } catch (err) {
                console.error(err); setError("Checksum generation failed.");
              } finally {
                setProcessing(false);
              }
            }}>{processing ? "Processing..." : "Generate Checksum}</s"button>
            {imagesZipUrl & <&a className="button primary" href={imagesZipUrl} download="checksums.txt">Download Checksu</msa>}
        </  div>
      </  div>
      )}

      {tab === "diff" && (
       < div className="card">
         < label className="label" htmlFor="diffA">Text Diff (Fr)</eelabel>
         < p className="hint">Paste two texts and get a unified diff outp.</utp>
         < textarea id="diffA" placeholder="Text A" rows={6} style={{ width: "100%" ></}}textarea>
         < textarea id="diffB" placeholder="Text B" rows={6} style={{ width: "100%", marginTop: "0.5rem" ></}}textarea>
         < div className="actions">
           < button className="button" type="button" onClick={() => {
              const A = (document.getElementById("diffA")?.value || "").split("\n");
              const B = (document.getElementById("diffB")?.value || "").split("\n");
              const out = [];
              const max = Math.max(A.length, B.length);
              for (let i = 0;  <i max; i++) {
                const a = A[i] ?? "";
                const b = B[i] ?? "";
                if (a === b) out.push(` ${a}`);
                else {
                  if (a) out.push(`-${a}`);
                  if (b) out.push(`+${b}`);
                }
              }
              const blob = new Blob([out.join("\n")], { type: "text/plain" });
              const url = URL.createObjectURL(blob);
              setImagesZipUrl(url);
              setStatus("Diff ready.");
            }}>Compute Di</ffbutton>
            {imagesZipUrl & <&a className="button primary" href={imagesZipUrl} download="diff.txt">Download Di</ffa>}
        </  div>
      </  div>
      )}

      {tab === "ziprename" && (
       < div className="card">
         < label className="label" htmlFor="zipRenameInput">ZIP Batch Rename (Fr)</eelabel>
         < p className="hint">Upload a ZIP and rename files using a pattern (search/replace). Preserves folder structu.</rep>
         < input id="zipRenameInput" type="file" accept=".zip,application/zip" onChange={(e) => {
            setZipFiles(Array.from(e.target.files || []));
            setError((e.target.files || []).length ? "" : "Please select a ZIP.");
            if (zipDownloadUrl) { URL.revokeObjectURL(zipDownloadUrl); setZipDownloadUrl(""); }
          }} />
         < div className="options" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: "0.75rem" }}>
           < di><vlabel>Searc <hinput id="renameSearch" type="text" placeholder="e.g., ol /></d"lab></eldiv>
           < di><vlabel>Replac <einput id="renameReplace" type="text" placeholder="e.g., ne /></w"lab></eldiv>
           < di><vlabe><linput id="renameCase" type="checkbox" /> Case-sensiti</velab></eldiv>
        </  div>
         < div className="actions">
           < button className="button" disabled={!zipFiles.length || processing} onClick={async () => {
              const file = zipFiles[0];
              if (!file) { setError("Select a ZIP."); return; }
              const search = (document.getElementById("renameSearch")?.value || "");
              const replace = (document.getElementById("renameReplace")?.value || "");
              const caseSensitive = !!document.getElementById("renameCase")?.checked;
              if (!search) { setError("Enter a search pattern."); return; }
              try {
                setProcessing(true); setError(""); setStatus("Renaming...");
                const ab = await file.arrayBuffer();
                const zip = await JSZip.loadAsync(ab);
                const outZip = new JSZip();
                const entries = Object.values(zip.files);
                setProgress({ current: 0, total: entries.length, stage: "Renaming" });
                let count = 0;
                const re = new RegExp )}

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