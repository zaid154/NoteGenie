// FLOW: Client source file. Data usually comes from props/context/routes/api/client.js, UI logic processes it, and rendered output or user actions go back to parent/API flow.

// FLOW: Parent page/layout renders this component (icons). Data comes through props/context, UI events call callbacks or api/client.js helpers, and the result is displayed back in the parent flow.

// Custom inline SVG icons (koi icon library nahi - taaki look unique rahe).
// Sab same stroke style follow karte hain.
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const make = (paths) => (props) => (
  <svg {...base} {...props}>
    {paths}
  </svg>
);

export const IconBook = make(
  <>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </>
);
export const IconFileText = make(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
    <path d="M14 2v6h6" />
    <path d="M9 13h6" />
    <path d="M9 17h6" />
  </>
);
export const IconBriefcase = make(
  <>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </>
);
export const IconHeart = make(
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.49 4.04 3 5.5l7 7Z" />
);

export const IconUpload = make(
  <>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M5 20h14" />
  </>
);
export const IconLink = make(
  <>
    <path d="M9 15 15 9" />
    <path d="M11 6.5 12.5 5a4 4 0 0 1 5.7 5.7l-1.5 1.5" />
    <path d="M13 17.5 11.5 19a4 4 0 0 1-5.7-5.7L7.3 11.8" />
  </>
);
export const IconCards = make(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 10h18" />
  </>
);
export const IconChat = make(
  <>
    <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.8-5.5A8 8 0 1 1 21 12Z" />
  </>
);
export const IconChart = make(
  <>
    <path d="M4 19V5" />
    <path d="M4 19h16" />
    <path d="M8 16v-5" />
    <path d="M13 16V8" />
    <path d="M18 16v-3" />
  </>
);
export const IconHome = make(
  <>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 10v9h12v-9" />
  </>
);
export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
  </>
);
export const IconMoon = make(<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10Z" />);
export const IconPlus = make(
  <>
    <path d="M12 5v14M5 12h14" />
  </>
);
export const IconTrash = make(
  <>
    <path d="M4 7h16" />
    <path d="M9 7V5h6v2" />
    <path d="M6 7l1 13h10l1-13" />
  </>
);
export const IconLogout = make(
  <>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="M10 17 15 12 10 7" />
    <path d="M15 12H3" />
  </>
);
export const IconCheck = make(<path d="m5 13 4 4L19 7" />);
export const IconX = make(<path d="M6 6 18 18M18 6 6 18" />);
export const IconDownload = make(
  <>
    <path d="M12 4v10" />
    <path d="m8 11 4 4 4-4" />
    <path d="M5 19h14" />
  </>
);
export const IconCart = make(
  <>
    <circle cx="9" cy="20" r="1" />
    <circle cx="18" cy="20" r="1" />
    <path d="M2 3h3l2.4 12.3a1 1 0 0 0 1 .7h9.2a1 1 0 0 0 1-.8L21 7H6" />
  </>
);
export const IconSparkles = make(
  <>
    <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6L12 4Z" />
    <path d="M19 15l.7 1.9L21.5 18l-1.8.6L19 21l-.7-2-1.8-.6 1.8-.6L19 15Z" />
  </>
);
export const IconDoc = make(
  <>
    <path d="M7 3h7l5 5v13a0 0 0 0 1 0 0H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
    <path d="M14 3v5h5" />
  </>
);
export const IconSend = make(
  <>
    <path d="M4 12 20 4l-6 16-3-7-7-1Z" />
  </>
);
export const IconMenu = make(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconArrowLeft = make(
  <>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </>
);
export const IconBrain = make(
  <>
    <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-1 5.8V15a3 3 0 0 0 4 2.8" />
    <path d="M9 4a2.5 2.5 0 0 1 3 2.5V18" />
    <path d="M15 4a3 3 0 0 1 3 3 3 3 0 0 1 1 5.8V15a3 3 0 0 1-4 2.8" />
  </>
);
export const IconShield = make(
  <path d="M12 3 20 7v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4Z" />
);
export const IconUsers = make(
  <>
    <path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" />
    <circle cx="9" cy="7" r="3" />
    <path d="M22 19v-1a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </>
);
export const IconSettings = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
  </>
);
export const IconMail = make(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </>
);
export const IconLock = make(
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>
);
export const IconUser = make(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
  </>
);
export const IconEye = make(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </>
);
export const IconEyeOff = make(
  <>
    <path d="M9.9 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.8" />
    <path d="M6.1 6.1A17 17 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 4-.8" />
    <path d="M3 3l18 18" />
  </>
);
export const IconActivity = make(
  <>
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </>
);
// Brand logos filled hote hain (stroke style se alag), isliye inhe alag se banate hain.
export const IconGithub = (props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" {...props}>
    <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
  </svg>
);
export const IconLinkedin = (props) => (
  <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" {...props}>
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3.2 9h3.6v12H3.2zM9.2 9h3.45v1.64h.05c.48-.9 1.65-1.85 3.4-1.85 3.64 0 4.31 2.4 4.31 5.51V21h-3.6v-5.3c0-1.26-.02-2.89-1.76-2.89-1.76 0-2.03 1.38-2.03 2.8V21H9.2z" />
  </svg>
);
export const IconGlobe = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </>
);
export const IconCamera = make(
  <>
    <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13" r="3.5" />
  </>
);
export const IconCalendar = make(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18M8 3v4M16 3v4" />
  </>
);
export const IconCoins = make(
  <>
    <circle cx="8" cy="8" r="5" />
    <path d="M13.5 13.5 19 19" />
    <path d="M8 6v4M6 8h4" />
  </>
);
export const IconChevronRight = make(<path d="m9 6 6 6-6 6" />);
export const IconLayers = make(
  <>
    <path d="M12 3 3 8l9 5 9-5-9-5Z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </>
);
export const IconShare = make(
  <>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 3.9M15.4 6.6 8.6 10.5" />
  </>
);
export const IconFlame = make(
  <path d="M12 3c.5 3 2.5 4.5 3.8 6.2A6 6 0 1 1 6 13c0-2 1-3.6 2-5 .3 1.3 1 2 2 2.4C9.7 7 10.5 4.8 12 3Z" />
);
export const IconHeadphones = make(
  <>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="2.5" y="14" width="4" height="6" rx="1.5" />
    <rect x="17.5" y="14" width="4" height="6" rx="1.5" />
  </>
);
export const IconPlay = make(<path d="M7 4.5v15l12-7.5-12-7.5Z" />);
export const IconPause = make(
  <>
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </>
);
export const IconStop = make(<rect x="6" y="6" width="12" height="12" rx="2" />);
export const IconMap = make(
  <>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="18" cy="9" r="2.5" />
    <circle cx="9" cy="18" r="2.5" />
    <path d="M8 7l8 1.5M7.5 8 8.5 15.5" />
  </>
);
export const IconSearch = make(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>
);
export const IconMic = make(
  <>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0" />
    <path d="M12 18v3" />
    <path d="M8 21h8" />
  </>
);

