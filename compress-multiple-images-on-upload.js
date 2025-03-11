const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async uploadMultipleWallpapers(req, res) {
  if (!req.files || req.files.length === 0) {
    return res
      .status(400)
      .json({ error: "Please upload at least one wallpaper!" });
  }

  try {
    const { catName, tags } = req.body;
    const wallpaperData = [];

    // Process each file
    for (const file of req.files) {
      const imageName = file.filename;
      const imagePath = file.path;
      const originalName = file.originalname;

      const fileInKb = Math.round(file.size / 1024);

      // Get image dimensions using sharp
      const { width, height } = await sharp(imagePath).metadata();

      // Compress the image
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

      // Upload the original image to S3
      await this.s3Service.uploadImage(imagePath, "elitecat/hd/" + imageName);

      // Upload the compressed image to S3
      const compressedImageName = `compressed_${imageName}`;
      await this.s3Service.uploadImage(
        compressedImagePath,
        "elitecat/compress/" + compressedImageName
      );

      // Prepare wallpaper data for database
      wallpaperData.push({
        catname: catName,
        imagename: imageName,
        new_name: originalName,
        size: fileInKb,
        dimension: `${width}x${height}`,
        tags,
        status: "inactive",
        thumbnail: compressedImageName, // Save the compressed image name for thumbnail
      });

      // Clean up temporary compressed file
      fs.unlink(compressedImagePath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Failed to delete compressed file:", unlinkErr.message);
        }
      });
    }

    // Save all wallpapers to the database
    const wallpapers = await EliteWallpaperService.createMultipleWallpapers(
      wallpaperData
    );

    // Format the response with S3 URLs
    const filteredWallpaper = wallpapers.map((item) => ({
      ...item,
      imagename: "/eliteWallpapers/hd/" + item.imagename,
      thumbnail: "/eliteWallpapers/compress/" + item.thumbnail,
    }));

    res.status(201).json(filteredWallpaper); // Return the created wallpaper records
  } catch (error) {
    console.log("############error############", error);

    // Handle cleanup of uploaded files if needed
    req.files.forEach((file) =>
      fs.unlink(file.path, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Failed to delete uploaded file:", unlinkErr.message);
        }
      })
    );

    res.status(400).json({ error: error.message });
  }
}