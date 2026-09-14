import { useRef, useState } from 'react';
import type { ProposalCustomSection, ProposalImage } from '../types';

interface Props {
  proposalId: string;
  customSections: ProposalCustomSection[];
  images: ProposalImage[];
  onCustomSectionsChange: (sections: ProposalCustomSection[]) => void;
  onImagesChange: (images: ProposalImage[]) => void;
  onBeforeUpload: () => Promise<void>;
}

const STANDARD_SECTIONS = [
  ['problemStatement', 'Problem Statement'],
  ['opportunity', 'Opportunity'],
  ['proposedSolution', 'Proposed Solution'],
  ['resourceEstimate', 'Resource Estimate'],
  ['notes', 'Notes'],
] as const;

const ProposalFlexibleContent = ({
  proposalId,
  customSections,
  images,
  onCustomSectionsChange,
  onImagesChange,
  onBeforeUpload,
}: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingImageDelete, setPendingImageDelete] = useState<string | null>(null);

  const sectionOptions = [
    ...STANDARD_SECTIONS,
    ...customSections.map(section => [section.id, section.title || 'Untitled section'] as const),
  ];

  const addCustomSection = () => {
    onCustomSectionsChange([
      ...customSections,
      { id: crypto.randomUUID(), title: '', content: '', parentSectionId: 'proposedSolution' },
    ]);
  };

  const updateCustomSection = (id: string, patch: Partial<ProposalCustomSection>) => {
    onCustomSectionsChange(
      customSections.map(section => (section.id === id ? { ...section, ...patch } : section))
    );
  };

  const removeCustomSection = (id: string) => {
    onCustomSectionsChange(customSections.filter(section => section.id !== id));
    onImagesChange(
      images.map(image =>
        image.sectionId === id ? { ...image, sectionId: 'proposedSolution' } : image
      )
    );
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        throw new Error('Choose a PNG or JPEG image');
      }
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be no larger than 5 MB');
      }
      await onBeforeUpload();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Could not read image'));
        reader.readAsDataURL(file);
      });
      const data = dataUrl.split(',')[1];
      if (!data) throw new Error('Could not read image');
      const response = await fetch(`/api/proposals/${proposalId}/images`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, data }),
      });
      const result = (await response.json()) as {
        id?: string;
        filename?: string;
        mimeType?: ProposalImage['mimeType'];
        error?: string;
      };
      if (!response.ok || !result.id || !result.filename || !result.mimeType) {
        throw new Error(result.error || 'Upload failed');
      }
      onImagesChange([
        ...images,
        {
          id: result.id,
          filename: result.filename,
          mimeType: result.mimeType,
          caption: '',
          sectionId: 'proposedSolution',
        },
      ]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removeImage = async (image: ProposalImage) => {
    const response = await fetch(`/api/proposals/${proposalId}/images/${image.id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      setUploadError('Could not remove image');
      return;
    }
    onImagesChange(images.filter(item => item.id !== image.id));
    setPendingImageDelete(null);
  };

  return (
    <>
      <section className="print:hidden">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Additional Sections
        </h2>
        <div className="space-y-4">
          {customSections.map(section => (
            <div key={section.id} className="group bg-white border border-gray-200 rounded-lg p-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 space-y-2">
                  <input
                    value={section.title}
                    onChange={event =>
                      updateCustomSection(section.id, { title: event.target.value })
                    }
                    placeholder="Section heading, e.g. Principles or Process"
                    className="w-full font-medium text-gray-800 border-b border-gray-200 py-1 outline-none focus:border-blue-400 placeholder-gray-300"
                  />
                  <textarea
                    value={section.content}
                    onChange={event =>
                      updateCustomSection(section.id, { content: event.target.value })
                    }
                    placeholder="Add the section content…"
                    rows={4}
                    className="w-full text-sm text-gray-800 outline-none resize-none placeholder-gray-300"
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-400 print:hidden">
                    Place under
                    <select
                      value={section.parentSectionId}
                      onChange={event =>
                        updateCustomSection(section.id, { parentSectionId: event.target.value })
                      }
                      className="text-sm text-gray-700 border-b border-gray-200 py-1 outline-none focus:border-blue-400"
                    >
                      {STANDARD_SECTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <button
                  onClick={() => removeCustomSection(section.id)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 print:hidden"
                  aria-label="Remove custom section"
                >
                  &#10005;
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addCustomSection}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 print:hidden"
        >
          + Add your own section
        </button>
      </section>

      <section className="print:hidden">
        <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
          Images &amp; Diagrams
        </h2>
        <div className="space-y-4">
          {images.map(image => (
            <figure key={image.id} className="group bg-white border border-gray-200 rounded-lg p-3">
              <img
                src={`/api/proposals/${proposalId}/images/${image.id}`}
                alt={image.caption || image.filename}
                className="max-h-96 max-w-full mx-auto object-contain rounded"
              />
              <div className="mt-3 flex gap-3 items-start print:hidden">
                <input
                  value={image.caption}
                  onChange={event =>
                    onImagesChange(
                      images.map(item =>
                        item.id === image.id ? { ...item, caption: event.target.value } : item
                      )
                    )
                  }
                  placeholder="Caption or description"
                  className="flex-1 text-sm border-b border-gray-200 py-1 outline-none focus:border-blue-400"
                />
                <select
                  value={image.sectionId}
                  onChange={event =>
                    onImagesChange(
                      images.map(item =>
                        item.id === image.id ? { ...item, sectionId: event.target.value } : item
                      )
                    )
                  }
                  aria-label="Image section"
                  className="text-sm border-b border-gray-200 py-1 outline-none focus:border-blue-400"
                >
                  {sectionOptions.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                {pendingImageDelete === image.id ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => void removeImage(image)}
                      className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setPendingImageDelete(null)}
                      className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingImageDelete(image.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    &#10005;
                  </button>
                )}
              </div>
              {image.caption && (
                <figcaption className="hidden print:block text-sm text-gray-500 text-center mt-2">
                  {image.caption}
                </figcaption>
              )}
            </figure>
          ))}
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-3 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40 print:hidden"
        >
          {uploading ? 'Uploading…' : '+ Add image or diagram'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          onChange={event => {
            const file = event.target.files?.[0];
            if (file) void uploadImage(file);
          }}
          className="hidden"
        />
        <p className="mt-1 text-xs text-gray-400 print:hidden">PNG or JPEG, up to 5 MB.</p>
        {uploadError && <p className="mt-2 text-sm text-red-500 print:hidden">{uploadError}</p>}
      </section>
    </>
  );
};

export default ProposalFlexibleContent;
