import Image from "next/image";
import Menu from "./menu";
import Link from "next/link"

export default function Navbar() {
    const nav_items = {
        "Home": {
            "href": "/"
        },
        "Rankings":{
            "href": "/rankings"
        },
        "Events":{
            "href": "/events"
        },
        "Judging":{
            "href": "/judging"
        },
        "World Records":{
            "href": "/world_records"
        }
    }

    return (
        <div className="navbar clearfix">
            <div className="nav-logo">
                <Image src="/static/images/sport-hub-logo.png" 
                alt="logo"
                layout="intrinsic"
                width={426}
                height={247}
                />
            </div>
            <Menu buttons={nav_items}/>
        </div>
    )
}