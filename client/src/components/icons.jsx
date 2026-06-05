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
export const IconCoins = make(
  <>
    <circle cx="8" cy="8" r="5" />
    <path d="M13.5 13.5 19 19" />
    <path d="M8 6v4M6 8h4" />
  </>
);
