#!/bin/bash

echo ">>> Starting install"

# Install Node 
nvm install 22.15.0
nvm use 22.15.0
node -v  # sanity check

# Install pnpm
npm install -g pnpm@10.10

# Install SportHub dependencies
pnpm install