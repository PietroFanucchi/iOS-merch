import React, { useCallback, useState } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number; // in bytes
  disabled?: boolean;
  className?: string;
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = "*/*",
  maxSize = 10 * 1024 * 1024, // 10MB default
  disabled = false,
  className,
  multiple = false
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): boolean => {
    setError(null);
    
    if (maxSize && file.size > maxSize) {
      setError(`File troppo grande. Dimensione massima: ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
      return false;
    }

    if (accept !== "*/*") {
      const acceptedTypes = accept.split(',').map(type => type.trim());
      const fileType = file.type;
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return type === fileExtension;
        }
        return fileType.match(type.replace('*', '.*'));
      });

      if (!isAccepted) {
        setError(`Tipo di file non supportato. Tipi accettati: ${accept}`);
        return false;
      }
    }

    return true;
  }, [accept, maxSize]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || disabled) return;

    const file = files[0]; // Take first file even if multiple is true
    if (file && validateFile(file)) {
      onFileSelect(file);
    }
  }, [onFileSelect, validateFile, disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input value to allow selecting same file again
    e.target.value = '';
  }, [handleFiles]);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-6 transition-colors",
          "flex flex-col items-center justify-center min-h-[120px]",
          "hover:bg-muted/50 cursor-pointer",
          {
            "border-primary bg-primary/10": isDragOver && !disabled,
            "border-muted-foreground/25": !isDragOver && !disabled,
            "border-muted-foreground/10 opacity-50 cursor-not-allowed": disabled,
          }
        )}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInput}
          disabled={disabled}
          multiple={multiple}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        
        <div className="text-center">
          <Upload className={cn(
            "w-8 h-8 mx-auto mb-2",
            isDragOver ? "text-primary" : "text-muted-foreground"
          )} />
          <p className="text-sm font-medium">
            {isDragOver ? "Rilascia il file qui" : "Drag & drop o clicca per selezionare"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {accept === ".pdf" ? "Solo file PDF" : `Tipi supportati: ${accept}`}
          </p>
          {maxSize && (
            <p className="text-xs text-muted-foreground">
              Dimensione massima: {(maxSize / 1024 / 1024).toFixed(1)}MB
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <X className="w-4 h-4" />
          {error}
        </div>
      )}
    </div>
  );
};

export default FileUpload;