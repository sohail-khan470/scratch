// Project Structure:
// /ride-sharing-api
//   /prisma
//     schema.prisma
//   /src
//     /config
//       index.js
//     /controllers
//       authController.js
//       bookingController.js
//       driverController.js
//       passengerController.js
//       routeController.js
//     /middleware
//       auth.js
//       errorHandler.js
//     /routes
//       auth.routes.js
//       booking.routes.js
//       driver.routes.js
//       passenger.routes.js
//       route.routes.js
//     /services
//       authService.js
//       bookingService.js
//       driverService.js
//       passengerService.js
//       routeService.js
//     /utils
//       geospatial.js
//       validators.js
//     app.js
//     server.js
//   .env
//   package.json

// 1. First, let's set up the Prisma schema

// File: /prisma/schema.prisma
// This file defines your database schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  userType      String    // "passenger" or "driver"
  firstName     String
  lastName      String
  email         String    @unique
  phoneNumber   String    @unique
  passwordHash  String
  dateOfBirth   DateTime?
  profilePicUrl String?
  rating        Float     @default(0)
  accountStatus String    @default("active")
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  driver        Driver?
  passenger     Passenger?
}

model Driver {
  id                 String               @id @default(uuid())
  userId             String               @unique
  user               User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  licenseNumber      String               @unique
  licenseExpiry      DateTime
  verificationStatus String               @default("pending")
  currentCityId      String?
  currentCity        City?                @relation(fields: [currentCityId], references: [id])
  isAvailable        Boolean              @default(false)
  currentLatitude    Float?
  currentLongitude   Float?
  lastLocationUpdate DateTime?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  vehicle            Vehicle?
  driverRoutes       DriverRoute[]
  locationHistory    DriverLocationHistory[]
  availability       DriverAvailability[]
}

model Passenger {
  id        String    @id @default(uuid())
  userId    String    @unique
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  bookings  Booking[]
}

model Vehicle {
  id           String   @id @default(uuid())
  driverId     String   @unique
  driver       Driver   @relation(fields: [driverId], references: [id], onDelete: Cascade)
  make         String
  model        String
  year         Int
  color        String
  licensePlate String   @unique
  capacity     Int
  vehicleType  String
  photoUrl     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model City {
  id                 String               @id @default(uuid())
  name               String
  state              String
  country            String
  latitude           Float
  longitude          Float
  radiusKm           Float
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  driversCurrentCity Driver[]
  originRoutes       Route[]              @relation("OriginCity")
  destRoutes         Route[]              @relation("DestinationCity")
  driverAvailability DriverAvailability[]
  locationHistory    DriverLocationHistory[]
}

model Route {
  id                    String        @id @default(uuid())
  originCityId          String
  originCity            City          @relation("OriginCity", fields: [originCityId], references: [id])
  destinationCityId     String
  destinationCity       City          @relation("DestinationCity", fields: [destinationCityId], references: [id])
  distanceKm            Float
  averageDurationMinutes Int
  createdAt             DateTime      @default(now())
  updatedAt             DateTime      @updatedAt
  driverRoutes          DriverRoute[]

  @@unique([originCityId, destinationCityId])
}

model DriverRoute {
  id                  String    @id @default(uuid())
  driverId            String
  driver              Driver    @relation(fields: [driverId], references: [id], onDelete: Cascade)
  routeId             String
  route               Route     @relation(fields: [routeId], references: [id])
  departureTime       DateTime
  estimatedArrivalTime DateTime
  availableSeats      Int
  status              String    // "scheduled", "in-progress", "completed"
  pricePerSeat        Float
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  bookings            Booking[]
}

model Booking {
  id               String      @id @default(uuid())
  passengerId      String
  passenger        Passenger   @relation(fields: [passengerId], references: [id])
  driverRouteId    String
  driverRoute      DriverRoute @relation(fields: [driverRouteId], references: [id])
  pickupLatitude   Float
  pickupLongitude  Float
  dropoffLatitude  Float
  dropoffLongitude Float
  bookingStatus    String      // "pending", "confirmed", "completed", "cancelled"
  price            Float
  paymentMethod    String      @default("cash")
  paymentStatus    String      @default("pending")
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt
  transaction      Transaction?
}

model Transaction {
  id              String   @id @default(uuid())
  bookingId       String   @unique
  booking         Booking  @relation(fields: [bookingId], references: [id])
  amount          Float
  paymentMethod   String   @default("cash")
  status          String   // "pending", "completed"
  confirmationCode String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model DriverLocationHistory {
  id        String   @id @default(uuid())
  driverId  String
  driver    Driver   @relation(fields: [driverId], references: [id], onDelete: Cascade)
  latitude  Float
  longitude Float
  cityId    String?
  city      City?    @relation(fields: [cityId], references: [id])
  timestamp DateTime @default(now())
}

model DriverAvailability {
  id          String   @id @default(uuid())
  driverId    String
  driver      Driver   @relation(fields: [driverId], references: [id], onDelete: Cascade)
  cityId      String
  city        City     @relation(fields: [cityId], references: [id])
  latitude    Float
  longitude   Float
  isAvailable Boolean  @default(true)
  lastUpdated DateTime @default(now())

  @@index([cityId])
  @@index([driverId])
}


// 2. Now, let's set up the Express server

// File: src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth.routes');
const driverRoutes = require('./routes/driver.routes');
const passengerRoutes = require('./routes/passenger.routes');
const routeRoutes = require('./routes/route.routes');
const bookingRoutes = require('./routes/booking.routes');

const app = express();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/passengers', passengerRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/bookings', bookingRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use(errorHandler);

module.exports = app;

// File: src/server.js
const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Connected to the database successfully');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// 3. Middleware setup

// File: src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id }
    });
    
    if (!user) {
      throw new Error();
    }
    
    req.token = token;
    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate' });
  }
};

const driverAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (req.user.userType !== 'driver') {
      return res.status(403).send({ error: 'Not authorized as driver' });
    }
    
    const driver = await prisma.driver.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!driver) {
      return res.status(403).send({ error: 'Driver profile not found' });
    }
    
    req.driver = driver;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate as driver' });
  }
};

const passengerAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {});
    
    if (req.user.userType !== 'passenger') {
      return res.status(403).send({ error: 'Not authorized as passenger' });
    }
    
    const passenger = await prisma.passenger.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!passenger) {
      return res.status(403).send({ error: 'Passenger profile not found' });
    }
    
    req.passenger = passenger;
    next();
  } catch (error) {
    res.status(401).send({ error: 'Please authenticate as passenger' });
  }
};

module.exports = { auth, driverAuth, passengerAuth };

// File: src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  
  // Handle Prisma errors
  if (err.code && err.code.startsWith('P')) {
    return res.status(400).json({
      status: 'error',
      message: 'Database operation failed',
      error: err.message
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
      error: err.message
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors
    });
  }
  
  // Handle other errors
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error'
  });
};

module.exports = { errorHandler };

// 4. Controllers

// File: src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phoneNumber, password, userType, dateOfBirth } = req.body;
    
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phoneNumber }
        ]
      }
    });
    
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'User with this email or phone number already exists'
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create user
      const user = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          phoneNumber,
          passwordHash,
          userType,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null
        }
      });
      
      // Create passenger or driver profile
      if (userType === 'passenger') {
        await prisma.passenger.create({
          data: {
            userId: user.id
          }
        });
      } else if (userType === 'driver') {
        // Note: For drivers, additional info will be required in a separate endpoint
        await prisma.driver.create({
          data: {
            userId: user.id,
            licenseNumber: req.body.licenseNumber || 'PENDING',
            licenseExpiry: req.body.licenseExpiry ? new Date(req.body.licenseExpiry) : new Date()
          }
        });
      }
      
      return user;
    });
    
    // Generate JWT token
    const token = jwt.sign(
      { id: result.id, email: result.email, userType: result.userType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: result.id,
          firstName: result.firstName,
          lastName: result.lastName,
          email: result.email,
          phoneNumber: result.phoneNumber,
          userType: result.userType
        },
        token
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to register user',
      error: error.message
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.userType },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          userType: user.userType
        },
        tken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to login',
      error: error.message
    });
  }
};

module.exports = { register, login };

// File: src/controllers/driverController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { calculateDistance } = require('../utils/geospatial');

const getDriverProfile = async (req, res) => {
  try {
    const driverId = req.driver.id;
    
    const driver = await prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            profilePicUrl: true,
            rating: true
          }
        },
        vehicle: true,
        currentCity: true
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        driver
      }
    });
  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get driver profile',
      error: error.message
    });
  }
};

