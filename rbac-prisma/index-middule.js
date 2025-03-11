const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Middleware to verify JWT and check roles
const authenticate = (roles = []) => {
  return async (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "Access denied" });

    try {
      const decoded = jwt.verify(token, "your-secret-key");
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { roles: { include: { role: true } } },
      });

      if (!user) return res.status(403).json({ message: "Unauthorized" });

      const userRoles = user.roles.map((userRole) => userRole.role.name);
      if (roles.length && !roles.some((role) => userRoles.includes(role))) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      req.user = user;
      next();
    } catch (error) {
      res.status(400).json({ message: "Invalid token" });
    }
  };
};

// Login Route
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { roles: { include: { role: true } } },
  });

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id }, "your-secret-key", { expiresIn: "1h" });
  const roles = user.roles.map((userRole) => userRole.role.name);
  res.json({ token, roles });
});

// Create User (Admin Only)
app.post("/create-user", authenticate(["ADMIN"]), async (req, res) => {
  const { email, password, roleNames } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  const roles = await prisma.role.findMany({
    where: { name: { in: roleNames } },
  });

  if (roles.length !== roleNames.length) {
    return res.status(400).json({ message: "Invalid roles" });
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      roles: {
        create: roles.map((role) => ({ roleId: role.id })),
      },
    },
  });
  res.json(user);
});

// Protected Route (Admin Only)
app.get("/admin", authenticate(["ADMIN"]), (req, res) => {
  res.json({ message: "Welcome, Admin!" });
});

// Protected Route (Moderator Only)
app.get("/moderator", authenticate(["MODERATOR"]), (req, res) => {
  res.json({ message: "Welcome, Moderator!" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});