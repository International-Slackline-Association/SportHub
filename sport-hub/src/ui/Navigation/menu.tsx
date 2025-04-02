'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react';

type MenuProps = {
    buttons: Record<string, { href: string }>;
};

const Menu: React.FC<MenuProps> = ({ buttons = {} }) => { 
    const router = useRouter()
    const [active, setActive] = useState<string | null>(null);

    const handleClick = (label: string, href: string) => {
        setActive(label);
        router.push(href)
    }

    return (
        <div className="menu font-bold">
            {Object.entries(buttons).map(([label, { href }]) => (
                <button key={label} 
                    className={`btn btn-nav ${active === label ? 'btn-nav-active' : ''}`}
                    onClick={() => handleClick(label, href)}>{label}
                </button>
            ))}
        </div>
    );
};

export default Menu;
