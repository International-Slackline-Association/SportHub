#!/bin/bash

echo ">>> Starting install"

node -v  # sanity check

# Install pnpm
npm install -g pnpm@10.10

# Install SportHub dependencies
pnpm install