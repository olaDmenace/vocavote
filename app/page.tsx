import { redirect } from 'next/navigation'

// Authenticated users are redirected by proxy.ts to /feed before they hit this.
// Unauthenticated users land here; bounce them to the login form.
export default function Home() {
  redirect('/login')
}
