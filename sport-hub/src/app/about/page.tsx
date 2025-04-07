import type { Metadata } from 'next'
 
export const metadata: Metadata = {
  title: 'SportHub - About',
}

export default async function Page() {
    return (
        <h1> About </h1>
    )
}