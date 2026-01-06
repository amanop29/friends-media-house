import React from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

// Validation functions
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhoneNumber(phone: string): boolean {
  // Accepts: Only 10 digits (no country code - backend detects from IP)
  const digitsOnly = phone.replace(/[-\.\s]/g, '');
  return /^\d{10}$/.test(digitsOnly);
}

// Utility to get input className based on error state
export function getInputClassName(error?: string): string {
  const baseClass = 'rounded-lg bg-white/50 dark:bg-black/20 border-[#2B2B2B] dark:border-white/10 focus:border-[#C5A572] text-[#2B2B2B] dark:text-white';
  const errorClass = 'border-red-500 focus:border-red-500';
  return error ? `${baseClass} ${errorClass}` : baseClass;
}

// Form field wrapper component
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  htmlFor?: string;
}

export function FormField({ label, required = false, error, children, htmlFor }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-[#2B2B2B] dark:text-white">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  );
}

// Event type select with Jainism option
interface EventTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

export function EventTypeSelect({ value, onChange, error, required = true }: EventTypeSelectProps) {
  return (
    <FormField label="Event Type" required={required} error={error} htmlFor="eventType">
      <Select value={value} onValueChange={onChange} required={required}>
        <SelectTrigger 
          id="eventType"
          className={getInputClassName(error)}
        >
          <SelectValue placeholder="Select event type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="wedding">Wedding</SelectItem>
          <SelectItem value="pre-wedding">Pre-Wedding</SelectItem>
          <SelectItem value="jainism">Jainism</SelectItem>
          <SelectItem value="reception">Reception</SelectItem>
          <SelectItem value="engagement">Engagement</SelectItem>
          <SelectItem value="birthday">Birthday</SelectItem>
          <SelectItem value="corporate">Corporate Event</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>
    </FormField>
  );
}

// Validated text input
interface ValidatedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  placeholder?: string;
  id?: string;
}

export function ValidatedInput({ 
  label, 
  value, 
  onChange, 
  error, 
  required = false, 
  type = 'text',
  placeholder,
  id
}: ValidatedInputProps) {
  return (
    <FormField label={label} required={required} error={error} htmlFor={id}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={getInputClassName(error)}
        placeholder={placeholder}
        required={required}
      />
    </FormField>
  );
}

// Validated textarea
interface ValidatedTextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  rows?: number;
  id?: string;
}

export function ValidatedTextarea({ 
  label, 
  value, 
  onChange, 
  error, 
  required = false,
  placeholder,
  rows = 4,
  id
}: ValidatedTextareaProps) {
  return (
    <FormField label={label} required={required} error={error} htmlFor={id}>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={getInputClassName(error)}
        placeholder={placeholder}
        rows={rows}
        required={required}
      />
    </FormField>
  );
}

// Phone number input with validation
interface PhoneInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  id?: string;
}

export function PhoneInput({ 
  label = 'Phone Number',
  value, 
  onChange, 
  error, 
  required = true,
  id = 'phone'
}: PhoneInputProps) {
  return (
    <FormField label={label} required={required} error={error} htmlFor={id}>
      <Input
        id={id}
        type="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={getInputClassName(error)}
        placeholder="9876543210"
        required={required}
      />
    </FormField>
  );
}

// Email input with validation
interface EmailInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  id?: string;
}

export function EmailInput({ 
  label = 'Email Address',
  value, 
  onChange, 
  error, 
  required = true,
  id = 'email'
}: EmailInputProps) {
  return (
    <FormField label={label} required={required} error={error} htmlFor={id}>
      <Input
        id={id}
        type="email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={getInputClassName(error)}
        placeholder="your.email@example.com"
        required={required}
      />
    </FormField>
  );
}