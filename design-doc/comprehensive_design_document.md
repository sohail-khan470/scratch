# Comprehensive Design Document for "ohmywall" Project

## Project Overview

The "ohmywall" project is a web application designed to manage and showcase wallpapers and categories. It allows users to upload, retrieve, and manage wallpapers while ensuring that all data adheres to specific validation rules. The application aims to provide a seamless experience for users looking to explore and manage high-quality wallpapers.

### Features

- User authentication and authorization (to be implemented).
- Upload and manage wallpapers with validation.
- Categorize wallpapers for easy navigation.
- Responsive design for mobile and desktop users.

## Architecture

The project is structured into several key directories:

- **controllers**: Contains the logic for handling requests and responses.
- **validators**: Defines validation rules for incoming data.
- **services**: Manages database interactions and image handling.
- **routes**: Defines the API endpoints and their corresponding controllers.

### Architecture Diagram

_(Insert architecture diagram here)_

## Components

### Validators

- **staticCategoryValidator.js**: Validates category data, ensuring required fields are present and of the correct type.
- **staticWallpaperValidator.js**: Validates wallpaper upload data, checking for required fields and their types.

### Controllers

- **StaticWallpaperController.js**: Manages wallpaper uploads, retrieval, updates, and deletions. It integrates with S3 for image storage and uses validation logic.
- **StaticCategoryController.js**: Manages category creation, retrieval, updates, and deletions. It also handles image uploads and processing.

### Services

- **StaticWallpaperService**: Handles database operations related to wallpapers.
- **StaticCategoryService**: Manages database operations for categories.
- **S3Service**: Facilitates image uploads to S3 storage.

### Routes

- Defines the routing structure for the application, mapping API endpoints to their respective controllers.

## API Endpoints

| Endpoint            | Method | Description                | Request Body               | Response                     |
| ------------------- | ------ | -------------------------- | -------------------------- | ---------------------------- |
| /api/wallpapers     | POST   | Upload multiple wallpapers | { catName, tags, files[] } | { success, wallpaperData[] } |
| /api/wallpapers/:id | GET    | Retrieve wallpaper by ID   |                            | { wallpaper }                |
| /api/categories     | POST   | Create a new category      | { catName, image }         | { success, category }        |
| /api/categories/:id | GET    | Retrieve category by ID    |                            | { category }                 |

## Data Flow

Data flows through the application as follows:

1. Incoming requests are routed to the appropriate controller.
2. The controller validates the data using the corresponding validator.
3. If validation passes, the controller processes the data and interacts with the service layer for database operations.
4. Responses are sent back to the client, including any relevant data or error messages.

## Database Schema

- **Wallpapers Table**: Stores information about wallpapers, including ID, name, category, size, and dimensions.
- **Categories Table**: Stores information about categories, including ID, name, and associated images.

## Deployment Instructions

1. Clone the repository.
2. Install dependencies using `npm install`.
3. Set up environment variables in a `.env` file.
4. Start the application using `npm start`.

## Testing

- Unit tests for individual components.
- Integration tests for API endpoints.

## Future Enhancements

- Implement user authentication and authorization.
- Add support for image tagging and searching.
- Enhance the user interface for better user experience.