const updateDriverProfile = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { licenseNumber, licenseExpiry } = req.body;
    
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        licenseNumber,
        licenseExpiry: new Date(licenseExpiry)
      }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Driver profile updated successfully',
      data: {
        driver: updatedDriver
      }
    });
  } catch (error) {
    console.error('Update driver profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update driver profile',
      error: error.message
    });
  }
};

const addVehicle = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { make, model, year, color, licensePlate, capacity, vehicleType, photoUrl } = req.body;
    
    // Check if driver already has a vehicle
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { driverId }
    });
    
    if (existingVehicle) {
      return res.status(400).json({
        status: 'error',
        message: 'Driver already has a vehicle registered'
      });
    }
    
    const vehicle = await prisma.vehicle.create({
      data: {
        driverId,
        make,
        model,
        year: parseInt(year),
        color,
        licensePlate,
        capacity: parseInt(capacity),
        vehicleType,
        photoUrl
      }
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Vehicle added successfully',
      data: {
        vehicle
      }
    });
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to add vehicle',
      error: error.message
    });
  }
};

const updateLocation = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { latitude, longitude, cityId } = req.body;
    
    // Update driver location
    const updatedDriver = await prisma.driver.update({
      where: { id: driverId },
      data: {
        currentLatitude: latitude,
        currentLongitude: longitude,
        currentCityId: cityId,
        lastLocationUpdate: new Date()
      }
    });
    
    // Record location history
    await prisma.driverLocationHistory.create({
      data: {
        driverId,
        latitude,
        longitude,
        cityId
      }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Location updated successfully',
      data: {
        latitude,
        longitude,
        cityId,
        lastUpdate: updatedDriver.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update location',
      error: error.message
    });
  }
};

const updateAvailability = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { isAvailable, latitude, longitude, cityId } = req.body;
    
    // Check if driver has current location
    if (!latitude || !longitude || !cityId) {
      return res.status(400).json({
        status: 'error',
        message: 'Location data required to update availability'
      });
    }
    
    // Update driver availability
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        isAvailable,
        currentLatitude: latitude,
        currentLongitude: longitude,
        currentCityId: cityId,
        lastLocationUpdate: new Date()
      }
    });
    
    // Update or create availability record
    const existingAvailability = await prisma.driverAvailability.findFirst({
      where: {
        driverId,
        cityId
      }
    });
    
    if (existingAvailability) {
      await prisma.driverAvailability.update({
        where: { id: existingAvailability.id },
        data: {
          isAvailable,
          latitude,
          longitude,
          lastUpdated: new Date()
        }
      });
    } else {
      await prisma.driverAvailability.create({
        data: {
          driverId,
          cityId,
          latitude,
          longitude,
          isAvailable,
          lastUpdated: new Date()
        }
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: `Driver availability updated to ${isAvailable ? 'available' : 'unavailable'}`,
      data: {
        isAvailable,
        latitude,
        longitude,
        cityId,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update availability',
      error: error.message
    });
  }
};

const createIntercityRoute = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const {
      originCityId,
      destinationCityId,
      departureTime,
      estimatedArrivalTime,
      availableSeats,
      pricePerSeat
    } = req.body;
    
    // Find or create route
    let route = await prisma.route.findUnique({
      where: {
        originCityId_destinationCityId: {
          originCityId,
          destinationCityId
        }
      }
    });
    
    if (!route) {
      // Get city coordinates to calculate distance
      const [originCity, destinationCity] = await Promise.all([
        prisma.city.findUnique({ where: { id: originCityId } }),
        prisma.city.findUnique({ where: { id: destinationCityId } })
      ]);
      
      if (!originCity || !destinationCity) {
        return res.status(404).json({
          status: 'error',
          message: 'Origin or destination city not found'
        });
      }
      
      // Calculate distance between cities
      const distance = calculateDistance(
        originCity.latitude,
        originCity.longitude,
        destinationCity.latitude,
        destinationCity.longitude
      );
      
      // Estimate average duration (approx 60 km/h average speed)
      const averageDuration = Math.round((distance / 60) * 60); // in minutes
      
      route = await prisma.route.create({
        data: {
          originCityId,
          destinationCityId,
          distanceKm: distance,
          averageDurationMinutes: averageDuration
        }
      });
    }
    
    // Create driver route
    const driverRoute = await prisma.driverRoute.create({
      data: {
        driverId,
        routeId: route.id,
        departureTime: new Date(departureTime),
        estimatedArrivalTime: new Date(estimatedArrivalTime),
        availableSeats: parseInt(availableSeats),
        pricePerSeat: parseFloat(pricePerSeat),
        status: 'scheduled'
      },
      include: {
        route: {
          include: {
            originCity: true,
            destinationCity: true
          }
        }
      }
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Intercity route created successfully',
      data: {
        driverRoute
      }
    });
  } catch (error) {
    console.error('Create intercity route error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create intercity route',
      error: error.message
    });
  }
};

