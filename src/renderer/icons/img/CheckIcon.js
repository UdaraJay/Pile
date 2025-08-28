export function CheckIcon(props) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <polyline points="9,11 12,14 22,4" />
      <path d="M21,12v7a2,2 0 01-2,2H5a2,2 0 01-2-2V5a2,2 0 012-2h11" />
    </svg>
  );
}
