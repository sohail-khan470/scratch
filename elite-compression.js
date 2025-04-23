async uploadWallpaper(req, res) {
    let imageFile, thumbnailFile;
    // Check if the files are provided
    if (
      !req.files ||
      !req.files.eliteWallpaperImage ||
      !req.files.eliteWallpaperThumbnail
    ) {
      return res
        .status(400)
        .json({ error: "Please upload both wallpaper and thumbnail!" });
    }

    try {
      const { catName, tags, subscriptionType } = req.body;
      imageFile = req.files.eliteWallpaperImage[0]; // Get HD image file
      thumbnailFile = req.files.eliteWallpaperThumbnail[0]; // Get thumbnail file

      const imageName = imageFile.filename;
      const thumbnailName = thumbnailFile.filename;
      const imagePath = imageFile.path;
      const thumbnailPath = thumbnailFile.path;
      const originalName = imageFile.originalname;

      const { width, height } = await sharp(imagePath).metadata();
      const fileInKb = Math.round(imageFile.size / 1024);
      console.log(thumbnailName);

      // await sharp(thumbnailPath)
      //   .resize(200, 200) // Resize thumbnail as needed
      //   .toFile(thumbnailPath); // Save resized thumbnail

      /**on upload compression */

      // await this.s3Service.uploadImageBuffer(
      //   compressedImage,
      //   "elitecat/compress/" + existingWallpaper.imagename,
      //   localThumbnailPath
      // );

      const compressedImage = await sharp(imagePath)
        .resize(831, 1800)
        .toBuffer();

      //delete old thumbnail if exists
      const oldThumbnailPath = path.join(
        __dirname,
        "..",
        "uploads",
        "eliteWallpapers",
        "compress",
        thumbnailName
      );
      if (fs.existsSync(oldThumbnailPath)) {
        fs.unlinkSync(oldThumbnailPath);
      }

      const localThumbnailPath = `uploads/eliteWallpapers/compress/${imageName}`;
      fs.promises.writeFile(localThumbnailPath, compressedImage);
      // await this.s3Service.uploadImageBuffer(
      //   compressedImage,
      //   "staticwallpaper/compress/" + imageName,
      //   localThumbnailPath
      // );

      await this.s3Service.uploadImage(imagePath, "elitecat/hd/" + imageName);

      //upload image buffer after it is compressed
      await this.s3Service.uploadImageBuffer(
        compressedImage,
        "elitecat/compress/" + imageName,
        localThumbnailPath
      );

      const wallpaper = await EliteWallpaperService.createWallpaper({
        catname: catName,
        imagename: imageName,
        new_name: originalName,
        size: fileInKb,
        dimension: `${width}x${height}`,
        tags,
        status: "inactive",
        thumbnail: imageName,
        subscriptionType,
      });

      res.status(201).json({
        ...wallpaper,
        imagename: "/eliteWallpapers/hd/" + wallpaper.imagename,
        thumbnail: "/eliteWallpapers/compress/" + wallpaper.thumbnail,
      });
    } catch (error) {
      // Delete uploaded files in case of error
      if (req.files.eliteWallpaperImage) {
        fs.unlink(imageFile.path, (unlinkErr) => {
          if (unlinkErr) {
            console.error(
              "Failed to delete uploaded wallpaper:",
              unlinkErr.message
            );
          }
        });
      }
      if (req.files.eliteWallpaperThumbnail) {
        fs.unlink(thumbnailFile.path, (unlinkErr) => {
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
