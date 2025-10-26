import React, { useEffect, useState } from 'react';

const toastStyles = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

const Toast = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade out transition
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  if (!toast) {
    return null;
  }

  return (
    <div 
      className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white text-base z-50 transition-all duration-300 ${toastStyles[toast.type]} ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}
    >
      {toast.message}
    </div>
  );
};

export default Toast;