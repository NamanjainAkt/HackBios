#MineGuard Pro

This document provides a technical overview of the MineGuard Pro project, a full-stack web application designed for mine safety monitoring.

## Project Overview

MineGuard Pro is a real-time hazard monitoring and management system for mining operations. It consists of a React-based frontend for supervisors and a Python/Flask backend that processes data from IoT sensors and manual reports from workers. The system visualizes hazard locations, simulates their potential spread, and provides real-time alerts to ensure worker safety.

**Key Technologies:**

*   **Frontend:** React, TypeScript, Vite, React Router, Lucide React
*   **Backend:** Python, Flask, MongoDB (via MongoDB Atlas), Flask-SocketIO
*   **Database:** MongoDB

## Architecture

The project follows a client-server architecture:

*   **Frontend (`/frontend`):** A single-page application (SPA) built with React that serves as the dashboard for mine supervisors. It communicates with the backend via a REST API and WebSockets.
*   **Backend (`/backend`):** A Flask application that provides a RESTful API for managing hazards and sensor data. It uses a MongoDB database to store information and Flask-SocketIO to push real-time updates to the frontend. It also includes a simulation module to predict hazard spread.

## Backend Setup and Commands

The backend is a Python Flask application.

**1. Setup:**

*   Create a virtual environment: `python -m venv venv`
*   Activate it: `source venv/bin/activate` (on Linux/macOS) or `venv\Scripts\activate` (on Windows)
*   Install dependencies: `pip install -r requirements.txt`
*   Set up a `.env` file with the `MONGO_URI` and other configuration as detailed in `backend/mineguard_flask_backend.md`.

**2. Running the Backend:**

```bash
python app.py
```

The backend server will start on `http://localhost:4000`.

## Frontend Setup and Commands

The frontend is a React application built with Vite.

**1. Setup:**

*   Navigate to the `frontend` directory: `cd frontend`
*   Install dependencies: `npm install`

**2. Development:**

To run the frontend in development mode with hot-reloading:

```bash
npm run dev
```

The development server will be accessible at `http://localhost:3000` (or another port if 3000 is in use).

**3. Building for Production:**

To create a production build of the frontend:

```bash
npm run build
```

The production-ready files will be placed in the `dist` directory.

**4. Linting:**

To check the code for any linting issues:

```bash
npm run lint
```

## Key Files

### Backend (`/backend`)

*   `app.py`: The main entry point for the Flask application, including WebSocket event handlers.
*   `requirements.txt`: A list of all the Python dependencies.
*   `.env`: Configuration file for environment variables (needs to be created).
*   `config.py`: Loads configuration from environment variables.
*   `models.py`: Defines the MongoDB database schema and models for hazards, sensors, and workers.
*   `routes/hazards.py`: Defines the API endpoints for hazard management.
*   `routes/sensors.py`: Defines the API endpoints for sensor data.
*   `utils/simulation.py`: Contains the logic for simulating the spread of hazards.

### Frontend (`/frontend`)

*   `package.json`: Lists the project's dependencies and scripts.
*   `vite.config.ts`: Configuration file for the Vite build tool.
*   `src/App.tsx`: The main React component that sets up the application's routing.
*   `src/api.ts`: Contains functions for making API calls to the backend.
*   `src/main.tsx`: The entry point of the React application.

## API Endpoints

The backend provides several RESTful endpoints. Here are some of the key ones:

*   `POST /api/hazard-reports`: To report a new hazard.
*   `GET /api/hazards`: To retrieve all hazards.
*   `GET /api/hazards/active`: To get all active hazards.
*   `GET /api/hazards/<hazard_id>`: To get details of a specific hazard.
*   `PUT /api/hazards/<hazard_id>/status`: To update the status of a hazard.
*   `GET /api/hazards/<hazard_id>/simulation`: To get hazard simulation data.
*   `POST /api/sensor-data`: To log data from a sensor.
*   `GET /api/sensor-data/recent`: To get recent sensor readings.

For more details, refer to the `backend/mineguard_flask_backend.md` file.
