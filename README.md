# ModelTrain

A split-architecture web application featuring multi-agent AI simulations. The project demonstrates the evolution of artificial intelligence behaviors, from basic rules and swarms to advanced reinforcement learning policies.

## Project Structure

This project is divided into two main components:

- **`frontend/`**: A React/Vite application that runs the client-side simulations. It uses Three.js for 3D simulations (Car World) and Pixi.js for 2D simulations (Fish World). The frontend renders the simulations entirely offline, using either deterministic algorithms, boids logic, or exported model weights.
- **`training/`**: A Python backend environment (using Gymnasium and Stable-Baselines3) dedicated to training the reinforcement learning agents. The models are trained here and exported as static JSON files to be consumed by the frontend.

## Getting Started

### Frontend

Navigate to the `frontend` directory, install the Node dependencies, and start the development server:

```bash
cd frontend
npm install
npm run dev
```

### Training

Navigate to the `training` directory and set up your Python environment:

```bash
cd training

# Create a virtual environment
python -m venv venv

# Activate the environment
# Windows: venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```
