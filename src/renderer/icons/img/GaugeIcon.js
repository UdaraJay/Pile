export const GaugeIcon = props => {
    return (
        <svg
            {...props}
            height="21"
            viewBox="0 0 21 21"
            width="21"
            xmlns="http://www.w3.org/2000/svg">
            <g fill="none" fillRule="evenodd" transform="translate(2 3)">
                <path
                    d="m14 14c1.4477153-1.4477153 2.5-3.290861 2.5-5.5 0-4.418278-3.581722-8-8-8s-8 3.581722-8 8c0 2.209139 1.05228475 4.0522847 2.5 5.5"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="m8.5 8.5-4-4"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <circle cx="8.5" cy="8.5" fill="currentColor" r="1.5" />
            </g>
        </svg>
    )
}
