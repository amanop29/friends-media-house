"use client";
import React, { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from './ui/utils';

interface FileUploadProps {
  accept?: string;
  onChange: (file: File | null) => void;
  value?: File | null;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
}

export function FileUpload({
  accept,
  onChange,
  value,
  placeholder = 'No file selected',
  id,
  disabled = false,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && accept) {
      const file = files[0];
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileType = file.type;
      const fileExtension = '.' + file.name.split('.').pop();

      const isAccepted = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return fileExtension.toLowerCase() === type.toLowerCase();
        }
        if (type.endsWith('/*')) {
          const baseType = type.split('/')[0];
          return fileType.startsWith(baseType);
        }
        return fileType === type;
      });

      if (isAccepted) {
        onChange(file);
      }
    } else if (files.length > 0) {
      onChange(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onChange(files[0]);
    }
  };

  const handleClear = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0',
        'h-auto sm:h-12',
        'rounded-lg overflow-hidden',
        'backdrop-blur-lg bg-white/50 dark:bg-black/20',
        'border-2 transition-all duration-200',
        isDragging
          ? 'border-dashed border-[#C5A572] bg-[#C5A572]/10'
          : 'border-white/20 dark:border-white/10',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* File Name Display */}
      <div
        className={cn(
          'flex-1 px-4 py-3 sm:py-0 flex items-center justify-between sm:justify-start',
          'text-sm truncate',
          'min-h-[44px] sm:min-h-0'
        )}
      >
        <span
          className={cn(
            'truncate flex-1',
            value
              ? 'text-[#2B2B2B] dark:text-white'
              : 'text-[#707070] dark:text-[#A0A0A0]'
          )}
        >
          {value ? value.name : placeholder}
        </span>
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0"
            title="Clear file"
          >
            <X className="w-4 h-4 text-[#707070] dark:text-[#A0A0A0]" />
          </button>
        )}
      </div>

      {/* Upload Button */}
      <Button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'bg-[#C5A572] hover:bg-[#B39563] text-white',
          'px-6 gap-2 flex-shrink-0',
          'h-11 sm:h-full sm:rounded-none sm:rounded-r-md',
          'min-h-[44px] sm:min-h-0',
          'w-full sm:w-auto'
        )}
      >
        <Upload className="w-4 h-4" />
        <span>Choose File</span>
      </Button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        id={id}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={disabled}
        className="hidden"
      />
    </div>
  );
}