const startRouteJourney = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { driverRouteId } = req.params;
    
    // Find driver route
    const driverRoute = await prisma.driverRoute.findFirst({
      where: {
        id: driverRouteId,
        driverId
      },
      include: {
        route: true
      }
    });
    
    if (!driverRoute) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver route not found'
      });
    }
    
    if (driverRoute.status !== 'scheduled') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot start route with status: ${driverRoute.status}`
      });
    }
    
    // Update driver route status
    const updatedDriverRoute = await prisma.driverRoute.update({
      where: { id: driverRouteId },
      data: {
        status: 'in-progress',
        departureTime: new Date() // Update with actual departure time
      }
    });
    
    // Update driver current city to origin city
    await prisma.driver.update({
      where: { id: driverId },
      data: {
        currentCityId: driverRoute.route.originCityId
      }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Route journey started',
      data: {
        driverRoute: updatedDriverRoute
      }
    });
  } catch (error) {
    console.error('Start route journey error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to start route journey',
      error: error.message
    });
  }
};

const completeRouteJourney = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { driverRouteId } = req.params;
    const { latitude, longitude } = req.body;
    
    // Find driver route
    const driverRoute = await prisma.driverRoute.findFirst({
      where: {
        id: driverRouteId,
        driverId
      },
      include: {
        route: true
      }
    });
    
    if (!driverRoute) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver route not found'
      });
    }
    
    if (driverRoute.status !== 'in-progress') {
      return res.status(400).json({
        status: 'error',
        message: `Cannot complete route with status: ${driverRoute.status}`
      });
    }
    
    // Perform transaction to update multiple related records
    await prisma.$transaction(async (prisma) => {
      // Update driver route status
      await prisma.driverRoute.update({
        where: { id: driverRouteId },
        data: {
          status: 'completed',
          estimatedArrivalTime: new Date() // Update with actual arrival time
        }
      });
      
      // Update driver location to destination city
      await prisma.driver.update({
        where: { id: driverId },
        data: {
          currentCityId: driverRoute.route.destinationCityId,
          currentLatitude: latitude,
          currentLongitude: longitude,
          lastLocationUpdate: new Date()
        }
      });
      
      // Set driver as available in destination city
      const existingAvailability = await prisma.driverAvailability.findFirst({
        where: {
          driverId,
          cityId: driverRoute.route.destinationCityId
        }
      });
      
      if (existingAvailability) {
        await prisma.driverAvailability.update({
          where: { id: existingAvailability.id },
          data: {
            isAvailable: true,
            latitude,
            longitude,
            lastUpdated: new Date()
          }
        });
      } else {
        await prisma.driverAvailability.create({
          data: {
            driverId,
            cityId: driverRoute.route.destinationCityId,
            latitude,
            longitude,
            isAvailable: true,
            lastUpdated: new Date()
          }
        });
      }
      
      // Record location history
      await prisma.driverLocationHistory.create({
        data: {
          driverId,
          latitude,
          longitude,
          cityId: driverRoute.route.destinationCityId
        }
      });
    });
    
    res.status(200).json({
      status: 'success',

      message: 'Route journey completed',
      data: {
        city: driverRoute.route.destinationCityId,
        latitude,
        longitude,
        status: 'completed'
      }
    });
  } catch (error) {
    console.error('Complete route journey error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to complete route journey',
      error: error.message
    });
  }
};

const getDriverBookings = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { status } = req.query;
    
    // Build query filter
    const whereClause = {
      driverRoute: {
        driverId
      }
    };
    
    if (status) {
      whereClause.bookingStatus = status;
    }
    
    // Get bookings
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        passenger: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
                profilePicUrl: true
              }
            }
          }
        },
        driverRoute: {
          include: {
            route: {
              include: {
                originCity: true,
                destinationCity: true
              }
            }
          }
        },
        transaction: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        bookings
      }
    });
  } catch (error) {
    console.error('Get driver bookings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get driver bookings',
      error: error.message
    });
  }
};

const confirmCashPayment = async (req, res) => {
  try {
    const driverId = req.driver.id;
    const { bookingId } = req.params;
    
    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        driverRoute: true,
        transaction: true
      }
    });
    
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }
    
    // Verify driver owns the booking
    if (booking.driverRoute.driverId !== driverId) {
      return res.status(403).json({
        status: 'error',
        message: 'Unauthorized to confirm this payment'
      });
    }
    
    if (booking.paymentStatus === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Payment already completed'
      });
    }
    
    // Update booking and transaction status
    await prisma.$transaction(async (prisma) => {
      // Update booking status
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          paymentStatus: 'completed',
          bookingStatus: 'completed'
        }
      });
      
      // Update or create transaction
      if (booking.transaction) {
        await prisma.transaction.update({
          where: { bookingId },
          data: {
            status: 'completed',
            confirmationCode: `PAY-${Date.now()}`
          }
        });
      } else {
        await prisma.transaction.create({
          data: {
            bookingId,
            amount: booking.price,
            paymentMethod: 'cash',
            status: 'completed',
            confirmationCode: `PAY-${Date.now()}`
          }
        });
      }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Cash payment confirmed successfully',
      data: {
        bookingId,
        paymentStatus: 'completed',
        confirmationCode: `PAY-${Date.now()}`
      }
    });
  } catch (error) {
    console.error('Confirm cash payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to confirm cash payment',
      error: error.message
    });
  }
};

module.exports = {
  getDriverProfile,
  updateDriverProfile,
  addVehicle,
  updateLocation,
  updateAvailability,
  createIntercityRoute,
  startRouteJourney,
  completeRouteJourney,
  getDriverBookings,
  confirmCashPayment
};

// File: src/controllers/passengerController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getPassengerProfile = async (req, res) => {
  try {
    const passengerId = req.passenger.id;
    
    const passenger = await prisma.passenger.findUnique({
      where: { id: passengerId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
            profilePicUrl: true
          }
        }
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        passenger
      }
    });
  } catch (error) {
    console.error('Get passenger profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get passenger profile',
      error: error.message
    });
  }
};

const updatePassengerProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phoneNumber, profilePicUrl } = req.body;
    
    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phoneNumber,
        profilePicUrl
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        profilePicUrl: true
      }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('Update passenger profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update passenger profile',
      error: error.message
    });
  }
};

const getNearbyDrivers = async (req, res) => {
  try {
    const { latitude, longitude, cityId, radius = 5 } = req.query;
    
    if (!latitude || !longitude || !cityId) {
      return res.status(400).json({
        status: 'error',
        message: 'Latitude, longitude and cityId are required'
      });
    }
    
    // Get available drivers in the city
    const availableDrivers = await prisma.driverAvailability.findMany({
      where: {
        cityId,
        isAvailable: true,
        lastUpdated: {
          // Only consider drivers who updated their status in the last hour
          gte: new Date(Date.now() - 60 * 60 * 1000)
        }
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                rating: true,
                profilePicUrl: true
              }
            },
            vehicle: true
          }
        }
      }
    });
    
    // Filter drivers by distance
    const nearbyDrivers = availableDrivers.filter(driver => {
      const distance = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        driver.latitude,
        driver.longitude
      );
      return distance <= parseFloat(radius);
    });
    
    // Sort by distance
    nearbyDrivers.sort((a, b) => {
      const distanceA = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        a.latitude,
        a.longitude
      );
      const distanceB = calculateDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        b.latitude,
        b.longitude
      );
      return distanceA - distanceB;
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        count: nearbyDrivers.length,
        drivers: nearbyDrivers.map(item => ({
          id: item.driver.id,
          name: `${item.driver.user.firstName} ${item.driver.user.lastName}`,
          rating: item.driver.user.rating,
          profilePicUrl: item.driver.user.profilePicUrl,
          vehicle: item.driver.vehicle,
          latitude: item.latitude,
          longitude: item.longitude,
          distance: calculateDistance(
            parseFloat(latitude),
            parseFloat(longitude),
            item.latitude,
            item.longitude
          ).toFixed(2)
        }))
      }
    });
  } catch (error) {
    console.error('Get nearby drivers error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get nearby drivers',
      error: error.message
    });
  }
};

const getPassengerBookings = async (req, res) => {
  try {
    const passengerId = req.passenger.id;
    const { status } = req.query;
    
    // Build query filter
    const whereClause = { passengerId };
    
    if (status) {
      whereClause.bookingStatus = status;
    }
    
    // Get bookings
    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        driverRoute: {
          include: {
            driver: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    phoneNumber: true,
                    profilePicUrl: true,
                    rating: true
                  }
                },
                vehicle: true
              }
            },
            route: {
              include: {
                originCity: true,
                destinationCity: true
              }
            }
          }
        },
        transaction: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        bookings
      }
    });
  } catch (error) {
    console.error('Get passenger bookings error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get passenger bookings',
      error: error.message
    });
  }
};

const confirmCashPayment = async (req, res) => {
  try {
    const passengerId = req.passenger.id;
    const { bookingId } = req.params;
    
    // Find booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        passengerId
      },
      include: {
        transaction: true
      }
    });
    
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found'
      });
    }
    
    if (booking.paymentStatus === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Payment already completed'
      });
    }
    
    // Update booking status to indicate passenger confirms they paid
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: 'pending_confirmation',
        bookingStatus: 'payment_pending'
      }
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Cash payment initiated, awaiting driver confirmation',
      data: {
        bookingId,
        paymentStatus: 'pending_confirmation'
      }
    });
  } catch (error) {
    console.error('Confirm cash payment error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to confirm cash payment',
      error: error.message
    });
  }
};

module.exports = {
  getPassengerProfile,
  updatePassengerProfile,
  getNearbyDrivers,
  getPassengerBookings,
  confirmCashPayment
};

// File: src/controllers/routeController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getRoutesBetweenCities = async (req, res) => {
  try {
    const { originCityId, destinationCityId } = req.query;
    
    if (!originCityId || !destinationCityId) {
      return res.status(400).json({
        status: 'error',
        message: 'Origin and destination city IDs are required'
      });
    }
    
    // Find route
    const route = await prisma.route.findUnique({
      where: {
        originCityId_destinationCityId: {
          originCityId,
          destinationCityId
        }
      },
      include: {
        originCity: true,
        destinationCity: true
      }
    });
    
    if (!route) {
      return res.status(404).json({
        status: 'error',
        message: 'No routes found between these cities'
      });
    }
    
    // Get driver routes for this route
    const driverRoutes = await prisma.driverRoute.findMany({
      where: {
        routeId: route.id,
        status: 'scheduled',
        departureTime: {
          gte: new Date()
        }
      },
      include: {
        driver: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                rating: true
              }
            },
            vehicle: true
          }
        }
      },
      orderBy: {
        departureTime: 'asc'
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        route,
        driverCount: driverRoutes.length,
        driverRoutes: driverRoutes.map(dr => ({
          id: dr.id,
          driver: {
            id: dr.driver.id,
            name: `${dr.driver.user.firstName} ${dr.driver.user.lastName}`,
            rating: dr.driver.user.rating
          },
          vehicle: dr.driver.vehicle,
          departureTime: dr.departureTime,
          estimatedArrivalTime: dr.estimatedArrivalTime,
          availableSeats: dr.availableSeats,
          pricePerSeat: dr.pricePerSeat
        }))
      }
    });
  } catch (error) {
    console.error('Get routes between cities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get routes between cities',
      error: error.message
    });
  }
};

const getRouteStats = async (req, res) => {
  try {
    const { originCityId, destinationCityId } = req.query;
    
    if (!originCityId || !destinationCityId) {
      return res.status(400).json({
        status: 'error',
        message: 'Origin and destination city IDs are required'
      });
    }
    
    // Get bidirectional routes
    const [routeAB, routeBA] = await Promise.all([
      prisma.route.findUnique({
        where: {
          originCityId_destinationCityId: {
            originCityId,
            destinationCityId
          }
        }
      }),
      prisma.route.findUnique({
        where: {
          originCityId_destinationCityId: {
            originCityId: destinationCityId,
            destinationCityId: originCityId
          }
        }
      })
    ]);
    
    // Count scheduled drivers
    const [driversAB, driversBA] = await Promise.all([
      routeAB ? prisma.driverRoute.count({
        where: {
          routeId: routeAB.id,
          status: 'scheduled',
          departureTime: {
            gte: new Date()
          }
        }
      }) : 0,
      routeBA ? prisma.driverRoute.count({
        where: {
          routeId: routeBA.id,
          status: 'scheduled',
          departureTime: {
            gte: new Date()
          }
        }
      }) : 0
    ]);
    
    // Get cities info
    const [cityA, cityB] = await Promise.all([
      prisma.city.findUnique({
        where: { id: originCityId }
      }),
      prisma.city.findUnique({
        where: { id: destinationCityId }
      })
    ]);
    
    if (!cityA || !cityB) {
      return res.status(404).json({
        status: 'error',
        message: 'One or both cities not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        stats: {
          driversCount: {
            fromOriginToDestination: driversAB,
            fromDestinationToOrigin: driversBA,
            total: driversAB + driversBA
          },
          cities: {
            origin: {
              id: cityA.id,
              name: cityA.name
            },
            destination: {
              id: cityB.id,
              name: cityB.name
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Get route stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get route stats',
      error: error.message
    });
  }
};

const getAllCities = async (req, res) => {
  try {
    const cities = await prisma.city.findMany({
      orderBy: {
        name: 'asc'
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        cities
      }
    });
  } catch (error) {
    console.error('Get all cities error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get cities',
      error: error.message
    });
  }
};

module.exports = {
  getRoutesBetweenCities,
  getRouteStats,
  getAllCities
};

// File: src/controllers/bookingController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createBooking = async (req, res) => {
  try {
    const passengerId = req.passenger.id;
    const {
      driverRouteId,
      pickupLatitude,
      pickupLongitude,
      dropoffLatitude,
      dropoffLongitude
    } = req.body;
    
    // Find driver route
    const driverRoute = await prisma.driverRoute.findUnique({
      where: { id: driverRouteId },
      include: {
        driver: true
      }
    });
    
    if (!driverRoute) {
      return res.status(404).json({
        status: 'error',
        message: 'Driver route not found'
      });
    }
    
    if (driverRoute.status !== 'scheduled') {
      return res.status(400).json({
        status: 'error',
        message: 'This route is no longer available for booking'
      });
    }
    
    if (driverRoute.availableSeats <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No seats available on this route'
      });
    }
    
    // Create booking
    const booking = await prisma.$transaction(async (prisma) => {
      // Create booking
      const newBooking = await prisma.booking.create({
        data: {
          passengerId,
          driverRouteId,
          pickupLatitude: parseFloat(pickupLatitude),
          pickupLongitude: parseFloat(pickupLongitude),
          dropoffLatitude: parseFloat(dropoffLatitude),
          dropoffLongitude: parseFloat(dropoffLongitude),
          bookingStatus: 'confirmed',
          price: driverRoute.pricePerSeat,
          paymentMethod: 'cash',
          paymentStatus: 'pending'
        }
      });
      
      // Create transaction record
      await prisma.transaction.create({
        data: {
          bookingId: newBooking.id,
          amount: driverRoute.pricePerSeat,
          paymentMethod: 'cash',
          status: 'pending'
        }
      });
      
      // Update available seats
      await prisma.driverRoute.update({
        where: { id: driverRouteId },
        data: {
          availableSeats: driverRoute.availableSeats - 1
        }
      });
      
      return newBooking;
    });
    
    res.status(201).json({
      status: 'success',
      message: 'Booking created successfully',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create booking',
      error: error.message
    });
  }
};


const getBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    
    // Determine if user is passenger or driver
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    let booking;
    
    if (user.userType === 'passenger') {
      const passenger = await prisma.passenger.findUnique({
        where: { userId }
      });
      
      booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          passengerId: passenger.id
        },
        include: {
          driverRoute: {
            include: {
              driver: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true,
                      phoneNumber: true,
                      profilePicUrl: true,
                      rating: true
                    }
                  },
                  vehicle: true
                }
              },
              route: {
                include: {
                  originCity: true,
                  destinationCity: true
                }
              }
            }
          },
          transaction: true
        }
      });
    } else if (user.userType === 'driver') {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });
      
      booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          driverRoute: {
            driverId: driver.id
          }
        },
        include: {
          passenger: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  phoneNumber: true,
                  profilePicUrl: true
                }
              }
            }
          },
          driverRoute: {
            include: {
              route: {
                include: {
                  originCity: true,
                  destinationCity: true
                }
              }
            }
          },
          transaction: true
        }
      });
    }
    
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or unauthorized'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        booking
      }
    });
  } catch (error) {
    console.error('Get booking details error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get booking details',
      error: error.message
    });
  }
};

const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userId = req.user.id;
    
    // Determine if user is passenger or driver
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    let booking;
    
    if (user.userType === 'passenger') {
      const passenger = await prisma.passenger.findUnique({
        where: { userId }
      });
      
      booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          passengerId: passenger.id
        },
        include: {
          driverRoute: true
        }
      });
    } else if (user.userType === 'driver') {
      const driver = await prisma.driver.findUnique({
        where: { userId }
      });
      
      booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          driverRoute: {
            driverId: driver.id
          }
        },
        include: {
          driverRoute: true
        }
      });
    }
    
    if (!booking) {
      return res.status(404).json({
        status: 'error',
        message: 'Booking not found or unauthorized'
      });
    }
    
    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({
        status: 'error',
        message: 'This booking is already cancelled'
      });
    }
    
    if (booking.bookingStatus === 'completed') {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot cancel a completed booking'
      });
    }
    
    // Cancel booking and refund seat
    await prisma.$transaction(async (prisma) => {
      // Update booking status
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          bookingStatus: 'cancelled',
          paymentStatus: 'cancelled'
        }
      });
      
      // Update transaction status if exists
      await prisma.transaction.updateMany({
        where: { bookingId },
        data: {
          status: 'cancelled'
        }
      });
      
      // Restore available seat
      await prisma.driverRoute.update({
        where: { id: booking.driverRouteId },
        data: {
          availableSeats: {
            increment: 1
          }
        }
      });
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Booking cancelled successfully',
      data: {
        bookingId,
        status: 'cancelled'
      }
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};

module.exports = {
  createBooking,
  getBookingDetails,
  cancelBooking
};

// 5. Routes

// File: src/routes/auth.routes.js
const express = require('express');
const { register, login } = require('../controllers/authController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);

module.exports = router;

// File: src/routes/driver.routes.js
const express = require('express');
const {
  getDriverProfile,
  updateDriverProfile,
  addVehicle,
  updateLocation,
  updateAvailability,
  createIntercityRoute,
  startRouteJourney,
  completeRouteJourney,
  getDriverBookings,
  confirmCashPayment
} = require('../controllers/driverController');
const { driverAuth } = require('../middleware/auth');

const router = express.Router();

// Apply driver authentication middleware to all routes
router.use(driverAuth);

router.get('/profile', getDriverProfile);
router.put('/profile', updateDriverProfile);
router.post('/vehicle', addVehicle);
router.put('/location', updateLocation);
router.put('/availability', updateAvailability);
router.post('/routes', createIntercityRoute);
router.put('/routes/:driverRouteId/start', startRouteJourney);
router.put('/routes/:driverRouteId/complete', completeRouteJourney);
router.get('/bookings', getDriverBookings);
router.post('/bookings/:bookingId/confirm-payment', confirmCashPayment);

module.exports = router;

// File: src/routes/passenger.routes.js
const express = require('express');
const {
  getPassengerProfile,
  updatePassengerProfile,
  getNearbyDrivers,
  getPassengerBookings,
  confirmCashPayment
} = require('../controllers/passengerController');
const { passengerAuth, auth } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', passengerAuth, getPassengerProfile);
router.put('/profile', auth, updatePassengerProfile);
router.get('/drivers/nearby', passengerAuth, getNearbyDrivers);
router.get('/bookings', passengerAuth, getPassengerBookings);
router.post('/bookings/:bookingId/cash-payment', passengerAuth, confirmCashPayment);

module.exports = router;

// File: src/routes/route.routes.js
const express = require('express');
const {
  getRoutesBetweenCities,
  getRouteStats,
  getAllCities
} = require('../controllers/routeController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.use(auth);

router.get('/between-cities', getRoutesBetweenCities);
router.get('/stats', getRouteStats);
router.get('/cities', getAllCities);

module.exports = router;

// File: src/routes/booking.routes.js
const express = require('express');
const {
  createBooking,
  getBookingDetails,
  cancelBooking
} = require('../controllers/bookingController');
const { auth, passengerAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/', passengerAuth, createBooking);
router.get('/:bookingId', auth, getBookingDetails);
router.put('/:bookingId/cancel', auth, cancelBooking);

module.exports = router;

// 6. Utils

// File: src/utils/geospatial.js
// src/utils/geospatial.js

/**
 * Calculate distance between two coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of the first point
 * @param {number} lon1 - Longitude of the first point
 * @param {number} lat2 - Latitude of the second point
 * @param {number} lon2 - Longitude of the second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const toRad = angle => angle * (Math.PI / 180);

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = { calculateDistance };
