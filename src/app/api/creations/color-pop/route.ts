import { v2 as cloudinary } from "cloudinary";
import { getCldImageUrl } from "next-cloudinary";
 
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


export async function POST(request : Request){
    const {publicId} = await request.json();

    const backgroundRemovedUrl = getCldImageUrl({
      src: publicId,
      removeBackground: true,
      format:'png',
      quality: 'default',
      version: Date.now()
    })


    // const uploadOptions: Record<string , string | boolean | Array<string>> = {};

    // if (typeof publicId === 'string'){
    //   uploadOptions.public_id = publicId;
    //   uploadOptions.invalidate = true;
    // }else{
    //   uploadOptions.tags = [String(process.env.NEXT_PUBLIC_CLOUDINARY_LIBRARY_TAG)]
    // }
    // const results = await cloudinary.uploader.upload(url,uploadOptions);

  return ({
    url: backgroundRemovedUrl
  });
}