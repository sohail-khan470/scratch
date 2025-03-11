model User {
  id        Int         @id @default(autoincrement())
  email     String      @unique
  password  String
  roles     UserRole[]  // Many-to-many relationship via UserRole
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}

model Role {
  id        Int         @id @default(autoincrement())
  name      String      @unique
  users     UserRole[]  // Many-to-many relationship via UserRole
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt
}

model UserRole {
  userId    Int
  roleId    Int
  user      User        @relation(fields: [userId], references: [id])
  role      Role        @relation(fields: [roleId], references: [id])
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  @@id([userId, roleId]) // Composite primary key
}