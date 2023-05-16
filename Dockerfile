# Base image
FROM node:16.13.2-alpine

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY . .

# Install PM2 globally
RUN npm install pm2 -g

# Expose the desired port
EXPOSE 3018

# Start the application using PM2
CMD ["pm2-runtime", "start", "ecosystem.config.js"]
