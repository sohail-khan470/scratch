//elite wallpaper update


async update(req, res) {
    console.log("update eliete started");
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

      /*******image compression start********/
      // if (localThumbnailPath) {
      //   sameImageDimension = await compareImages(
      //     localFilePath,
      //     localThumbnailPath
      //   );
      // }
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
        //delete old compressed image if exist
        fs.unlinkSync(localThumbnailPath);

        fs.writeFileSync(localThumbnailPath, compressedImage);

        /**modify image on digital ocaean */
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
        //compress file and save it to local compressed folder
        const imgBuffer = await fs.promises.readFile(localFilePath);

        // const localThumbnailFile = fs.readFileSync(localThumbnailPath);
        let localThumbnailFile;
        try {
          localThumbnailFile = fs.readFileSync(localThumbnailPath);
        } catch (error) {
          console.log(error);
        }
        //check if thmbnail file already exist in local compressed folder if so then delete it
        if (localThumbnailFile) {
          fs.unlinkSync(localThumbnailPath);
        }
        const compressedImage = await sharp(imgBuffer)
          .resize(831, 1800)
          .toBuffer();
        fs.writeFileSync(localThumbnailPath, compressedImage);

        /*

        // check if image exist on digital ocean with same name if so then delete it
        const res = await this.s3Service.findImageObject(
          existingWallpaper.thumbnail
        );
        if (res) {
          await this.s3Service.deleteImage(
            "elitecat/compress/" + existingWallpaper.imagename
          );
        }
         */

        await this.s3Service.uploadImageBuffer(
          compressedImage,
          "elitecat/compress/" + existingWallpaper.imagename,
          localThumbnailPath
        );

        await EliteWallpaperService.updateWallpaper(existingWallpaper.id, {
          thumbnail: existingWallpaper.imagename,
        });
      }

      /***image compression end********/

      if (
        req.files &&
        req.files.eliteWallpaperImage &&
        req.files.eliteWallpaperImage[0]
      ) {
        const imageFile = req.files.eliteWallpaperImage[0];

        if (imageFile && imageFile.path) {
          // Remove old HD image if it exists
          // if (fs.existsSync(localFilePath)) {
          //   fs.unlinkSync(localFilePath); // Delete old HD image
          // }

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

      // Check if a new thumbnail is uploaded
      if (
        req.files &&
        req.files.eliteWallpaperThumbnail &&
        req.files.eliteWallpaperThumbnail[0]
      ) {
        const thumbnailFile = req.files.eliteWallpaperThumbnail[0];

        if (thumbnailFile && thumbnailFile.path) {
          // Remove old thumbnail if it exists
          // if (localThumbnailPath && fs.existsSync(localThumbnailPath)) {
          //   fs.unlinkSync(localThumbnailPath); // Delete old thumbnail
          // }

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

          // // Resize or process thumbnail if needed
          // await sharp(thumbnailPath)
          //     .resize(200, 200) // Example thumbnail size
          //     .toFile(thumbnailPath);

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
      ////////////////////////////////////////////////////////////////////////////////
      const { subscriptionType } = req.body;
      console.log("@req.body", req.body);
      await EliteWallpaperService.updateWallpaper(Number(id), {
        subscriptionType: subscriptionType,
      });
      ////////////////////////////////////////////////////////////////////////////////

      const updatedWallpaper = await EliteWallpaperService.getWallpaperById(
        Number(id)
      );

      return res.status(200).json({
        ...updatedWallpaper,
        imagename: "/eliteWallpapers/hd/" + updatedWallpaper.imagename,
        thumbnail: "/eliteWallpapers/compress/" + updatedWallpaper.thumbnail,
      });
    } catch (error) {
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