// src/types.d.ts

// ✅ Fix for ALL CSS imports (including leaflet!)
declare module '*.css';

// ✅ Fix for other common assets
declare module '*.scss';
declare module '*.sass';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg';
declare module '*.ico';
declare module '*.woff';
declare module '*.woff2';
declare module '*.ttf';
declare module '*.otf';

// ✅ Optional: CSS Modules support
declare module '*.module.css' {  // ← SPACE not DOT!
  const classes: { readonly [key: string]: string };
  export default classes;
}