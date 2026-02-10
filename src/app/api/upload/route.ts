import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const loanCode = formData.get('loanCode') as string || 'default'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB' }, { status: 400 })
    }

    const supabase = await createClient()

    // Create unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_')
    const path = `${loanCode}/${timestamp}_${sanitizedName}`

    // Upload to Supabase Storage
    const { data, error } = await supabase
      .storage
      .from('properties')
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Error uploading to Supabase:', error)
      return NextResponse.json({ error: 'Error uploading file: ' + error.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('properties')
      .getPublicUrl(path)

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error('Error in upload route:', error)
    return NextResponse.json({ error: 'Error uploading file' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'No URL provided' }, { status: 400 })
    }

    const supabase = await createClient()

    // Extract path from URL
    // Format: .../storage/v1/object/public/properties/loanCode/filename
    const urlParts = url.split('/properties/')
    if (urlParts.length < 2) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    const path = urlParts[1]

    const { error } = await supabase
      .storage
      .from('properties')
      .remove([path])

    if (error) {
      console.error('Error deleting from Supabase:', error)
      return NextResponse.json({ error: 'Error deleting file: ' + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete route:', error)
    return NextResponse.json({ error: 'Error deleting file' }, { status: 500 })
  }
}
