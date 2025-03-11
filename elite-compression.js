
//elite compression modified new version

async update(req, res) {
    console.log("update elite started");
    const { id } = req.params;
    let imagePath, thumbnailPath;

    try {
        const existingWallpaper = await EliteWallpaperService.getWallpaperById(
            Number(id)
        );
        if (!existingWallpaper) {
            return res.status(404).json({ error: "Wallpaper not found" });
        }

        const hdPath = path.join(
            __dirname,
            "..",
            "uploads",
            "eliteWallpapers",
            "hd"
        );
        const compressPath = path.join(
            __dirname,
            "..",
            "uploads",
            "eliteWallpapers",
            "compress"
        );

        // Ensure the folders exist (create if they don't)
        if (!fs.existsSync(hdPath)) {
            fs.mkdirSync(hdPath, { recursive: true });
        }
        if (!fs.existsSync(compressPath)) {
            fs.mkdirSync(compressPath, { recursive: true });
        }

        const localFilePath = path.join(hdPath, existingWallpaper.imagename);
        const localThumbnailPath = existingWallpaper.thumbnail
            ? path.join(compressPath, existingWallpaper.thumbnail)
            : null;
        let sameImageDimension;

        /******* Image Compression Logic (Skip if category is "cinematic") *******/
        if (existingWallpaper.catname !== "cinematic") {
            console.log("Performing image compression (category is not cinematic).");

            if (!existingWallpaper.thumbnail) {
                await EliteWallpaperService.updateWallpaper(Number(id), {
                    thumbnail: existingWallpaper.imagename,
                });

                fs.writeFileSync(thumbnailPath, hdPath);
            }

            if (localThumbnailPath) {
                compareImages(localFilePath, localThumbnailPath)
                    .then((result) => {
                        sameImageDimension = result;
                    })
                    .catch((err) => console.log(err));
            }

            if (localThumbnailPath && sameImageDimension) {
                const imgBuffer = await fs.promises.readFile(localFilePath);
                const compressedImage = await sharp(imgBuffer)
                    .resize(831, 1800)
                    .toBuffer();

                // Delete old compressed image if it exists
                fs.unlinkSync(localThumbnailPath);

                // Save the new compressed image locally
                fs.writeFileSync(localThumbnailPath, compressedImage);

                // Upload the compressed image to Digital Ocean
                const res = await this.s3Service.findImageObject(
                    existingWallpaper.thumbnail
                );
                if (!res) {
                    await this.s3Service.uploadImageBuffer(
                        compressedImage,
                        "elitecat/compress/" + existingWallpaper.imagename,
                        localThumbnailPath
                    );
                }

                await EliteWallpaperService.updateWallpaper(existingWallpaper.id, {
                    thumbnail: existingWallpaper.imagename,
                });
            } else {
                // Compress file and save it to the local compressed folder
                const imgBuffer = await fs.promises.readFile(localFilePath);

                let localThumbnailFile;
                try {
                    localThumbnailFile = fs.readFileSync(localThumbnailPath);
                } catch (error) {
                    console.log(error);
                }

                // Check if the thumbnail file already exists in the local compressed folder; if so, delete it
                if (localThumbnailFile) {
                    fs.unlinkSync(localThumbnailPath);
                }

                const compressedImage = await sharp(imgBuffer)
                    .resize(831, 1800)
                    .toBuffer();
                fs.writeFileSync(localThumbnailPath, compressedImage);

                // Upload the compressed image to Digital Ocean
                await this.s3Service.uploadImageBuffer(
                    compressedImage,
                    "elitecat/compress/" + existingWallpaper.imagename,
                    localThumbnailPath
                );

                await EliteWallpaperService.updateWallpaper(existingWallpaper.id, {
                    thumbnail: existingWallpaper.imagename,
                });
            }
        } else {
            console.log("Skipping image compression (category is cinematic).");
        }
        /*** Image Compression End ***/

        // Handle new image upload (HD)
        if (
            req.files &&
            req.files.eliteWallpaperImage &&
            req.files.eliteWallpaperImage[0]
        ) {
            const imageFile = req.files.eliteWallpaperImage[0];

            if (imageFile && imageFile.path) {
                await this.s3Service.deleteImage(
                    "elitecat/hd/" + existingWallpaper.imagename
                );

                const imageName = imageFile.filename; // Use only the filename
                imagePath = path.join(hdPath, imageName); // Save new image in HD folder

                await this.s3Service.uploadImage(
                    imagePath,
                    "elitecat/hd/" + imageName
                );

                // Move the uploaded image to the HD folder
                fs.renameSync(imageFile.path, imagePath);

                // Get image dimensions using sharp
                const { width, height } = await sharp(imagePath).metadata();
                const fileInKb = Math.round(imageFile.size / 1024);

                // Update database with new image info
                await EliteWallpaperService.updateWallpaper(Number(id), {
                    imagename: imageName, // Only the filename
                    new_name: imageFile.originalname,
                    size: fileInKb,
                    dimension: `${width}x${height}`,
                });
            } else {
                throw new Error(
                    "Image file is missing a path or is not properly uploaded."
                );
            }
        }

        // Handle new thumbnail upload
        if (
            req.files &&
            req.files.eliteWallpaperThumbnail &&
            req.files.eliteWallpaperThumbnail[0]
        ) {
            const thumbnailFile = req.files.eliteWallpaperThumbnail[0];

            if (thumbnailFile && thumbnailFile.path) {
                await this.s3Service.deleteImage(
                    "elitecat/compress/" + existingWallpaper.thumbnail
                );

                const thumbnailName = thumbnailFile.filename; // Use only the filename
                thumbnailPath = path.join(compressPath, thumbnailName); // Save new thumbnail in compress folder

                await this.s3Service.uploadImage(
                    thumbnailPath,
                    "elitecat/compress/" + thumbnailName
                );

                // Move the uploaded thumbnail to the compress folder
                fs.renameSync(thumbnailFile.path, thumbnailPath);

                // Update database with new thumbnail info
                await EliteWallpaperService.updateWallpaper(Number(id), {
                    thumbnail: thumbnailName, // Only the filename
                });
            } else {
                throw new Error(
                    "Thumbnail file is missing a path or is not properly uploaded."
                );
            }
        }

        // Update subscription type
        const { subscriptionType } = req.body;
        console.log("@req.body", req.body);
        await EliteWallpaperService.updateWallpaper(Number(id), {
            subscriptionType: subscriptionType,
        });

        // Fetch the updated wallpaper
        const updatedWallpaper = await EliteWallpaperService.getWallpaperById(
            Number(id)
        );

        return res.status(200).json({
            ...updatedWallpaper,
            imagename: "/eliteWallpapers/hd/" + updatedWallpaper.imagename,
            thumbnail: "/eliteWallpapers/compress/" + updatedWallpaper.thumbnail,
        });
    } catch (error) {
        // Clean up uploaded files in case of an error
        if (imagePath) {
            fs.unlink(imagePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error("Failed to delete uploaded file:", unlinkErr.message);
                }
            });
        }
        if (thumbnailPath) {
            fs.unlink(thumbnailPath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error(
                        "Failed to delete uploaded thumbnail:",
                        unlinkErr.message
                    );
                }
            });
        }
        res.status(400).json({ error: error.message });
    }
}