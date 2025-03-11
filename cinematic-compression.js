async update(req, res) {
    console.log("@static wall update");

    const { id } = req.params;
    let imagePath; // Declare imagePath here to have a proper scope
    let tempFilepath;
    let tempThumbnailPath;

    try {
        const existingWallpaper = await StaticWallpaperService.getWallpaperById(
            Number(id)
        );

        if (!existingWallpaper) {
            return res.status(404).json({ error: "Wallpaper not found" });
        }

        tempThumbnailPath = `uploads/staticWallpapers/compress/${existingWallpaper.imageName}`;
        let imageName = existingWallpaper.imageName;
        tempFilepath = `uploads/staticWallpapers/hd/${existingWallpaper.imageName}`;

        // Skip the image compression if category of existing wallpaper is not cinematic
        if (existingWallpaper.category !== "cinematic") {
            try {
                // Check if temp file path exist or not
                if (tempFilepath) {
                    const imgBuffer = await fs.promises.readFile(tempFilepath);
                    console.log("image buffer", imgBuffer);
                    const compressedImage = await sharp(imgBuffer)
                        .resize(831, 1800)
                        .toBuffer();
                    fs.writeFileSync(
                        `uploads/staticWallpapers/compress/${existingWallpaper.imageName}`,
                        compressedImage
                    );

                    await this.s3Service.uploadImageBuffer(
                        compressedImage,
                        "staticwallpaper/compress/" + existingWallpaper.imageName,
                        tempFilepath
                    );
                }
            } catch (error) {
                console.log(error);
            }
            
            if (existingWallpaper.thumbnail !== null) {
                console.log("INSIDE thumbnail");

                try {
                    // Read the dimensions of image using sharp from local storage
                    const dimensions = await sharp(
                        `uploads/staticWallpapers/compress/${existingWallpaper.thumbnail}`
                    ).metadata();
                    if (dimensions.width !== 831 || dimensions.height !== 1800) {
                        try {
                            if (fs.existsSync(tempThumbnailPath)) {
                                console.log("Image exists in storage. Deleting...");
                                fs.unlinkSync(tempThumbnailPath);
                            }
                        } catch (error) {
                            console.log("Error deleting temp file:", error);
                        }

                        //Read image buffer from local path
                        const imgBuffer = await fs.promises.readFile(
                            `uploads/staticWallpapers/hd/${existingWallpaper.imageName}`
                        );

                        // Resize the image
                        const compressedImage = await sharp(imgBuffer)
                            .resize(831, 1800)
                            .toBuffer();

                        // Verify the dimensions of the resized image
                        const resizedDimensions = await sharp(compressedImage).metadata();
                        console.log("Resized Image Dimensions:", resizedDimensions);

                        const compressedImagePath = `uploads/staticWallpapers/compress/${existingWallpaper.imageName}`;

                        // Check if the compressed image already exists
                        if (fs.existsSync(compressedImagePath)) {
                            console.log("Compressed image already exists. Overwriting...");
                        }

                        // Save the compressed image locally
                        await fs.promises.writeFile(compressedImagePath, compressedImage);

                        // Upload the compressed image to Digital Ocean Spaces
                        console.log("Uploading image buffer to Digital Ocean Spaces...");
                        await this.s3Service.uploadImageBuffer(
                            compressedImage,
                            `staticwallpaper/compress/${existingWallpaper.imageName}`,
                            compressedImagePath
                        );

                        console.log("Image uploaded successfully.");
                    }
                } catch (error) {
                    console.log("Error processing image:", error);
                }
            }

            if (existingWallpaper.thumbnail === null) {
                await StaticWallpaperService.updateWallpaper(Number(id), {
                    thumbnail: imageName,
                });
            }
        } else {
            console.log("Skipping compression for cinematic category.");
        }

        // Delete old image from Bunny CDN (commented out for now)
        // await bunnyStorage.delete(`/test/${existingWallpaper.imageName}`);

        // Process new file (if a new file is uploaded)
        if (req.file) {
            await Promise.all([
                this.s3Service.deleteImage(
                    "staticwallpaper/hd/" + existingWallpaper.imageName
                ),
            ]);

            const imageName = req.file.filename;
            imagePath = req.file.path;

            // Get image dimensions using sharp
            const { width, height } = await sharp(imagePath).metadata();


            /* upload image to hd image path in hd image folder */
            
            await this.s3Service.uploadImage(
                imagePath,
                "staticwallpaper/hd/" + imageName
            );

            // Upload new image to Bunny CDN (commented out for now)
            // await bunnyStorage.upload(imagePath, `/test/${imageName}`);

            const fileInKb = Math.round(req.file.size / 1024);

            // Update database record
            const updatedWallpaper = await StaticWallpaperService.updateWallpaper(
                Number(id),
                {
                    imageName,
                    originalName: req.file.originalname,
                    size: fileInKb,
                    dimension: `${width}x${height}`,
                }
            );

            return res.status(200).json({
                ...updatedWallpaper,
                imageName: "/staticWallpapers/" + updatedWallpaper.imageName,
            });
        }

        // If no new file is uploaded, just update other fields
        console.log("@reqbody in static update", req.body);
        const { subscriptionType } = req.body;
        const updatedWallpaper = await StaticWallpaperService.updateWallpaper(
            Number(id),
            { subscriptionType }
        );
        res.status(200).json(updatedWallpaper);
    } catch (error) {
        console.log(error);
        if (imagePath) {
            // Only try to delete the uploaded image if imagePath is defined
            fs.unlink(imagePath, (unlinkErr) => {
                if (unlinkErr) {
                    console.error("Failed to delete uploaded file:", unlinkErr.message);
                }
            });
        }
        res.status(400).json({ error: error.message });
    }
}