import { requireProfile } from '@/lib/auth/guards'
import { ProfileForm } from './profile-form'
import { AvatarUploader } from './avatar-uploader'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default async function ProfileEditPage() {
  const profile = await requireProfile()

  return (
    <div className="grid gap-6 md:grid-cols-[280px,1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Avatar</CardTitle>
          <CardDescription>JPG or PNG, max 2 MB.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader profile={profile} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Your matric number is permanent. Other fields can be updated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm profile={profile} />
        </CardContent>
      </Card>
    </div>
  )
}
