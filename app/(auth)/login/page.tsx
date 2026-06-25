import Link from 'next/link'
import { LoginForm } from './login-form'
import { Alert } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Props = {
  searchParams: Promise<{ next?: string; suspended?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { next, suspended } = await searchParams
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your matric number to access the platform.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {suspended ? (
          <Alert tone="error">
            Your account has been suspended. Contact the electoral committee.
          </Alert>
        ) : null}
        <LoginForm next={next} />
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2 text-sm">
        <div className="text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium underline-offset-4 hover:underline">
            Register
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
