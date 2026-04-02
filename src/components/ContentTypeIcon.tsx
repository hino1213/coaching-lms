import React from 'react';

interface ContentTypeIconProps {
  type: 'video' | 'text' | 'work';
  size?: 'sm' | 'md' | 'lg';
}

const ContentTypeIcon: React.FC<ContentTypeIconProps> = ({ type, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const sizeClass = sizeMap[size];

  if (type === 'video') {
    return (
      <svg
        className={`${sizeClass} text-blue-500`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5h3V9h4v3h3l-5 5z" />
      </svg>
    );
  }

  if (type === 'text') {
    return (
      <svg
        className={`${sizeClass} text-green-500`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z" />
        <path d="M16 18H8v-2h8v2zm0-4H8v-2h8v2zm0-4H8V8h8v2z" fill="white" />
      </svg>
    );
  }

  if (type === 'work') {
    return (
      <svg
        className={`${sizeClass} text-orange-500`}
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <path d="M3 17.25V21h16.5V17.25m-13.5-5.25l1.41 1.41L12 9.83l10.59 10.59L24 19 12 7 0 19l1.41 1.41z" />
        <path d="M12 2l-5.41 5.41 1.41 1.41L12 4.83l4 4V3l-4-1z" />
      </svg>
    );
  }

  return null;
};

export default ContentTypeIcon;
