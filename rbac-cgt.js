// Step 1: Setup Prisma Schema
// Modify your prisma/schema.prisma file to define User, Role, and Permission tables

// Step 2: Run migration
// Execute `npx prisma migrate dev --name add_roles_permissions` to update the database

// Step 3: Seed initial roles and permissions
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedDatabase() {
    const adminRole = await prisma.role.upsert({
        where: { name: "admin" },
        update: {},
        create: {
            name: "admin",
            permissions: {
                create: [
                    { name: "create" },
                    { name: "update" },
                    { name: "delete" }
                ]
            }
        }
    });
    
    const userRole = await prisma.role.upsert({
        where: { name: "user" },
        update: {},
        create: {
            name: "user",
            permissions: {
                create: [{ name: "read" }]
            }
        }
    });

    console.log({ adminRole, userRole });
}

seedDatabase().catch(console.error).finally(() => prisma.$disconnect());

// Step 4: Middleware to check permissions
const checkPermission = (permission) => {
    return async (req, res, next) => {
        const userId = req.user?.id;
        if (!userId) return res.status(403).json({ message: "Unauthorized" });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { role: { include: { permissions: true } } }
        });

        if (!user) return res.status(403).json({ message: "User not found" });

        const hasPermission = user.role.permissions.some(perm => perm.name === permission);
        if (!hasPermission) return res.status(403).json({ message: "Permission denied" });

        next();
    };
};

// Step 5: Protect Routes using middleware
const express = require('express');
const app = express();

app.post('/create', checkPermission("create"), (req, res) => {
    res.json({ message: "Created successfully!" });
});

app.put('/update', checkPermission("update"), (req, res) => {
    res.json({ message: "Updated successfully!" });
});

app.delete('/delete', checkPermission("delete"), (req, res) => {
    res.json({ message: "Deleted successfully!" });
});

// Step 6: Assign Roles to Users on Registration
app.post('/register', async (req, res) => {
    const { email, password, roleName } = req.body;

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) return res.status(400).json({ message: "Invalid role" });

    const hashedPassword = require('bcryptjs').hashSync(password, 10);

    const user = await prisma.user.create({
        data: { email, password: hashedPassword, roleId: role.id }
    });

    res.json(user);
});

app.listen(3000, () => console.log('Server running on port 3000'));
