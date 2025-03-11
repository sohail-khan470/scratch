model StaticCategory {
  id             Int      @id @default(autoincrement())
  catName        String
  imageName      String
  dimension      String? 
  size           Int? 
  originalName   String? 
  views          Int?     @default(0)
  wallpaperCount Int?     @default(0)
  Order          Int?
  createdAt      DateTime @default(now())

  @@map("static_categories")
  @@index([catName])
  @@index([views])
}

model StaticWallpaper {
  id           Int      @id @default(autoincrement())
  catName      String
  imageName    String
  originalName String?
  size         Int?
  dimension    String?
  likes        Int      @default(0)
  views        Int      @default(0)
  downloads    Int      @default(0)
  tags         String?
  thumbnail    String?
  createdAt    DateTime @default(now())
  status       String?
  subscriptionType SubscriptionType @default(Free)

  @@map("static_wallpapers")
  @@index([catName])
  @@index([views])
  @@index([downloads])
}

model LiveCategory {
  id         Int             @id @default(autoincrement())
  catName    String
  imageName  String
  dimension  String?
  size       Int?
  createdAt  DateTime        @default(now())
  wallpapers LiveWallpaper[]

  @@map("live_categories")
  @@index([catName])
}

model LiveWallpaper {
  id               Int              @id @default(autoincrement())
  livewallpaper    String
  thumbnail        String
  size             String?
  likes            Int              @default(0)
  views            Int              @default(0)
  tags             String?
  new_name         String
  downloads        Int              @default(0)
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @default(now())
  categoryId       Int?
  dimension        String?
  pro              Boolean          @default(false)
  subscriptionType SubscriptionType @default(Free)
  quality          String?
  status           String?

  category LiveCategory? @relation(fields: [categoryId], references: [id])

  @@map("live_wallpapers")
  @@index([categoryId])
  @@index([views])
  @@index([downloads])
}

model EliteCategory {
  id        Int      @id @default(autoincrement())
  cat_name  String
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())

  @@map("elite_categories")
  @@index([cat_name])
}

model EliteWallpaper {
  id        Int      @id @default(autoincrement())
  catname   String
  imagename String
  thumbnail String?
  size      Int
  dimension String
  views     Int?     @default(0)
  likes     Int?     @default(0)
  downloads Int?     @default(0)
  tags      String?
  new_name  String
  status    String?  @default("inactive")
  createdAt DateTime @default(now())
  updatedAt DateTime @default(now())
  subscriptionType SubscriptionType @default(Free)

  @@map("elite_wallpapers")
  @@index([views])
  @@index([downloads])
}

model Product {
  id             Int      @id @default(autoincrement())
  device_id      String
  product_id     String
  transaction_id String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @default(now())

  @@map("product")
  @@index([device_id])
  @@index([product_id])
}

model Trend {
  id       Int            @id @default(autoincrement())
  deviceid String
  imageid  Int?
  type     WallpaperType?

  @@map("trend")
  @@index([deviceid])
  @@index([imageid])
}

model MostDownload {
  id             Int           @id @default(autoincrement())
  imgid          Int?
  type           WallpaperType
  download_count Int?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @default(now())

  @@map("most_downloaded")
  @@index([imgid])
  @@index([download_count])
}