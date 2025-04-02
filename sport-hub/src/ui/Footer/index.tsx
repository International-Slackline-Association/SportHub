'use client'

import Link from "next/link";
import Image from "next/image";

const footer_items: { [key: string]: string } = {
    "Frequently Asked Questions": "/faq",
    "Event Registration": "/events",
    "About ISA Sports": "/about",
    "ISA Members and Partners": "/partners",
    "Open Source": "https://github.com/International-Slackline-Association",
    "Contact Us": "/contact"
}

const chunkArray = (arr: string[], size: number) => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, index) =>
        arr.slice(index * size, index * size + size)
    );
};

const Footer: React.FC = () => {
    // TODO: change "3" to a prop input value
    const split_arrs = chunkArray(Object.keys(footer_items), 3)

    return (
        <footer className="clearfix font-bold">
            {split_arrs.map((chunk, index) => (
                <div key={index} className="footer-column">
                    {chunk.map((item) => (
                        <Link key={item} href={footer_items[item]}>
                            {item}
                        </Link>
                    ))}
                </div>
            ))}
            <div className="footer-column">
                <Image 
                className="isa-logo"
                    src="/static/images/ISA_logo.png"
                    alt="logo"
                    width={623}
                    height={112}
                />
                <Image
                    className="sport-img"
                    src="/static/images/sport-hub-logo.png"
                    alt="logo"
                    width={426}
                    height={247}
                />
            </div>
        </footer>
    )
}

export default Footer;