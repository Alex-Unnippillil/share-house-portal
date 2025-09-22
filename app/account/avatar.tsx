'use client'
import React, { useEffect, useState } from 'react'
import useSupabaseBrowser from '@/utils/supabase-browser'
import Image from 'next/image'
import { useSupabaseConnectivity } from '@/components/network/supabase-connectivity-provider'
import { stableHash } from '@/lib/utils'

export default function Avatar({
  uid,
  url,
  size,
  onUpload,
}: {
  uid: string | null
  url: string | null
  size: number
  onUpload: (url: string) => void
}) {
  const supabase = useSupabaseBrowser()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(url)
  const [uploading, setUploading] = useState(false)
  const { enqueueMutation, status } = useSupabaseConnectivity()

  useEffect(() => {
    async function downloadImage(path: string) {
      try {
        const { data, error } = await supabase.storage.from('avatars').download(path)
        if (error) {
          throw error
        }

        const url = URL.createObjectURL(data)
        setAvatarUrl(url)
      } catch (error) {
        console.log('Error downloading image: ', error)
      }
    }

    if (url) downloadImage(url)
  }, [url, supabase])

  const uploadAvatar: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    try {
      setUploading(true)

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${uid}-${Math.random()}.${fileExt}`

      const mutationKey = `avatar-upload:${stableHash({
        uid,
        name: file.name,
        modified: file.lastModified,
        size: file.size,
      })}`

      const mutationPromise = enqueueMutation(mutationKey, async () => {
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file)

        if (uploadError) {
          throw uploadError
        }

        onUpload(filePath)
      })

      if (status === 'online') {
        await mutationPromise
      } else {
        alert('You are offline. We will upload your avatar when the connection returns.')
        mutationPromise.catch(error => {
          console.error('Error uploading avatar: ', error)
          alert('Error uploading avatar!')
        })
      }
    } catch (error) {
      console.log('Error uploading avatar: ', error)
      alert('Error uploading avatar!')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {avatarUrl ? (
        <Image
          width={size}
          height={size}
          src={avatarUrl}
          alt="Avatar"
          className="relative flex size-10 shrink-0 overflow-hidden rounded-full"
          style={{ height: size, width: size }}
        />
      ) : (
        <div className="avatar no-image" style={{ height: size, width: size }} />
      )}
      <div style={{ width: size }}>
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="single">
          {uploading ? 'Uploading ...' : 'Upload Image'}
        </label>
        <input
          style={{
            visibility: 'hidden',
            position: 'absolute',
          }}
          type="file"
          id="single"
          accept="image/*"
          onChange={uploadAvatar}
          disabled={uploading}
        />
      </div>
    </div>
  )
}