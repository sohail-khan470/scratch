1. Understand Old and New Database Structure
Before migrating, compare the old MySQL structure (from PHP) with your new Prisma schema.

Example: Old PHP Database Table
sql
Copy
Edit
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    user_password VARCHAR(255)
);
Example: New Prisma Schema
prisma
Copy
Edit
model User {
  id        Int    @id @default(autoincrement())
  username  String
  email     String @unique
  password  String
  createdAt DateTime @default(now())
}
2. Extract Data from Old Database
Create a script to fetch data from the old database.

Install MySQL Package
sh
Copy
Edit
npm install mysql2
Create a Script to Extract Data (extractData.js)
javascript
Copy
Edit
const mysql = require("mysql2/promise");

const oldDbConfig = {
  host: "old-db-host",
  user: "old-db-user",
  password: "old-db-password",
  database: "old-db-name",
};

async function extractData() {
  const connection = await mysql.createConnection(oldDbConfig);
  const [rows] = await connection.execute("SELECT * FROM users");
  await connection.end();
  return rows;
}

module.exports = { extractData };
3. Transform Data
Modify column names and structure to match the new Prisma schema.

javascript
Copy
Edit
const transformData = (oldData) => {
  return oldData.map((user) => ({
    username: user.user_name.trim(),
    email: user.user_email.toLowerCase(),
    password: user.user_password, // You should hash passwords before storing
  }));
};

module.exports = { transformData };
4. Load Data into the New Database
Install Prisma
sh
Copy
Edit
npm install @prisma/client
/
Create a Script to Load Data (loadData.js)
javascript
Copy
Edit
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function loadData(transformedData) {
  await prisma.user.createMany({
    data: transformedData,
    skipDuplicates: true, // Prevents duplicate insertion
  });
  console.log("Data successfully migrated!");
}

module.exports = { loadData };
5. Run the Full ETL Pipeline
Create a Migration Script (migrateData.js)
javascript
Copy
Edit
const { extractData } = require("./extractData");
const { transformData } = require("./transformData");
const { loadData } = require("./loadData");

const runMigration = async () => {
  try {
    console.log("Extracting data...");
    const oldData = await extractData();

    console.log("Transforming data...");
    const transformedData = transformData(oldData);

    console.log("Loading data into new database...");
    await loadData(transformedData);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
  }
};

runMigration();
6. Execute the Migration
Run the following command:

sh
Copy
Edit
node migrateData.js
This will:

/

/
Extract data from the old MySQL database.
Transform the data (rename fields, format email, etc.).
Load data into the new Prisma-based MySQL database.
Bonus: Hash Passwords Before Storing
Modify transformData.js to hash passwords using bcrypt.

Install bcrypt:
sh
Copy
Edit
npm install bcrypt
Update transformData.js:
javascript
Copy
Edit
const bcrypt = require("bcrypt");

const transformData = async (oldData) => {
  return Promise.all(
    oldData.map(async (user) => ({
      username: user.user_name.trim(),
      email: user.user_email.toLowerCase(),
      password: await bcrypt.hash(user.user_password, 10),
    }))
  );
};

module.exports = { transformData };
Next Steps
Set up cron jobs to migrate data periodically.
Validate and log errors in case of failed migrations.
Ensure foreign keys are properly migrated if you have related tables.
Would you like to automate this process further? 🚀







