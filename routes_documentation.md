# Routes Documentation for "ohmywall" Project

## Overview

This document provides a detailed explanation of all the routes in the "ohmywall" project, including their mappings, descriptions, and expected request/response formats.

## Route Mapping

| Route                               | Method | Description                             | Request Body                                                 | Response                     |
| ----------------------------------- | ------ | --------------------------------------- | ------------------------------------------------------------ | ---------------------------- |
| /api/wallpapers                     | POST   | Upload multiple wallpapers              | { catName, tags, files[] }                                   | { success, wallpaperData[] } |
| /api/wallpapers/:id                 | GET    | Retrieve wallpaper by ID                |                                                              | { wallpaper }                |
| /api/categories                     | POST   | Create a new category                   | { catName, image }                                           | { success, category }        |
| /api/categories/:id                 | GET    | Retrieve category by ID                 |                                                              | { category }                 |
| /api/livewallpapers                 | POST   | Upload a live wallpaper                 | { categoryId, tags, subscriptionType, status }               | { message, wallpaper }       |
| /api/livewallpapers                 | GET    | Retrieve all live wallpapers            |                                                              | { wallpapers }               |
| /api/livewallpapers/:id             | GET    | Retrieve live wallpaper by ID           |                                                              | { wallpaper }                |
| /api/livewallpapers/category/:catId | GET    | Retrieve live wallpapers by category ID |                                                              | { wallpapers }               |
| /api/livewallpapers/:id             | PUT    | Update a live wallpaper                 | { categoryId, tags, pro, quality, subscriptionType, status } | { message, wallpaper }       |
| /api/livewallpapers/:id             | DELETE | Delete a live wallpaper                 |                                                              | { message }                  |

## Detailed Endpoint Descriptions

### 1. Upload Multiple Wallpapers

- **Route**: `/api/wallpapers`
- **Method**: POST
- **Description**: This endpoint allows users to upload multiple wallpapers at once.
- **Request Body**:
  - `catName`: Name of the category to which the wallpapers belong.
  - `tags`: Tags associated with the wallpapers.
  - `files[]`: Array of files to be uploaded.
- **Response**:
  - `success`: Boolean indicating the success of the operation.
  - `wallpaperData[]`: Array of objects containing details of the uploaded wallpapers.

### 2. Retrieve Wallpaper by ID

- **Route**: `/api/wallpapers/:id`
- **Method**: GET
- **Description**: This endpoint retrieves a specific wallpaper by its ID.
- **Request Parameters**:
  - `id`: The ID of the wallpaper to retrieve.
- **Response**:
  - `wallpaper`: Object containing details of the requested wallpaper.

### 3. Create a New Category

- **Route**: `/api/categories`
- **Method**: POST
- **Description**: This endpoint allows users to create a new category for wallpapers.
- **Request Body**:
  - `catName`: Name of the category.
  - `image`: Image associated with the category.
- **Response**:
  - `success`: Boolean indicating the success of the operation.
  - `category`: Object containing details of the created category.

### 4. Retrieve Category by ID

- **Route**: `/api/categories/:id`
- **Method**: GET
- **Description**: This endpoint retrieves a specific category by its ID.
- **Request Parameters**:
  - `id`: The ID of the category to retrieve.
- **Response**:
  - `category`: Object containing details of the requested category.

### 5. Upload a Live Wallpaper

- **Route**: `/api/livewallpapers`
- **Method**: POST
- **Description**: This endpoint allows users to upload a live wallpaper, including a thumbnail and video.
- **Request Body**:
  - `categoryId`: ID of the category to which the wallpaper belongs.
  - `tags`: Tags associated with the wallpaper.
  - `subscriptionType`: Type of subscription for the wallpaper.
  - `status`: Status of the wallpaper (active/inactive).
- **Response**:
  - `message`: Confirmation message.
  - `wallpaper`: Object containing details of the uploaded live wallpaper.

### 6. Retrieve All Live Wallpapers

- **Route**: `/api/livewallpapers`
- **Method**: GET
- **Description**: This endpoint retrieves all live wallpapers.
- **Response**:
  - `wallpapers`: Array of objects containing details of all live wallpapers.

### 7. Retrieve Live Wallpaper by ID

- **Route**: `/api/livewallpapers/:id`
- **Method**: GET
- **Description**: This endpoint retrieves a specific live wallpaper by its ID.
- **Request Parameters**:
  - `id`: The ID of the live wallpaper to retrieve.
- **Response**:
  - `wallpaper`: Object containing details of the requested live wallpaper.

### 8. Retrieve Live Wallpapers by Category ID

- **Route**: `/api/livewallpapers/category/:catId`
- **Method**: GET
- **Description**: This endpoint retrieves live wallpapers filtered by category ID.
- **Request Parameters**:
  - `catId`: The ID of the category to filter by.
- **Response**:
  - `wallpapers`: Array of objects containing details of live wallpapers in the specified category.

### 9. Update a Live Wallpaper

- **Route**: `/api/livewallpapers/:id`
- **Method**: PUT
- **Description**: This endpoint updates the details of an existing live wallpaper.
- **Request Parameters**:
  - `id`: The ID of the live wallpaper to update.
- **Request Body**:
  - `categoryId`: ID of the category to which the wallpaper belongs.
  - `tags`: Tags associated with the wallpaper.
  - `pro`: Boolean indicating if the wallpaper is a pro version.
  - `quality`: Quality of the wallpaper.
  - `subscriptionType`: Type of subscription for the wallpaper.
  - `status`: Status of the wallpaper (active/inactive).
- **Response**:
  - `message`: Confirmation message.
  - `wallpaper`: Object containing details of the updated live wallpaper.

### 10. Delete a Live Wallpaper

- **Route**: `/api/livewallpapers/:id`
- **Method**: DELETE
- **Description**: This endpoint deletes a specific live wallpaper by its ID.
- **Request Parameters**:
  - `id`: The ID of the live wallpaper to delete.
- **Response**:
  - `message`: Confirmation message indicating the wallpaper has been deleted.

## Diagrams

### Route Structure Diagram

_(Insert route structure diagram here)_

### API Endpoint Flow Diagram

_(Insert API endpoint flow diagram here)_

## Conclusion

This documentation provides a comprehensive overview of the routes available in the "ohmywall" project. Each route is designed to facilitate specific functionalities related to wallpaper and category management.
