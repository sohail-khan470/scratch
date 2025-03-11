const fs = require('fs');
const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');

async function compareImages(imgPath1, imgPath2, diffPath) {
    try {
        // Load images
        const img1 = await Jimp.read(imgPath1);
        const img2 = await Jimp.read(imgPath2);

        // Ensure same dimensions
        if (img1.bitmap.width !== img2.bitmap.width || img1.bitmap.height !== img2.bitmap.height) {
            console.error("Images must have the same dimensions!");
            return;
        }

        const { width, height } = img1.bitmap;

        // Create a diff image
        const diff = new Jimp(width, height);

        // Compare images
        const numDiffPixels = pixelmatch(
            img1.bitmap.data, img2.bitmap.data,
            diff.bitmap.data, width, height,
            { threshold: 0.1 }
        );

        // Save diff image
        await diff.writeAsync(diffPath);
        console.log(`Difference: ${numDiffPixels} pixels`);
    } catch (error) {
        console.error("Error comparing images:", error);
    }
}

// Usage
compareImages("image1.png", "image2.png", "diff.png");
