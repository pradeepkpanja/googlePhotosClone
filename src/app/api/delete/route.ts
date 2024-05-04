import { v2 as cloudinary } from "cloudinary";
 
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const { url, publicId } = await request.json();

  const uploadOptions: Record<string, string | boolean | Array<string>> = {};

  if (typeof publicId === 'string') {
      uploadOptions.public_id = publicId;
      uploadOptions.invalidate = true;
  } else {
      uploadOptions.tags = [String(process.env.NEXT_PUBLIC_CLOUDINARY_LIBRARY_TAG)];
  }

  const results = await cloudinary.uploader.upload(url, uploadOptions);

  const response = new Response(JSON.stringify({ data: results }), {
      headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, max-age=0', // Add cache-control headers
      },
  });

  return response;
}
