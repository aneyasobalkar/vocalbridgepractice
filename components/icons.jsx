// Small stroke-based icon set (no external icon library dependency).
const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function PlaneIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M12.5 2.5 21 11l-4.5 1.2-3 6.3-1.7-4.5-4.5-1.7 6.3-3L11 2.5Z" />
      <path d="M4 20l3-1 1-3-3 1-1 3Z" />
    </svg>
  );
}

export function MicIcon(props) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M8.5 21h7" />
    </svg>
  );
}

export function MicOffIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-.4 1.5" />
      <path d="M5 11a7 7 0 0 0 10.5 6" />
      <path d="M19 11a7 7 0 0 1-.7 3" />
      <path d="M12 18v3" />
      <path d="M8.5 21h7" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function PhoneOffIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M10.5 4.5c.6 0 1.2.4 1.4 1l1 2.5a1.5 1.5 0 0 1-.4 1.7l-1.3 1.1a11 11 0 0 0 4.9 4.9l1.1-1.3a1.5 1.5 0 0 1 1.7-.4l2.5 1c.6.2 1 .8 1 1.4v2a1.5 1.5 0 0 1-1.6 1.5A17.5 17.5 0 0 1 4.5 4.6 1.5 1.5 0 0 1 6 3h2Z" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function PhoneIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 3h2c.6 0 1.2.4 1.4 1l1 2.5a1.5 1.5 0 0 1-.4 1.7L9.2 9.3a11 11 0 0 0 4.9 4.9l1.1-1.3a1.5 1.5 0 0 1 1.7-.4l2.5 1c.6.2 1 .8 1 1.4v2A1.5 1.5 0 0 1 19 19C10.4 19 3 11.6 3 4.5A1.5 1.5 0 0 1 4.5 3h2Z" />
    </svg>
  );
}

export function PaperclipIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M18.5 8.5 9.9 17a3.5 3.5 0 1 1-5-5l8-8a2.3 2.3 0 0 1 3.3 3.3l-7.6 7.6a1.2 1.2 0 1 1-1.7-1.7l6.9-6.9" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  );
}

export function FileIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
    </svg>
  );
}

export function ImageFileIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <circle cx="11" cy="13" r="1.2" />
      <path d="M9 18l2.5-2.5L13 17l2-2 2.5 2.5" />
    </svg>
  );
}

export function PdfFileIcon(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 17v-4h1a1.2 1.2 0 0 1 0 2.4h-1" />
      <path d="M13.5 17v-4h1.2" />
      <path d="M13.5 15h1" />
    </svg>
  );
}
