import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload Base64 string to Cloudinary
 * @param base64String The image string (data:image/...)
 * @param folder Folder name in cloudinary
 * @returns Secure URL of the uploaded image
 */
export const uploadImage = async (base64String: string, folder: string = 'buildmate_logos'): Promise<string> => {
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder: folder,
            resource_type: 'auto'
        });
        return result.secure_url;
    } catch (error: any) {
        console.error('Cloudinary Upload Error:', error);
        throw new Error('Failed to upload image to Cloudinary');
    }
};

/**
 * Delete image from Cloudinary using its URL
 * @param url The full cloudinary URL
 */
export const deleteImageFromCloudinary = async (url: string): Promise<void> => {
    if (!url || !url.includes('cloudinary.com')) return;
    
    try {
        // Extract public_id from URL
        // Example: https://res.cloudinary.com/cloudname/image/upload/v162.../folder/image.png
        // We need: folder/image
        const parts = url.split('/');
        const uploadIndex = parts.indexOf('upload');
        if (uploadIndex === -1) return;

        // Skip the version part (starts with 'v') if it exists
        const publicIdWithExt = parts.slice(uploadIndex + 1).filter(p => !p.startsWith('v')).join('/');
        const publicId = publicIdWithExt.split('.')[0];

        await cloudinary.uploader.destroy(publicId);
        console.log('Deleted from Cloudinary:', publicId);
    } catch (error) {
        console.error('Cloudinary Delete Error:', error);
    }
};

export default cloudinary;
