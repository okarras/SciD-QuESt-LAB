import { useMemo, useRef, useState } from 'react';
import { PDFUpload, PdfViewer, FileUpload, FilePreview, FileManagerPanel, categoryLabel } from '@orkg/scidquest';
import type { UploadedFile } from '@orkg/scidquest';

function formatBytes(bytes: number): string {
  return bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.round(bytes / 1000)} KB`;
}

function PDFUploadDemo() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="api-live-demo">
      <PDFUpload
        maxSizeBytes={20 * 1024 * 1024}
        onFileSelected={(f) => setFile(f)}
        onFileRemoved={() => setFile(null)}
        sx={{ minHeight: 320, p: { xs: 3, md: 6 } }}
      />
      {file && (
        <p className="api-live-demo__notice">
          Selected <code>{file.name}</code> ({formatBytes(file.size)})
        </p>
      )}
    </div>
  );
}

function PdfViewerDemo() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pdfUrl = useMemo(() => new URL('/empire-compass.pdf', window.location.origin).href, []);

  return (
    <div className="api-live-demo">
      <div ref={scrollRef} className="api-live-demo__pdf-scroll">
        <PdfViewer refContainer={scrollRef as React.RefObject<HTMLDivElement>} pdfUrl={pdfUrl} pageWidth={860} />
      </div>
    </div>
  );
}

function FileUploadDemo() {
  const [files, setFiles] = useState<UploadedFile[]>([]);

  return (
    <div className="api-live-demo">
      <FileUpload
        onFilesAdded={(added) => setFiles((prev) => [...prev, ...added])}
        hasExistingFiles={files.length > 0}
        sx={{ minHeight: 220, p: { xs: 3, md: 4 } }}
      />
      {files.length > 0 && (
        <ul className="api-live-demo__file-list">
          {files.map((f) => (
            <li key={f.id}>
              <code>{f.name}</code> — {categoryLabel(f.category)} ({formatBytes(f.size)})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilePreviewDemo() {
  const [file, setFile] = useState<UploadedFile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="api-live-demo">
      <FileUpload
        multiple={false}
        onFilesAdded={(added) => setFile(added[0] ?? null)}
        hasExistingFiles={!!file}
        sx={{ minHeight: 180, p: { xs: 3, md: 4 } }}
      />
      {file && (
        <div className="api-live-demo__preview">
          <FilePreview
            file={file}
            pdfViewer={
              <div ref={scrollRef} className="api-live-demo__pdf-scroll">
                <PdfViewer
                  refContainer={scrollRef as React.RefObject<HTMLDivElement>}
                  pdfUrl={file.url}
                  pageWidth={860}
                />
              </div>
            }
          />
        </div>
      )}
    </div>
  );
}

function FileManagerPanelDemo() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  return (
    <div className="api-live-demo">
      <FileUpload
        onFilesAdded={(added) => {
          setFiles((prev) => [...prev, ...added]);
          setActiveFileId((prev) => prev ?? added[0]?.id ?? null);
        }}
        hasExistingFiles={files.length > 0}
        sx={{ minHeight: 160, p: { xs: 3, md: 4 }, mb: files.length > 0 ? 2 : 0 }}
      />
      {files.length > 0 && (
        <div className="api-live-demo__file-manager">
          <FileManagerPanel
            files={files}
            activeFileId={activeFileId}
            onActivate={setActiveFileId}
            onRemove={(id) => {
              setFiles((prev) => prev.filter((f) => f.id !== id));
              setActiveFileId((prev) => (prev === id ? null : prev));
            }}
            onRename={(id, newName) =>
              setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, name: newName } : f)))
            }
            onRemoveMultiple={(ids) => {
              setFiles((prev) => prev.filter((f) => !ids.includes(f.id)));
              setActiveFileId((prev) => (prev && ids.includes(prev) ? null : prev));
            }}
            sx={{ height: 380 }}
          />
        </div>
      )}
    </div>
  );
}

export const apiLiveDemos: Record<string, React.ComponentType> = {
  PDFUpload: PDFUploadDemo,
  PdfViewer: PdfViewerDemo,
  FileUpload: FileUploadDemo,
  FilePreview: FilePreviewDemo,
  FileManagerPanel: FileManagerPanelDemo,
};
