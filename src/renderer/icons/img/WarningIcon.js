export const WarningIcon = (props) => {
  return (
    <svg
      {...props}
      height="21"
      width="21"
      viewBox="0 0 21 21"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g fill="none" fill-rule="evenodd">
        <circle
          cx="10.5"
          cy="10.5"
          r="8"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m10.5 11.5v-5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10.5" cy="14.5" fill="currentColor" r="1" />
      </g>
    </svg>
  );
};
