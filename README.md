# Personal Media Library

A sleek, responsive, and intuitive personal media library application built with React and Vite. It allows you to manage and view your images and videos directly in your browser without uploading them to any server (ensuring complete security and privacy).

## Key Features

- 📂 **Media Management**: Easily import, view, and remove image and video files.
- 🚀 **Integrated Viewers**: Features a built-in image viewer and a customizable video player.
- 🔒 **Security & Privacy**: All file processing is performed locally in your browser using Object URLs. No data leaves your machine.
- 🎨 **Modern Aesthetics**: Sleek dark mode design featuring glassmorphism and smooth micro-animations.

## Prerequisites

Before running the project, ensure you have the following installed:
- **Node.js** (LTS version 18 or higher is recommended)
- **NPM** (Normally comes pre-packaged with Node.js)

## Getting Started

Follow these steps to set up and run the application locally:

### 1. Install Dependencies
Open your terminal in the project's root directory and run:
```bash
npm install
```

### 2. Start the Development Server
To launch the app locally in development mode, run:
```bash
npm run dev
```
Once started, open your browser and navigate to the address displayed in the terminal (usually `http://localhost:5173`).

### 3. Build for Production
To build and optimize the application for production deployment, run:
```bash
npm run build
```
The optimized production-ready files will be generated in the `/dist` directory.

### 4. Preview the Production Build
To test the production build locally before deploying, run:
```bash
npm run preview
```

---
This project is configured with a minimal **React** + **Vite** setup, along with **Oxlint** rules to ensure code quality and performance.
