const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

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

    // Get image dimensions using sharp
    const { width, height } = await sharp(imagePath).metadata();
    const fileInKb = Math.round(imageFile.size / 1024);

    // Compress the HD image
    const compressedImageBuffer = await sharp(imagePath)
      .resize(831, 1800) // Resize to desired dimensions
      .jpeg({ quality: 80 }) // Adjust quality for compression
      .toBuffer();

    // Save the compressed image to a temporary file
    const compressedImagePath = path.join(
      path.dirname(imagePath),
      `compressed_${imageName}`
    );
    await fs.promises.writeFile(compressedImagePath, compressedImageBuffer);

    // Upload the original HD image to S3
    await this.s3Service.uploadImage(imagePath, "elitecat/hd/" + imageName);

    // Upload the compressed HD image to S3
    const compressedImageName = `compressed_${imageName}`;
    await this.s3Service.uploadImage(
      compressedImagePath,
      "elitecat/compress/" + compressedImageName
    );

    // Compress the thumbnail (if needed)
    const compressedThumbnailBuffer = await sharp(thumbnailPath)
      .resize(200, 200) // Resize thumbnail to desired dimensions
      .jpeg({ quality: 80 }) // Adjust quality for compression
      .toBuffer();

    //save images to temporary directory
    const compressedThumbnailPath = path.join(
      path.dirname(thumbnailPath),
      `compressed_${thumbnailName}`
    );
    await fs.promises.writeFile(compressedThumbnailPath, compressedThumbnailBuffer);

    // Upload the original thumbnail to S3
    await this.s3Service.uploadImage(
      thumbnailPath,
      "elitecat/compress/" + thumbnailName
    );

    // Upload the compressed thumbnail to S3
    const compressedThumbnailName = `compressed_${thumbnailName}`;
    await this.s3Service.uploadImage(
      compressedThumbnailPath,
      "elitecat/compress/" + compressedThumbnailName
    );

    // Save wallpaper data to the database
    const wallpaper = await EliteWallpaperService.createWallpaper({
      catname: catName,
      imagename: imageName,
      new_name: originalName,
      size: fileInKb,
      dimension: `${width}x${height}`,
      tags,
      status: "inactive",
      thumbnail: compressedThumbnailName, // Use compressed thumbnail name
      subscriptionType,
    });

    // Respond with the created wallpaper data
    res.status(201).json({
      ...wallpaper,
      imagename: "/eliteWallpapers/hd/" + wallpaper.imagename,
      thumbnail: "/eliteWallpapers/compress/" + wallpaper.thumbnail,
    });

    // Clean up temporary files
    fs.unlink(compressedImagePath, (unlinkErr) => {
      if (unlinkErr) {
        console.error("Failed to delete compressed HD image:", unlinkErr.message);
      }
    });
    fs.unlink(compressedThumbnailPath, (unlinkErr) => {
      if (unlinkErr) {
        console.error("Failed to delete compressed thumbnail:", unlinkErr.message);
      }
    });
  } catch (error) {
    console.log("############error############", error);

    // Delete uploaded files in case of error
    if (imageFile) {
      fs.unlink(imageFile.path, (unlinkErr) => {
        if (unlinkErr) {
          console.error(
            "Failed to delete uploaded wallpaper:",
            unlinkErr.message
          );
        }
      });
    }
    if (thumbnailFile) {
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