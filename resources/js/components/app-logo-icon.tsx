import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg {...props} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="sGradient" x1="0%" y1="50%" x2="100%" y2="50%">
                    <stop offset="0%" stopColor="#C850C0" />
                    <stop offset="100%" stopColor="#FFCC70" />
                </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="90" fill="url(#sGradient)" opacity="0.1" />
            <path
                d="M135 80C135 71.5 131 63.5 124.5 57.5C118 51.5 110 48 100 48C89.5 48 81.5 51.5 75 57.5C68.5 63.5 65 71 65 80C65 89 68.5 95 75 99.5C81.5 104 88 107 95 109.5C102 112 108.5 114.5 115 119C121.5 123.5 125 128.5 125 135C125 140.5 122.5 146 118 149.5C113.5 153 107 155 100 155C93 155 86.5 153 81.5 149.5C76.5 146 73.5 140.5 73.5 135H53C53 147 58 157 67.5 165C77 173 88 177 100 177C112 177 123 173 132.5 165C142 157 147 147 147 135C147 124 142 116 133.5 109.5C125 103 115 99 105.5 95.5C96 92 87 88.5 80.5 83.5C74 78.5 70 74.5 70 70C70 65.5 71.5 61.5 75 58.5C78.5 55.5 83.5 54 90 54C96.5 54 101.5 55.5 105 58.5C108.5 61.5 110 65.5 110 70H135V80Z"
                fill="url(#sGradient)"
            />
        </svg>
    );
}
