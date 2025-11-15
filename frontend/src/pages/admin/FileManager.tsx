import React, { useEffect, useMemo, useState } from "react";
import { fileApi } from "../../services/alblearnApi";
import { ApiError } from "../../services/apiClient";
import {
  UploadConfig,
  UploadResponse,
  UploadMultipleResponse,
  FileInfo,
} from "../../types/api";

interface UploadState<T = UploadResponse | UploadMultipleResponse> {
  status: "idle" | "uploading" | "success" | "error";
  message: string;
  payload?: T;
}

const FileManager: React.FC = () => {
  const [config, setConfig] = useState<UploadConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadState<UploadResponse>>({
    status: "idle",
    message: "",
  });
  const [multiStatus, setMultiStatus] =
    useState<UploadState<UploadMultipleResponse>>({
      status: "idle",
      message: "",
    });
  const [avatarStatus, setAvatarStatus] = useState<UploadState<UploadResponse>>({
    status: "idle",
    message: "",
  });
  const [infoPath, setInfoPath] = useState("");
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [deletePath, setDeletePath] = useState("");
  const [deleteFeedback, setDeleteFeedback] = useState<
    { status: "idle" | "loading" | "success" | "error"; message: string }
  >({ status: "idle", message: "" });

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fileApi.config();
        setConfig(response.data);
        setConfigError(null);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Unable to load upload configuration.";
        setConfigError(message);
      }
    };

    loadConfig();
  }, []);

  const humanReadableTypes = useMemo(() => {
    if (!config) return [];
    return Object.entries(config.allowed_types).map(([key, value]) => ({
      label: key,
      extensions: value.join(", "),
    }));
  }, [config]);

  type UploadSetter<T> = React.Dispatch<React.SetStateAction<UploadState<T>>>;

  const handleUpload = async <T extends UploadResponse | UploadMultipleResponse>(
    event: React.FormEvent<HTMLFormElement>,
    setter: UploadSetter<T>,
    mode: "single" | "multiple" | "avatar"
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setter({ status: "error", message: "Please select at least one file." });
      return;
    }

    const formData = new FormData();
    const files = Array.from(fileInput.files);

    if (mode === "multiple") {
      files.forEach((file) => formData.append("files[]", file));
    } else {
      formData.append("file", files[0]);
    }

    setter({ status: "uploading", message: "Uploading files..." } as UploadState<T>);

    try {
      if (mode === "single") {
        const response = await fileApi.upload(formData);
        (setter as UploadSetter<UploadResponse>)({
          status: "success",
          message: "File uploaded successfully.",
          payload: response.data,
        });
      } else if (mode === "avatar") {
        const response = await fileApi.uploadAvatar(formData);
        (setter as UploadSetter<UploadResponse>)({
          status: "success",
          message: "Avatar updated successfully.",
          payload: response.data,
        });
      } else {
        const response = await fileApi.uploadMultiple(formData);
        (setter as UploadSetter<UploadMultipleResponse>)({
          status: "success",
          message: "Files uploaded successfully.",
          payload: response.data,
        });
      }
      fileInput.value = "";
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Upload failed. Please try again.";
      setter({ status: "error", message } as UploadState<T>);
    }
  };

  const handleFetchInfo = async (event: React.FormEvent) => {
    event.preventDefault();
    setInfoError(null);
    setFileInfo(null);

    if (!infoPath.trim()) {
      setInfoError("Please provide a file path.");
      return;
    }

    try {
      const response = await fileApi.info(infoPath.trim());
      setFileInfo(response.data);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unable to fetch file information.";
      setInfoError(message);
    }
  };

  const handleDelete = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleteFeedback({ status: "loading", message: "Deleting file..." });

    if (!deletePath.trim()) {
      setDeleteFeedback({ status: "error", message: "Enter a file path." });
      return;
    }

    try {
      await fileApi.delete({ path: deletePath.trim() });
      setDeleteFeedback({ status: "success", message: "File deleted successfully." });
      setDeletePath("");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Unable to delete file.";
      setDeleteFeedback({ status: "error", message });
    }
  };

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900">File Manager</h1>
        <p className="text-gray-600 max-w-2xl">
          Upload assets, inspect file metadata, and clean up stored content across AlbLearn.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Single upload</h2>
          <form onSubmit={(event) => handleUpload(event, setStatus, "single")}
            className="space-y-3"
          >
            <input type="file" name="file" className="input-field" />
            <button type="submit" className="btn-primary" disabled={status.status === "uploading"}>
              {status.status === "uploading" ? "Uploading..." : "Upload file"}
            </button>
            {status.message && (
              <p
                className={`text-sm ${
                  status.status === "error"
                    ? "text-red-600"
                    : status.status === "success"
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              >
                {status.message}
              </p>
            )}
            {status.payload && (
              <pre className="bg-gray-100 border border-gray-200 rounded p-3 text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(status.payload, null, 2)}
              </pre>
            )}
          </form>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Upload multiple files</h2>
          <form onSubmit={(event) => handleUpload(event, setMultiStatus, "multiple")}
            className="space-y-3"
          >
            <input type="file" name="file" className="input-field" multiple />
            <button type="submit" className="btn-primary" disabled={multiStatus.status === "uploading"}>
              {multiStatus.status === "uploading" ? "Uploading..." : "Upload files"}
            </button>
            {multiStatus.message && (
              <p
                className={`text-sm ${
                  multiStatus.status === "error"
                    ? "text-red-600"
                    : multiStatus.status === "success"
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              >
                {multiStatus.message}
              </p>
            )}
            {multiStatus.payload && (
              <pre className="bg-gray-100 border border-gray-200 rounded p-3 text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(multiStatus.payload, null, 2)}
              </pre>
            )}
          </form>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Upload avatar</h2>
          <form onSubmit={(event) => handleUpload(event, setAvatarStatus, "avatar")}
            className="space-y-3"
          >
            <input type="file" name="file" accept="image/*" className="input-field" />
            <button type="submit" className="btn-primary" disabled={avatarStatus.status === "uploading"}>
              {avatarStatus.status === "uploading" ? "Uploading..." : "Upload avatar"}
            </button>
            {avatarStatus.message && (
              <p
                className={`text-sm ${
                  avatarStatus.status === "error"
                    ? "text-red-600"
                    : avatarStatus.status === "success"
                    ? "text-green-600"
                    : "text-gray-500"
                }`}
              >
                {avatarStatus.message}
              </p>
            )}
          </form>
        </div>

        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Upload configuration</h2>
          {configError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {configError}
            </div>
          )}
          {config ? (
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <span className="font-semibold text-gray-900">Max size:</span>{" "}
                {config.max_file_size_human} ({config.max_file_size} bytes)
              </p>
              <div>
                <p className="font-semibold text-gray-900">Allowed types:</p>
                <ul className="list-disc list-inside space-y-1">
                  {humanReadableTypes.map((type) => (
                    <li key={type.label}>
                      {type.label}: <span className="text-gray-500">{type.extensions}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Loading configuration...</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Inspect file</h2>
          <form onSubmit={handleFetchInfo} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage path
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="uploads/documents/file.pdf"
                value={infoPath}
                onChange={(event) => setInfoPath(event.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary">
              Fetch info
            </button>
          </form>
          {infoError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {infoError}
            </div>
          )}
          {fileInfo && (
            <pre className="bg-gray-100 border border-gray-200 rounded p-3 text-xs whitespace-pre-wrap break-words">
              {JSON.stringify(fileInfo, null, 2)}
            </pre>
          )}
        </div>

        <div className="card space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Delete file</h2>
          <form onSubmit={handleDelete} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage path
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="uploads/documents/file.pdf"
                value={deletePath}
                onChange={(event) => setDeletePath(event.target.value)}
              />
            </div>
            <button type="submit" className="btn-primary bg-red-600 hover:bg-red-700 border-red-700">
              Delete file
            </button>
          </form>
          {deleteFeedback.message && (
            <p
              className={`text-sm ${
                deleteFeedback.status === "error"
                  ? "text-red-600"
                  : deleteFeedback.status === "success"
                  ? "text-green-600"
                  : "text-gray-500"
              }`}
            >
              {deleteFeedback.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileManager;
