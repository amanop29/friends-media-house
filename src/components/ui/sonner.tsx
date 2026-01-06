"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        style: {
          background: 'white',
          color: 'black',
          border: '1px solid rgba(0, 0, 0, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        },
        classNames: {
          success: 'bg-white text-black border-green-200',
          error: 'bg-white text-black border-red-200',
          info: 'bg-white text-black border-blue-200',
          warning: 'bg-white text-black border-yellow-200',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
