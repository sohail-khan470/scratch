 async uploadWallpaper(req, res) {
    console.log("@uploadWallpaper artistic was being called");
    let hdImagePath;
    let thumbnailImagePath;

    // Check for both files
    if (
      !req.files ||
      !req.files.staticWallpaper ||
      !req.files.staticWallpaperThumbnail
    ) {
      return res
        .status(400)
        .json({ error: "Please upload both HD and thumbnail images!" });
    }

    try {
      const { tags } = req.body;

      const hdFile = req.files.staticWallpaper[0];
      const hdImageName = hdFile.filename;
      hdImagePath = hdFile.path;
      const { width: hdWidth, height: hdHeight } = await sharp(
        hdImagePath
      ).metadata();

      await this.s3Service.uploadImage(
        hdImagePath,
        "staticwallpaper/hd/" + hdImageName
      );

      /*** image compression start ***/
      /*
      const compressedImage = await sharp(hdImagePath)
        .resize(831, 1800)
        .toBuffer();

      //delete old thumbnail if exists
      const oldThumbnailPath = path.join(
        __dirname,
        "..",
        "uploads",
        "eliteWallpapers",
        "compress",
        thumbnailImageName
      );
      if (fs.existsSync(oldThumbnailPath)) {
        fs.unlinkSync(oldThumbnailPath);
      }

      const localThumbnailPath = `uploads/staticWallpapers/compress/${hdImageName}`;
      fs.promises.writeFile(localThumbnailPath, compressedImage);
        */
      /*** image compression end ***/

      const thumbnailFile = req.files.staticWallpaperThumbnail[0];
      const thumbnailImageName = thumbnailFile.filename;
      thumbnailImagePath = thumbnailFile.path;

      await this.s3Service.uploadImage(
        thumbnailImagePath,
        "staticwallpaper/compress/" + thumbnailImageName
      );

      const size = Math.round(hdFile.size / 1024);
      const wallpaper = await StaticWallpaperService.createWallpaper({
        catName: "Artistic",
        imageName: hdImageName,
        originalName: hdFile.originalname,
        size,
        dimension: `${hdWidth}x${hdHeight}`,
        tags,
        thumbnail: thumbnailImageName,
      });

      res.status(201).json({
        ...wallpaper,
        imageName: "/staticWallpapers/hd/" + wallpaper.imageName,
        thumbnail: "/staticWallpapers/compress/" + wallpaper.thumbnail,
      });
    } catch (error) {
      console
        .log(error)

        [(hdImagePath, thumbnailImagePath)].forEach((path) => {
          if (path) {
            fs.unlink(path, (unlinkErr) => {
              if (unlinkErr)
                console.error("Failed to delete file:", unlinkErr.message);
            });
          }
        });
      res.status(400).json({ error: error.message });
    }
  }
