import React, { useId, useRef, useState } from 'react';
import EventSheetUploadSignIn from './EventSheetUploadSignIn.jsx';
import { documentUploadError } from '../../utils/protectedRequests.js';
import { ATTACHMENT_ACCEPT, MAX_SECTION_ATTACHMENTS, safeAttachmentUrl, validateEventSheetAttachment } from '../../utils/eventSheetAttachments.js';

export default function EventSheetAttachments({ value, onChange, readOnly, help, access }) {
  const inputId = useId();
  const files = Array.isArray(value) ? value : [];
  const current = useRef(files);
  current.current = files;
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const busy = useRef(false);
  const change = next => { current.current = next; onChange(next); };

  async function upload(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (readOnly || !access.allowed || busy.current || !selected.length) return;
    setError('');
    if (current.current.length + selected.length > MAX_SECTION_ATTACHMENTS) {
      setError('You can attach up to 10 files to this section.'); return;
    }
    const invalid = selected.map(file => [file.name, validateEventSheetAttachment(file)]).find(([, message]) => message);
    if (invalid) { setError(`${invalid[0]}: ${invalid[1]}`); return; }
    busy.current = true;
    const failures = [];
    try {
      for (const [index, file] of selected.entries()) {
        setProgress(`Uploading ${index + 1} of ${selected.length}: ${file.name}`);
        try {
          const response = await access.uploadFile(file);
          const url = safeAttachmentUrl(response.data?.url);
          if (!url) throw new Error('The upload did not return a document link.');
          change([...current.current, { id: response.data.public_id || url, name: file.name, url, type: file.type,
            size: file.size, uploadedAt: new Date().toISOString() }]);
        } catch (failure) { failures.push(`${file.name}: ${documentUploadError(failure)}`); }
      }
    } finally { busy.current = false; setProgress(''); setError(failures.join(' ')); }
  }

  if (readOnly && !files.length) return null;
  return <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
    <p className="text-sm font-semibold text-gray-800">Attachments (optional)</p>
    {!readOnly && <>
      <p className="mt-1 text-sm text-gray-600">{help}</p>
      <EventSheetUploadSignIn access={access}/>
      <label htmlFor={inputId} className="mt-3 mb-1 block text-sm font-medium text-gray-700">Add attachments</label>
      <input id={inputId} type="file" accept={ATTACHMENT_ACCEPT} multiple disabled={!!progress || !access.allowed}
        onChange={upload} className="block max-w-full text-sm text-gray-700" />
      <p className="mt-2 text-xs text-gray-500">PDF, Word or images; up to 20 MB per file. Attachments are shared with the band through the event sheet.</p>
    </>}
    {progress && <p role="status" className="mt-2 text-sm text-gray-700">{progress}</p>}
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
    {!!files.length && <ul className="mt-3 space-y-2">
      {files.map((file, index) => <li key={file.id || `${file.url}-${index}`} className="flex items-center justify-between gap-3 rounded border bg-white px-3 py-2 text-sm">
        {safeAttachmentUrl(file.url) ? <a href={safeAttachmentUrl(file.url)} target="_blank" rel="noreferrer" className="min-w-0 break-all text-[#ff6667] underline">{file.name || 'View attachment'}</a> : <span>{file.name || 'Attachment'}</span>}
        {!readOnly && <button type="button" disabled={!!progress} aria-label={`Remove ${file.name || 'attachment'}`}
          className="shrink-0 text-sm text-gray-600 underline disabled:opacity-50" onClick={() => change(current.current.filter((_, i) => i !== index))}>Remove</button>}
      </li>)}
    </ul>}
  </div>;
}
