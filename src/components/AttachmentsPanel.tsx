import React, { useState } from 'react';
import { Upload, Link, FileText, X } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Input } from './Input';
import type { Attachment } from '../types/onboarding';

interface AttachmentsPanelProps {
  attachments: Attachment[];
  onAddAttachment: (attachment: Omit<Attachment, 'id'>) => void;
  onRemoveAttachment: (id: string) => void;
}

export function AttachmentsPanel({
  attachments,
  onAddAttachment,
  onRemoveAttachment,
}: AttachmentsPanelProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'text'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let type: 'pdf' | 'docx' | 'pptx' | 'text' = 'text';

      if (extension === 'pdf') type = 'pdf';
      else if (extension === 'docx' || extension === 'doc') type = 'docx';
      else if (extension === 'pptx' || extension === 'ppt') type = 'pptx';

      onAddAttachment({
        type,
        title: file.name,
        uploading: true,
      });
    });
  };

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;

    onAddAttachment({
      type: 'url',
      title: urlInput,
      url: urlInput,
    });

    setUrlInput('');
  };

  const handleAddText = () => {
    if (!textInput.trim() || !textTitle.trim()) return;

    onAddAttachment({
      type: 'text',
      title: textTitle,
      content: textInput,
    });

    setTextInput('');
    setTextTitle('');
  };

  return (
    <Card className="mb-4">
      <h3 className="font-display text-lg font-bold text-neutral-text mb-4">
        Add Learning Materials
      </h3>

      <div className="flex gap-2 mb-4 border-b-2 border-neutral-border">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-body font-semibold transition-colors ${
            activeTab === 'upload'
              ? 'text-primary border-b-4 border-primary'
              : 'text-neutral-text-muted hover:text-neutral-text'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          Upload
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 font-body font-semibold transition-colors ${
            activeTab === 'url'
              ? 'text-primary border-b-4 border-primary'
              : 'text-neutral-text-muted hover:text-neutral-text'
          }`}
        >
          <Link className="w-4 h-4 inline mr-2" />
          URL
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`px-4 py-2 font-body font-semibold transition-colors ${
            activeTab === 'text'
              ? 'text-primary border-b-4 border-primary'
              : 'text-neutral-text-muted hover:text-neutral-text'
          }`}
        >
          <FileText className="w-4 h-4 inline mr-2" />
          Text
        </button>
      </div>

      <div className="mb-4">
        {activeTab === 'upload' && (
          <div>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-border rounded-lg cursor-pointer hover:bg-neutral-surface transition-colors">
              <Upload className="w-8 h-8 text-neutral-text-muted mb-2" />
              <span className="font-body text-sm text-neutral-text-muted">
                Click to upload PDF, DOCX, or PPTX
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                multiple
                onChange={handleFileUpload}
              />
            </label>
          </div>
        )}

        {activeTab === 'url' && (
          <div>
            <Input
              placeholder="https://example.com/article"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="mb-2"
            />
            <Button onClick={handleAddUrl} disabled={!urlInput.trim()}>
              Add URL
            </Button>
          </div>
        )}

        {activeTab === 'text' && (
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
            />
            <textarea
              placeholder="Paste your text content here..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-neutral-border font-body text-neutral-text placeholder:text-neutral-text-muted focus:outline-none focus:border-primary transition-colors resize-none"
              rows={6}
            />
            <Button onClick={handleAddText} disabled={!textInput.trim() || !textTitle.trim()}>
              Add Text
            </Button>
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-body font-semibold text-neutral-text text-sm mb-2">
            Added Materials ({attachments.length})
          </h4>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-neutral-surface rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="font-body text-sm text-neutral-text truncate">
                  {attachment.title}
                </span>
                {attachment.uploading && (
                  <span className="text-xs text-neutral-text-muted">(uploading...)</span>
                )}
              </div>
              <button
                onClick={() => onRemoveAttachment(attachment.id)}
                className="p-1 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
