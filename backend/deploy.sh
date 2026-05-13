#!/bin/bash

# Configuration
IMAGE_NAME="ghcr.io/mani7061338807/buildmate-backend:latest"
CONTAINER_NAME="buildmate-backend"
PORT=8002

echo "🚀 Starting BuildMate Backend Deployment..."

# 1. Pull the latest image
echo "📥 Pulling latest image from GHCR..."
sudo docker pull $IMAGE_NAME

# 2. Stop and remove existing container if it exists
if [ "$(sudo docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "🛑 Stopping existing container..."
    sudo docker stop $CONTAINER_NAME
    sudo docker rm $CONTAINER_NAME
fi

# 3. Run the new container
echo "🏃 Running new container on port $PORT..."
sudo docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:8002 \
  --env-file .env \
  --restart unless-stopped \
  $IMAGE_NAME

# 4. Cleanup old images
echo "🧹 Cleaning up old images..."
sudo docker image prune -f

echo "✅ Deployment Successful! Backend is running on port $PORT."
