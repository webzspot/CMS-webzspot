import { useEffect, useRef, useState } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { FiX, FiLoader, FiCrop } from "react-icons/fi";

// Draws the selected region at the image's natural resolution so cropping does
// not resample the picture down to whatever size it happened to preview at.
const cropToFile = (image, crop, file) =>
  new Promise((resolve, reject) => {
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(crop.width * scaleX));
    canvas.height = Math.max(1, Math.round(crop.height * scaleY));

    const ctx = canvas.getContext("2d");
    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    // PNG keeps transparency; anything else is written as JPEG.
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not crop this image"));
          return;
        }
        resolve(new File([blob], file.name, { type, lastModified: Date.now() }));
      },
      type,
      0.92,
    );
  });

// Free-form crop: no aspect ratio is fixed, so the box can be any shape.
const ImageCropDialog = ({ file, onCancel, onCropped }) => {
  const imgRef = useRef(null);
  const [src, setSrc] = useState("");
  const [crop, setCrop] = useState();
  const [completed, setCompleted] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Read as a data URL rather than an object URL. An object URL has to be
  // revoked on cleanup, and StrictMode's mount/unmount/mount in development
  // revokes it before the second mount renders, leaving a blank preview.
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setSrc(String(reader.result));
    reader.onerror = () => setError("Could not read this image");
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);

  // Start with the whole image selected so confirming without dragging works
  const onImageLoad = (event) => {
    const { width, height } = event.currentTarget;
    const initial = { unit: "px", x: 0, y: 0, width, height };
    setCrop(initial);
    setCompleted(initial);
  };

  const apply = async () => {
    if (!completed?.width || !completed?.height) {
      setError("Drag on the image to choose an area first.");
      return;
    }
    setBusy(true);
    try {
      onCropped(await cropToFile(imgRef.current, completed, file));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/80 p-4 sm:p-8">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Crop image</h2>
            <p className="truncate text-sm text-slate-500">{file.name}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="flex justify-center bg-slate-100 px-6 py-5">
          {src && (
            <ReactCrop
              crop={crop}
              onChange={(pixelCrop) => setCrop(pixelCrop)}
              onComplete={(pixelCrop) => setCompleted(pixelCrop)}
              keepSelection
            >
              <img
                ref={imgRef}
                src={src}
                alt={file.name}
                onLoad={onImageLoad}
                className="max-h-[55vh] w-auto"
              />
            </ReactCrop>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 px-6 py-4">
          <p className="text-sm text-red-600">
            {error || (
              <span className="text-slate-400">
                Drag any edge or corner — the crop is free-form.
              </span>
            )}
          </p>
          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={() => onCropped(file)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Use original
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={busy}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy ? <FiLoader className="animate-spin" /> : <FiCrop size={15} />}
              Crop &amp; use
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropDialog;
