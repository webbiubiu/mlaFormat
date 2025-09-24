'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isValidDocxFile, formatFileSize } from '@/lib/utils';
import { Upload, File, X, AlertCircle } from 'lucide-react';

interface DocumentUploadProps {
  onFileUpload: (file: File | null) => void;
  uploadedFile?: File | null;
}

export default function DocumentUpload({ onFileUpload, uploadedFile }: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndUploadFile = useCallback((file: File) => {
    setError(null);
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Check file type
    if (!isValidDocxFile(file)) {
      setError('Please upload a valid DOCX file');
      return;
    }

    onFileUpload(file);
  }, [onFileUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      validateAndUploadFile(files[0]);
    }
  }, [validateAndUploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUploadFile(files[0]);
    }
  }, [validateAndUploadFile]);

  const removeFile = useCallback(() => {
    setError(null);
    onFileUpload(null); // Reset file
  }, [onFileUpload]);

  if (uploadedFile) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <File className="h-8 w-8 text-blue-500" />
            <div>
              <p className="font-medium text-sm">{uploadedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(uploadedFile.size)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={removeFile}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
          ${isDragOver 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="flex flex-col items-center space-y-4">
          <Upload className={`h-12 w-12 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
          <div>
            <p className="text-lg font-medium">
              {isDragOver ? 'Drop your file here' : 'Upload DOCX Document'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports DOCX files up to 10MB
            </p>
          </div>
          <Button variant="secondary" size="sm">
            Choose File
          </Button>
        </div>
      </div>
      
      <input
        id="file-input"
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}