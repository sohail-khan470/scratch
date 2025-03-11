const fs = require('fs');
const Jimp = require('jimp');
const pixelmatch = require('pixelmatch');

async function compareImages(imgPath1, imgPath2) {
    try {
        // Load images
        const img1 = await Jimp.read(imgPath1);
        const img2 = await Jimp.read(imgPath2);

        // Ensure same dimensions
        if (img1.bitmap.width !== img2.bitmap.width || img1.bitmap.height !== img2.bitmap.height) {
            console.error("Images does not have the same dimensions!");
            return false;
        }else{
            return true;
        }

        console.log(`Difference: ${numDiffPixels} pixels`);
    } catch (error) {
        console.error("Error comparing images:", error);
    }
}

// Usage
compareImages("image1.png", "image2.png");
