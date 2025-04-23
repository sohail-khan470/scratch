// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String?   @unique
  phone         String?   @unique
  password      String?
  googleId      String?   @unique
  name          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  sessions      Session[]
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  token        String   @unique
  expiresAt    DateTime
  createdAt    DateTime @default(now())
}

// For phone OTP verification (optional but recommended)
model PhoneVerification {
  id          String   @id @default(uuid())
  phone       String
  otp         String
  expiresAt   DateTime
  createdAt   DateTime @default(now())

  @@unique([phone, otp])
}

// For password reset tokens (optional but recommended)
model PasswordResetToken {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  token       String   @unique
  expiresAt   DateTime
  createdAt   DateTime @default(now())
}