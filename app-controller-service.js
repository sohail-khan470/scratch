  // async fetchStaticWallpapers(req, res) {
  //   try {
  //     const freeWallpaperLength = req.query.freeWallpaperLength || 3; // Default to 3 if not provided
  //     const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
  //     const limit = parseInt(req.query.limit) || 20; // Default to 20 wallpapers per page if not provided

  //     // Call the service with pagination parameters
  //     const staticWallpapers = await appService.getStaticWallpaper(
  //       freeWallpaperLength,
  //       page,
  //       limit
  //     );

  //     // Return the response with paginated data
  //     return res.status(200).json({ images: staticWallpapers });
  //   } catch (error) {
  //     // Handle errors and respond with a proper status
  //     return res
  //       .status(500)
  //       .json({ message: error.message || "Internal Server Error" });
  //   }
  // }

/****app service******/



  // async getStaticWallpaper(freeWallpaperLength = 3, page = 1, limit = 20) {
  //   const allWallpapers = await prisma.staticWallpaper.findMany({
  //     where: {
  //       NOT: {
  //         catName: "Artistic",
  //       },
  //     },
  //     select: {
  //       id: true,
  //       catName: true,
  //       imageName: true,
  //       originalName: true,
  //       size: true,
  //       tags: true,
  //       dimension: true,
  //       thumbnail: true,
  //       subscriptionType: true,
  //     },
  //     orderBy: {
  //       id: "desc",
  //     },
  //   });

  //   // Separate free and non-free wallpapers
  //   const freeWallpapers = allWallpapers.filter(
  //     (wallpaper) => wallpaper.subscriptionType === "Free"
  //   );
  //   const nonFreeWallpapers = allWallpapers.filter(
  //     (wallpaper) => wallpaper.subscriptionType !== "Free"
  //   );

  //   // Shuffle function for arrays
  //   const shuffle = (array) => array.sort(() => Math.random() - 0.5);

  //   // Shuffle free wallpapers and take the first `freeWallpaperLength`
  //   const selectedFreeWallpapers = shuffle(freeWallpapers).slice(
  //     0,
  //     freeWallpaperLength
  //   );

  //   // Remaining free wallpapers not included in the first list
  //   const remainingFreeWallpapers = freeWallpapers.filter(
  //     (wallpaper) => !selectedFreeWallpapers.includes(wallpaper)
  //   );

  //   // Combine remaining free wallpapers with non-free wallpapers and shuffle them
  //   const mixedWallpapers = shuffle([
  //     ...remainingFreeWallpapers,
  //     ...nonFreeWallpapers,
  //   ]);

  //   // Final list: Selected free wallpapers first, then mixed wallpapers
  //   const staticWallpapers = [...selectedFreeWallpapers, ...mixedWallpapers];

  //   // Pagination logic
  //   const startIndex = (page - 1) * limit;
  //   const endIndex = page * limit;
  //   const paginatedWallpapers = staticWallpapers.slice(startIndex, endIndex);

  //   // Map the result
  //   const result = paginatedWallpapers.map((wallpaper) => ({
  //     id: wallpaper.id,
  //     cat_name: wallpaper.catName,
  //     image_name: wallpaper.originalName,
  //     hd_url: `${process.env.CDN_URL}/staticwallpaper/hd/${wallpaper.imageName}`,
  //     compress_url: wallpaper.thumbnail
  //       ? `${process.env.CDN_URL}/staticwallpaper/compress/${wallpaper.thumbnail}`
  //       : `${process.env.CDN_URL}/staticwallpaper/hd/${wallpaper.imageName}`,
  //     size: wallpaper.size.toString(),
  //     pro: false,
  //     tags: wallpaper.tags === null ? "" : wallpaper.tags,
  //     capacity: wallpaper.dimension,
  //     type: "STATIC",
  //     subscriptionType: wallpaper.subscriptionType,
  //   }));

  //   return {
  //     total: staticWallpapers.length,
  //     page,
  //     limit,
  //     data: result,
  //   };
  // }