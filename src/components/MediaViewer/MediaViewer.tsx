'use client';

import {  useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Blend, ChevronLeft, ChevronDown, Crop, Info, Pencil, Trash2, Wand2, Image, Ban, PencilRuler, ScissorsSquareDashedBottom, Square, RectangleHorizontal, RectangleVertical, Circle, Router } from 'lucide-react';
import {  CldImageProps,getCldImageUrl } from 'next-cloudinary';
import { CloudinaryResource } from '@/types/cloudinary';
import { useRouter } from 'next/navigation';

import Container from '@/components/Container';
import CldImage from '@/components/CldImage';

import { Button, buttonVariants } from '@/components/ui/button';
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { POST } from '@/app/api/sign-cloudinary-params/route';
import { Close } from '@radix-ui/react-dialog';
import { json } from 'stream/consumers';



interface Deletion {
  state: string;
}

const MediaViewer = ({ resource }: { resource: CloudinaryResource }) => {
  const router = useRouter();
  const sheetFiltersRef = useRef<HTMLDivElement | null>(null);
  const sheetInfoRef = useRef<HTMLDivElement | null>(null);

  // Sheet / Dialog UI state, basically controlling keeping them open or closed

  const [filterSheetIsOpen, setFilterSheetIsOpen] = useState(false);
  const [infoSheetIsOpen, setInfoSheetIsOpen] = useState(false);
  const [deletion, setDeletion] = useState<Deletion>();

  const [version , setVersion] = useState<number>(1)
  const [enhancements, setenhancements] = useState<string>()
  const [crop, setCrop] = useState<string>()
  const [filter, setfilter] = useState<string>()

  type Transformations = Omit<CldImageProps, "src" | "alt">;
  const transformations : Transformations = {};

  if ( enhancements === 'restore'){
    transformations.restore = true;
  }else if (enhancements === 'improve'){
    transformations.improve = true;
  }else if (enhancements === 'remove-background'){
    transformations.removeBackground = true;
  }

  if ( crop === 'square'){
    if(resource.width > resource.height){
      transformations.height = resource.width;
    }else{
      transformations.width = resource.height;
    }
    transformations.crop = {
      source : true,
      type: 'fill'
    }

  }else if(crop === 'landscape'){
    transformations.height = Math.floor(resource.width / (16/9))
    transformations.crop = {
      source : true,
      type: 'fill'
    }
  }else if (crop === 'portrait'){
    transformations.width = Math.floor(resource.height / (16/9))
    transformations.crop = {
      source : true,
      type: 'fill'
    }
  }

  if( typeof filter === 'string' && ['grayscale','sepia'].includes(filter) ){
    transformations[filter as keyof Transformations] = true;
  }else if( typeof filter === 'string' && ['sizzle'].includes(filter) ){
    transformations.art = filter;
  }

   const hasTransformations =  Object.entries(transformations).length > 0
  // Canvas sizing based on the image dimensions. The tricky thing about
  // showing a single image in a space like this in a responsive way is trying
  // to take up as much room as possible without distorting it or upscaling
  // the image. Since we have the resource width and height, we can dynamically
  // determine whether it's landscape, portrait, or square, and change a little
  // CSS to make it appear centered and scalable!

  const canvasHeight = transformations.height || resource.height;
  const canvasWidth = transformations.width || resource.width;

  const isSquare = canvasHeight === canvasWidth;
  const isLandscape = canvasWidth > canvasHeight;
  const isPortrait = canvasHeight > canvasWidth;

  const imgStyles: Record<string, string | number> = {};

  if ( isLandscape ) {
    imgStyles.maxWidth = resource.width;
    imgStyles.width = '100%';
    imgStyles.height = 'auto';
  } else if ( isPortrait || isSquare ) {
    imgStyles.maxHeight = resource.height;
    imgStyles.height = '100vh';
    imgStyles.width = 'auto'
  }

  /**
   * closeMenus
   * @description Closes all panel menus and dialogs
   */

  function closeMenus() {
    setFilterSheetIsOpen(false)
    setInfoSheetIsOpen(false)
    setDeletion(undefined)
  }
  function discardChanges(){
    setfilter(undefined)
    setCrop(undefined)
    setenhancements(undefined)
  }
  /**
   * handleOnDeletionOpenChange
   */

  function handleOnDeletionOpenChange(isOpen: boolean) {
    // Reset deletion dialog if the user is closing it
    if ( !isOpen ) {
      setDeletion(undefined);
    }
  }

    /**
   * handleOnSaveChange
   */

  async function handleOnSave(){
    const url = getCldImageUrl({
      width:resource.width,
      height:resource.height,
      src:resource.public_id,
      format:'default',
      quality:'default',
      ...transformations
    })

    await fetch(url);

    const results = await fetch('/api/upload',{
      method:'POST',
      body: JSON.stringify({
        publicId: resource.public_id,
        url
      })
    })
  
    closeMenus();
    discardChanges();
    setVersion(Date.now())
  }


    /**
   * handleOnSaveCopy
   */

    async function handleOnSaveCopy(){
      const url = getCldImageUrl({
        width:resource.width,
        height:resource.height,
        src:resource.public_id,
        format:'default',
        quality:'default',
        ...transformations
      })
  
      await fetch(url);
  
      const {data} = await fetch('/api/upload',{
        method:'POST',
        body: JSON.stringify({
          url
        })
      }).then(r => r.json())
      router.push(`/resources/${data.asset_id}`)
    }

  // Listen for clicks outside of the panel area and if determined
  // to be outside, close the panel. This is marked by using
  // a data attribute to provide an easy way to reference it on
  // multiple elements

  useEffect(() => {
    document.body.addEventListener('click', handleOnOutsideClick)
    return () => {
      document.body.removeEventListener('click', handleOnOutsideClick)
    }
  }, []);

  function handleOnOutsideClick(event: MouseEvent) {
    const excludedElements = Array.from(document.querySelectorAll('[data-exclude-close-on-click="true"]'));
    const clickedExcludedElement = excludedElements.filter(element => event.composedPath().includes(element)).length > 0;

    if ( !clickedExcludedElement ) {
      closeMenus();
    }
  }

  return (
    <div className="h-screen bg-black px-0">

      {/* Modal for deletion */}

      <Dialog open={!!deletion?.state} onOpenChange={handleOnDeletionOpenChange}>
        <DialogContent data-exclude-close-on-click={true}>
          <DialogHeader>
            <DialogTitle className="text-center">Are you sure you want to delete?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="justify-center sm:justify-center">
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/** Edit panel for transformations and filters */}

      <Sheet modal={false} open={filterSheetIsOpen}>
        <SheetContent
          ref={sheetFiltersRef}
          className="w-full sm:w-3/4 grid grid-rows-[1fr_auto] bg-zinc-800 text-white border-0"
          data-exclude-close-on-click={true}
        >
          <Tabs defaultValue="account">
            <TabsList className="grid grid-cols-3 w-full bg-transparent p-0">
              <TabsTrigger value="enhance">
                <Wand2 />
                <span className="sr-only">Enhance</span>
              </TabsTrigger>
              <TabsTrigger value="crop">
                <Crop />
                <span className="sr-only">Crop & Resize</span>
              </TabsTrigger>
              <TabsTrigger value="filters">
                <Blend />
                <span className="sr-only">Filters</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="enhance">
              <SheetHeader className="my-4">
                <SheetTitle className="text-zinc-400 text-sm font-semibold">Enhancements</SheetTitle>
              </SheetHeader>
              <ul className="grid gap-2">
                <li>
                  <Button 
                  variant="ghost" 
                  className={`text-left justify-start w-full h-14 border-4 bg-zinc-700 ${!enhancements ? 'border-white' : 'border-transparent'}`}
                  onClick={()=>setenhancements('undefined')}
                  >
                    <Ban className="w-5 h-5 mr-3" />
                    <span className="text-[1.01rem]">None</span>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" 
                  className={`text-left justify-start w-full h-14 border-4 bg-zinc-700 ${enhancements ==='improve' ? 'border-white' : 'border-transparent'}`}
                  onClick={()=>setenhancements('improve')}
                  >
                    <Wand2 className="w-5 h-5 mr-3" />
                    <span className="text-[1.01rem]">Improve</span>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" 
                  className={`text-left justify-start w-full h-14 border-4 bg-zinc-700  ${enhancements ==='restore' ? 'border-white' : 'border-transparent'}`}
                  onClick={()=>setenhancements('restore')}>
                    <PencilRuler className="w-5 h-5 mr-3" />
                    <span className="text-[1.01rem]">Restore</span>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" className={`text-left justify-start w-full h-14 border-4 bg-zinc-700  ${enhancements ==='remove-background' ? 'border-white' : 'border-transparent'}`}
                  onClick={()=>setenhancements('remove-background')}>
                    <ScissorsSquareDashedBottom className="w-5 h-5 mr-3" />
                    <span className="text-[1.01rem]">Remove Background</span>
                  </Button>
                </li>
              </ul>
            </TabsContent>
            <TabsContent value="crop">
              <SheetHeader className="my-4">
                <SheetTitle className="text-zinc-400 text-sm font-semibold">Cropping & Resizing</SheetTitle>
              </SheetHeader>
              <ul className="grid gap-2">
                <li>
                  <Button variant="ghost" 
                  className={`text-left justify-start w-full h-14 border-4 bg-zinc-700 ${!crop ? 'border-white' : 'border-transparent'}`}
                  onClick={()=>setCrop(undefined)}>
                    <Circle className="w-5 h-5 mr-3" />
                    <span className="text-[1.01rem]">Original</span>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" 
                  className={`text-left justify-start w-full h-14 border-4 bg-zinc-700 ${crop ==='square' ? 'border-white' : 'border-transparent'}`}
                  onClick={()=>setCrop('square')}>
                    <Square className="w-5 h-5 mr-3" />
                    <span className="text-[1.01rem]">Square</span>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" 
                  className={`text-left justify-start w-full h-14 border-4 bg-zinc-700 ${crop ==='landscape' ? 'border-white' : 'border-transparent'}`}
                  onClick={()=>setCrop('landscape')}>
                  
                    <RectangleHorizontal className="w-5 h-5 mr-3" />
                    <span className="text-[1.01rem]">Landscape</span>
                  </Button>
                </li>
                <li>
                  <Button variant="ghost" 
                  className={`text-left justify-start w-full h-14 border-4 bg-zinc-700 ${crop ==='portrait' ? 'border-white' : 'border-transparent'}`}
                  onClick={()=>setCrop('portrait')}>
                    <RectangleVertical className="w-5 h-5 mr-3" />
                    <span className="text-[1.01rem]">Portrait</span>
                  </Button>
                </li>
              </ul>
            </TabsContent>
            <TabsContent value="filters">
              <SheetHeader className="my-4">
                <SheetTitle className="text-zinc-400 text-sm font-semibold">Filters</SheetTitle>
              </SheetHeader>
              <ul className="grid grid-cols-2 gap-2">
                <li>
                  <button className={`w-full border-4 ${!filter  ? 'border-white' : 'border-transparent'}`}
                  onClick={()=>{setfilter(undefined)}}>
                    <CldImage
                      width={156}
                      height={156}
                      crop="fill"
                      src={resource.public_id}
                      alt="No Filter"
                    />
                  </button>
                </li>
                <li>
                  <button className={`w-full border-4 ${filter === 'sepia'  ? 'border-white' : 'border-transparent'}`}
                   onClick={()=>{setfilter('sepia')}}>
                    <CldImage
                      width={156}
                      height={156}
                      crop="fill"
                      sepia
                      src={resource.public_id}
                      alt="Sepia"
                    />
                  </button>
                </li>
                <li>
                  <button className={`w-full border-4  ${filter === 'sizzle'  ? 'border-white' : 'border-transparent'}`}
                   onClick={()=>{setfilter('sizzle')}}>
                    <CldImage
                      width={156}
                      height={156}
                      crop="fill"
                      art={"sizzle"}
                      src={resource.public_id}
                      alt="Sizzle"
                    />
                  </button>
                </li>
                <li>
                  <button className={`w-full border-4  ${filter === 'grayscale'  ? 'border-white' : 'border-transparent'}`}
                   onClick={()=>{setfilter('grayscale')}}>
                    <CldImage
                      width={156}
                      height={156}
                      crop="fill"
                      grayscale
                      src={resource.public_id}
                      alt="GrayScale"
                    />
                  </button>
                </li>
              </ul>
            </TabsContent>
          </Tabs>
          <SheetFooter className="gap-2 sm:flex-col">
            {hasTransformations && (
            <div className="grid grid-cols-[1fr_4rem] gap-2">
              <Button
                variant="ghost"
                className="w-full h-14 text-left justify-center items-center bg-blue-500"
                onClick={handleOnSave}
              >
                <span className="text-[1.01rem]">
                  Save
                </span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-14 text-left justify-center items-center bg-blue-500"
                  >
                    <span className="sr-only">More Options</span>
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" data-exclude-close-on-click={true}>
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleOnSaveCopy}>
                      <span>Save as Copy</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            )}
            <Button
              variant="outline"
              className={`w-full h-14 text-left justify-center items-center ${hasTransformations ? 'bg-red-500':'bg-transparent'} border-zinc-600`}
              onClick={() => {closeMenus();discardChanges();}}
            >
              <span className="text-[1.01rem]">
                {hasTransformations ? 'Cancel' : 'Close'}
              </span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/** Info panel for asset metadata */}

      <Sheet modal={false} open={infoSheetIsOpen}>
        <SheetContent
          ref={sheetInfoRef}
          className="w-full sm:w-3/4 grid grid-rows-[auto_1fr_auto] bg-zinc-800 text-white border-0"
          data-exclude-close-on-click={true}
        >
          <SheetHeader className="my-4">
            <SheetTitle className="text-zinc-200 font-semibold">Info</SheetTitle>
          </SheetHeader>
          <div>
            <ul>
              <li className="mb-3">
                <strong className="block text-xs font-normal text-zinc-400 mb-1">ID</strong>
                <span className="flex gap-4 items-center text-zinc-100">
                  { resource.public_id }
                </span>
              </li>
            </ul>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              className="w-full h-14 text-left justify-center items-center bg-transparent border-zinc-600"
              onClick={() => closeMenus()}
            >
              <span className="text-[1.01rem]">Close</span>
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/** Asset management navbar */}

      <Container className="fixed z-10 top-0 left-0 w-full h-16 flex items-center justify-between gap-4 bg-gradient-to-b from-black">
        <div className="flex items-center gap-4">
          <ul>
            <li>
              <Link href="/" className={`${buttonVariants({ variant: "ghost" })} text-white`}>
                <ChevronLeft className="h-6 w-6" />
                Back
              </Link>
            </li>
          </ul>
        </div>
        <ul className="flex items-center gap-4">
          <li>
            <Button variant="ghost" className="text-white" onClick={() => setFilterSheetIsOpen(true)}>
              <Pencil className="h-6 w-6" />
              <span className="sr-only">Edit</span>
            </Button>
          </li>
          <li>
            <Button variant="ghost" className="text-white" onClick={() => setInfoSheetIsOpen(true)}>
              <Info className="h-6 w-6" />
              <span className="sr-only">Info</span>
            </Button>
          </li>
          <li>
            <Button variant="ghost" className="text-white" onClick={() => setDeletion({ state: 'confirm' })}>
              <Trash2 className="h-6 w-6" />
              <span className="sr-only">Delete</span>
            </Button>
          </li>
        </ul>
      </Container>

      {/** Asset viewer */}

      <div className="relative flex justify-center items-center align-center w-full h-full">
        <CldImage
          key= {`${JSON.stringify(transformations)}- ${version}`}
          className="object-contain"
          width={resource.width}
          height={resource.height}
          src={resource.public_id}
          alt={`Image ${resource.public_id}`}
          style={imgStyles}
          version={version}
          {...transformations}
        />
      </div>
    </div>
  )
};

export default MediaViewer;