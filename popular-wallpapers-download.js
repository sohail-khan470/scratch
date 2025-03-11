//returns popular wallpapers based on type

async getPopularWallpapers() {
        const popularWallpapers = await prisma.staticWallpaper.findMany({
        where: {
            NOT: {
                catName: "Artistic",
            },
        },
        select: {
            id: true,
            catName: true,  
            imageName: true,
            originalName: true,
            size: true,
            tags: true,
            dimension: true,
            thumbnail: true,
            subscriptionType: true, // Include subscriptionType in response
        },
        orderBy: {
            downloads: "desc",
        },
        take: 10,
        });
    return popularWallpapers;       
    }