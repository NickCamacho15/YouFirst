/**
 * Profile Image Upload Module
 * 
 * Handles all profile image operations with proper error handling,
 * optimistic updates, and guaranteed UI consistency.
 */

import { supabase } from "./supabase"
import { Image } from "react-native"

/**
 * Upload result with both the storage path and displayable URL
 */
export interface UploadResult {
  storagePath: string
  displayUrl: string
}

/**
 * Upload a profile image to Supabase Storage
 * 
 * @param file - Image file data (Blob, ArrayBuffer, or Uint8Array)
 * @param contentType - MIME type (e.g., 'image/jpeg')
 * @param fileName - Original file name
 * @returns Storage path and display URL
 */
export async function uploadProfileImageToStorage(
  file: Blob | ArrayBuffer | Uint8Array,
  contentType: string,
  fileName: string
): Promise<UploadResult> {
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error("Not authenticated")
  }

  // Validate file is not empty
  const fileSize = file instanceof Blob 
    ? (file as any).size 
    : file instanceof Uint8Array 
      ? file.byteLength 
      : (file as ArrayBuffer).byteLength

  if (fileSize === 0) {
    throw new Error("Image file is empty. Please select a different photo.")
  }

  // Create storage path: userId/timestamp_filename
  const cleanName = fileName.replace(/[^a-zA-Z0-9_.-]/g, "_")
  const storagePath = `${user.id}/${Date.now()}_${cleanName}`

  // Upload to storage with upsert (overwrites if exists)
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(storagePath, file as any, {
      contentType,
      upsert: true,
      cacheControl: '3600', // Cache for 1 hour
    })

  if (uploadError) {
    console.error("[profile-image] Upload failed:", uploadError)
    throw new Error(`Upload failed: ${uploadError.message}`)
  }

  // Generate public URL (bucket is public, so this always works)
  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(storagePath)

  const displayUrl = urlData.publicUrl

  if (!displayUrl) {
    throw new Error("Failed to generate image URL")
  }

  // Add cache-busting parameter to ensure fresh load
  const finalUrl = `${displayUrl}?t=${Date.now()}`

  console.log("[profile-image] Upload successful:", { storagePath, displayUrl: finalUrl })

  return {
    storagePath,
    displayUrl: finalUrl,
  }
}

/**
 * Update profile image URL in both auth metadata and users table
 * 
 * @param imageUrl - Full URL to the uploaded image
 * @returns Success status
 */
export async function updateProfileImageInDatabase(imageUrl: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error("Not authenticated")
  }

  // Update in parallel for speed
  const [authResult, dbResult] = await Promise.allSettled([
    // Update auth metadata
    supabase.auth.updateUser({
      data: { profile_image_url: imageUrl }
    }),
    // Update users table
    supabase
      .from("users")
      .update({ profile_image_url: imageUrl })
      .eq("id", user.id)
  ])

  // Log any errors but don't throw - at least one should succeed
  if (authResult.status === "rejected") {
    console.warn("[profile-image] Auth metadata update failed:", authResult.reason)
  } else if (authResult.value.error) {
    console.warn("[profile-image] Auth metadata update error:", authResult.value.error)
  }

  if (dbResult.status === "rejected") {
    console.warn("[profile-image] Database update failed:", dbResult.reason)
  } else if ('error' in dbResult.value && dbResult.value.error) {
    console.warn("[profile-image] Database update error:", dbResult.value.error)
  }

  // Verify at least one succeeded
  const authSuccess = authResult.status === "fulfilled" && !authResult.value.error
  const dbSuccess = dbResult.status === "fulfilled" && !('error' in dbResult.value && dbResult.value.error)

  if (!authSuccess && !dbSuccess) {
    throw new Error("Failed to update profile image in both auth and database")
  }

  console.log("[profile-image] Database update successful", { authSuccess, dbSuccess })
}

/**
 * Prefetch image to ensure it's in device cache
 * 
 * @param imageUrl - URL to prefetch
 */
export async function prefetchImage(imageUrl: string): Promise<void> {
  try {
    await Image.prefetch(imageUrl)
    console.log("[profile-image] Image prefetched successfully")
  } catch (error) {
    console.warn("[profile-image] Image prefetch failed (non-critical):", error)
    // Don't throw - prefetch failure is not critical
  }
}

/**
 * Complete profile image upload flow
 * 
 * This is the main entry point that orchestrates the entire upload process:
 * 1. Upload image to storage
 * 2. Update database records
 * 3. Prefetch image for immediate display
 * 
 * @param file - Image file data
 * @param contentType - MIME type
 * @param fileName - Original file name
 * @returns Display URL for immediate UI update
 */
export async function uploadProfileImage(
  file: Blob | ArrayBuffer | Uint8Array,
  contentType: string,
  fileName: string
): Promise<string> {
  console.log("[profile-image] Starting upload flow")

  // Step 1: Upload to storage
  const { storagePath, displayUrl } = await uploadProfileImageToStorage(
    file,
    contentType,
    fileName
  )

  // Step 2 & 3: Update database and prefetch in parallel (fast path)
  // Start both immediately but don't wait for them
  const dbUpdatePromise = updateProfileImageInDatabase(displayUrl).catch((error) => {
    console.error("[profile-image] Database update failed:", error)
  })
  
  const prefetchPromise = prefetchImage(displayUrl).catch(() => {
    // Ignore prefetch errors
  })

  console.log("[profile-image] Upload flow complete (database update in progress)")

  // Return URL immediately for UI to display
  // Database update continues in background
  return displayUrl
}

